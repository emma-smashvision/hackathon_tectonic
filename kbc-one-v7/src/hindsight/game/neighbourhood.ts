import type { Place } from "../engine/world";
import { dayAngle, ringAt } from "./everydayRing";
import { type CityNet, type Vec2, RING_R, nearest, spawnOn, pointAt, sAtMonth } from "./network";
import { STREET_Z, STREET_DIR, type Spot } from "./streets";

/** Public entry contract. Unknown IDs fall back to your neighbourhood. */
export type CityFocus = { kind: "place" | "journey"; id: string };
const PLACE_ALIASES: Record<string, string> = { car: "garage", investments: "savings", "vault:savings": "savings" };
export const placeId = (id: string) => Object.hasOwn(PLACE_ALIASES, id) ? PLACE_ALIASES[id] : id;

/** Four places at most. Keep the underlying products together, including savings goals and investments. */
export function neighbourhoodPlaces(all: Place[]): Place[] {
  const home = all.find((p) => p.id === "home");
  const future = all.find((p) => p.id === "future-home");
  const car = all.find((p) => p.id === "garage");
  const pension = all.find((p) => p.id === "pension");
  const saved = all.filter((p) => p.kind === "silo" || p.kind === "tower" || p.kind === "child");
  const savings: Place | undefined = saved.length ? {
    ...saved[0], id: "savings", street: "home", kind: "silo", width: 16,
    kicker: "SAVINGS & INVESTMENTS", title: "Savings & investments",
    line: `${saved.length} ${saved.length === 1 ? "product" : "products"} · your savings and goals`,
    facts: saved.flatMap((p) => p.facts.map((f) => ({ ...f, label: `${p.title} · ${f.label}` }))),
    actions: saved.flatMap((p) => p.actions.map((a) => ({ ...a, id: `${p.id}:${a.id}` }))),
    body: "Your savings, investments and goals, together in one place.", news: undefined,
  } : undefined;
  return [home && { ...home, id: "home", kicker: "HOME", body: home.body.replace(" The dome is your home insurance.", " Your home insurance covers the property.").replace("The dome is your tenant insurance:", "Your tenant insurance covers the rented home:") }, car ? { ...car, kicker: "CAR" } : future ? { ...future, kicker: "FUTURE HOME", title: "Your future home" } : undefined, savings,
    pension && { ...pension, kicker: "PENSION", title: "Your pension" }].filter((p): p is Place => !!p);
}

/** The same next destination drives the title, readable sign and 3D signpost. */
export function nextStreetJourney(places: Place[], road: { id: string; name: string }) {
  if (places.some((p) => p.id === "garage" && p.alert)) return { id: "car-insurance", title: "Car insurance" };
  if (places.some((p) => p.id === "future-home")) return { id: "first-home", title: "Your first home" };
  return { id: road.id, title: road.name };
}

export const journeyForPlace = (id: string) => id === "garage" ? "car-insurance" : id === "future-home" ? "first-home" : id;
const JOURNEY_TITLES: Record<string, string> = { "car-insurance": "Car insurance", home: "Your home", savings: "Your savings plan", pension: "Your pension plan" };
export const journeyTitle = (id: string) => Object.hasOwn(JOURNEY_TITLES, id) ? JOURNEY_TITLES[id] : undefined;

export function focusTarget(focus: CityFocus, net: CityNet, spots: Spot[], insurance?: { month: number; day: number }) {
  const id = placeId(focus.id);
  if (focus.kind === "place") {
    const spot = spots.find((p) => p.id === id);
    return spot ? { pose: { ...spot.door, heading: STREET_DIR[spot.street] * Math.PI / 2 }, panel: { type: "place" as const, id } } : null;
  }
  const custom = id === "car-insurance" ? "garage" : id;
  if (journeyTitle(id) && spots.some((p) => p.id === custom)) {
    const angle = id === "car-insurance" && insurance ? dayAngle(insurance.month, insurance.day) : dayAngle({home: 2, savings: 5, pension: 8}[id] ?? 0, 15);
    return { pose: { ...ringAt(angle), heading: -angle }, panel: { type: "journey" as const, id: custom } };
  }
  const stop = net.stops.find((s) => s.key === id || s.stop.id === id);
  if (stop) return { pose: spawnOn(net, stop.roadId, stop.month - 0.2, stop.branch === "b" ? "b" : "a"), panel: stop.stop.kind === "fork" ? { type: "fork" as const, roadId: stop.roadId } : { type: "stop" as const, key: stop.key } };
  const avenue = net.avenues.find((a) => a.road.id === id);
  return avenue ? { pose: spawnOn(net, id, -0.8), panel: null } : null;
}

/** Follow street → ring → avenue, rather than cutting across buildings. */
export function routeTo(net: CityNet, from: Vec2, to: Vec2): Vec2[] {
  const start = nearest(net, from.x, from.z);
  const end = nearest(net, to.x, to.z);
  if (start.path === end.path && start.branch === "street") return [to];
  const pts: Vec2[] = [];
  const join = (near: typeof start, p: Vec2, leaving: boolean): Vec2[] => {
    if (near.branch === "street") {
      const x = Math.sqrt(RING_R ** 2 - STREET_Z ** 2) * (p.x < 0 ? -1 : 1);
      return [{ x, z: near.path.street === "market" ? -STREET_Z : STREET_Z }];
    }
    if (near.roadId) {
      const av = net.avenues.find((a) => a.road.id === near.roadId)!;
      const sample = (path: typeof av.trunk, month: number) => {
        const limit = Math.min(path.length, sAtMonth(path, month));
        const count = Math.max(2, Math.ceil(limit / 10));
        return Array.from({ length: count }, (_, i) => pointAt(path, limit * i / (count - 1)).p);
      };
      const sampled = near.branch === "trunk" ? sample(av.trunk, near.month)
        : [...sample(av.trunk, av.forkMonth ?? 0), ...sample(near.path, near.month)];
      return leaving ? sampled.reverse() : sampled;
    }
    return [ringAt(Math.atan2(p.z, p.x))];
  };
  const out = join(start, from, true);
  const into = join(end, to, false);
  pts.push(...out);
  const a = Math.atan2(out.at(-1)!.z, out.at(-1)!.x);
  const b = Math.atan2(into[0].z, into[0].x);
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const steps = Math.max(1, Math.ceil(Math.abs(delta) * 18));
  for (let i = 1; i <= steps; i++) pts.push(ringAt(a + delta * i / steps));
  pts.push(...into, to);
  return pts;
}

/** Chunky landmarks have real, non-overlapping footprints; the street stays clear. */
export function layoutNeighbourhood(places: Place[]): Spot[] {
  const dimensions = (p: Place) => {
    if (p.kind === "house") return { width: 46, depth: 35 };
    if (p.kind === "flat") return { width: 40, depth: 32 };
    if (p.kind === "plot") return { width: 52, depth: 38 };
    if (p.kind === "garage") return { width: 30, depth: 30 };
    if (p.kind === "tree") return { width: 23 * (p.scale ?? 1), depth: 22 * (p.scale ?? 1) };
    return { width: 28, depth: 26 };
  };
  const home = places.filter((p) => p.street === "home");
  const total = home.reduce((sum, p) => sum + dimensions(p).width, 0) + Math.max(0, home.length - 1) * 7;
  let cursor = -total / 2;
  return home.map((p) => {
    const { width, depth } = dimensions(p);
    const x = cursor + width / 2;
    cursor += width + 7;
    return { id: p.id, street: "home", x, z: STREET_Z + 10 + depth / 2, width, depth, side: 1, door: { x, z: STREET_Z } };
  });
}
