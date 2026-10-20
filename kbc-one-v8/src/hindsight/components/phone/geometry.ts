import { hashSeed, mulberry32 } from "../../engine/rng";

// Turns a stretch of road into a winding road on screen. You drive upward, into what's ahead.
// The phone shows a "headlights" window: a couple of months behind you and ~a year ahead.

export const ROAD_W = 390;
export const ROAD_H = 372;
const PAD_TOP = 30;
const PAD_BOTTOM = 26;

export interface Win {
  start: number;
  span: number;
  seed: string;
}

export function windowFor(month: number, months: number, seed: string, span = 13): Win {
  const s = Math.min(months, span);
  const start = Math.max(0, Math.min(month - 2, months - s));
  return { start, span: s, seed };
}

export function pos(month: number, w: Win): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, (month - w.start) / w.span));
  const phase = ((hashSeed(w.seed) % 100) / 100) * 1.2 - 0.6;
  // absolute month drives the wiggle so the road doesn't "move" while you drive
  const wave = Math.sin(month * 0.55 + phase * 3) * 0.75 + Math.sin(month * 0.21 + phase) * 0.25;
  const x = ROAD_W / 2 + 96 * wave;
  const y = ROAD_H - PAD_BOTTOM - t * (ROAD_H - PAD_TOP - PAD_BOTTOM);
  return { x, y };
}

/** Smooth SVG path (Catmull-Rom → cubic Bézier) between two months. */
export function pathBetween(from: number, to: number, w: Win, steps = 40): string {
  const a = Math.max(from, w.start);
  const b = Math.min(to, w.start + w.span);
  if (b <= a) return "";
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) pts.push(pos(a + ((b - a) * i) / steps, w));
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)},${c2x.toFixed(1)} ${c2y.toFixed(1)},${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/** Deterministic "ghost riders": people ahead of you, as dots along the road. */
export function riders(from: number, w: Win, count: number) {
  const rand = mulberry32(hashSeed(`riders:${w.seed}`));
  const out: { x: number; y: number; r: number; o: number; key: number }[] = [];
  const end = w.start + w.span;
  for (let i = 0; i < count; i++) {
    const u = rand();
    const m = from + 0.3 + u * Math.max(0, end - from - 0.3);
    const p = pos(m, w);
    out.push({ key: i, x: p.x + (rand() - 0.5) * 18, y: p.y + (rand() - 0.5) * 8, r: 1.4 + rand() * 1.1, o: 0.3 + rand() * 0.6 });
  }
  return out;
}
