import { TODAY } from "../engine/everyday";
import { allStops } from "../engine/game";
import { EVERYDAY_ONLY_ID } from "../engine/roads";
import { ROADS } from "../engine/roads";
import type { AnyStop, RoadDef } from "../engine/types";

// Hindsight City, as data. The Atlas becomes a drivable city:
// a ring road around Hindsight Square, and one avenue per life road going outward.
// Distance along an avenue IS time: MONTH_LEN world units per month.
// Pure TypeScript (no three.js) so it can be unit-tested.

export const MONTH_LEN = 16;
export const RING_R = 120;
export const ENTRY = 26; // on-ramp from the ring to month 0
export const ROAD_W = 11;
export const HALF_W = ROAD_W / 2;
export const STEP = 0.5; // sample every half month
export const JUNCTION_R = HALF_W + 7;

export type Vec2 = { x: number; z: number };

export type District = "work" | "home" | "family" | "abroad" | "later" | "care";

export const DISTRICTS: Record<District, { name: string; color: string; window: string }> = {
  work: { name: "Work Quarter", color: "#C9C2AE", window: "#F6E7B8" },
  home: { name: "Home Quarter", color: "#5ED4E8", window: "#BDEFF7" },
  family: { name: "Family Park", color: "#E8B4A0", window: "#F8D9C4" },
  abroad: { name: "Harbour", color: "#8FB8E8", window: "#CFE0F7" },
  later: { name: "Later Hills", color: "#D8C27A", window: "#F1E3B0" },
  care: { name: "Quiet Gardens", color: "#B7B0DA", window: "#DCD8F0" },
};

/** Order of avenues around the ring, grouped by district. */
export const AVENUE_ORDER = [
  "first-job",
  "freelance",
  "first-home",
  "moving-house",
  "heat-pump",
  "first-child",
  "moving-abroad",
  "caring-parent",
  "retirement",
  "separation",
  "losing-parent",
  "job-loss",
];

export type StreetId = "home" | "market";

/** Two streets inside the ring, your own world: they carry on from the avenues across the square. */
export const STREETS: Record<StreetId, { name: string; from: number; to: number }> = {
  home: { name: "Home Street", from: 0, to: 5 },
  market: { name: "Market Mile", from: 6, to: 11 },
};

/** Home Street is mint like your car; Market Mile is gold. */
export const STREET_COLOR: Record<StreetId, string> = { home: "#5ED4E8", market: "#D8C27A" };

export interface Path {
  id: string;
  roadId: string | null;
  branch: "trunk" | "a" | "b" | "ring" | "street";
  /** inside the ring: which of your streets */
  street?: StreetId;
  pts: Vec2[];
  /** month value at each point (ring: NaN) */
  months: number[];
  /** cumulative arc length at each point */
  cum: number[];
  length: number;
}

export interface Avenue {
  road: RoadDef;
  index: number;
  angle: number;
  dir: Vec2;
  perp: Vec2;
  district: District;
  trunk: Path;
  branches: [Path, Path] | null;
  forkMonth: number | null;
}

export interface PlacedStop {
  key: string;
  roadId: string;
  stop: AnyStop;
  branch: "trunk" | "a" | "b";
  /** where it sits on the road; same-month stops are spaced a little apart */
  month: number;
  pos: Vec2;
  /** unit tangent along the road (outward) */
  tan: Vec2;
}

export interface CityNet {
  ring: Path;
  avenues: Avenue[];
  paths: Path[];
  stops: PlacedStop[];
  radius: number;
  /** where avenues meet the ring: wider, forgiving corners */
  junctions: Vec2[];
  /** your streets inside the ring (only when there is a world to show) */
  streets: Path[];
}

export interface Nearest {
  path: Path;
  seg: number;
  t: number;
  dist: number;
  point: Vec2;
  tangent: Vec2;
  month: number;
  roadId: string | null;
  branch: Path["branch"];
}

const len = (a: Vec2, b: Vec2) => Math.hypot(b.x - a.x, b.z - a.z);

export function makePath(id: string, roadId: string | null, branch: Path["branch"], pts: Vec2[], months: number[]): Path {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + len(pts[i - 1], pts[i]));
  return { id, roadId, branch, pts, months, cum, length: cum[cum.length - 1] };
}

function familyToDistrict(road: RoadDef): District {
  return road.family;
}

/** World position on an avenue at a month, for a branch. */
export function avenuePoint(av: Pick<Avenue, "dir" | "perp" | "index">, month: number, branch: "trunk" | "a" | "b", forkMonth: number | null): Vec2 {
  const r = RING_R + ENTRY + month * MONTH_LEN;
  const ramp = Math.max(0, Math.min(1, (month + 1) / 6));
  let lat = 20 * Math.sin(month * 0.26 + av.index * 1.7) * ramp;
  if (forkMonth !== null && branch !== "trunk" && month > forkMonth) {
    const spread = Math.min(30, (month - forkMonth) * 7);
    lat += branch === "a" ? -spread : spread;
  }
  return { x: av.dir.x * r + av.perp.x * lat, z: av.dir.z * r + av.perp.z * lat };
}

export function buildCity(roads: RoadDef[] = ROADS, opts: { streets?: boolean } = {}): CityNet {
  const ringPts: Vec2[] = [];
  const ringMonths: number[] = [];
  const N = 96;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    ringPts.push({ x: Math.cos(a) * RING_R, z: Math.sin(a) * RING_R });
    ringMonths.push(Number.NaN);
  }
  const ring = makePath("ring", null, "ring", ringPts, ringMonths);
  const avenues: Avenue[] = [];
  const stops: PlacedStop[] = [];
  const paths: Path[] = [ring];
  const ordered = AVENUE_ORDER.map((id) => roads.find((r) => r.id === id)).filter((r): r is RoadDef => !!r);
  // KBC One: exactly twelve avenues (one per month boundary on the ring). A road outside the order
  // list (Kid goes to university, swapped out for Moving house) has no avenue: it lives in the app only.
  const slots = ordered.length;

  ordered.forEach((road, index) => {
    const angle = (index / slots) * Math.PI * 2 + Math.PI / slots;
    const dir = { x: Math.cos(angle), z: Math.sin(angle) };
    const perp = { x: -dir.z, z: dir.x };
    const forkMonth = road.fork ? road.fork.month : null;
    const proto = { dir, perp, index };
    const entryMonth = -ENTRY / MONTH_LEN;

    const trunkEnd = forkMonth ?? road.months;
    const tPts: Vec2[] = [];
    const tMonths: number[] = [];
    // from the ring edge to month 0
    for (let k = 0; k <= 4; k++) {
      const m = entryMonth + ((0 - entryMonth) * k) / 4;
      tPts.push(avenuePoint(proto, m, "trunk", forkMonth));
      tMonths.push(m);
    }
    for (let m = STEP; m <= trunkEnd + 1e-6; m += STEP) {
      tPts.push(avenuePoint(proto, m, "trunk", forkMonth));
      tMonths.push(m);
    }
    const trunk = makePath(`${road.id}:trunk`, road.id, "trunk", tPts, tMonths);
    paths.push(trunk);
    let branches: [Path, Path] | null = null;
    if (forkMonth !== null && forkMonth < road.months) {
      const mk = (b: "a" | "b") => {
        const pts: Vec2[] = [];
        const ms: number[] = [];
        for (let m = forkMonth; m <= road.months + 1e-6; m += STEP) {
          pts.push(avenuePoint(proto, m, b, forkMonth));
          ms.push(m);
        }
        // a short run-out after the end of the road
        return makePath(`${road.id}:${b}`, road.id, b, pts, ms);
      };
      branches = [mk("a"), mk("b")];
      paths.push(branches[0], branches[1]);
    }
    const av: Avenue = { road, index, angle, dir, perp, district: familyToDistrict(road), trunk, branches, forkMonth };
    avenues.push(av);

    const used: number[] = [];
    for (const stop of allStops(road)) {
      const onBranches = forkMonth !== null && stop.month > forkMonth && stop.kind !== "fork";
      const list: ("trunk" | "a" | "b")[] = onBranches ? ["a", "b"] : ["trunk"];
      let month = stop.month;
      while (used.some((u) => Math.abs(u - month) < 0.4)) month += 0.45;
      used.push(month);
      for (const br of list) {
        const p = avenuePoint(proto, month, br, forkMonth);
        const q = avenuePoint(proto, month + 0.1, br, forkMonth);
        const l = len(p, q) || 1;
        stops.push({
          key: `${road.id}:${stop.id}:${br}`,
          roadId: road.id,
          stop,
          branch: br,
          month,
          pos: p,
          tan: { x: (q.x - p.x) / l, z: (q.z - p.z) / l },
        });
      }
    }
  });

  // your streets: straight chords between two junctions, so every crossing is a four-way junction
  const streets: Path[] = [];
  if (opts.streets) {
    const at = (i: number) => {
      const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
      return { x: Math.cos(a) * RING_R, z: Math.sin(a) * RING_R };
    };
    for (const id of Object.keys(STREETS) as StreetId[]) {
      const a = at(STREETS[id].from);
      const b = at(STREETS[id].to);
      const n = Math.ceil(len(a, b) / 3);
      const pts = Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n }));
      const path = makePath(`street:${id}`, null, "street", pts, pts.map(() => Number.NaN));
      path.street = id;
      streets.push(path);
      paths.push(path);
    }
  }

  let radius = RING_R;
  for (const p of paths) for (const pt of p.pts) radius = Math.max(radius, Math.hypot(pt.x, pt.z));
  const junctions = avenues.map((a) => a.trunk.pts[0]);
  return { ring, avenues, paths, stops, radius, junctions, streets };
}

/** Closest point on the whole network. */
export function nearest(net: CityNet, x: number, z: number, only?: (p: Path) => boolean): Nearest {
  let best: Nearest | null = null;
  for (const path of net.paths) {
    if (only && !only(path)) continue;
    const pts = path.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const l2 = dx * dx + dz * dz || 1;
      let t = ((x - a.x) * dx + (z - a.z) * dz) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = a.x + dx * t;
      const pz = a.z + dz * t;
      const d = Math.hypot(x - px, z - pz);
      if (!best || d < best.dist) {
        const l = Math.sqrt(l2);
        const m0 = path.months[i];
        const m1 = path.months[i + 1];
        best = {
          path,
          seg: i,
          t,
          dist: d,
          point: { x: px, z: pz },
          tangent: { x: dx / l, z: dz / l },
          month: Number.isNaN(m0) ? Number.NaN : m0 + (m1 - m0) * t,
          roadId: path.roadId,
          branch: path.branch,
        };
      }
    }
  }
  if (!best) throw new Error("empty network");
  return best;
}

/** Point and tangent at arc length s along a path. */
export function pointAt(path: Path, s: number): { p: Vec2; tan: Vec2; month: number } {
  const c = path.cum;
  const sl = Math.max(0, Math.min(path.length, s));
  let lo = 0;
  let hi = c.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (c[mid] <= sl) lo = mid;
    else hi = mid;
  }
  const a = path.pts[lo];
  const b = path.pts[hi];
  const seg = c[hi] - c[lo] || 1;
  const t = (sl - c[lo]) / seg;
  const l = len(a, b) || 1;
  const m0 = path.months[lo];
  const m1 = path.months[hi];
  return {
    p: { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t },
    tan: { x: (b.x - a.x) / l, z: (b.z - a.z) / l },
    month: Number.isNaN(m0) ? Number.NaN : m0 + (m1 - m0) * t,
  };
}

/** Arc length on a path where a month is reached. */
export function sAtMonth(path: Path, month: number): number {
  const ms = path.months;
  if (month <= ms[0]) return 0;
  for (let i = 0; i < ms.length - 1; i++) {
    if (month <= ms[i + 1]) {
      const t = (month - ms[i]) / (ms[i + 1] - ms[i] || 1);
      return path.cum[i] + (path.cum[i + 1] - path.cum[i]) * t;
    }
  }
  return path.length;
}

/** Spawn pose on an avenue at a month (facing outward, into the future). */
export function spawnOn(net: CityNet, roadId: string, month: number, branch: "a" | "b" = "a") {
  const av = net.avenues.find((a) => a.road.id === roadId);
  if (!av) {
    // KBC One: someone without a life road starts on the ring (the Everyday Road), at this month
    if (roadId === EVERYDAY_ONLY_ID) {
      // same maths as everydayRing.monthAngle / ringAt / ringHeading (inlined: that module imports this one)
      const a = Math.PI / 12 + (((TODAY.month + Math.max(0, Math.floor(month))) % 12) + 0.15) * (Math.PI / 6);
      return { x: Math.cos(a) * RING_R, z: Math.sin(a) * RING_R, heading: Math.atan2(-Math.sin(a), Math.cos(a)) };
    }
    return { x: RING_R, z: 0, heading: 0 };
  }
  const path = av.branches && av.forkMonth !== null && month > av.forkMonth ? av.branches[branch === "a" ? 0 : 1] : av.trunk;
  const s = sAtMonth(path, Math.max(month, -ENTRY / MONTH_LEN + 0.2));
  const { p, tan } = pointAt(path, s);
  return { x: p.x, z: p.z, heading: Math.atan2(tan.x, tan.z) };
}

export function avenueFor(net: CityNet, roadId: string | null) {
  return roadId ? net.avenues.find((a) => a.road.id === roadId) : undefined;
}
