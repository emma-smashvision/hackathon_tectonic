import { hashSeed, mulberry32 } from "../../../engine/rng";
import { type CityNet, type District, HALF_W, MONTH_LEN, nearest, type Path, pointAt, RING_R } from "./network";

// Procedural dressing of the city: buildings along the avenues, trees in the
// gardens and parks, lamp posts that mark the months. Deterministic.

export interface Building {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rot: number;
  district: District;
  seed: number;
}

export interface Tree {
  x: number;
  z: number;
  s: number;
}

export interface Lamp {
  x: number;
  z: number;
  roadId: string;
  month: number;
  side: number;
}

const HEIGHT: Record<District, [number, number]> = {
  work: [14, 46],
  home: [8, 22],
  family: [5, 10],
  abroad: [6, 14],
  later: [6, 16],
  care: [4, 7],
};

const TREE_SHARE: Record<District, number> = {
  work: 0.08,
  home: 0.2,
  family: 0.45,
  abroad: 0.12,
  later: 0.35,
  care: 0.75,
};

/** `reserved`: footprints kept free for landmarks (see landmarks.ts). */
export function generateCity(net: CityNet, reserved: { x: number; z: number; r: number }[] = []) {
  const rand = mulberry32(hashSeed("hindsight-city"));
  const buildings: Building[] = [];
  const trees: Tree[] = [];
  const lamps: Lamp[] = [];

  const clearOf = (x: number, z: number, r: number) => nearest(net, x, z).dist > HALF_W + 2 + r;
  const nearStop = (x: number, z: number) => net.stops.some((s) => Math.hypot(s.pos.x - x, s.pos.z - z) < 20);
  const taken: { x: number; z: number; r: number }[] = reserved.map((l) => ({ x: l.x, z: l.z, r: l.r + 2 }));
  const free = (x: number, z: number, r: number) => taken.every((t) => Math.hypot(t.x - x, t.z - z) > t.r + r);

  const dress = (path: Path, district: District) => {
    for (let s = 14; s < path.length; s += 9 + rand() * 5) {
      const { p, tan } = pointAt(path, s);
      const perp = { x: -tan.z, z: tan.x };
      const rot = Math.atan2(tan.x, tan.z);
      for (const side of [-1, 1]) {
        for (let row = 0; row < 2; row++) {
          if (row === 1 && rand() < 0.45) continue;
          const isTree = rand() < TREE_SHARE[district];
          const w = 6 + rand() * 6;
          const d = 6 + rand() * 7;
          const r = isTree ? 2.5 : Math.max(w, d) * 0.62;
          const off = HALF_W + 5 + r + row * 15 + rand() * 3;
          const x = p.x + perp.x * off * side;
          const z = p.z + perp.z * off * side;
          if (nearStop(x, z) || !clearOf(x, z, r) || !free(x, z, r)) continue;
          taken.push({ x, z, r });
          if (isTree) {
            trees.push({ x, z, s: 0.8 + rand() * 0.8 });
          } else {
            const [lo, hi] = HEIGHT[district];
            const far = Math.min(1, Math.hypot(x, z) / 700);
            const h = lo + (hi - lo) * rand() * (1 - far * 0.5);
            buildings.push({ x, z, w, d, h, rot, district, seed: Math.floor(rand() * 1000) });
          }
        }
      }
    }
  };

  for (const av of net.avenues) {
    dress(av.trunk, av.district);
    if (av.branches) for (const b of av.branches) dress(b, av.district);
    // lamps: one per month, alternating sides
    const paths = av.branches ? [av.trunk, ...av.branches] : [av.trunk];
    for (const path of paths) {
      for (let i = 0; i < path.pts.length; i++) {
        const m = path.months[i];
        if (m < 0 || Math.abs(m - Math.round(m)) > 0.01) continue;
        if (path.branch !== "trunk" && m === path.months[0]) continue;
        const { tan } = pointAt(path, path.cum[i]);
        const side = Math.round(m) % 2 === 0 ? 1 : -1;
        const perp = { x: -tan.z, z: tan.x };
        lamps.push({
          x: path.pts[i].x + perp.x * (HALF_W + 1.4) * side,
          z: path.pts[i].z + perp.z * (HALF_W + 1.4) * side,
          roadId: av.road.id,
          month: Math.round(m),
          side,
        });
      }
    }
  }

  // ring-side blocks between the avenue entrances
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + rand() * 0.04;
    const r = RING_R + HALF_W + 10 + rand() * 8;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const w = 7 + rand() * 5;
    if (!clearOf(x, z, w * 0.62) || !free(x, z, w * 0.62)) continue;
    taken.push({ x, z, r: w * 0.62 });
    buildings.push({ x, z, w, d: 8 + rand() * 4, h: 18 + rand() * 30, rot: -a + Math.PI / 2, district: "work", seed: Math.floor(rand() * 1000) });
  }
  // the square: trees around the tower (with your streets, only beside them: your places stand there)
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r = 52 + (i % 2) * 18;
    const s = 1 + rand() * 0.4;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (net.streets.length && (Math.abs(z) > 18 || !clearOf(x, z, 2.5))) continue;
    trees.push({ x, z, s });
  }
  return { buildings, trees, lamps, monthLen: MONTH_LEN };
}
