// Your own world: the home you own or rent, your car, your savings and goals, your pension and your
// investments, as places in the city. Pull over at one and you see your own products, with only
// next steps of what you already do. Market Mile shows investments month by month, never live:
// no prices ticking, no trade button, no scores against other people (ESMA / FCA guidance on gamified investing).
// All data is synthetic, and the news on Market Mile is generated from the synthetic prices (DEMO).
// Pure TypeScript, unit-tested.

import { MONTH_LONG, MONTH_SHORT } from "./everyday";
import { duration, euro, months1, pct, signedEuro } from "./format";
import type { LifeState } from "./life";
import { type ActionSpec, type Advisor, addDays, DOW, nextDow, type When, whenLabel, whenLong } from "./plan";
import { gaussian, hashSeed, mulberry32 } from "./rng";

// ---------- what a person has ----------

export interface MonthPoint {
  year: number;
  /** 0 = January */
  month: number;
}

export interface MortgageDef {
  original: number;
  /** yearly rate, 0.031 = 3.1% */
  rate: number;
  /** month of the first payment */
  start: MonthPoint;
  years: number;
  fixed: boolean;
  balanceInsurance: boolean;
}

export interface HomeDef {
  tenure: "own" | "rent";
  kind: "flat" | "terraced" | "detached";
  city: string;
  boughtYear?: number;
  epc?: "A" | "B" | "C" | "D" | "E" | "F";
  mortgage?: MortgageDef;
  rent?: { monthly: number; deposit: number; leaseStart: When };
  insurance?: { label: string; monthly?: number; kbc: boolean };
  /** the household's cover line to check from here (CoverDef id) */
  coverId?: string;
}

/** Saving for a home you don't have yet: the plot, with the goal as its foundations. */
export interface FutureHomeDef {
  goalId: string;
  city: string;
  appointment?: { dow: (typeof DOW)[number]; time: string; with: string; role: string };
  coverId?: string;
}

export interface CarDef {
  label: string;
  insurance: { label: string; yearly: number; before: number; renews: { month: number; day: number }; kbc: boolean };
}

export interface HoldingDef {
  id: string;
  name: string;
  kind: "ETF" | "fund" | "bonds";
  /** summary risk indicator, 1–7 (PRIIPs KID) */
  sri: number;
  /** ongoing costs, % a year */
  costs: number;
  /** where it's held, as the customer knows it */
  via: string;
  since: MonthPoint;
  initial: number;
  /** a monthly investment plan, invested at every month's start after the first */
  monthly?: number;
  /** value at the last month's close (matches the app) */
  value: number;
  profile: "equity" | "bonds";
  /** sensitivity to the market moves of its profile */
  beta: number;
  /** monthly noise of its own */
  vol: number;
}

export interface PensionDef {
  limit: number;
  paid: number;
  fund: number;
  /** what you usually pay in a year (in December), when nothing is paid yet this year */
  usual?: number;
}

export interface ChildDef {
  name: string;
  balance: number;
  weekly: number;
  day: string;
}

export interface WorldDef {
  home?: HomeDef;
  futureHome?: FutureHomeDef;
  car?: CarDef;
  holdings: HoldingDef[];
  pension?: PensionDef;
  child?: ChildDef;
}

// ---------- small helpers ----------

const monthIndex = (p: MonthPoint) => p.year * 12 + p.month;
export const addMonths = (p: MonthPoint, n: number): MonthPoint => {
  const t = monthIndex(p) + n;
  return { year: Math.floor(t / 12), month: ((t % 12) + 12) % 12 };
};
export const monthsBetween = (a: MonthPoint, b: MonthPoint) => monthIndex(b) - monthIndex(a);
const daysIn = (p: MonthPoint) => new Date(Date.UTC(p.year, p.month + 1, 0)).getUTCDate();
const pct1 = (v: number) => `${(Math.abs(v) * 100).toFixed(1).replace(".", ",")}%`;
const signedPct1 = (v: number) => `${v >= 0 ? "+" : "−"}${pct1(v)}`;
const monthLabel = (p: MonthPoint) => `${MONTH_SHORT[p.month]} ${p.year}`;

/** For the stage: every amount becomes "€ •••". Percentages and dates stay. */
export const maskMoney = (s: string) => s.replace(/[−+-]?€\s?\d[\d.,]*/g, "€ •••");

// ---------- the home loan ----------

export interface MortgageState {
  payment: number;
  left: number;
  paidShare: number;
  monthsLeft: number;
  last: MonthPoint;
}

/** An annuity loan: the same payment every month; what's left after the payments made before `at`. */
export function mortgageAt(m: MortgageDef, at: MonthPoint): MortgageState {
  const r = m.rate / 12;
  const n = m.years * 12;
  const payment = r === 0 ? m.original / n : (m.original * r) / (1 - (1 + r) ** -n);
  const k = Math.max(0, Math.min(n, monthsBetween(m.start, at)));
  const left = r === 0 ? m.original - payment * k : m.original * (1 + r) ** k - (payment * ((1 + r) ** k - 1)) / r;
  const clean = Math.max(0, left);
  return { payment, left: clean, paidShare: 1 - clean / m.original, monthsLeft: n - k, last: addMonths(m.start, n - 1) };
}

// ---------- investments: month by month ----------

/** Synthetic market moves per month (log returns). Shapes only, not real history. */
function marketMove(profile: HoldingDef["profile"], p: MonthPoint): number {
  if (profile === "equity") {
    if (p.year === 2020) return [0, -0.07, -0.13, 0.1, 0.04][p.month] ?? 0;
    if (p.year === 2022 && p.month <= 8) return -0.022;
    if (p.year === 2025) return [0, 0, -0.06, -0.03, 0.05][p.month] ?? 0;
    if (p.year === 2026) return [0, 0, 0, 0, 0, 0, 0.01, 0.015, 0.025][p.month] ?? 0;
    return 0;
  }
  if (p.year === 2022 && p.month <= 9) return -0.017;
  if (p.year === 2023 && (p.month === 10 || p.month === 11)) return 0.025;
  return 0;
}

export interface HoldingSeries {
  months: MonthPoint[];
  /** price index, 1 at the start */
  index: number[];
  /** what you had put in at each month's close */
  invested: number[];
  /** what it was worth at each month's close */
  value: number[];
}

/**
 * Monthly closes from the first purchase to `close`. Seeded and deterministic; the drift is solved so
 * the last close equals the value the app shows. Nothing here depends on the clock: no live prices.
 */
export function holdingSeries(h: HoldingDef, close: MonthPoint): HoldingSeries {
  const n = Math.max(0, monthsBetween(h.since, close));
  const rand = mulberry32(hashSeed(`holding:${h.id}`));
  const months = Array.from({ length: n + 1 }, (_, t) => addMonths(h.since, t));
  const shock = months.map((p, t) => (t === 0 ? 0 : h.beta * marketMove(h.profile, p) + h.vol * gaussian(rand)));
  const contrib = months.map((_, t) => (t === 0 ? h.initial : (h.monthly ?? 0)));
  const build = (c: number) => {
    const index = [1];
    for (let t = 1; t <= n; t++) index.push(index[t - 1] * Math.exp(c + shock[t]));
    let units = 0;
    let put = 0;
    const invested: number[] = [];
    const value: number[] = [];
    for (let t = 0; t <= n; t++) {
      units += contrib[t] / index[t];
      put += contrib[t];
      invested.push(put);
      value.push(units * index[t]);
    }
    return { months, index, invested, value };
  };
  let lo = -0.2;
  let hi = 0.2;
  for (let i = 0; i < 70; i++) {
    const mid = (lo + hi) / 2;
    const v = build(mid).value[n];
    if (v < h.value) lo = mid;
    else hi = mid;
  }
  return build((lo + hi) / 2);
}

/** € 2.000 per floor. Stone = what you put in; lit = what it grew; scaffolding = what's missing (never rubble). */
export const FLOOR_EUR = 2000;

export interface TowerState {
  stone: number;
  lit: number;
  scaffold: number;
  gain: number;
  gainPct: number;
  under: boolean;
}

export function towerState(invested: number, value: number): TowerState {
  const gain = value - invested;
  const gainPct = invested > 0 ? gain / invested : 0;
  if (value >= invested) {
    const stone = Math.max(1, Math.round(invested / FLOOR_EUR));
    return { stone, lit: Math.max(0, Math.round(value / FLOOR_EUR) - stone), scaffold: 0, gain, gainPct, under: false };
  }
  const stone = Math.max(1, Math.floor(value / FLOOR_EUR));
  return { stone, lit: 0, scaffold: Math.max(1, Math.ceil(invested / FLOOR_EUR) - stone), gain, gainPct, under: true };
}

export interface NewsItem {
  when: string;
  text: string;
}

/** Two lines of demo news per holding, generated from its own synthetic monthly closes. */
export function holdingNews(h: HoldingDef, s: HoldingSeries): NewsItem[] {
  const n = s.index.length - 1;
  if (n < 1) return [{ when: monthLabel(s.months[0]), text: `You bought ${h.name} this month.` }];
  const ret = (t: number) => s.index[t] / s.index[t - 1] - 1;
  const last = ret(n);
  const out: NewsItem[] = [
    { when: monthLabel(s.months[n]), text: `${h.name} ${last >= 0 ? "rose" : "fell"} ${pct1(last)} in ${MONTH_LONG[s.months[n].month]}.` },
  ];
  let worst = 0;
  let best = 0;
  let wi = -1;
  let bi = -1;
  for (let t = Math.max(1, n - 11); t <= n; t++) {
    const r = ret(t);
    if (r < worst) {
      worst = r;
      wi = t;
    }
    if (r > best) {
      best = r;
      bi = t;
    }
  }
  if (wi > 0 && worst < -0.025) {
    const since = s.index[n] / s.index[wi] - 1;
    out.push({ when: monthLabel(s.months[wi]), text: `Biggest dip of the past year: −${pct1(worst)} in ${MONTH_LONG[s.months[wi].month]}. Since then: ${signedPct1(since)}.` });
  } else if (bi > 0) {
    out.push({ when: monthLabel(s.months[bi]), text: `Best month of the past year: +${pct1(best)} in ${MONTH_LONG[s.months[bi].month]}.` });
  }
  return out;
}

export interface MarketWeather {
  kind: "clear" | "cloudy" | "rain";
  change: number;
  line: string;
}

/** The market mood over the last three months, value-weighted. Never lightning. */
export function marketWeather(list: { s: HoldingSeries }[]): MarketWeather {
  let w = 0;
  let r = 0;
  for (const { s } of list) {
    const n = s.index.length - 1;
    const back = Math.max(0, n - 3);
    w += s.value[n];
    r += s.value[n] * (s.index[n] / s.index[back] - 1);
  }
  const change = w > 0 ? r / w : 0;
  const kind = change > 0.02 ? "clear" : change < -0.02 ? "rain" : "cloudy";
  return { kind, change, line: `${kind === "clear" ? "Clear" : kind === "rain" ? "Rain" : "Cloudy"} · last 3 months ${signedPct1(change)}` };
}

// ---------- places ----------

export type PlaceKind = "house" | "flat" | "plot" | "garage" | "silo" | "tree" | "child" | "tower" | "kiosk";

export interface PlaceFact {
  label: string;
  value: string;
  tone?: "ok" | "check" | "gap";
}

export type PlaceAction =
  /** a follow-up that goes into the glovebox (scope "place") */
  | { id: string; type: "pick"; spec: ActionSpec }
  /** change a goal's monthly transfer (the store's own goal flow, undone if not confirmed) */
  | { id: string; type: "goal"; goalId: string; monthly: number; label: string; note: string }
  /** check a cover line (the store's own cover flow) */
  | { id: string; type: "cover"; coverId: string; label: string; note: string };

export interface Place {
  id: string;
  street: "home" | "market";
  kind: PlaceKind;
  kicker: string;
  title: string;
  /** one line for the sign above it */
  line: string;
  facts: PlaceFact[];
  body: string;
  actions: PlaceAction[];
  news?: NewsItem[];
  /** 0..1: how much is built (house, plot) or filled (silo) */
  fill: number;
  accent: string;
  /** frontage along the street, world units */
  width: number;
  insured?: boolean;
  epc?: string;
  /** something needs attention soon (renewal within a month) */
  alert?: boolean;
  /** tree size, tower floors, position on Market Mile */
  scale?: number;
  tower?: TowerState;
  /** months since the first purchase on Market Mile */
  t?: number;
}

export interface MarketInfo {
  first: MonthPoint;
  close: MonthPoint;
  span: number;
  weather: MarketWeather | null;
  years: { label: string; t: number }[];
}

const EPC_NOTE = (epc: string, bought?: number) =>
  bought && bought >= 2023 && (epc === "E" || epc === "F")
    ? `Label ${epc}, bought in ${bought}: the Flemish renovation obligation asks for label D within 6 years.`
    : `Label ${epc}. The Flemish renovation obligation only applies to homes bought from 2023 with label E or F.`;

function bookSpec(advisor: Advisor | undefined, about: string, topic: string, product?: string): ActionSpec {
  return {
    kind: "book",
    title: advisor ? `Talk to ${advisor.name} about ${about}` : `Book a talk about ${about}`,
    detail: `${advisor ? `${advisor.name} (${advisor.office}) or ` : ""}KBC Live by video or phone. You pick the moment when you confirm; you can move or cancel it.`,
    topic,
    product,
  };
}

/** The places in your own world, built from your products and your life replay. */
export function buildPlaces(world: WorldDef, life: LifeState, advisor?: Advisor): { places: Place[]; market: MarketInfo } {
  const out: Place[] = [];
  const now: MonthPoint = { year: life.today.cal.year, month: life.today.cal.month };
  const today: When = { year: now.year, month: now.month, day: life.today.day };
  const cover = (id?: string) => (id ? life.def.cover.find((c) => c.id === id) : undefined);
  const salary = life.def.incomes.find((i) => i.salary);

  // ---- home ----
  const h = world.home;
  if (h?.tenure === "own") {
    const m = h.mortgage ? mortgageAt(h.mortgage, now) : null;
    const c = cover(h.coverId);
    const facts: PlaceFact[] = [];
    if (m && h.mortgage) {
      facts.push(
        { label: "Home loan left", value: euro(m.left) },
        { label: "Paid back", value: `${pct(m.paidShare)} of ${euro(h.mortgage.original)}` },
        { label: "Each month", value: euro(m.payment) },
        { label: "Last payment", value: `${monthLabel(m.last)} · ${duration(m.monthsLeft)} to go` },
        { label: "Rate", value: `${(h.mortgage.rate * 100).toFixed(1).replace(".", ",")}% ${h.mortgage.fixed ? "fixed" : "variable"}` },
      );
      if (h.mortgage.balanceInsurance) facts.push({ label: "Outstanding balance insurance", value: "In place", tone: "ok" });
    }
    if (h.insurance) facts.push({ label: "Home insurance", value: `${h.insurance.label}${h.insurance.monthly ? ` · ${euro(h.insurance.monthly)} a month` : ""}`, tone: "ok" });
    if (h.epc) facts.push({ label: "Energy label", value: `EPC ${h.epc}${h.boughtYear ? ` · bought in ${h.boughtYear}` : ""}` });
    const actions: PlaceAction[] = [];
    if (c) actions.push({ id: "cover", type: "cover", coverId: c.id, label: "Check what your home insurance covers", note: c.note });
    if (m) actions.push({ id: "loan", type: "pick", spec: bookSpec(advisor, "your home loan", "home loan", "KBC home loan") });
    out.push({
      id: "home",
      street: "home",
      kind: "house",
      kicker: `YOUR HOME · ${h.city.toUpperCase()}`,
      title: h.kind === "flat" ? "Your flat" : "Your house",
      line: m ? `Home loan ${euro(m.left)} left · ${pct(m.paidShare)} paid back` : "Paid off",
      facts,
      body: `The walls are built up to what you've paid back; the see-through part is the home loan that's left. The dome is your home insurance.${h.epc ? ` ${EPC_NOTE(h.epc, h.boughtYear)}` : ""}`,
      actions,
      fill: m ? m.paidShare : 1,
      accent: "#5ED4E8",
      width: 22,
      insured: !!h.insurance,
      epc: h.epc,
    });
  } else if (h?.tenure === "rent" && h.rent) {
    const lease = h.rent.leaseStart;
    const future = lease.year * 400 + lease.month * 32 + lease.day > today.year * 400 + today.month * 32 + today.day;
    // a rent can be indexed once a year, on the lease's anniversary
    let anniv: When = { year: today.year, month: lease.month, day: lease.day };
    while (anniv.year * 400 + anniv.month * 32 + anniv.day <= today.year * 400 + today.month * 32 + today.day || anniv.year <= lease.year)
      anniv = { ...anniv, year: anniv.year + 1 };
    const remindAt = addDays(anniv, -14);
    const c = cover(h.coverId);
    const actions: PlaceAction[] = [];
    if (c) actions.push({ id: "cover", type: "cover", coverId: c.id, label: c.state === "ok" ? "Check your home insurance covers this flat" : `Check your ${c.label.toLowerCase()} cover`, note: c.note });
    actions.push({
      id: "index",
      type: "pick",
      spec: {
        kind: "remind",
        title: `Remind me before the rent can be indexed (${whenLabel(remindAt)} ${remindAt.year})`,
        detail: `From ${whenLong(anniv)} your landlord may index the rent, once a year. A reminder two weeks before, so you can check the new amount.`,
        when: remindAt,
      },
    });
    out.push({
      id: "home",
      street: "home",
      kind: "flat",
      kicker: `YOUR HOME · ${h.city.toUpperCase()}${future ? ` · FROM ${lease.day} ${MONTH_SHORT[lease.month].toUpperCase()}` : ""}`,
      title: "Your rented flat",
      line: `Rent ${euro(h.rent.monthly)} on the ${lease.day === 1 ? "1st" : `${lease.day}th`} · deposit ${euro(h.rent.deposit)} kept safe`,
      facts: [
        { label: "Rent", value: `${euro(h.rent.monthly)} a month · standing order` },
        { label: "Rental deposit", value: `${euro(h.rent.deposit)} on a blocked account in your name`, tone: "ok" },
        { label: future ? "Lease starts" : "Lease since", value: whenLong(lease) },
        { label: "Rent indexation", value: `Possible once a year, next from ${whenLong(anniv)}` },
        ...(h.insurance ? [{ label: "Tenant insurance", value: `${h.insurance.label}${h.insurance.monthly ? ` · ${euro(h.insurance.monthly)} a month` : ""}`, tone: "ok" as const }] : []),
      ],
      body: "The deposit stays yours, blocked until you leave. The dome is your tenant insurance: fire and water damage to a rented home is the tenant's to insure in Flanders (since 2019).",
      actions,
      fill: 1,
      accent: "#5ED4E8",
      width: 18,
      insured: !!h.insurance,
    });
  }

  // ---- a home you're saving for ----
  const fh = world.futureHome;
  const fhGoal = fh ? life.goals.find((g) => g.id === fh.goalId) : undefined;
  if (fh && fhGoal) {
    const actions: PlaceAction[] = [];
    const facts: PlaceFact[] = [
      { label: "Own contribution saved", value: euro(fhGoal.saved) },
      { label: "Target", value: euro(fhGoal.target) },
      { label: "Each month", value: euro(fhGoal.monthly) },
      { label: "Complete", value: fhGoal.eta ? monthLabel(fhGoal.eta) : "—" },
    ];
    if (fh.appointment) {
      const day = nextDow(today, DOW.indexOf(fh.appointment.dow));
      const eve = addDays(day, -1);
      facts.push({ label: "Appointment", value: `${whenLabel({ ...day, time: fh.appointment.time })} · ${fh.appointment.with}, ${fh.appointment.role}`, tone: "ok" });
      actions.push({
        id: "docs",
        type: "pick",
        spec: {
          kind: "remind",
          title: `Remind me on ${whenLabel(eve)} what to bring to ${fh.appointment.with}`,
          detail: `The day before your appointment: your last two payslips each, your savings statements and your ID cards.`,
          when: { ...eve, time: "19:00" },
        },
      });
    }
    const goalAction = raiseGoal(fhGoal, now);
    if (goalAction) actions.push(goalAction);
    const c = cover(fh.coverId);
    if (c) {
      facts.push({ label: c.label, value: c.note, tone: c.state === "ok" ? "ok" : "check" });
      actions.push({ id: "cover", type: "cover", coverId: c.id, label: "Check: home insurance from the day of the deed", note: c.note });
    }
    out.push({
      id: "future-home",
      street: "home",
      kind: "plot",
      kicker: `YOUR FUTURE HOME · ${fh.city.toUpperCase()}`,
      title: fhGoal.label,
      line: `Own contribution ${euro(fhGoal.saved)} of ${euro(fhGoal.target)} · ${pct(fhGoal.saved / fhGoal.target)}`,
      facts,
      body: "The foundations grow with your house fund. When your own contribution is complete, the walls go up: that's the day you can sign.",
      actions,
      fill: Math.min(1, fhGoal.saved / fhGoal.target),
      accent: "#7FD6A8",
      width: 24,
    });
  }

  // ---- the car ----
  const car = world.car;
  if (car) {
    const ins = car.insurance;
    let at: When = { year: today.year, month: ins.renews.month, day: ins.renews.day };
    if (at.year * 400 + at.month * 32 + at.day < today.year * 400 + today.month * 32 + today.day) at = { ...at, year: at.year + 1 };
    const soon = (Date.UTC(at.year, at.month, at.day) - Date.UTC(today.year, today.month, today.day)) / 86400000 <= 31;
    const change = ins.before > 0 ? ins.yearly / ins.before - 1 : 0;
    const monthly = Math.ceil(ins.yearly / 12);
    const actions: PlaceAction[] = [
      {
        id: "pot",
        type: "pick",
        spec: {
          kind: "setup",
          title: `Set aside ${euro(monthly)} a month for next year's car insurance`,
          detail: `A standing order of ${euro(monthly)} on the 1st into a pot "Car insurance", so the ${euro(ins.yearly)} is there next ${MONTH_LONG[ins.renews.month]}. Stop it any time.`,
          product: "KBC savings pot",
          monthly,
        },
      },
    ];
    if (!ins.kbc)
      actions.push({
        id: "quote",
        type: "pick",
        spec: { ...bookSpec(advisor, `a car insurance quote before ${ins.renews.day} ${MONTH_SHORT[ins.renews.month]}`, "car insurance", "KBC Car Insurance"), detail: "You compare it with your renewal yourself. Nothing changes unless you decide to." },
      });
    out.push({
      id: "garage",
      street: "home",
      kind: "garage",
      kicker: "THE GARAGE · YOUR CAR",
      title: "Your car",
      line: `Insurance renews ${at.day} ${MONTH_SHORT[at.month]}: ${euro(ins.yearly)} a year${change > 0.005 ? ` (+${pct(change)})` : ""}`,
      facts: [
        { label: "Car", value: car.label },
        { label: "Insurance", value: `${ins.label} · ${ins.kbc ? "with KBC" : "another insurer"}` },
        { label: "Renews", value: `${whenLabel(at)} ${at.year} · ${euro(ins.yearly)} a year`, tone: soon ? "check" : undefined },
        ...(ins.before ? [{ label: "Change", value: `${signedEuro(ins.yearly - ins.before)} on last year (${change >= 0 ? "+" : "−"}${pct(Math.abs(change))})` }] : []),
      ],
      body: `It's taken from your account on ${at.day} ${MONTH_LONG[at.month]}. ${euro(monthly)} a month set aside covers next year's.`,
      actions,
      fill: 1,
      accent: soon ? "#F3A93C" : "#C9C2AE",
      width: 12,
      insured: true,
      alert: soon,
    });
  }

  // ---- the vault: savings and goals ----
  const savings = life.pots.find((p) => p.kind === "savings");
  if (savings && (savings.balance > 0 || savings.monthly > 0)) {
    const actions: PlaceAction[] = [];
    if (!savings.monthly && salary)
      actions.push({
        id: "salary-day",
        type: "pick",
        spec: {
          kind: "setup",
          title: `Move ${euro(100)} to savings on salary day`,
          detail: `A standing order of ${euro(100)} on the ${salary.day}th, the day your salary lands. Stop or change it any time.`,
          product: "Standing order",
          monthly: 100,
        },
      });
    out.push({
      id: "vault:savings",
      street: "home",
      kind: "silo",
      kicker: "THE VAULT · SAVINGS",
      title: savings.label,
      line: `${euro(savings.balance)} · ${months1(life.fuel)} months of fuel`,
      facts: [
        { label: "Balance", value: euro(savings.balance) },
        { label: "Each month", value: savings.monthly ? `${euro(savings.monthly)} on the 1st` : "No automatic transfer" },
        { label: "Fuel", value: `${months1(life.fuel)} months of your usual bills and spending` },
      ],
      body: "Your buffer. The silo shows months of fuel: it's full at six.",
      actions,
      fill: Math.min(1, life.fuel / 6),
      accent: "#D8C9A3",
      width: 9,
    });
  }
  for (const g of life.goals) {
    if (fh && g.id === fh.goalId) continue;
    const act = raiseGoal(g, now);
    out.push({
      id: `vault:${g.id}`,
      street: "home",
      kind: "silo",
      kicker: g.reached ? "THE VAULT · GOAL REACHED" : "THE VAULT · GOAL",
      title: g.label,
      line: `${euro(g.saved)} of ${euro(g.target)}${g.eta && !g.reached ? ` · arrives ${monthLabel(g.eta)}` : ""}`,
      facts: [
        { label: "Saved", value: euro(g.saved) },
        { label: "Target", value: euro(g.target) },
        { label: "Each month", value: g.monthly ? euro(g.monthly) : "Nothing yet" },
        { label: "Arrives", value: g.reached ? "Reached" : g.eta ? monthLabel(g.eta) : "—" },
      ],
      body: "A goal fills its own silo, so it never mixes with your buffer.",
      actions: act ? [act] : [],
      fill: Math.min(1, g.target ? g.saved / g.target : 0),
      accent: "#7FD6A8",
      width: 9,
    });
  }

  // ---- your child's account ----
  if (world.child) {
    const k = world.child;
    out.push({
      id: "child",
      street: "home",
      kind: "child",
      kicker: `${k.name.toUpperCase()}'S ACCOUNT`,
      title: `${k.name}'s pocket money`,
      line: `${euro(k.weekly)} every ${k.day}`,
      facts: [
        { label: "Balance", value: `€ ${k.balance.toFixed(2).replace(".", ",")}` },
        { label: "Pocket money", value: `${euro(k.weekly)} every ${k.day}, from your account` },
      ],
      body: `${k.name}'s own KBC account: ${k.name} sees what goes out, you see the transfers.`,
      actions: [],
      fill: 1,
      accent: "#E8B4A0",
      width: 10,
    });
  }

  // ---- the pension tree ----
  const pen = world.pension;
  if (pen) {
    const actions: PlaceAction[] = [];
    const year = today.year;
    if (pen.paid > 0 && pen.paid < pen.limit)
      actions.push({
        id: "top-up",
        type: "pick",
        spec: {
          kind: "setup",
          title: `Top up your pension saving by ${euro(pen.limit - pen.paid)} before 31 December`,
          detail: `One transfer into your pension saving fund, so this year's full ${euro(pen.limit)} counts for the tax reduction. You choose the day.`,
          product: "KBC pension saving fund",
          when: { year, month: 11, day: 15 },
        },
      });
    else if (pen.paid === 0 && pen.usual)
      actions.push({
        id: "monthly",
        type: "pick",
        spec: {
          kind: "setup",
          title: `Spread your pension saving: ${euro(Math.round(pen.usual / 12))} a month`,
          detail: `A monthly standing order into your pension saving fund instead of ${euro(pen.usual)} in December. The same tax reduction.`,
          product: "KBC pension saving fund",
          monthly: Math.round(pen.usual / 12),
        },
      });
    out.push({
      id: "pension",
      street: "home",
      kind: "tree",
      kicker: "PENSION SAVING",
      title: "Your pension tree",
      line: `Fund ${euro(pen.fund)} · ${euro(pen.paid)} of ${euro(pen.limit)} paid this year`,
      facts: [
        { label: "Fund value", value: euro(pen.fund) },
        { label: "Paid this year", value: `${euro(pen.paid)} of ${euro(pen.limit)}${pen.paid === 0 && pen.usual ? ` · usually ${euro(pen.usual)} in December` : ""}` },
        { label: "Counts for this year", value: "Payments until 31 December" },
      ],
      body: "The tree grows with your pension saving fund; the fruit is this year's payments.",
      actions,
      fill: Math.min(1, pen.paid / pen.limit),
      accent: "#7FD6A8",
      width: 14,
      scale: 0.8 + Math.min(1.4, pen.fund / 12000),
    });
  }

  // ---- Market Mile ----
  const close = addMonths(now, -1);
  const list = world.holdings.map((hd) => ({ h: hd, s: holdingSeries(hd, close) }));
  const first = list.length ? list.map((x) => x.h.since).sort((a, b) => monthIndex(a) - monthIndex(b))[0] : close;
  const span = Math.max(1, monthsBetween(first, close));
  const weather = list.length ? marketWeather(list) : null;
  const lastDay = `${daysIn(close)} ${MONTH_SHORT[close.month]}`;
  for (const { h: hd, s } of list) {
    const n = s.value.length - 1;
    const tower = towerState(s.invested[n], s.value[n]);
    const lastMonth = n > 0 ? s.index[n] / s.index[n - 1] - 1 : 0;
    const actions: PlaceAction[] = [
      {
        id: "kid",
        type: "pick",
        spec: {
          kind: "check",
          title: `Read the key information document of ${hd.name}`,
          detail: `Risk ${hd.sri} of 7, costs ${String(hd.costs).replace(".", ",")}% a year, and what you could get back in good and bad years.`,
          product: hd.via,
        },
      },
    ];
    if (hd.monthly)
      actions.push({
        id: "plan",
        type: "pick",
        spec: {
          kind: "check",
          title: `Keep or pause your ${euro(hd.monthly)} monthly plan`,
          detail: "Opens your plan in the app. Nothing changes unless you change it there.",
          product: hd.via,
        },
      });
    actions.push({ id: "talk", type: "pick", spec: bookSpec(advisor, "your investments", "investing") });
    out.push({
      id: `tower:${hd.id}`,
      street: "market",
      kind: "tower",
      kicker: `${hd.kind.toUpperCase()} · RISK ${hd.sri}/7`,
      title: hd.name,
      line: `Put in ${euro(s.invested[n])} · worth ${euro(s.value[n])} on ${lastDay}`,
      facts: [
        { label: "Put in", value: `${euro(s.invested[n])} since ${monthLabel(hd.since)}` },
        { label: `Worth on ${lastDay}`, value: euro(s.value[n]) },
        { label: "Since you started", value: `${signedEuro(tower.gain)} (${signedPct1(tower.gainPct)})`, tone: tower.under ? "check" : "ok" },
        { label: MONTH_LONG[close.month], value: signedPct1(lastMonth) },
        { label: "Risk", value: `${hd.sri} of 7` },
        { label: "Costs", value: `${String(hd.costs).replace(".", ",")}% a year` },
        ...(hd.monthly ? [{ label: "Monthly plan", value: `${euro(hd.monthly)} a month` }] : []),
        { label: "Held via", value: hd.via },
      ],
      body: tower.under
        ? `Under repair: worth ${euro(-tower.gain)} less than you put in. Prices go up and down; the scaffolding comes down when it's back above. The tower changes once a month, never live.`
        : "Stone floors are what you put in, lit floors are what it grew. The tower changes once a month, at the month's close, never live.",
      actions,
      news: holdingNews(hd, s),
      fill: 1,
      accent: tower.under ? "#F3A93C" : "#D8C27A",
      width: 12,
      tower,
      t: monthsBetween(first, hd.since),
    });
  }
  out.push(
    list.length
      ? {
          id: "market:today",
          street: "market",
          kind: "kiosk",
          kicker: `TODAY · ${lastDay.toUpperCase()} CLOSE`,
          title: "Beyond today",
          line: "Nobody knows what comes next",
          facts: weather ? [{ label: "Market weather", value: weather.line }] : [],
          body: "Past returns are no guide to the future. Hindsight shows what happened to people like you, never a forecast. There's no buy or sell button here, on purpose: decide in the app, in your own time.",
          actions: [],
          fill: 1,
          accent: "#9FB0C6",
          width: 10,
          t: span,
        }
      : {
          id: "market:empty",
          street: "market",
          kind: "kiosk",
          kicker: "MARKET MILE",
          title: "Nothing invested here",
          line: "Nobody here will push you to start",
          facts: [{ label: "Fuel", value: `${months1(life.fuel)} months` }],
          body: `You don't invest with KBC. That's fine: your buffer comes first, and you have ${months1(life.fuel)} months of fuel. If you ever want to talk about it, your advisor is one tap away in the app.`,
          actions: [],
          fill: 1,
          accent: "#9FB0C6",
          width: 10,
          t: span / 2,
        },
  );
  const years: { label: string; t: number }[] = [];
  for (let y = first.year + 1; y <= close.year; y++) years.push({ label: String(y), t: monthsBetween(first, { year: y, month: 0 }) });
  return { places: out, market: { first, close, span, weather, years: list.length ? years : [] } };
}

/** "+€100 a month: arrives 2 months sooner", only when it changes the arrival. */
function raiseGoal(g: LifeState["goals"][number], now: MonthPoint): PlaceAction | null {
  // from the household's own pace, so the offer stays the same once you've taken it
  const base = g.defaultMonthly;
  if (g.reached || g.remaining <= 0 || !base) return null;
  const step = Math.max(25, Math.round((base * 0.1) / 25) * 25);
  const before = Math.ceil(g.remaining / base);
  const after = Math.ceil(g.remaining / (base + step));
  if (after >= before) return null;
  const at = addMonths(now, after);
  return {
    id: "pace",
    type: "goal",
    goalId: g.id,
    monthly: base + step,
    label: `Add ${euro(step)} a month: there by ${monthLabel(at)}`,
    note: `${before - after} month${before - after === 1 ? "" : "s"} sooner.`,
  };
}

/** The pick a place offers in the debrief when you looked but didn't take anything. */
export function placeSuggestion(p: Place): ActionSpec | null {
  const a = p.actions.find((x) => x.type === "pick");
  return a && a.type === "pick" ? a.spec : null;
}
