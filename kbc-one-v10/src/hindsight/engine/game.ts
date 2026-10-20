import { statsFor } from "./simulate";
import type { AnyStop, RoadDef, StopDef } from "./types";

// The game layer. No points, coins or leaderboards: you prepare for what's ahead
// ("readiness"), drive forward, and get a postcard when you pass a bump that tells you
// how people who prepared like you came through. Care roads switch all of this off.

export interface Postcard {
  stopId: string;
  title: string;
  line: string;
  you: number | null;
  road: number | null;
  month: number;
}

export interface Journey {
  roadId: string;
  month: number;
  /** stopId -> ids of actions taken (behaviour ids for bumps, "main" for others) */
  done: Record<string, string[]>;
  forkChoice: Record<string, string>;
  postcards: Postcard[];
  careOptIn: boolean;
  /** The journey month that is "today" (17 Oct 2026). Older saved journeys lack it: use the persona's month. */
  anchor?: number;
  /** `${stopKey}|${actionId}` -> journey month the action was taken (starts its pot) */
  doneAt?: Record<string, number>;
  /** What-if overrides for goals: monthly pace and whether the transfer is automated. */
  goals?: Record<string, { monthly?: number; auto?: boolean }>;
  /** Cover items the customer checked ("tyres"). */
  cover?: string[];
}

export function newJourney(road: RoadDef): Journey {
  return {
    roadId: road.id,
    month: road.persona.month,
    done: {},
    forkChoice: {},
    postcards: [],
    careOptIn: false,
    anchor: road.persona.month,
    doneAt: {},
    goals: {},
    cover: [],
  };
}

export const anchorOf = (road: RoadDef, j: Journey) => j.anchor ?? road.persona.month;

export function allStops(road: RoadDef): AnyStop[] {
  const list: AnyStop[] = [...road.stops];
  if (road.fork) list.push(road.fork);
  return list.sort((a, b) => a.month - b.month);
}

export function readiness(stop: StopDef, done: string[] = []): number {
  if (stop.kind === "bump") {
    const total = (stop.behaviours ?? []).filter((b) => done.includes(b.id)).reduce((s, b) => s + b.action.readiness, 0);
    return Math.min(100, total);
  }
  return done.includes("main") ? 100 : 0;
}

export function nextStop(road: RoadDef, month: number): AnyStop | undefined {
  return allStops(road).find((s) => s.month > month);
}

/** Overall readiness for what's ahead in the next 6 months, 0..100. */
export function roadReadiness(road: RoadDef, j: Journey): number {
  const ahead = road.stops.filter((s) => s.month > j.month && s.month <= j.month + 6 && s.kind !== "boost");
  if (!ahead.length) return 100;
  return Math.round(ahead.reduce((s, st) => s + readiness(st, j.done[st.id]), 0) / ahead.length);
}

/** Called when the journey moves forward: creates postcards for stops just passed. */
export function passStops(road: RoadDef, j: Journey, toMonth: number): Postcard[] {
  const cards: Postcard[] = [];
  for (const stop of road.stops) {
    if (stop.month <= j.month || stop.month > toMonth) continue;
    if (j.postcards.some((p) => p.stopId === stop.id)) continue;
    const s = statsFor(road, stop);
    if (s.kind === "bump") {
      const ids = j.done[stop.id] ?? [];
      const you = ids.length ? s.calmIf(ids) : null;
      const roadCalm = s.hitRate.value === null ? null : 1 - s.hitRate.value;
      cards.push({
        stopId: stop.id,
        title: `You passed: ${stop.short}`,
        line: you?.value != null
          ? `Of the people who prepared like you, ${Math.round(you.value * 100)}% came through calmly.`
          : "You passed it. Next time, the crowd's tips are there before it hits.",
        you: you?.value ?? null,
        road: roadCalm,
        month: stop.month,
      });
    } else if (s.kind === "boost") {
      cards.push({
        stopId: stop.id,
        title: `Arrived: ${stop.short}`,
        line: (j.done[stop.id] ?? []).length ? "Parked, as planned. That's the next bump covered." : "It landed. People who parked it were glad later.",
        you: null,
        road: null,
        month: stop.month,
      });
    }
  }
  return cards;
}
