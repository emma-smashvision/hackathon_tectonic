import { type Avenue, HALF_W, MONTH_LEN, type PlacedStop, pointAt, sAtMonth } from "./network";

// Where signs stand in the world. The 3D scene puts a glowing beacon here,
// and the label layer pins the readable text above it (in screen space, never occluded).

export const BEACON_H = 6;

export interface Anchor {
  x: number;
  y: number;
  z: number;
}

export function stopAnchor(ps: PlacedStop): Anchor {
  const side = { x: -ps.tan.z, z: ps.tan.x };
  if (ps.stop.kind === "boost") {
    return { x: ps.pos.x, y: 9.6, z: ps.pos.z };
  }
  if (ps.stop.kind === "fork") {
    return { x: ps.pos.x, y: 3, z: ps.pos.z };
  }
  // bumps stand on the right, milestones on the left, a little before the stop
  const k = ps.stop.kind === "bump" ? 1 : -1;
  const back = ps.stop.kind === "bump" ? 7 : 5;
  return {
    x: ps.pos.x + side.x * (HALF_W + 4.5) * k - ps.tan.x * back,
    y: BEACON_H,
    z: ps.pos.z + side.z * (HALF_W + 4.5) * k - ps.tan.z * back,
  };
}

export function forkBranchAnchor(av: Avenue, i: 0 | 1): Anchor | null {
  if (!av.branches) return null;
  const at = pointAt(av.branches[i], MONTH_LEN * 0.9);
  const side = { x: -at.tan.z, z: at.tan.x };
  const k = i === 0 ? -1 : 1;
  return { x: at.p.x + side.x * (HALF_W + 4.5) * k, y: BEACON_H, z: at.p.z + side.z * (HALF_W + 4.5) * k };
}

export function gateAnchor(av: Avenue): Anchor & { tan: { x: number; z: number } } {
  const { p, tan } = pointAt(av.trunk, sAtMonth(av.trunk, -0.7));
  return { x: p.x, y: 9.4, z: p.z, tan };
}

/** Notes from drivers ahead stand on the left of their stop, spaced along the road. */
export function noteAnchors(
  net: { stops: PlacedStop[]; avenues: Avenue[] },
  notes: { id: string; roadId: string; stopId: string | null; text: string }[],
): (Anchor & { id: string; text: string; roadId: string })[] {
  const count = new Map<string, number>();
  return notes.slice(0, 24).flatMap((n) => {
    const ps = n.stopId ? net.stops.find((s) => s.roadId === n.roadId && s.stop.id === n.stopId) : undefined;
    const av = net.avenues.find((a) => a.road.id === n.roadId);
    if (!av) return [];
    const entry = pointAt(av.trunk, 30);
    const base = ps ? { pos: ps.pos, tan: ps.tan, key: ps.key } : { pos: entry.p, tan: entry.tan, key: `${n.roadId}:entry` };
    const k = count.get(base.key) ?? 0;
    count.set(base.key, k + 1);
    const side = { x: -base.tan.z, z: base.tan.x };
    const along = 8 + k * 6;
    return [
      {
        id: n.id,
        text: n.text,
        roadId: n.roadId,
        x: base.pos.x - side.x * (HALF_W + 2.5) + base.tan.x * along,
        y: 4.6,
        z: base.pos.z - side.z * (HALF_W + 2.5) + base.tan.z * along,
      },
    ];
  });
}

/** A goal's destination pin: on the left of your road, at the month you'd arrive (or the road's end). */
export function destinationAnchor(av: Avenue, month: number, branch: 0 | 1, slot = 0): Anchor & { side: { x: number; z: number } } {
  const forked = av.branches && av.forkMonth !== null && month > av.forkMonth;
  const path = forked && av.branches ? av.branches[branch] : av.trunk;
  const { p, tan } = pointAt(path, sAtMonth(path, month) + slot * 9);
  const side = { x: -tan.z, z: tan.x };
  const k = HALF_W + 10;
  return { x: p.x - side.x * k, y: 7.5, z: p.z - side.z * k, side };
}
