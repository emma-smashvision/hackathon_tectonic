import { type Cal, daysIn, EVERYDAY, MONTH_LONG, MONTH_SHORT, parseEvKey } from "./everyday";
import { euro } from "./format";
import { type LifeState, potSpec, refFromKey, stopOf } from "./life";
import type { RoadDef, StopDef } from "./types";

// From information to action. Every tip on the road is a real action of one of five kinds:
//   setup  — money moves or a rule is set (a pot, a standing order, a budget, a goal pace)
//   check  — opens your own product or contract (cover, advance, payslip)
//   remind — a dated reminder
//   book   — an appointment with your advisor or KBC Live (video or phone)
//   talk   — on care roads: a person first, no plan pressure
// In the driving world, picks go into the glovebox; nothing happens until the customer confirms
// them in the debrief on the way out. In the app, a tip becomes a plan item straight away.
// Every plan item stays visible ("My plan") with its status, next date and what it did.
// Pure TypeScript, unit-tested.

export type ActionKind = "setup" | "check" | "remind" | "book" | "talk";

export interface When {
  year: number;
  /** 0 = January */
  month: number;
  day: number;
  time?: string;
}

export interface ActionSpec {
  kind: ActionKind;
  /** the follow-up as the customer reads it in the debrief and in My plan */
  title: string;
  /** what exactly happens when it's confirmed */
  detail: string;
  /** honest label when the follow-up is something KBC sells or runs */
  product?: string;
  monthly?: number;
  when?: When;
  /** appointment topic, as on KBC's booking page */
  topic?: string;
}

export interface PlanSource {
  scope: "road" | "everyday" | "fork" | "goal" | "cover" | "place";
  roadId: string;
  /** journey done-key (stop id or ev:<id>:<year>), goal id, cover id or place id */
  key: string;
  actionId?: string;
}

export interface TripPick {
  id: string;
  source: PlanSource;
  spec: ActionSpec;
  /** the road the pick was made on was a test drive (not your own road) */
  testDrive?: boolean;
}

export interface Slot {
  id: string;
  when: When;
  with: string;
  channel: "branch" | "video" | "phone";
}

export interface PlanItem {
  id: string;
  kind: ActionKind;
  title: string;
  detail: string;
  product?: string;
  status: "active" | "booked" | "set" | "done";
  when?: When;
  with?: string;
  source: PlanSource;
  /** "17 Oct 2026": when the customer confirmed it */
  since: string;
  /** made from the driving world's debrief, or straight in the app */
  from: "drive" | "app";
}

export interface Advisor {
  name: string;
  office: string;
  /** "Tue 14:00" */
  nextSlot: string;
}

// ---------- dates ----------

export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dateOf = (w: Pick<When, "year" | "month" | "day">) => new Date(Date.UTC(w.year, w.month, w.day));
const whenOf = (d: Date, time?: string): When => ({ year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate(), time });
export const whenLabel = (w: When) =>
  `${DOW[dateOf(w).getUTCDay()]} ${w.day} ${MONTH_SHORT[w.month]}${w.time ? ` · ${w.time}` : ""}`;
export const whenLong = (w: When) => `${w.day} ${MONTH_LONG[w.month]} ${w.year}`;
export const whenIndex = (w: When) => dateOf(w).getTime() / 86400000;
export const todayWhen = (life: Pick<LifeState, "today">): When => ({ year: life.today.cal.year, month: life.today.cal.month, day: life.today.day });

export function addDays(w: When, n: number): When {
  const d = dateOf(w);
  d.setUTCDate(d.getUTCDate() + n);
  return whenOf(d, w.time);
}

/** The next given weekday (0 = Sunday) strictly after a date. */
export function nextDow(from: When, dow: number): When {
  const d = dateOf(from);
  do d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() !== dow);
  return whenOf(d);
}

/**
 * Three ways to talk: your own advisor's next free slot in the branch, and KBC Live by video or
 * phone (KBC Live: weekdays 8–22, Saturday 9–17).
 */
export function slotsFor(advisor: Advisor | undefined, today: When): Slot[] {
  const out: Slot[] = [];
  if (advisor) {
    const m = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(\d{1,2}:\d{2})$/.exec(advisor.nextSlot.trim());
    const day = m ? nextDow(today, DOW.indexOf(m[1])) : addDays(today, 3);
    out.push({ id: "advisor", when: { ...day, time: m ? m[2] : "10:00" }, with: `${advisor.name} · ${advisor.office}`, channel: "branch" });
  }
  const weekday = (() => {
    let d = addDays(today, 1);
    while (dateOf(d).getUTCDay() === 0 || dateOf(d).getUTCDay() === 6) d = addDays(d, 1);
    return d;
  })();
  out.push({ id: "video", when: { ...weekday, time: "18:30" }, with: "KBC Live · video call", channel: "video" });
  out.push({ id: "phone", when: { ...nextDow(today, 6), time: "10:00" }, with: "KBC Live · phone call", channel: "phone" });
  return out;
}

// ---------- tips → actions ----------

export function classifyTip(label: string, care = false): ActionKind {
  const l = label.toLowerCase();
  if (/\b(book|talk to someone|talk it through|find out about mediation|ask kate)\b/.test(l)) return care ? "talk" : "book";
  if (/^remind me|add it to my calendar|plan a boiler service|^remind/.test(l)) return "remind";
  if (/^(check|compare|explain|read|open|calculate|show me|explore|review)\b/.test(l)) return "check";
  return "setup";
}

const TOPIC: Record<string, string> = {
  "first-home": "Borrowing",
  "moving-house": "Life events",
  freelance: "Business",
  "first-job": "Savings & investing",
  "first-child": "Life events",
  "caring-parent": "Life events",
  retirement: "Savings & investing",
  "moving-abroad": "Payments",
  "heat-pump": "Borrowing",
};

interface TipContext {
  road: RoadDef;
  life: LifeState;
  advisor?: Advisor;
}

/** Find the stop behind a done-key, on the road or on the Everyday Road. */
export function stopForKey(road: RoadDef, key: string): StopDef | undefined {
  const ref = refFromKey(key);
  const s = ref.scope === "everyday" ? EVERYDAY.stops.find((x) => x.id === ref.id) : stopOf(road, ref);
  return s && s.kind !== "fork" ? (s as StopDef) : undefined;
}

export function tipLabel(stop: StopDef, actionId: string): string {
  return actionId === "main" ? (stop.action?.label ?? "") : (stop.behaviours?.find((b) => b.id === actionId)?.action.label ?? "");
}

/** The date a stop lands on (from the life replay), or a fortnight from today when it's not ahead. */
function stopDate(life: LifeState, key: string): When {
  const u = life.upcoming.find((x) => x.ref.key === key);
  if (u) return { year: u.cal.year, month: u.cal.month, day: Math.min(u.day, daysIn(u.cal)) };
  return addDays(todayWhen(life), 14);
}

function remindDate(label: string, life: LifeState, key: string): When {
  const today = todayWhen(life);
  const m = /\bin (january|february|march|april|may|june|july|august|september|october|november|december)\b/i.exec(label);
  if (m) {
    const month = MONTH_LONG.findIndex((x) => x.toLowerCase() === m[1].toLowerCase());
    const year = month > today.month || (month === today.month && today.day === 1) ? today.year : today.year + 1;
    return { year, month, day: 1 };
  }
  const at = stopDate(life, key);
  const before = addDays(at, -14);
  return whenIndex(before) > whenIndex(today) ? before : addDays(today, 1);
}

/** What a tip will do, as a concrete follow-up the customer can confirm. */
export function specForTip(ctx: TipContext, key: string, actionId: string): ActionSpec | null {
  const { road, life } = ctx;
  const stop = stopForKey(road, key);
  if (!stop) return null;
  const label = tipLabel(stop, actionId);
  const everyday = !!parseEvKey(key);
  const scope = everyday ? "everyday" : road.id;
  const kind = classifyTip(label, road.care);
  const subject = stop.short.toLowerCase();
  const due = stopDate(life, key);

  if (kind === "setup") {
    if (stop.kind === "boost" && actionId === "main") {
      return {
        kind,
        title: `Move ${stop.short.toLowerCase()} to savings the day it lands`,
        detail: `A rule on your current account: when it arrives (around ${whenLong(due)}), it moves to your savings.`,
        product: "KBC savings account",
      };
    }
    const spec = potSpec(scope, stop.id, actionId, label);
    if (spec) {
      const pot = life.pots.find((p) => p.forKey === key);
      const monthly = spec.kind === "monthly" ? spec.amount : pot?.monthly;
      const what =
        spec.kind === "pensionSpread"
          ? "Spread your pension saving over twelve monthly transfers"
          : spec.kind === "fromBoost"
            ? `Park ${Math.round(spec.pct * 100)}% of your holiday pay for ${subject}`
            : monthly
              ? `Start a pot of ${euro(monthly)} a month for "${stop.short}"`
              : `Start a pot for "${stop.short}"`;
      return {
        kind,
        title: what,
        detail:
          spec.kind === "fromBoost"
            ? "When your holiday pay lands, that share moves to a pot. It pays the bill when it comes."
            : `A standing order on the 1st, from your current account into a savings pot, until ${whenLong(due)}. The pot pays it when it lands.`,
        product: spec.kind === "pensionSpread" ? "KBC pension saving" : "KBC savings pot",
        monthly,
      };
    }
    return {
      kind,
      title: label,
      detail: `Set up in KBC Mobile: ${label.toLowerCase()}. Nothing is paid or moved.`,
    };
  }
  if (kind === "remind") {
    const when = remindDate(label, life, key);
    return {
      kind,
      title: `Reminder on ${whenLong(when)}: ${label.replace(/^remind me (to |in \w+)?/i, "").replace(/^add it to my calendar$/i, subject) || subject}`,
      detail: "A reminder in KBC Mobile, on your phone only. Nothing else happens.",
      when,
    };
  }
  if (kind === "check") {
    return {
      kind,
      title: label,
      detail: `Opens your own ${subject} details in KBC Mobile. Information only: nothing changes.`,
    };
  }
  if (kind === "talk") {
    return {
      kind,
      title: ctx.advisor ? `Talk it through with ${ctx.advisor.name}` : "Talk it through with a person",
      detail: "A quiet call or visit, when you want it. No products, no pressure.",
      topic: "Life events",
    };
  }
  return {
    kind,
    title: ctx.advisor ? `Book a talk with ${ctx.advisor.name} about ${subject}` : `Book a talk about ${subject}`,
    detail: "Pick a moment: in the branch, by video or by phone. You can cancel any time.",
    topic: TOPIC[road.id] ?? "Life events",
  };
}

/** A crossroads you looked at: talk it through before you choose. */
export function specForFork(road: RoadDef, advisor?: Advisor): ActionSpec | null {
  if (!road.fork) return null;
  return {
    kind: road.care ? "talk" : "book",
    title: advisor ? `Talk "${road.fork.title.replace(/\?$/, "")}" through with ${advisor.name}` : `Talk "${road.fork.title.replace(/\?$/, "")}" through`,
    detail: "Bring what you saw on the drive. Your advisor sees only what you share.",
    topic: TOPIC[road.id] ?? "Life events",
  };
}

/** A new monthly pace for a goal. */
export function specForGoal(label: string, monthly: number, before: number): ActionSpec {
  return {
    kind: "setup",
    title: `Change the monthly transfer to "${label}" to ${euro(monthly)}`,
    detail: `Your standing order on the 1st goes from ${euro(before)} to ${euro(monthly)}. You can change it back any time.`,
    product: "Standing order",
    monthly,
  };
}

// ---------- plan items ----------

export function planItemFrom(pick: TripPick, today: When, from: PlanItem["from"], slot?: Slot): PlanItem {
  const s = pick.spec;
  const booked = s.kind === "book" || s.kind === "talk";
  return {
    id: pick.id,
    kind: s.kind,
    title: s.title,
    detail: s.detail,
    product: s.product,
    status: booked ? (slot ? "booked" : "active") : s.kind === "remind" ? "set" : s.kind === "check" ? "done" : "active",
    when: slot?.when ?? s.when,
    with: slot?.with,
    source: pick.source,
    since: whenLong(today),
    from,
  };
}

/** What a plan item has done so far, from the life replay. */
export function planProgress(item: PlanItem, life: LifeState): { line: string; done: boolean } {
  const today = whenIndex(todayWhen(life));
  if (item.when && (item.kind === "book" || item.kind === "talk" || item.kind === "remind")) {
    const past = whenIndex(item.when) < today;
    const at = whenLabel(item.when);
    if (item.kind === "remind") return { line: past ? `Reminded you on ${at}` : `Reminder ${at}`, done: past };
    return { line: past ? `You talked on ${at}${item.with ? ` · ${item.with}` : ""}` : `${at}${item.with ? ` · ${item.with}` : ""}`, done: past };
  }
  if (item.kind === "book" || item.kind === "talk") return { line: "Pick a moment that suits you", done: false };
  if (item.kind === "check") return { line: "Opened · information only", done: true };
  // setup: follow the pot, or the stop it's for
  const key = item.source.key;
  const pot = life.pots.find((p) => p.forKey === key && (!item.source.actionId || p.id.endsWith(`:${item.source.actionId}`)));
  const ahead = life.upcoming.find((u) => u.ref.key === key);
  const passed = life.history.flatMap((m) => m.stops).find((s) => s.ref.key === key);
  if (passed) {
    const how = passed.outcome === "paved" ? "paved" : passed.outcome === "parked" ? "parked" : passed.outcome;
    return { line: `${passed.short}: ${how}${passed.fromPot ? ` · ${euro(passed.fromPot)} came from the pot` : ""}`, done: true };
  }
  if (pot) return { line: `${euro(pot.balance)} in the pot${pot.monthly ? ` · +${euro(pot.monthly)} on the 1st` : ""}${ahead ? ` · for ${ahead.short.toLowerCase()} on ${ahead.day} ${MONTH_SHORT[ahead.cal.month]}` : ""}`, done: false };
  if (item.source.scope === "goal") {
    const g = life.goals.find((x) => x.id === key);
    if (g) return { line: `${euro(g.saved)} of ${euro(g.target)}${g.eta ? ` · arrives ${MONTH_SHORT[g.eta.month]} ${g.eta.year}` : ""}`, done: g.reached };
  }
  if (ahead) return { line: `Ready for ${ahead.short.toLowerCase()} on ${ahead.day} ${MONTH_SHORT[ahead.cal.month]}`, done: false };
  if (item.source.scope === "place") {
    if (item.when) return { line: whenIndex(item.when) < today ? `Done on ${whenLabel(item.when)}` : `On ${whenLabel(item.when)} ${item.when.year}`, done: whenIndex(item.when) < today };
    return { line: "Standing order set · stop it any time", done: false };
  }
  return { line: "Set up", done: false };
}

// ---------- the debrief on the way out of the driving world ----------

export interface TripEntry {
  key: string;
  roadId: string;
  title: string;
  kind: "bump" | "boost" | "milestone" | "fork" | "everyday" | "place";
  /** a place in your world offers its first follow-up in the debrief, if you didn't take one */
  suggest?: TripPick;
}

export interface Debrief {
  /** what you looked at */
  seen: TripEntry[];
  /** what you picked up (pre-selected) */
  picked: TripPick[];
  /** worth considering, from what you looked at (not selected) */
  suggested: TripPick[];
}

/** Picks from the glovebox, plus up to two suggestions from the stops you looked at but didn't act on. */
export function buildDebrief(opts: {
  glovebox: TripPick[];
  trip: TripEntry[];
  roads: RoadDef[];
  ownRoadId: string;
  lifeFor: (roadId: string) => LifeState;
  journeyDone: (roadId: string) => Record<string, string[]>;
  advisor?: Advisor;
}): Debrief {
  const seen = opts.trip.filter((t, i, all) => all.findIndex((x) => x.key === t.key && x.roadId === t.roadId) === i);
  const pickedKeys = new Set(opts.glovebox.map((p) => `${p.source.roadId}|${p.source.key}`));
  const suggested: TripPick[] = [];
  for (const t of seen) {
    if (suggested.length >= 2) break;
    if (pickedKeys.has(`${t.roadId}|${t.key}`)) continue;
    if (t.kind === "place") {
      if (t.suggest) suggested.push({ ...t.suggest, id: `sug:${t.suggest.id}` });
      continue;
    }
    const road = opts.roads.find((r) => r.id === t.roadId);
    if (!road || road.care) continue;
    if (t.kind === "fork") {
      const spec = specForFork(road, opts.advisor);
      if (spec) suggested.push({ id: `sug:${t.roadId}:${t.key}`, source: { scope: "fork", roadId: t.roadId, key: t.key }, spec, testDrive: t.roadId !== opts.ownRoadId });
      continue;
    }
    if (t.kind !== "bump" && t.kind !== "everyday") continue;
    const stop = stopForKey(road, t.key);
    if (!stop?.behaviours?.length) continue;
    const done = opts.journeyDone(t.roadId)[t.key] ?? [];
    const best = stop.behaviours.filter((b) => !done.includes(b.id)).sort((a, b) => b.action.readiness - a.action.readiness)[0];
    if (!best) continue;
    const spec = specForTip({ road, life: opts.lifeFor(t.roadId), advisor: opts.advisor }, t.key, best.id);
    if (spec) suggested.push({ id: `sug:${t.roadId}:${t.key}:${best.id}`, source: { scope: parseEvKey(t.key) ? "everyday" : "road", roadId: t.roadId, key: t.key, actionId: best.id }, spec, testDrive: t.roadId !== opts.ownRoadId });
  }
  return { seen, picked: opts.glovebox, suggested };
}

export const KIND_LABEL: Record<ActionKind, string> = {
  setup: "Set up",
  check: "Check",
  remind: "Reminder",
  book: "Appointment",
  talk: "A person",
};

export type { Cal };
