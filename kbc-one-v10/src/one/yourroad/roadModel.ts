import { EVERYDAY_STOPS } from "../../hindsight/engine/everyday";
import { everydayApplies, type LifeState } from "../../hindsight/engine/life";
import { addDays, type PlanItem, type TripPick, type When, whenIndex } from "../../hindsight/engine/plan";
import { mortgageAt } from "../../hindsight/engine/world";
import { EVERYDAY_ONLY_ID, catalogueRoad, roadViewFor, stopEvidenceFor, type PersonPointers, type StopEvidence } from "../crowd";
import { lessonsFor } from "../learning/lessons";
import type { Lesson } from "../learning/types";
import type { PersonRoad } from "../people";
import { progress } from "./model";

export const AREA = {
  home: { title: "Home", color: "#59dcff", icon: "⌂", hint: "Tell us about your home or a move." },
  car: { title: "Car", color: "#ffc478", icon: "◇", hint: "Add your car or tell us you’re getting one." },
  savings: { title: "Savings", color: "#68e4bb", icon: "◉", hint: "Set a savings goal, with any amount." },
  pension: { title: "Pension", color: "#c2a3ff", icon: "♧", hint: "Add your pension saving or pension income." },
  business: { title: "Business", color: "#ff9fb8", icon: "▥", hint: "Tell us you’re starting work for yourself." },
  kids: { title: "Kids", color: "#ffe193", icon: "✧", hint: "Set a child’s goal or add their account." },
  everyday: { title: "Everyday", color: "#afc8e1", icon: "↻", hint: "" },
  care: { title: "Care", color: "#d2c0dc", icon: "♡", hint: "At your own pace." },
} as const;
export type AreaId = keyof typeof AREA;
export function areaFor(roadId: string, stopId = ""): AreaId {
  if (catalogueRoad(roadId)?.care) return "care";
  if (/home|moving/.test(roadId) || /energy/.test(stopId)) return "home";
  if (/freelance/.test(roadId)) return "business";
  if (/pension/.test(stopId)) return "pension";
  if (/school|child/.test(stopId + roadId)) return "kids";
  if (/saving/.test(stopId)) return "savings";
  return "everyday";
}
export const formatDate = (date: When) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(date.year, date.month, date.day)));
export function countdown(date: When | undefined, today: When): string {
  if (!date) return "At your pace";
  const days = Math.max(0, Math.round(whenIndex(date) - whenIndex(today)));
  if (days === 0) return "Today";
  if (days < 7) return `in ${days} ${days === 1 ? "day" : "days"}`;
  const weeks = Math.round(days / 7);
  if (weeks < 9) return `in ${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  const months = Math.round(days / 30.4);
  return `in ${months} months`;
}
export type RoadItem = {
  id: string; roadId: string; stopId: string; title: string; area: AreaId;
  date?: When; timing: string; evidence?: StopEvidence; lesson?: Lesson;
  prepared: boolean; reminded: boolean; care: boolean; reminder?: TripPick;
};
export function mergedTimeline(person: PersonRoad, life: LifeState, pointers: PersonPointers, plan: PlanItem[], done: string[], careConsent: boolean | ((roadId: string) => boolean)): RoadItem[] {
  const today = { ...life.today.cal, day: life.today.day };
  const end = { ...today, year: today.year + 1 };
  const lessons = lessonsFor(person.key);
  const ids = [...new Set([pointers.confirmed?.roadId, ...pointers.exploring.map(p => p.roadId), EVERYDAY_ONLY_ID].filter((id): id is string => !!id))];
  const items: RoadItem[] = [];
  for (const roadId of ids) {
    const careOptIn = typeof careConsent === "function" ? careConsent(roadId) : careConsent;
    const view = roadViewFor(person, roadId, { pointers, careOptIn });
    if (!view?.available) continue;
    const stops = [...view.nextStops];
    if (view.fork && !stops.some(s => s.stopId === view.fork!.stopId) && view.fork.month >= (view.position.month ?? 0)) {
      stops.push({ roadId, stopId: view.fork.stopId, id: view.fork.id, title: view.fork.title, short: view.fork.title, month: view.fork.month, offset: view.fork.month - (view.position.month ?? 0), year: null, passed: false, kind: "milestone" });
    }
    for (const stop of stops) {
      const calendar = roadId === EVERYDAY_ONLY_ID ? EVERYDAY_STOPS.find(s => s.id === stop.stopId) : undefined;
      if (calendar && !everydayApplies(life.def, calendar, life.m + stop.offset)) continue;
      const upcoming = life.upcoming.find(u => u.ref.id === stop.stopId && (calendar ? u.scope === "everyday" : u.scope === "road" && roadId === person.roadId));
      let date: When | undefined;
      if (calendar) {
        date = { year: today.year, month: calendar.calMonth, day: calendar.day };
        if (whenIndex(date) < whenIndex(today)) date.year++;
      } else if (!view.care && !view.position.preview && upcoming) date = { ...upcoming.cal, day: upcoming.day };
      else if (!view.care && !view.position.preview && stop.offset >= 0) {
        // Known stage gives a month, not an invented day. Leave it relative.
      }
      if (date && (whenIndex(date) < whenIndex(today) || whenIndex(date) >= whenIndex(end))) continue;
      if (!date && stop.offset > 12) continue;
      const evidence = stopEvidenceFor(roadId, stop.stopId, { careOptIn, year: date?.year }) ?? undefined;
      const lesson = lessons.find(l => l.stopId === `${roadId}:${stop.stopId}`);
      const id = `r2:${roadId}:${stop.stopId}:${date?.year ?? "undated"}`;
      const prepared = !!lesson && done.includes(lesson.id) || !!upcoming?.ready && upcoming.ready >= 100;
      const reminded = plan.some(p => p.id === id);
      const timing = date ? formatDate(date) : view.care || view.position.preview ? "When you’re ready" : `In ${Math.max(1, stop.offset)} ${stop.offset === 1 ? "month" : "months"}`;
      const reminder: TripPick | undefined = date && !view.care ? { id, source: { scope: calendar ? "everyday" : "road", roadId, key: stop.stopId }, spec: { kind: "remind", title: `Check ${lesson?.title ?? stop.title}`, detail: `Before ${formatDate(date)}. Saved in your demo plan.`, when: whenIndex(date) > whenIndex(today) ? addDays(date, -1) : date } } : undefined;
      items.push({ id, roadId, stopId: stop.stopId, title: lesson?.title ?? stop.title, area: areaFor(roadId, stop.stopId), date, timing, evidence, lesson, prepared, reminded, care: view.care, reminder });
    }
  }
  const car = person.world?.car;
  if (car) {
    const date = { year: today.year, ...car.insurance.renews };
    if (whenIndex(date) < whenIndex(today)) date.year++;
    const id = `r2:car:renewal:${date.year}`;
    items.push({ id, roadId: EVERYDAY_ONLY_ID, stopId: "car-renewal", title: "Car insurance renewal", area: "car", date, timing: formatDate(date), prepared: false, reminded: plan.some(p => p.id === id), care: false, reminder: { id, source: { scope: "place", roadId: EVERYDAY_ONLY_ID, key: "car-renewal" }, spec: { kind: "remind", title: "Review my car insurance", detail: `Renews ${formatDate(date)}. Compare your cover before renewal.`, when: addDays(date, -1) } } });
  }
  return items.sort((a, b) => (a.date ? whenIndex(a.date) : Infinity) - (b.date ? whenIndex(b.date) : Infinity) || a.id.localeCompare(b.id));
}
export type AreaProgress = { id: AreaId; open: boolean; percent: number | null; label: string };
export function areaProgress(person: PersonRoad, life: LifeState): AreaProgress[] {
  const world = person.world;
  const goals = life.goals;
  const homeGoal = goals.find(g => /home|flat|house/i.test(g.label));
  const home = world?.home?.mortgage ? mortgageAt(world.home.mortgage, life.today.cal) : null;
  const goalTotal = goals.reduce((sum, g) => sum + g.target, 0);
  const saved = goals.reduce((sum, g) => sum + g.saved, 0);
  const businessGoal = goals.find(g => /tax/i.test(g.label));
  return [
    { id: "home", open: !!world?.home || !!homeGoal || !!life.def.cover.find(c => c.id === "home"), percent: home ? Math.round(home.paidShare * 100) : homeGoal ? progress(homeGoal.saved, homeGoal.target) : null, label: home ? "mortgage repaid" : homeGoal ? homeGoal.label : "Your home & cover" },
    { id: "savings", open: !!life.pots.length || !!goals.length, percent: goalTotal ? progress(saved, goalTotal) : null, label: goalTotal ? "of your savings goals" : "No target set" },
    { id: "car", open: !!world?.car, percent: null, label: world?.car ? `Renews ${world.car.insurance.renews.day} ${new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(2026, world.car.insurance.renews.month, 1))}` : AREA.car.hint },
    { id: "pension", open: !!world?.pension || life.def.incomes.some(i => i.id === "pension"), percent: world?.pension ? progress(world.pension.paid, world.pension.limit) : null, label: world?.pension ? "of this year’s limit" : "Your pension income" },
    { id: "business", open: person.roadId === "freelance", percent: businessGoal ? progress(businessGoal.saved, businessGoal.target) : null, label: businessGoal?.label ?? AREA.business.hint },
    { id: "kids", open: !!world?.child, percent: null, label: world?.child ? `${world.child.name}’s account` : AREA.kids.hint },
  ];
}

/** Only publish a miniature when the underlying proportion AND denominator passed their gates. */
export function crowdVisual(e?: StopEvidence): { share: number; dots: number; red: number; label: string } | undefined {
  if (!e?.available || !e.denominator.shown || !e.surprised.share.shown || e.surprised.share.value === null) return;
  const share = e.surprised.share.value;
  const reciprocal = share > 0 ? Math.round(1 / share) : 0;
  const dots = reciprocal >= 2 && reciprocal <= 10 ? reciprocal : 10;
  const red = reciprocal >= 2 && reciprocal <= 10 ? 1 : Math.round(share * 10);
  return { share, dots, red, label: `${Math.round(share * 100)}% ${e.kind === "bump" ? "had a cost that strained their buffer" : e.surprised.label.toLowerCase()}` };
}
