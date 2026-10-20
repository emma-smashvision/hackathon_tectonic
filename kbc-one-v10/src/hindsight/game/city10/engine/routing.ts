import { nearest, type CityNet, type Vec2 } from "./network";
export const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
export type RoadGraph = { points: Vec2[]; edges: Map<number, number>[]; pathNodes: Map<string, number[]> };
/** v6 polylines become a connected, bidirectional navigation graph. Entrances
 * project onto the ring, including chords whose endpoint lies between samples. */
export function buildGraph(net: CityNet): RoadGraph {
  const points: Vec2[] = [], edges: Map<number, number>[] = [], pathNodes = new Map<string, number[]>();
  const add = (p: Vec2) => { const id = points.length; points.push(p); edges.push(new Map()); return id; };
  const link = (a: number, b: number) => { const d = distance(points[a], points[b]); edges[a].set(b, d); edges[b].set(a, d); };
  for (const path of net.paths) {
    const ids = path.pts.map(add); pathNodes.set(path.id, ids);
    for (let i = 1; i < ids.length; i++) link(ids[i - 1], ids[i]);
  }
  const ring = pathNodes.get(net.ring.id)!; link(ring[0], ring[ring.length - 1]);
  for (const path of net.paths.filter(p => p !== net.ring)) {
    const ids = pathNodes.get(path.id)!;
    for (const end of [ids[0], ids[ids.length - 1]]) {
      const p = points[end];
      const n = nearest(net, p.x, p.z, other => other !== path);
      if (n.dist > 1) continue;
      const other = pathNodes.get(n.path.id)!;
      // Add the projected junction to both neighbouring graph vertices.
      const j = add(n.point); link(end, j); link(j, other[n.seg]); link(j, other[n.seg + 1]);
    }
  }
  return { points, edges, pathNodes };
}
export function routeTo(net: CityNet, graph: RoadGraph, from: Vec2, to: Vec2): Vec2[] {
  const start = nearest(net, from.x, from.z), end = nearest(net, to.x, to.z);
  if (start.path === end.path && start.seg === end.seg) return [start.point, end.point];
  const d = graph.points.map(() => Infinity), previous = graph.points.map(() => -1), visited = new Set<number>();
  const starts = graph.pathNodes.get(start.path.id)!;
  for (const id of [starts[start.seg], starts[start.seg + 1]]) d[id] = distance(start.point, graph.points[id]);
  const ends = graph.pathNodes.get(end.path.id)!;
  let best = -1, bestCost = Infinity;
  while (visited.size < graph.points.length) {
    let id = -1, cost = Infinity;
    for (let i = 0; i < d.length; i++) if (!visited.has(i) && d[i] < cost) { id = i; cost = d[i]; }
    if (id < 0 || cost > bestCost) break;
    visited.add(id);
    if (id === ends[end.seg] || id === ends[end.seg + 1]) {
      const total = cost + distance(graph.points[id], end.point);
      if (total < bestCost) { best = id; bestCost = total; }
    }
    for (const [next, weight] of graph.edges[id]) if (cost + weight < d[next]) { d[next] = cost + weight; previous[next] = id; }
  }
  if (best < 0) return [];
  const ids: number[] = []; for (let id = best; id >= 0; id = previous[id]) ids.push(id);
  const route = [start.point, ...ids.reverse().map(id => graph.points[id]), end.point];
  return route.filter((p, i) => i === 0 || distance(p, route[i - 1]) > .05);
}

/** Connect an off-road car to the road without driving through a building. */
export function approachRoad(from: Vec2, to: Vec2, boxes: readonly import('./driving').Collider[]): Vec2[] {
  if (distance(from, to) < .1) return [to];
  const local = boxes.filter(b => b.x + b.w + b.d > Math.min(from.x, to.x) - 25 && b.x - b.w - b.d < Math.max(from.x, to.x) + 25 && b.z + b.w + b.d > Math.min(from.z, to.z) - 25 && b.z - b.w - b.d < Math.max(from.z, to.z) + 25);
  const clear = (a: Vec2, b: Vec2) => local.every(box => {
    const cos = Math.cos(box.rot), sin = Math.sin(box.rot);
    const ax = (a.x - box.x) * cos - (a.z - box.z) * sin, az = (a.x - box.x) * sin + (a.z - box.z) * cos;
    const bx = (b.x - box.x) * cos - (b.z - box.z) * sin, bz = (b.x - box.x) * sin + (b.z - box.z) * cos;
    let lo = 0, hi = 1;
    for (const [start, delta, half] of [[ax, bx - ax, box.w / 2 + 1.15], [az, bz - az, box.d / 2 + 1.15]]) {
      if (Math.abs(delta) < 1e-7) { if (Math.abs(start) >= half) return true; }
      else { const t0 = (-half - start) / delta, t1 = (half - start) / delta; lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1)); }
    }
    return lo >= hi;
  });
  if (clear(from, to)) return [from, to];
  const points = [from, to];
  for (const box of local) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (box.w / 2 + 2), z = sz * (box.d / 2 + 2), cos = Math.cos(box.rot), sin = Math.sin(box.rot);
    const p = { x: box.x + x * cos + z * sin, z: box.z - x * sin + z * cos };
    if (clear(p, p)) points.push(p);
  }
  const costs = points.map(() => Infinity), prev = points.map(() => -1), used = new Set<number>(); costs[0] = 0;
  while (used.size < points.length) {
    let at = -1, cost = Infinity;
    for (let i = 0; i < points.length; i++) if (!used.has(i) && costs[i] < cost) { at = i; cost = costs[i]; }
    if (at < 0) return [];
    if (at === 1) { const route: Vec2[] = []; for (let i = 1; i >= 0; i = prev[i]) route.push(points[i]); return route.reverse(); }
    used.add(at);
    for (let i = 0; i < points.length; i++) if (!used.has(i) && clear(points[at], points[i])) {
      const next = cost + distance(points[at], points[i]); if (next < costs[i]) { costs[i] = next; prev[i] = at; }
    }
  }
  return [];
}
