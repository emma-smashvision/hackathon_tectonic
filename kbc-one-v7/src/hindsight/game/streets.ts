import type { MarketInfo, Place } from "../engine/world";
import { HALF_W, RING_R, type StreetId, type Vec2 } from "./network";

// Where your places stand on your two streets inside the ring. Both streets are straight chords
// (Home Street at z = +STREET_Z, Market Mile at z = −STREET_Z); places stand on the ring side,
// facing the street, on your right in the driving direction (the HUD's left column never hides them):
// Home Street is driven towards +x, Market Mile towards −x. On Market Mile, distance is time: each
// tower stands where you bought it, and the end of the street is today. Pure TypeScript, unit-tested.

/** distance of both chords from the centre of the square */
export const STREET_Z = RING_R * Math.sin(Math.PI / 12);
/** Market Mile: from the first purchase (east) to the last month's close (west) */
export const MARKET_X0 = 70;
export const MARKET_X1 = -56;
/** the direction you drive each street in */
export const STREET_DIR: Record<StreetId, 1 | -1> = { home: 1, market: -1 };
const HOME_X0 = -70;
const GAP = 6;
const MIN_TOWER_GAP = 15;

export interface Spot {
  id: string;
  street: StreetId;
  x: number;
  z: number;
  /** footprint: along the street × away from it */
  width: number;
  depth: number;
  /** +1: Home Street (z > 0), −1: Market Mile (z < 0) */
  side: 1 | -1;
  /** where you pull over: on the street, in front of it */
  door: Vec2;
}

const sideOf = (s: StreetId): 1 | -1 => (s === "home" ? 1 : -1);
const depthOf = (p: Place) => (p.kind === "tower" ? 11 : p.kind === "silo" ? 8 : p.kind === "tree" ? 12 : Math.min(18, p.width));

/** Market Mile x for a moment, in months since the first purchase. */
export const marketX = (t: number, span: number) => MARKET_X0 + (MARKET_X1 - MARKET_X0) * Math.max(0, Math.min(1, t / Math.max(1, span)));

export function layoutPlaces(places: Place[], market: MarketInfo | null): Spot[] {
  const out: Spot[] = [];
  const spot = (p: Place, x: number): Spot => {
    const side = sideOf(p.street);
    const depth = depthOf(p);
    // towers stand a little further back, so you see them rise as you drive by
    const z = side * (STREET_Z + HALF_W + 3 + depth / 2 + (p.kind === "tower" ? 5 : 0));
    return { id: p.id, street: p.street, x, z, width: p.width, depth, side, door: { x, z: side * STREET_Z } };
  };
  // Home Street: from the first-child side, one after the other, your home first
  let cursor = HOME_X0;
  for (const p of places.filter((q) => q.street === "home")) {
    out.push(spot(p, cursor + p.width / 2));
    cursor += p.width + GAP;
  }
  // Market Mile: by date, pushed apart (further along) when two purchases are close in time
  const span = market?.span ?? 1;
  let last = Number.POSITIVE_INFINITY;
  const sorted = places.filter((q) => q.street === "market").sort((a, b) => (a.t ?? 0) - (b.t ?? 0) || (a.kind === "kiosk" ? 1 : -1));
  for (const p of sorted) {
    let x = p.kind === "kiosk" && p.id === "market:today" ? MARKET_X1 - 14 : marketX(p.t ?? 0, span);
    if (x > last - MIN_TOWER_GAP) x = last - MIN_TOWER_GAP;
    last = x;
    out.push(spot(p, x));
  }
  return out;
}

/** The place you're in front of, if any, when you're on one of your streets. */
export function placeAt(spots: Spot[], street: StreetId | undefined, x: number, z: number): { id: string; dist: number } | null {
  if (!street) return null;
  let best: { id: string; dist: number } | null = null;
  for (const s of spots) {
    if (s.street !== street) continue;
    const d = Math.hypot(x - s.door.x, z - s.door.z);
    if (Math.abs(x - s.door.x) < s.width / 2 + 5 && (!best || d < best.dist)) best = { id: s.id, dist: d };
  }
  return best;
}

/** Where a street starts (in its driving direction), for the "drive there" buttons and the debug hook. */
export function streetStart(street: StreetId, frac = 0.15) {
  const dir = STREET_DIR[street];
  const xa = Math.cos(Math.PI / 12) * RING_R;
  return { x: -dir * xa + dir * 2 * xa * frac, z: sideOf(street) * STREET_Z, heading: (dir * Math.PI) / 2 };
}
