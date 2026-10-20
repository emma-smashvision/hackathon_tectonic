import { hashSeed, mulberry32 } from "./rng";
import { ROADS } from "./roads";

// Placement: the only per-customer computation Hindsight needs.
// Each customer gets one pointer (road + month) from recent money events, by cheap rules.
// Crowd statistics are computed once per (road, month) and shared by everyone on it,
// so cost grows with the number of roads, not with the number of customers.
// This file runs the placement over a synthetic population of 2.3M in the browser.

export const POPULATION = 2_300_000;

interface Rule {
  roadId: string;
  /** probability of the triggering event pattern for an age */
  p: (age: number) => number;
}

const band = (age: number, lo: number, hi: number, p: number) => (age >= lo && age <= hi ? p : 0);

// Priority order: care roads first, so a person in a hard moment is never placed on a commercial road.
const RULES: Rule[] = [
  { roadId: "job-loss", p: (a) => band(a, 22, 62, 0.012) },
  { roadId: "losing-parent", p: (a) => band(a, 35, 70, 0.008) },
  { roadId: "separation", p: (a) => band(a, 28, 60, 0.005) },
  { roadId: "caring-parent", p: (a) => band(a, 42, 65, 0.012) },
  { roadId: "retirement", p: (a) => band(a, 62, 68, 0.11) },
  { roadId: "first-child", p: (a) => band(a, 26, 40, 0.025) },
  { roadId: "first-home", p: (a) => band(a, 25, 42, 0.03) },
  { roadId: "moving-house", p: (a) => band(a, 21, 40, 0.035) },
  { roadId: "student-kid", p: (a) => band(a, 43, 56, 0.045) },
  { roadId: "freelance", p: (a) => band(a, 24, 55, 0.004) },
  { roadId: "first-job", p: (a) => band(a, 20, 26, 0.09) },
  { roadId: "moving-abroad", p: (a) => band(a, 22, 45, 0.003) },
  { roadId: "heat-pump", p: (a) => band(a, 30, 70, 0.0012) },
];

const RULE_ROAD_INDEX = RULES.map((rule) => ROADS.findIndex((x) => x.id === rule.roadId));

export interface PlacementResult {
  placed: number;
  quiet: number;
  ms: number;
  perRoad: Record<string, number>;
  pointers: number;
  perSecond: number;
}

function sampleAge(rand: () => number): number {
  // rough adult age distribution 18–90
  const r = rand();
  if (r < 0.14) return 18 + Math.floor(rand() * 10);
  if (r < 0.48) return 28 + Math.floor(rand() * 22);
  if (r < 0.8) return 50 + Math.floor(rand() * 18);
  return 68 + Math.floor(rand() * 22);
}

/** Place a chunk; returns counts. Pure, so it can run in chunks or in a worker. */
export function placeChunk(start: number, count: number, perRoad: Uint32Array, pointerSeen: Uint8Array): number {
  const rand = mulberry32(hashSeed(`pop:${start}`));
  const months = ROADS.map((r) => r.months);
  const offsets: number[] = [];
  let acc = 0;
  for (const m of months) {
    offsets.push(acc);
    acc += m + 1;
  }
  let placed = 0;
  for (let i = 0; i < count; i++) {
    const age = sampleAge(rand);
    for (let r = 0; r < RULES.length; r++) {
      if (rand() < RULES[r].p(age)) {
        const idx = RULE_ROAD_INDEX[r];
        perRoad[idx]++;
        const month = Math.floor(rand() * (months[idx] + 1));
        pointerSeen[offsets[idx] + month] = 1;
        placed++;
        break;
      }
    }
  }
  return placed;
}

export function pointerSpace(): number {
  return ROADS.reduce((s, r) => s + r.months + 1, 0);
}

/** Runs the whole population in chunks, yielding to the UI between chunks. */
export async function runPlacement(onProgress: (done: number) => void, chunk = 115_000): Promise<PlacementResult> {
  const perRoad = new Uint32Array(ROADS.length);
  const seen = new Uint8Array(pointerSpace());
  let placed = 0;
  let ms = 0; // compute time only, not the pauses that keep the UI responsive
  for (let start = 0; start < POPULATION; start += chunk) {
    const t0 = performance.now();
    placed += placeChunk(start, Math.min(chunk, POPULATION - start), perRoad, seen);
    ms += performance.now() - t0;
    onProgress(Math.min(POPULATION, start + chunk));
    await new Promise((r) => setTimeout(r, 16));
  }
  const out: Record<string, number> = {};
  ROADS.forEach((r, i) => {
    out[r.id] = perRoad[i];
  });
  return {
    placed,
    quiet: POPULATION - placed,
    ms,
    perRoad: out,
    pointers: seen.reduce((s, v) => s + v, 0),
    perSecond: Math.round(POPULATION / (ms / 1000)),
  };
}
