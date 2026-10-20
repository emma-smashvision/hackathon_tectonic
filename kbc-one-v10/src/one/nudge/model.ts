import { MONTH_LONG } from "../../hindsight/engine/everyday";
import { euro } from "../../hindsight/engine/format";
import type { Journey } from "../../hindsight/engine/game";
import type { LifeState } from "../../hindsight/engine/life";
import { addDays, DOW, nextDow, slotsFor, todayWhen, whenIndex, type ActionSpec, type PlanItem, type TripPick, type When } from "../../hindsight/engine/plan";
import type { RoadDef } from "../../hindsight/engine/types";
import { buildPlaces } from "../../hindsight/engine/world";
import { eur } from "../../kbc/format";
import { PERSONAS } from "../../kbc/personas";
import type { PersonRoad } from "../people";
import { journeyCrowd } from "../road";

export const PRIVATE_NUDGE = {
  title: "Something coming up could use a little preparation",
  body: "Open KBC to see your next step.",
} as const;

export interface JourneyAction { label: string; pick: TripPick }
export interface UpcomingJourney {
  id: string;
  title: string;
  summary: string;
  product: string;
  when: When;
  inDays: number;
  decision?: boolean;
  reason: string;
  crowd: ReturnType<typeof journeyCrowd>;
  actions: JourneyAction[];
  prepared: number;
  total: number;
  ready: number;
  cityFocus?: string;
}

const dateLabel = (w: When) => `${w.day} ${MONTH_LONG[w.month]}`;
const pick = (roadId: string, key: string, actionId: string, spec: ActionSpec): TripPick => ({
  id: `journey:${key}:${actionId}`, source: { scope: "place", roadId, key, actionId }, spec,
});

/** The six-week rule uses the demo's own clock, never the computer's wall clock. */
export function isAboutToStart(j: Pick<UpcomingJourney, "inDays" | "ready" | "decision">): boolean {
  return j.inDays >= 0 && j.inDays <= (j.decision ? 183 : 42) && j.ready < 50;
}

/** Read-only adapter over the existing household, world, crowd gate and plan. */
export function journeysFor(p: PersonRoad, road: RoadDef, journey: Journey, life: LifeState, plan: PlanItem[] = []): UpcomingJourney[] {
  if (road.care) return [];
  const today = todayWhen(life);
  const out: UpcomingJourney[] = [];
  const add = (j: Omit<UpcomingJourney, "inDays" | "prepared" | "total" | "ready">) => {
    const prepared = j.actions.filter((a) => plan.some((item) => item.id === a.pick.id)).length;
    out.push({ ...j, inDays: whenIndex(j.when) - whenIndex(today), prepared, total: j.actions.length, ready: Math.round(prepared / j.actions.length * 100) });
  };
  const world = p.world;
  if (world?.car) {
    const ins = world.car.insurance;
    let when: When = { year: today.year, ...ins.renews };
    if (whenIndex(when) < whenIndex(today)) when = { ...when, year: when.year + 1 };
    const pot = buildPlaces(world, life, p.advisor).places.find((place) => place.id === "garage")?.actions.find((a) => a.id === "pot");
    if (pot?.type === "pick") {
      const reminder = addDays(when, -8);
      add({
        id: "car-renewal", title: `Your car insurance renews on ${dateLabel(when)}`,
        summary: `Last year ${euro(ins.before)}. This year ${euro(ins.yearly)}. A monthly pot helps with next year's renewal; this year's payment is still due.`,
        product: `${ins.label} · ${ins.kbc ? "KBC" : "another insurer"}`,
        when, reason: "Your insurance renewal is in your calendar. You have not prepared all the next steps.",
        crowd: journeyCrowd("renewals", road), cityFocus: "car-insurance",
        actions: [
          { label: `Set aside ${euro(pot.spec.monthly ?? 0)} a month`, pick: { id: "place:garage:pot", source: { scope: "place", roadId: road.id, key: "garage", actionId: "pot" }, spec: pot.spec } },
          { label: "Plan a cover review", pick: pick(road.id, "car-renewal", "review", { kind: "remind", title: "Review my car insurance cover", detail: `Compare your current ${ins.label.toLowerCase()} with what you need. Nothing changes unless you decide.`, when: today }) },
          { label: `Remind me on ${dateLabel(reminder)}`, pick: pick(road.id, "car-renewal", "reminder", { kind: "remind", title: "Review my insurance renewal", detail: "Check the renewal before it is due.", when: reminder }) },
        ],
      });
    }
  }
  if (road.fork && p.key === "karim" && !journey.forkChoice[road.fork.id]) {
    const slot = slotsFor(p.advisor, today)[0];
    const forkItem = life.upcoming.find((u) => u.ref.id === road.fork?.id);
    const when = forkItem ? { year: forkItem.cal.year, month: forkItem.cal.month, day: forkItem.day } : { year: today.year + Math.floor((today.month + road.fork.month - journey.month) / 12), month: (today.month + road.fork.month - journey.month) % 12, day: today.day };
    add({
      id: road.fork.id, title: "Sole trader or company? Prepare the choice",
      summary: `This choice is coming up in about ${road.fork.month - journey.month} months. Compare the costs and administration before you decide.`,
      product: "Your tax reserve · business advice from KBC", when, decision: true,
      reason: "You are approaching a business choice. An advisor slot is available soon; this is not a deadline to change your business.",
      crowd: journeyCrowd("company", road), cityFocus: road.fork.id,
      actions: [
        { label: "Talk to your advisor", pick: pick(road.id, "company", "advisor", { kind: "book", title: "Discuss sole trader or company", detail: `Next slot: ${dateLabel(slot.when)} at ${slot.when.time}. Choose a time from your plan. No company is created.`, topic: "Business structure", product: "KBC business advice" }) },
        { label: "Remind me to gather my figures", pick: pick(road.id, "company", "figures", { kind: "remind", title: "Gather income and business costs", detail: "Bring recent invoices, costs and your tax reserve to the conversation.", when: addDays(slot.when, -1) }) },
      ],
    });
  }
  if (world?.futureHome?.appointment) {
    const appointment = world.futureHome.appointment;
    const when = { ...nextDow(today, DOW.indexOf(appointment.dow)), time: appointment.time };
    const goal = life.goals.find((g) => g.id === world.futureHome?.goalId);
    const docs = buildPlaces(world, life, p.advisor).places.find((place) => place.id === "future-home")?.actions.find((a) => a.id === "docs");
    add({
      id: "first-home", title: "Your first home starts with a conversation",
      summary: `You and Pieter meet ${appointment.with} on ${dateLabel(when)} at ${appointment.time}. Bring your figures and questions.`,
      product: goal ? `${goal.label} · ${euro(goal.saved)} of ${euro(goal.target)} saved` : "Your first home savings",
      when, reason: "Your mortgage appointment is coming up. Preparing the documents is separate from how much you have saved.",
      crowd: journeyCrowd("first-home", road), cityFocus: "first-home",
      actions: [
        { label: "Remind me what to bring", pick: docs?.type === "pick" ? { id: "place:future-home:docs", source: { scope: "place", roadId: road.id, key: "future-home", actionId: "docs" }, spec: docs.spec } : pick(road.id, "first-home", "docs", { kind: "remind", title: "Gather documents for the mortgage appointment", detail: "Bring payslips, savings statements and your IDs.", when: addDays(when, -1) }) },
        { label: "Add home cover to my plan", pick: pick(road.id, "first-home", "cover", { kind: "remind", title: "Ask about home cover from the deed date", detail: "Discuss cover at your mortgage appointment. No insurance is bought.", when }) },
      ],
    });
  }
  // The duplicate is observed in the synthetic transactions, not inferred from age.
  if (p.noGame) {
    const persona = PERSONAS.find((x) => x.id === p.key);
    const txs = persona?.transactions ?? [];
    const duplicate = txs.find((t, i) => t.amount < 0 && txs.some((other, n) => n !== i && other.merchant === t.merchant && other.amount === t.amount && Math.abs(Date.parse(other.date) - Date.parse(t.date)) <= 2 * 86400000));
    if (duplicate) add({
      id: "duplicate-payment", title: "Let's check a payment made twice",
      summary: `Two payments of ${eur(Math.abs(duplicate.amount))} to ${duplicate.merchant} appear close together. Your advisor can help check them.`,
      product: "Your current account", when: today,
      reason: "Two matching payments appear in your recent transactions. This may be correct, so we ask you to check.",
      crowd: { text: "This suggestion comes from your own payments. We do not use a crowd comparison here.", decisions: [] },
      actions: [
        { label: "Add a call with my advisor", pick: pick(road.id, "duplicate-payment", "advisor", { kind: "book", title: "Ask my advisor about a payment made twice", detail: `Ask about the two payments to ${duplicate.merchant}. Choose a time from your plan; no payment is reversed.`, topic: "Check a payment" }) },
        { label: "Remind me tomorrow", pick: pick(road.id, "duplicate-payment", "reminder", { kind: "remind", title: "Check the payment made twice", detail: `Check the two payments to ${duplicate.merchant}.`, when: addDays(today, 1) }) },
      ],
    });
  }
  return out;
}

export function selectJourney(p: PersonRoad, road: RoadDef, journey: Journey, life: LifeState, plan: PlanItem[] = []): UpcomingJourney | null {
  return journeysFor(p, road, journey, life, plan).filter(isAboutToStart).sort((a, b) => a.inDays - b.inDays)[0] ?? null;
}

export const journeyTiming = (j: Pick<UpcomingJourney, "inDays">) => j.inDays === 0 ? "Today" : j.inDays > 42 ? `In about ${Math.ceil(j.inDays / 30)} months` : `In ${j.inDays} days`;
