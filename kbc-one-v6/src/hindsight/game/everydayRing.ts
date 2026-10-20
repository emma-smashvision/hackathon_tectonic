import { BEACON_H } from "./anchors";
import { HALF_W, RING_R, type Vec2 } from "./network";

// The ring road is the Everyday Road: one lap is one year.
// Twelve avenues meet the ring, so the ring has twelve segments: one per calendar month
// (the life roads branch off at the month boundaries and merge back there).
// Pure TypeScript, unit-tested.

export const MONTH_ARC = Math.PI / 6;
/** the first avenue sits at 15°, so January fills the segment between avenue 0 and avenue 1 */
export const RING_OFFSET = Math.PI / 12;

const TAU = Math.PI * 2;
export const norm = (a: number) => ((a % TAU) + TAU) % TAU;

export function monthAngle(calMonth: number, frac = 0.5): number {
  return norm(RING_OFFSET + (calMonth + frac) * MONTH_ARC);
}

/** Where a day of the year sits on the ring; kept clear of the junctions at the month edges. */
export function dayAngle(calMonth: number, day: number): number {
  return monthAngle(calMonth, 0.25 + 0.5 * Math.min(1, Math.max(0, (day - 1) / 30)));
}

/** The calendar month of the ring segment at this angle. */
export function monthAtAngle(angle: number): number {
  return Math.floor(norm(angle - RING_OFFSET) / MONTH_ARC) % 12;
}

export const ringAt = (angle: number, r = RING_R): Vec2 => ({ x: Math.cos(angle) * r, z: Math.sin(angle) * r });
export const ringTangent = (angle: number): Vec2 => ({ x: -Math.sin(angle), z: Math.cos(angle) });

/** Beacons for everyday stops stand on the inside of the ring, towards the square. */
export function everydayAnchor(calMonth: number, day: number) {
  return everydayAnchorAt(dayAngle(calMonth, day));
}

export function everydayAnchorAt(a: number) {
  return { ...ringAt(a, RING_R - HALF_W - 4), y: BEACON_H, angle: a };
}

/** Angles for this year's everyday stops: by day, spread evenly when a month has several. */
export function everydayAngles(items: { key: string; month: number; day: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (let m = 0; m < 12; m++) {
    const list = items.filter((i) => i.month === m).sort((a, b) => a.day - b.day);
    list.forEach((it, i) => out.set(it.key, list.length > 1 ? monthAngle(m, 0.25 + (0.5 * (i + 0.5)) / list.length) : dayAngle(m, it.day)));
  }
  return out;
}

/** Month names are painted on the square side of the ring. */
export function monthLabelAnchor(calMonth: number) {
  const a = monthAngle(calMonth);
  return { ...ringAt(a, RING_R - HALF_W - 16), y: 1.5, angle: a };
}

/** Arc distance along the ring between two angles, in world units. */
export function ringDist(a: number, b: number, r = RING_R): number {
  const d = Math.abs(norm(a - b));
  return Math.min(d, TAU - d) * r;
}

/** Heading for a car driving along the ring with the calendar (months increasing). */
export function ringHeading(angle: number): number {
  const t = ringTangent(angle);
  return Math.atan2(t.x, t.z);
}
