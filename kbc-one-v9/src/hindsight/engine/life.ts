import {
  type Cal,
  calIndex,
  calOf,
  daysIn,
  EVERYDAY,
  EVERYDAY_STOPS,
  type EverydayStop,
  evKey,
  everydayStop,
  parseEvKey,
  TODAY,
} from "./everyday";
import { euro, oneIn, pct } from "./format";
import { anchorOf, type Journey, readiness } from "./game";
import { type GateDecision, type Gated, gateNumber, gateRate } from "./gate";
import { type GoalDef, type LifeDef, lifeFor, type Yearly } from "./lives";
import { clamp, gaussian, hashSeed, mulberry32 } from "./rng";
import { crowdFor, statsFor } from "./simulate";
import type { ForkDef, RoadDef, StopDef, StopKind } from "./types";

// The life engine. Your money, replayed month by month from your journey.
// - The car is what you have: fuel = buffer months, trip computer = the next 30 days,
//   boot = pots and goals, tyres = cover.
// - Tips you take turn into pots. A prepared bump is paid from its pot and your savings
//   ("paved"); an unprepared one hits your account.
// - Everything is deterministic: the same journey always gives the same life.
// The future is never predicted for you: upcoming bumps show the crowd's typical amount,
// only months you've actually lived (replayed) use your own amounts.

// ---------- references to stops ----------

export interface StopRef {
  scope: "road" | "everyday";
  id: string;
  /** key in journey.done */
  key: string;
  year?: number;
}

export function refFor(scope: "road" | "everyday", id: string, year?: number): StopRef {
  return scope === "road" ? { scope, id, key: id } : { scope, id, key: evKey(id, year ?? TODAY.year), year };
}

export function refFromKey(key: string): StopRef {
  const ev = parseEvKey(key);
  return ev ? { scope: "everyday", id: ev.id, key, year: ev.year } : { scope: "road", id: key, key };
}

export function stopOf(road: RoadDef, ref: StopRef): StopDef | ForkDef | undefined {
  if (ref.scope === "everyday") return everydayStop(ref.id);
  if (road.fork?.id === ref.id) return road.fork;
  return road.stops.find((s) => s.id === ref.id);
}

/** The road a stop's crowd lives on. */
export const crowdRoad = (road: RoadDef, ref: StopRef) => (ref.scope === "everyday" ? EVERYDAY : road);

/** One line of crowd hindsight for a stop. */
export function crowdLine(road: RoadDef, stop: StopDef): { text: string; gated: Gated<number> } {
  const s = statsFor(road, stop);
  if (s.kind === "bump")
    return {
      text: s.hitRate.value != null ? `${oneIn(s.hitRate.value)} ${stop.hitVerb ?? "paid more than"} ${euro(s.threshold)}` : "Not enough drivers yet",
      gated: s.hitRate,
    };
  if (s.kind === "boost") return { text: s.median.value != null ? `Typically ${euro(s.median.value)}` : "Not enough drivers yet", gated: s.median };
  return { text: s.rate.value != null ? `${pct(s.rate.value)} ${stop.rate?.label}` : "Not enough drivers yet", gated: s.rate };
}

// ---------- calendar helpers ----------

const dayNum = (c: Cal, day: number) => Math.round(Date.UTC(c.year, c.month, Math.min(day, daysIn(c))) / 86400000);

/** Day of the month a road stop falls on: late in the month, stable per stop. */
export const roadStopDay = (roadId: string, stopId: string) => 18 + (hashSeed(`day:${roadId}:${stopId}`) % 9);

const active = (x: { from?: number; to?: number }, k: number) => (x.from ?? Number.NEGATIVE_INFINITY) <= k && k <= (x.to ?? Number.POSITIVE_INFINITY);

const salariedAt = (life: LifeDef, k: number) => life.incomes.some((i) => i.salary && active(i, k));

export function spendAt(life: LifeDef, k: number): number {
  let v = life.spend;
  for (const st of life.spendSteps ?? []) if (k >= st.from) v = st.amount;
  return v;
}

function yearlyOf(life: LifeDef, stop: EverydayStop): number {
  return life.yearly[stop.yearlyKey as keyof Yearly] ?? 0;
}

export function everydayApplies(life: LifeDef, stop: EverydayStop, k: number): boolean {
  const v = yearlyOf(life, stop);
  if (!v) return false;
  if (stop.id === "holiday-pay" || stop.id === "bonus") return salariedAt(life, k);
  return true;
}

/** Your own amount for a road stop, the month you actually live it (replay only). */
function personalRoadAmount(road: RoadDef, stop: StopDef): number {
  if (!stop.amount) return 0;
  const z = clamp(gaussian(mulberry32(hashSeed(`you:${road.id}:${stop.id}`))), -1.5, 1.5);
  const v = stop.amount.median * Math.exp(0.28 * z);
  return Math.round(v / 10) * 10;
}

/** What the crowd typically paid or got: used for anything still ahead. */
function typicalRoadAmount(road: RoadDef, stop: StopDef): number | null {
  const s = statsFor(road, stop);
  if (s.kind === "bump" || s.kind === "boost") return s.median.value;
  return null;
}

// ---------- pots from tips ----------

type PotSpec =
  | { kind: "monthly"; amount: number; locked?: boolean; ongoing?: boolean; label?: string }
  | { kind: "pct"; pct: number }
  | { kind: "spread" }
  | { kind: "target"; amount: number }
  | { kind: "fromBoost"; boost: string; pct: number }
  | { kind: "covered" }
  | { kind: "pensionSpread" };

const OVERRIDES: Record<string, PotSpec | null> = {
  "first-job:pension-saving:main": { kind: "monthly", amount: 25, locked: true, ongoing: true, label: "Pension saving" },
  "losing-parent:funeral:direct": { kind: "covered" },
  "everyday:holidays:park": { kind: "fromBoost", boost: "holiday-pay", pct: 0.4 },
  "everyday:pension:main": { kind: "pensionSpread" },
  "everyday:school:bonus": null,
};

const num = (s: string) => Number(s.replace(/[,.](?=\d{3})/g, ""));

/** Turn a tip's label into a pot. "Set aside €45 a month" → €45 a month. */
export function potSpec(scope: string, stopId: string, actionId: string, label: string): PotSpec | null {
  const key = `${scope}:${stopId}:${actionId}`;
  if (key in OVERRIDES) return OVERRIDES[key];
  const monthly = /€\s?([\d.,]+)\s+a month/i.exec(label);
  if (monthly) return { kind: "monthly", amount: num(monthly[1]) };
  const target = /€\s?([\d.,]+)\s+buffer/i.exec(label);
  if (target) return { kind: "target", amount: num(target[1]) };
  const p = /(\d+)%/.exec(label);
  if (p) return { kind: "pct", pct: Number(p[1]) / 100 };
  if (/\b(pot|reserve|aside|spread|cash)\b/i.test(label)) return { kind: "spread" };
  return null;
}

interface Occurrence {
  ref: StopRef;
  stop: StopDef | ForkDef;
  k: number;
  day: number;
}

interface TipPot {
  id: string;
  label: string;
  forKey: string;
  forLabel: string;
  startK: number;
  endK: number;
  monthly: number;
  locked: boolean;
  spec: PotSpec;
  /** already given its first transfer (projection only) */
  created?: boolean;
}

export interface PotState {
  id: string;
  label: string;
  balance: number;
  monthly: number;
  kind: "savings" | "goal" | "tip" | "pension";
  locked: boolean;
  /** tip pots: the stop they are for */
  forKey?: string;
  forLabel?: string;
  goalId?: string;
  target?: number;
}

// ---------- results ----------

export interface StopOutcome {
  ref: StopRef;
  title: string;
  short: string;
  kind: StopKind;
  amount: number;
  outcome: "paved" | "hit" | "covered" | "parked" | "landed" | "info";
  fromPot: number;
  fromSavings: number;
  fromAccount: number;
  toSavings: number;
  toGoal: number;
  note: string;
}

export interface DayItem {
  key: string;
  k: number;
  cal: Cal;
  day: number;
  label: string;
  amount: number;
  kind: "income" | "bill" | "stop" | "pots" | "oneoff" | "spend";
  ref?: StopRef;
  typical?: boolean;
}

export interface MonthResult {
  k: number;
  cal: Cal;
  partial: boolean;
  income: number;
  bills: number;
  billCount: number;
  spend: number;
  toPots: number;
  oneOffs: number;
  stops: StopOutcome[];
  goalsReached: string[];
  accountStart: number;
  accountEnd: number;
  bufferStart: number;
  bufferEnd: number;
  lowest: number;
  lowestDay: number;
  overdraftDays: number;
}

export interface UpcomingItem {
  ref: StopRef;
  k: number;
  cal: Cal;
  day: number;
  inDays: number;
  kind: StopKind;
  title: string;
  short: string;
  /** crowd typical (road) or your own last year (everyday); signed: + in, − out */
  amount: number | null;
  amountSource: "crowd" | "last-year" | "none";
  ready: number;
  done: string[];
  crowd: string;
  scope: "road" | "everyday";
}

export interface GoalState {
  id: string;
  label: string;
  place: string;
  target: number;
  saved: number;
  monthly: number;
  defaultMonthly: number;
  auto: boolean;
  remaining: number;
  reached: boolean;
  etaMonths: number | null;
  eta: Cal | null;
}

export interface LifeState {
  def: LifeDef;
  anchor: number;
  m: number;
  today: { cal: Cal; day: number; k: number };
  account: number;
  pots: PotState[];
  /** savings + tip pots + what your account keeps at its lowest point this month (goal and pension pots are not your buffer) */
  buffer: number;
  /** a typical month of bills + everyday spending */
  essentials: number;
  /** months of essentials your buffer covers */
  fuel: number;
  monthlyIn: number;
  monthlyBills: number;
  history: MonthResult[];
  next30: DayItem[];
  curve: { d: number; bal: number }[];
  lowest: { bal: number; cal: Cal; day: number };
  salary: { label: string; amount: number; cal: Cal; day: number; inDays: number } | null;
  upcoming: UpcomingItem[];
  goals: GoalState[];
}

// ---------- the simulation ----------

interface Ctx {
  road: RoadDef;
  j: Journey;
  life: LifeDef;
  anchor: number;
  start: number;
  tips: TipPot[];
  occ: Map<number, Occurrence[]>;
  avgIncome: number;
  goals: { def: GoalDef; monthly: number }[];
}

interface Sim {
  account: number;
  pots: Map<string, PotState>;
  /** pension saving already paid this calendar year */
  pensionPaid: Map<number, number>;
}

function occurrences(road: RoadDef, life: LifeDef, anchor: number, kFrom: number, kTo: number, includeForks = false): Occurrence[] {
  const out: Occurrence[] = [];
  const list: (StopDef | ForkDef)[] = [...road.stops];
  if (includeForks && road.fork) list.push(road.fork);
  for (const stop of list) {
    const k = stop.month - 1;
    if (k < kFrom || k > kTo || stop.month > road.months) continue;
    out.push({ ref: refFor("road", stop.id), stop, k, day: roadStopDay(road.id, stop.id) });
  }
  for (let k = kFrom; k <= kTo; k++) {
    const c = calOf(anchor, k);
    for (const stop of EVERYDAY_STOPS) {
      if (stop.calMonth !== c.month || !everydayApplies(life, stop, k)) continue;
      out.push({ ref: refFor("everyday", stop.id, c.year), stop, k, day: stop.day });
    }
  }
  return out.sort((a, b) => a.k - b.k || a.day - b.day);
}

function occurrenceK(road: RoadDef, anchor: number, ref: StopRef): number | null {
  if (ref.scope === "road") {
    const s = road.stops.find((x) => x.id === ref.id);
    return s ? s.month - 1 : null;
  }
  const st = everydayStop(ref.id);
  if (!st || ref.year == null) return null;
  return anchor + (ref.year * 12 + st.calMonth) - (TODAY.year * 12 + TODAY.month);
}

function costOf(road: RoadDef, life: LifeDef, o: { ref: StopRef; stop: StopDef }, mode: "replay" | "project"): number {
  if (o.ref.scope === "everyday") return Math.abs(yearlyOf(life, o.stop as EverydayStop));
  return mode === "replay" ? personalRoadAmount(road, o.stop) : (typicalRoadAmount(road, o.stop) ?? o.stop.amount?.median ?? 0);
}

function buildTips(road: RoadDef, j: Journey, life: LifeDef, anchor: number, start: number, avgIncome: number): TipPot[] {
  const tips: TipPot[] = [];
  for (const [key, ids] of Object.entries(j.done)) {
    const ref = refFromKey(key);
    const stop = stopOf(road, ref);
    if (!stop || stop.kind === "fork") continue;
    const endK = occurrenceK(road, anchor, ref);
    if (endK == null) continue;
    const scope = ref.scope === "everyday" ? "everyday" : road.id;
    for (const id of ids) {
      const label = id === "main" ? (stop.action?.label ?? "") : (stop.behaviours?.find((b) => b.id === id)?.action.label ?? "");
      if (stop.kind === "boost" && id === "main") continue; // parking, not a pot
      const spec = potSpec(scope, stop.id, id, label);
      if (!spec || spec.kind === "covered") continue;
      const startK = Math.max(start, j.doneAt?.[`${key}|${id}`] ?? start);
      const ongoing = spec.kind === "monthly" && !!spec.ongoing;
      if (!ongoing && startK > endK) continue;
      const count = Math.max(1, endK - startK + 1);
      let cost = 0;
      if (ref.scope === "everyday") cost = Math.abs(yearlyOf(life, stop as EverydayStop));
      else cost = typicalRoadAmount(road, stop) ?? stop.amount?.median ?? 0;
      let monthly = 0;
      if (spec.kind === "monthly") monthly = spec.amount;
      else if (spec.kind === "pct") monthly = Math.round(spec.pct * avgIncome);
      else if (spec.kind === "spread") monthly = Math.ceil(cost / count / 5) * 5;
      else if (spec.kind === "target") monthly = Math.ceil(spec.amount / count / 5) * 5;
      else if (spec.kind === "pensionSpread") monthly = Math.ceil(cost / 12 / 5) * 5;
      const locked = (spec.kind === "monthly" && !!spec.locked) || spec.kind === "pensionSpread";
      tips.push({
        id: locked ? "pension" : `tip:${key}:${id}`,
        label: spec.kind === "monthly" && spec.label ? spec.label : locked ? "Pension saving" : `${stop.short} pot`,
        forKey: key,
        forLabel: stop.title,
        startK,
        endK: ongoing ? Number.POSITIVE_INFINITY : endK,
        monthly: spec.kind === "fromBoost" ? 0 : monthly,
        locked,
        spec,
      });
    }
  }
  return tips;
}

function ensurePot(sim: Sim, id: string, init: () => PotState): PotState {
  let p = sim.pots.get(id);
  if (!p) {
    p = init();
    sim.pots.set(id, p);
  }
  return p;
}

const savingsPot = (sim: Sim) =>
  ensurePot(sim, "savings", () => ({ id: "savings", label: "Savings", balance: 0, monthly: 0, kind: "savings", locked: false }));

function bufferOf(sim: Sim): number {
  let b = sim.account;
  for (const p of sim.pots.values()) if (!p.locked && p.kind !== "goal") b += p.balance;
  return b;
}

function transfer(sim: Sim, pot: PotState, amount: number) {
  if (amount <= 0) return 0;
  sim.account -= amount;
  pot.balance += amount;
  return amount;
}

function makeCtx(road: RoadDef, j: Journey, life: LifeDef, anchor: number, start: number, horizon: number): Ctx {
  const avgIncome = life.incomes.filter((i) => active(i, Math.max(start, j.month))).reduce((s, i) => s + i.amount, 0);
  const all = occurrences(road, life, anchor, start, horizon);
  const occ = new Map<number, Occurrence[]>();
  for (const o of all) occ.set(o.k, [...(occ.get(o.k) ?? []), o]);
  const goals = life.goals.map((def) => ({ def, monthly: Math.max(0, j.goals?.[def.id]?.monthly ?? def.monthly) }));
  return { road, j, life, anchor, start, tips: buildTips(road, j, life, anchor, start, avgIncome), occ, avgIncome, goals };
}

function initSim(life: LifeDef): Sim {
  const pots = new Map<string, PotState>();
  for (const p of life.pots) pots.set(p.id, { id: p.id, label: p.label, balance: p.balance, monthly: p.monthly, kind: p.locked ? "pension" : "savings", locked: !!p.locked });
  for (const g of life.goals)
    pots.set(`goal:${g.id}`, { id: `goal:${g.id}`, label: g.label, balance: g.saved, monthly: g.monthly, kind: "goal", locked: false, goalId: g.id, target: g.target });
  return { account: life.balance, pots, pensionPaid: new Map() };
}

function cloneSim(s: Sim): Sim {
  const pots = new Map<string, PotState>();
  for (const [k, p] of s.pots) pots.set(k, { ...p });
  return { account: s.account, pots, pensionPaid: new Map(s.pensionPaid) };
}

/** Creation transfer for tip pots started this month (the first contribution, right away). */
function createTips(ctx: Ctx, sim: Sim, k: number, log?: (it: Omit<DayItem, "k" | "cal">) => void, day = 1) {
  let moved = 0;
  for (const t of ctx.tips) {
    if (t.startK !== k || t.monthly <= 0 || t.created) continue;
    const isNew = !sim.pots.has(t.id);
    const pot = ensurePot(sim, t.id, () => ({
      id: t.id,
      label: t.label,
      balance: 0,
      monthly: t.monthly,
      kind: t.locked ? "pension" : "tip",
      locked: t.locked,
      forKey: t.locked ? undefined : t.forKey,
      forLabel: t.locked ? undefined : t.forLabel,
    }));
    if (!isNew) pot.monthly = t.locked ? pot.monthly + t.monthly : t.monthly;
    moved += transfer(sim, pot, t.monthly);
    if (t.spec.kind === "pensionSpread") {
      const y = calOf(ctx.anchor, k).year;
      sim.pensionPaid.set(y, (sim.pensionPaid.get(y) ?? 0) + t.monthly);
    }
  }
  if (moved && log) log({ key: `create:${k}`, day, label: "First transfer to your new pots", amount: -moved, kind: "pots" });
  return moved;
}

function emptyMonth(k: number, cal: Cal, partial: boolean, sim: Sim): MonthResult {
  return {
    k,
    cal,
    partial,
    income: 0,
    bills: 0,
    billCount: 0,
    spend: 0,
    toPots: 0,
    oneOffs: 0,
    stops: [],
    goalsReached: [],
    accountStart: sim.account,
    accountEnd: sim.account,
    bufferStart: bufferOf(sim),
    bufferEnd: bufferOf(sim),
    lowest: sim.account,
    lowestDay: 1,
    overdraftDays: 0,
  };
}

/**
 * Run one journey month (a calendar month) from startDay to endDay.
 * replay: your own amounts, outcomes recorded. project: the crowd's typical amounts, nothing recorded.
 */
function runMonth(
  ctx: Ctx,
  sim: Sim,
  k: number,
  startDay: number,
  endDay: number,
  mode: "replay" | "project",
  log?: (it: DayItem) => void,
  curve?: (bal: number) => void,
): MonthResult {
  const { road, life, anchor } = ctx;
  const cal = calOf(anchor, k);
  const dim = daysIn(cal);
  const res = emptyMonth(k, cal, startDay > 1, sim);
  const L = (it: Omit<DayItem, "k" | "cal">) => log?.({ ...it, k, cal });
  const rand = mulberry32(hashSeed(`month:${road.id}:${k}`));
  const spendMonth = spendAt(life, k) * (1 + 0.06 * gaussian(rand));
  const vary = life.incomes.map((i) => (i.vary ? clamp(1 + i.vary * gaussian(rand), 0.35, 1.8) : 1));
  const occ = (ctx.occ.get(k) ?? []).filter((o) => o.stop.kind !== "fork");
  const careQuiet = road.care;

  for (let d = startDay; d <= Math.min(endDay, dim); d++) {
    // the first contributions of pots started this month
    if (d === startDay) res.toPots += createTips(ctx, sim, k, L, d);
    // standing orders on the 1st: savings, goals, tip pots
    if (d === 1) {
      let moved = 0;
      for (const p of life.pots) {
        const pot = sim.pots.get(p.id);
        if (pot && p.monthly > 0) moved += transfer(sim, pot, p.monthly);
      }
      for (const g of ctx.goals) {
        const pot = sim.pots.get(`goal:${g.def.id}`);
        if (!pot || g.monthly <= 0) continue;
        const room = g.def.target - pot.balance;
        if (room <= 0) continue;
        const amt = Math.min(g.monthly, room);
        moved += transfer(sim, pot, amt);
        if (pot.balance >= g.def.target) res.goalsReached.push(g.def.id);
      }
      for (const t of ctx.tips) {
        if (t.monthly <= 0 || !(t.startK < k && k <= t.endK)) continue;
        const pot = sim.pots.get(t.id);
        if (!pot) continue;
        moved += transfer(sim, pot, t.monthly);
        if (t.spec.kind === "pensionSpread") sim.pensionPaid.set(cal.year, (sim.pensionPaid.get(cal.year) ?? 0) + t.monthly);
      }
      res.toPots += moved;
      if (moved) L({ key: `pots:${k}`, day: 1, label: "To your pots and goals", amount: -moved, kind: "pots" });
    }
    life.incomes.forEach((inc, i) => {
      if (!active(inc, k) || Math.min(inc.day, dim) !== d) return;
      const amt = Math.round(inc.amount * vary[i]);
      sim.account += amt;
      res.income += amt;
      L({ key: `inc:${inc.id}:${k}`, day: d, label: inc.label, amount: amt, kind: "income" });
    });
    for (const bill of life.bills) {
      if (!active(bill, k) || Math.min(bill.day, dim) !== d) continue;
      if (bill.months && !bill.months.includes(cal.month)) continue;
      sim.account -= bill.amount;
      res.bills += bill.amount;
      res.billCount++;
      L({ key: `bill:${bill.id}:${k}`, day: d, label: bill.label, amount: -bill.amount, kind: "bill" });
    }
    for (const o of life.oneOffs ?? []) {
      if (o.month !== k || o.day !== d) continue;
      sim.account += o.amount;
      res.oneOffs += o.amount;
      L({ key: `one:${o.id}`, day: d, label: o.label, amount: o.amount, kind: "oneoff" });
    }
    for (const o of occ) {
      if (Math.min(o.day, dim) !== d) continue;
      const out = resolve(ctx, sim, { ref: o.ref, stop: o.stop as StopDef }, k, mode, careQuiet);
      if (!out) continue;
      res.stops.push(out);
      const signed = out.kind === "boost" || out.outcome === "landed" ? out.amount : -out.amount;
      if (out.amount || out.kind !== "milestone")
        L({ key: `stop:${o.ref.key}`, day: d, label: out.title, amount: out.outcome === "covered" ? 0 : signed, kind: "stop", ref: o.ref, typical: mode === "project" && o.ref.scope === "road" });
    }
    const daily = spendMonth / dim;
    sim.account -= daily;
    res.spend += daily;
    if (sim.account < res.lowest) {
      res.lowest = sim.account;
      res.lowestDay = d;
    }
    if (sim.account < 0) res.overdraftDays++;
    curve?.(sim.account);
  }
  res.spend = Math.round(res.spend);
  res.accountEnd = sim.account;
  res.bufferEnd = bufferOf(sim);
  return res;
}

function resolve(ctx: Ctx, sim: Sim, o: { ref: StopRef; stop: StopDef }, k: number, mode: "replay" | "project", care: boolean): StopOutcome | null {
  const { road, j, life } = ctx;
  const stop = o.stop;
  const done = j.done[o.ref.key] ?? [];
  const base = { ref: o.ref, title: stop.title, short: stop.short, kind: stop.kind, fromPot: 0, fromSavings: 0, fromAccount: 0, toSavings: 0, toGoal: 0 };
  const scope = o.ref.scope === "everyday" ? "everyday" : road.id;

  const pay = (cost: number, prepared: boolean) => {
    let left = Math.round(cost);
    let fromPot = 0;
    for (const t of ctx.tips) {
      if (t.forKey !== o.ref.key || t.locked) continue;
      const pot = sim.pots.get(t.id);
      if (!pot) continue;
      const take = Math.min(pot.balance, left);
      fromPot += take;
      left -= take;
      const rest = pot.balance - take;
      sim.pots.delete(t.id);
      if (rest > 0) savingsPot(sim).balance += rest;
    }
    let fromSavings = 0;
    if (prepared && left > 0) {
      const sv = sim.pots.get("savings");
      if (sv) {
        fromSavings = Math.min(Math.max(0, sv.balance), left);
        sv.balance -= fromSavings;
        left -= fromSavings;
      }
    }
    sim.account -= left;
    return { fromPot, fromSavings, fromAccount: left };
  };

  if (stop.kind === "bump") {
    const covered = done.some((id) => potSpec(scope, stop.id, id, "")?.kind === "covered");
    const cost = costOf(road, life, o, mode);
    if (covered) return { ...base, amount: cost, outcome: "covered", note: "Paid from the estate, not by you." };
    const prepared = readiness(stop, done) >= 50;
    const p = pay(cost, prepared);
    const note = care
      ? "It's behind you now."
      : prepared
        ? p.fromPot + p.fromSavings >= cost
          ? "Paved: paid from what you put aside."
          : "Paved: most of it came from what you put aside."
        : "Hit: it came out of your account.";
    return { ...base, amount: cost, outcome: prepared ? "paved" : "hit", ...p, note };
  }

  if (stop.kind === "boost") {
    const amount = o.ref.scope === "everyday" ? Math.abs(yearlyOf(life, stop as EverydayStop)) : mode === "replay" ? personalRoadAmount(road, stop) : (typicalRoadAmount(road, stop) ?? 0);
    sim.account += amount;
    const parked = done.includes("main");
    let toSavings = 0;
    let toGoal = 0;
    // tips that feed on this boost ("park 40% of my holiday pay for the summer")
    for (const t of ctx.tips) {
      if (t.spec.kind !== "fromBoost" || t.spec.boost !== stop.id) continue;
      const year = o.ref.year;
      if (refFromKey(t.forKey).year !== year) continue;
      const pot = ensurePot(sim, t.id, () => ({ id: t.id, label: t.label, balance: 0, monthly: 0, kind: "tip", locked: false, forKey: t.forKey, forLabel: t.forLabel }));
      transfer(sim, pot, Math.round(amount * t.spec.pct));
      toSavings += Math.round(amount * t.spec.pct);
    }
    if (parked) {
      if (o.ref.scope === "road") toSavings += transfer(sim, savingsPot(sim), amount - toSavings);
      else if (stop.id === "bonus") {
        const g = ctx.goals.map((x) => sim.pots.get(`goal:${x.def.id}`)).find((p) => p && p.target != null && p.balance < p.target);
        if (g) toGoal = transfer(sim, g, Math.min(Math.round(amount / 2), (g.target ?? 0) - g.balance));
        else toSavings += transfer(sim, savingsPot(sim), Math.round(amount / 2));
      } else toSavings += transfer(sim, savingsPot(sim), Math.round(amount / 2));
    }
    const note = toGoal
      ? `Half went straight to your first goal.`
      : parked
        ? o.ref.scope === "road"
          ? "Parked in savings, as planned."
          : "Half parked in savings, as planned."
        : toSavings
          ? "Part of it went to your summer pot."
          : "It landed in your account.";
    return { ...base, amount, outcome: parked ? "parked" : "landed", toSavings, toGoal, note };
  }

  // milestones
  if (o.ref.scope === "everyday" && stop.id === "tax-assessment") {
    const v = yearlyOf(life, stop as EverydayStop);
    if (v > 0) {
      sim.account += v;
      return { ...base, amount: v, outcome: "landed", note: "A refund. It landed in your account." };
    }
    const prepared = readiness(stop, done) >= 50;
    const p = pay(-v, prepared);
    return { ...base, amount: -v, outcome: prepared ? "paved" : "hit", ...p, note: prepared ? "You had it aside." : "It came out of your account." };
  }
  if (o.ref.scope === "everyday" && stop.id === "pension") {
    const total = Math.abs(yearlyOf(life, stop as EverydayStop));
    const year = calOf(ctx.anchor, k).year;
    const lump = Math.max(0, total - (sim.pensionPaid.get(year) ?? 0));
    const pot = ensurePot(sim, "pension", () => ({ id: "pension", label: "Pension saving", balance: 0, monthly: 0, kind: "pension", locked: true }));
    transfer(sim, pot, lump);
    return {
      ...base,
      amount: lump,
      outcome: lump < total ? "paved" : "info",
      toSavings: 0,
      fromAccount: lump,
      note: lump < total ? `Spread over the year: only ${euro(lump)} left to add in December.` : `${euro(lump)} moved to pension saving in one go.`,
    };
  }
  return { ...base, amount: 0, outcome: "info", note: done.length ? "Done ✓" : "" };
}

// ---------- the public API ----------

export function computeLife(road: RoadDef, j: Journey, household?: LifeDef): LifeState {
  // KBC One: the household belongs to the person, not to the road (falls back to the road's own driver).
  const life = household ?? lifeFor(road.id);
  const anchor = anchorOf(road, j);
  const m = j.month;
  const start = Math.min(anchor, m);
  const ctx = makeCtx(road, j, life, anchor, start, m + 13);
  const sim = initSim(life);
  const history: MonthResult[] = [];
  for (let k = start; k < m; k++) history.push(runMonth(ctx, sim, k, k === anchor ? TODAY.day : 1, 31, "replay"));

  const todayDay = m === anchor ? TODAY.day : 1;
  const today = { cal: calOf(anchor, m), day: todayDay, k: m };
  // pots started today get their first transfer now
  createTips(ctx, sim, m);
  const nowSim = cloneSim(sim);

  // trip computer: the next 30 days with the crowd's typical amounts for anything ahead
  const proj = cloneSim(sim);
  const next30: DayItem[] = [];
  const curve: { d: number; bal: number }[] = [{ d: 0, bal: proj.account }];
  let d = 0;
  const push = (bal: number) => {
    d++;
    curve.push({ d, bal });
  };
  const projCtx = { ...ctx, tips: ctx.tips.map((t) => (t.startK === m ? { ...t, created: true } : t)) };
  const dimNow = daysIn(today.cal);
  // today's own bills and income haven't happened yet: the window includes today
  runMonth(projCtx, proj, m, todayDay, dimNow, "project", (it) => next30.push(it), push);
  const restDays = 30 - (dimNow - todayDay + 1);
  if (restDays > 0) runMonth(projCtx, proj, m + 1, 1, restDays, "project", (it) => next30.push(it), push);
  let lowest = { bal: sim.account, cal: today.cal, day: todayDay };
  curve.forEach((p) => {
    if (p.bal < lowest.bal) {
      const abs = dayNum(today.cal, todayDay) + p.d;
      const dt = new Date(abs * 86400000);
      lowest = { bal: p.bal, cal: { year: dt.getUTCFullYear(), month: dt.getUTCMonth() }, day: dt.getUTCDate() };
    }
  });

  // next salary (or main income) within 45 days
  const t0 = dayNum(today.cal, todayDay);
  let salary: LifeState["salary"] = null;
  for (let kk = m; kk <= m + 2 && !salary; kk++) {
    const c = calOf(anchor, kk);
    const incs = life.incomes.filter((i) => active(i, kk)).sort((a, b) => b.amount - a.amount);
    const main = incs[0];
    if (!main) continue;
    const dd = Math.min(main.day, daysIn(c));
    const inDays = dayNum(c, dd) - t0;
    if (inDays >= 0) salary = { label: main.label, amount: main.amount, cal: c, day: dd, inDays };
  }

  // the next 12 months on both roads
  const upcoming: UpcomingItem[] = [];
  for (const o of occurrences(road, life, anchor, m, m + 11, true)) {
    if (o.ref.scope === "road" && o.stop.month <= j.month) continue;
    const inDays = dayNum(calOf(anchor, o.k), o.day) - t0;
    if (inDays < 0) continue;
    const done = j.done[o.ref.key] ?? [];
    let amount: number | null = null;
    let src: UpcomingItem["amountSource"] = "none";
    if (o.stop.kind !== "fork") {
      const st = o.stop as StopDef;
      if (o.ref.scope === "everyday") {
        const v = yearlyOf(life, st as EverydayStop);
        if (st.id !== "tax-return") {
          amount = st.kind === "bump" || st.id === "pension" ? -Math.abs(v) : v;
          src = "last-year";
        }
      } else if (st.kind !== "milestone") {
        const t = typicalRoadAmount(road, st);
        amount = t == null ? null : st.kind === "bump" ? -t : t;
        src = t == null ? "none" : "crowd";
      }
    }
    upcoming.push({
      ref: o.ref,
      k: o.k,
      cal: calOf(anchor, o.k),
      day: o.day,
      inDays,
      kind: o.stop.kind,
      title: o.stop.title,
      short: o.stop.short,
      amount,
      amountSource: src,
      ready: o.stop.kind === "fork" ? 0 : readiness(o.stop as StopDef, done),
      done,
      crowd: o.stop.kind === "fork" ? (o.stop as ForkDef).intro : crowdLine(crowdRoad(road, o.ref), o.stop as StopDef).text,
      scope: o.ref.scope,
    });
  }

  const pots = [...nowSim.pots.values()].map((p) => ({ ...p, balance: Math.round(p.balance) }));
  // the buffer is what's left when this month's bills are paid: your pots plus the lowest
  // point of your account over the next 30 days (so salary day doesn't make the gauge jump)
  const buffer = Math.round(bufferOf(nowSim) - nowSim.account + Math.min(nowSim.account, lowest.bal));
  const kNow = Math.max(m, start);
  const monthlyBills = Math.round(
    life.bills.filter((b) => active(b, kNow)).reduce((s, b) => s + (b.months ? (b.amount * b.months.length) / 12 : b.amount), 0),
  );
  const essentials = monthlyBills + spendAt(life, kNow);
  const monthlyIn = life.incomes.filter((i) => active(i, kNow)).reduce((s, i) => s + i.amount, 0);

  const goals: GoalState[] = ctx.goals.map(({ def, monthly }) => {
    const saved = Math.round(nowSim.pots.get(`goal:${def.id}`)?.balance ?? def.saved);
    const remaining = Math.max(0, def.target - saved);
    const etaMonths = remaining <= 0 ? 0 : monthly > 0 ? Math.ceil(remaining / monthly) : null;
    return {
      id: def.id,
      label: def.label,
      place: def.place,
      target: def.target,
      saved,
      monthly,
      defaultMonthly: def.monthly,
      auto: j.goals?.[def.id]?.auto ?? false,
      remaining,
      reached: remaining <= 0,
      etaMonths,
      eta: etaMonths == null ? null : calOf(anchor, m + etaMonths),
    };
  });

  return {
    def: life,
    anchor,
    m,
    today,
    account: Math.round(nowSim.account),
    pots,
    buffer,
    essentials,
    fuel: Math.max(0, buffer) / Math.max(1, essentials),
    monthlyIn,
    monthlyBills,
    history,
    next30,
    curve,
    lowest: { ...lowest, bal: Math.round(lowest.bal) },
    salary,
    upcoming,
    goals,
  };
}

// ---------- the crowd's hindsight on your money ----------

const FUEL_SCALE: Record<RoadDef["family"], number> = { work: 0.7, home: 1, family: 1, abroad: 0.8, later: 1.8, care: 1 };
const fuelCache = new Map<string, Gated<number>>();

/** Median buffer, in months, of drivers on this road (synthetic crowd, gated). */
export function fuelCrowd(road: RoadDef): Gated<number> {
  const hit = fuelCache.get(road.id);
  if (hit) return hit;
  const crowd = crowdFor(road);
  const vals = new Float64Array(crowd.n);
  const s = FUEL_SCALE[road.family];
  for (let i = 0; i < crowd.n; i++) vals[i] = s * (0.2 + 7 * crowd.buffer[i] ** 1.7);
  vals.sort();
  const g = gateNumber(`${road.id}:fuel:median`, vals[Math.floor(vals.length / 2)] ?? 0, crowd.n, 0.1);
  fuelCache.set(road.id, g);
  return g;
}

export interface GoalCrowd {
  /** got there within `within` months (a little slack on your own ETA), drivers who started like you */
  reach: Gated<number>;
  within: number;
  reachAuto: Gated<number>;
  reachManual: Gated<number>;
  /** median months to get there, among those who did */
  months: Gated<number>;
  n: number;
  decisions: GateDecision[];
}

/** "Got there" means: within your own ETA plus a quarter, plus three months. */
export const goalWindow = (remaining: number, monthly: number) => Math.min(240, Math.ceil(Math.ceil(remaining / Math.max(1, monthly)) * 1.25) + 3);
const goalCache = new Map<string, GoalCrowd>();

/**
 * "63% of drivers who started like you got there (within a little of their ETA)."
 * Like you = a similar amount still to go, a monthly pace within ±25% of yours, and a similar buffer.
 * Common random numbers per person, so moving the pace slider changes the odds smoothly.
 */
export function goalCrowd(road: RoadDef, goal: Pick<GoalState, "id" | "remaining" | "monthly" | "defaultMonthly">, bufferBand: number): GoalCrowd {
  const monthly = Math.max(5, Math.round(goal.monthly / 5) * 5);
  const remaining = Math.max(100, Math.round(goal.remaining / 50) * 50);
  const key = `${road.id}:${goal.id}:${monthly}:${remaining}:${bufferBand}`;
  const hit = goalCache.get(key);
  if (hit) return hit;
  const crowd = crowdFor(road);
  const seed = hashSeed(`goal:${road.id}:${goal.id}`);
  const rand = mulberry32(seed);
  const centre = Math.max(10, goal.defaultMonthly || monthly);
  const within = goalWindow(remaining, monthly);
  let n = 0;
  let reached = 0;
  let nAuto = 0;
  let rAuto = 0;
  let nMan = 0;
  let rMan = 0;
  const months: number[] = [];
  for (let i = 0; i < crowd.n; i++) {
    // everyone draws, so subsets stay comparable when the slider moves
    const pace = centre * Math.exp(0.7 * gaussian(rand));
    const auto = rand() < 0.3 + 0.4 * crowd.prep[i];
    if (Math.abs(Math.log(pace / monthly)) > 0.25 || Math.abs(crowd.bufferBand[i] - bufferBand) > 1) continue;
    const r = mulberry32((seed ^ Math.imul(i + 1, 2654435761)) >>> 0);
    const derail = 0.03 * (1.5 - crowd.buffer[i]);
    let saved = 0;
    let at = -1;
    for (let t = 1; t <= within; t++) {
      if (auto || r() > 0.2) saved += pace;
      if (r() < derail) saved = Math.max(0, saved - pace * (2 + 4 * r()));
      if (saved >= remaining) {
        at = t;
        break;
      }
    }
    n++;
    if (auto) nAuto++;
    else nMan++;
    if (at > 0) {
      reached++;
      months.push(at);
      if (auto) rAuto++;
      else rMan++;
    }
  }
  months.sort((a, b) => a - b);
  const label = `${road.id}:goal:${goal.id}:${monthly}`;
  const out: GoalCrowd = {
    reach: gateRate(`${label}:reach`, reached, n),
    reachAuto: gateRate(`${label}:auto`, rAuto, nAuto),
    reachManual: gateRate(`${label}:manual`, rMan, nMan),
    months: gateNumber(`${label}:months`, months[Math.floor(months.length / 2)] ?? 0, months.length, 1),
    within,
    n,
    decisions: [],
  };
  out.decisions = [out.reach.decision, out.reachAuto.decision, out.reachManual.decision, out.months.decision];
  if (goalCache.size > 400) goalCache.clear();
  goalCache.set(key, out);
  return out;
}

// ---------- today's one thing ----------

export interface TodayPick {
  tone: "bump" | "boost" | "everyday" | "cover" | "goal" | "calm" | "care";
  kicker: string;
  title: string;
  line: string;
  ref?: StopRef;
  action?: { key: string; id: string; label: string };
  coverId?: string;
}

const inWords = (days: number) =>
  days <= 1 ? "tomorrow" : days < 14 ? `in ${days} days` : days < 60 ? `in about ${Math.round(days / 7)} weeks` : `in about ${Math.round(days / 30)} months`;

export function todayPick(road: RoadDef, j: Journey, life: LifeState): TodayPick {
  if (road.care) {
    if (!j.careOptIn)
      return {
        tone: "care",
        kicker: "TODAY",
        title: "Nothing you need to do today.",
        line: "When you're ready, there's a calm overview of what's ahead. A person is there first, if you want one.",
      };
    const next = life.upcoming.find((u) => u.scope === "road" && u.kind !== "fork");
    return {
      tone: "care",
      kicker: "WHEN YOU'RE READY",
      title: next ? `Next on your road: ${next.title.toLowerCase()}` : "Nothing urgent ahead.",
      line: next ? `${inWords(next.inDays)[0].toUpperCase()}${inWords(next.inDays).slice(1)}. You don't have to face it alone.` : "You can always talk to someone.",
      ref: next?.ref,
    };
  }
  const stopFor = (u: UpcomingItem) => stopOf(road, u.ref) as StopDef | undefined;
  const bump = life.upcoming.find((u) => u.kind === "bump" && u.inDays <= 90 && u.ready < 50 && (u.scope === "road" || u.inDays <= 75));
  if (bump) {
    const st = stopFor(bump);
    const b = st?.behaviours?.filter((x) => !bump.done.includes(x.id)).sort((a, c) => c.action.readiness - a.action.readiness)[0];
    return {
      tone: bump.scope === "road" ? "bump" : "everyday",
      kicker: bump.scope === "road" ? `ON YOUR ROAD · ${inWords(bump.inDays).toUpperCase()}` : `EVERYDAY ROAD · ${inWords(bump.inDays).toUpperCase()}`,
      title: bump.title,
      line: `${bump.crowd}. ${st?.advice ?? ""}`,
      ref: bump.ref,
      action: b ? { key: bump.ref.key, id: b.id, label: b.action.label } : undefined,
    };
  }
  const boost = life.upcoming.find((u) => u.kind === "boost" && u.inDays <= 45 && !u.done.includes("main"));
  if (boost) {
    const st = stopFor(boost);
    return {
      tone: "boost",
      kicker: `MONEY COMING IN · ${inWords(boost.inDays).toUpperCase()}`,
      title: boost.title,
      line: st?.advice ?? "",
      ref: boost.ref,
      action: st?.action ? { key: boost.ref.key, id: "main", label: st.action.label } : undefined,
    };
  }
  const cover = life.def.cover.find((c) => c.state !== "ok" && !(j.cover ?? []).includes(c.id));
  if (cover)
    return { tone: "cover", kicker: "A TYRE TO CHECK", title: `${cover.label}: worth a look`, line: cover.note, coverId: cover.id };
  const goal = life.goals.find((g) => !g.reached);
  if (goal)
    return {
      tone: "goal",
      kicker: "YOUR NEXT DESTINATION",
      title: goal.label,
      line: goal.eta ? `${euro(goal.remaining)} to go at ${euro(goal.monthly)} a month. You'd arrive around ${calLabelLong(goal.eta)}.` : `${euro(goal.remaining)} to go. Set a monthly pace to see when you'd arrive.`,
    };
  return { tone: "calm", kicker: "TODAY", title: "Nothing on the road today.", line: "Everything ahead is covered. Enjoy the drive." };
}

export const calLabelLong = (c: Cal) => `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][c.month]} ${c.year}`;

// ---------- the salary-day recap ----------

export interface MonthRecap {
  roadId: string;
  month: MonthResult;
  fuelBefore: number;
  fuelAfter: number;
  goals: { id: string; label: string; before: number; after: number; target: number; eta: Cal | null; reached: boolean }[];
  next: UpcomingItem[];
  finished: boolean;
}

export function buildRecap(road: RoadDef, before: LifeState, after: LifeState, finished: boolean): MonthRecap | null {
  const month = after.history[after.history.length - 1];
  if (!month) return null;
  return {
    roadId: road.id,
    month,
    fuelBefore: before.fuel,
    fuelAfter: after.fuel,
    goals: after.goals.map((g) => ({
      id: g.id,
      label: g.label,
      before: before.goals.find((x) => x.id === g.id)?.saved ?? g.saved,
      after: g.saved,
      target: g.target,
      eta: g.eta,
      reached: g.reached,
    })),
    next: after.upcoming.slice(0, 3),
    finished,
  };
}

/** Months-of-buffer band, for "people like you" (0..3), from fuel. */
export const fuelBand = (fuel: number) => (fuel < 1 ? 0 : fuel < 2.5 ? 1 : fuel < 5 ? 2 : 3);

export { calIndex };
