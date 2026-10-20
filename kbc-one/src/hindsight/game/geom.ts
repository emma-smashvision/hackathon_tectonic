import * as THREE from "three";
import type { Path, Vec2 } from "./network";

// Ribbon geometry along a polyline (roads, edge lines, bump zones).

interface RibbonPart {
  pts: Vec2[];
  /** lateral offset of the ribbon centre from the polyline */
  offset: number;
  width: number;
  y: number;
  color?: THREE.Color;
}

function normals(pts: Vec2[]): Vec2[] {
  return pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l = Math.hypot(dx, dz) || 1;
    return { x: -dz / l, z: dx / l };
  });
}

export function ribbon(parts: RibbonPart[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let base = 0;
  for (const part of parts) {
    const ns = normals(part.pts);
    let along = 0;
    const c = part.color ?? new THREE.Color(1, 1, 1);
    for (let i = 0; i < part.pts.length; i++) {
      if (i > 0) along += Math.hypot(part.pts[i].x - part.pts[i - 1].x, part.pts[i].z - part.pts[i - 1].z);
      const p = part.pts[i];
      const n = ns[i];
      const l = part.offset - part.width / 2;
      const r = part.offset + part.width / 2;
      pos.push(p.x + n.x * l, part.y, p.z + n.z * l, p.x + n.x * r, part.y, p.z + n.z * r);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      uv.push(0, along / part.width, 1, along / part.width);
      if (i > 0) {
        const a = base + (i - 1) * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    base += part.pts.length * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Dashed centre line as separate quads. */
export function dashes(paths: Path[], every = 7, dash = 3, width = 0.35, y = 0.04): THREE.BufferGeometry {
  const parts: RibbonPart[] = [];
  for (const path of paths) {
    for (let s = 2; s < path.length - dash; s += every) {
      const pts: Vec2[] = [];
      for (let k = 0; k <= 1; k++) {
        const target = s + dash * k;
        let i = 0;
        while (i < path.cum.length - 2 && path.cum[i + 1] < target) i++;
        const t = (target - path.cum[i]) / (path.cum[i + 1] - path.cum[i] || 1);
        const a = path.pts[i];
        const b = path.pts[i + 1];
        pts.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      }
      parts.push({ pts, offset: 0, width, y });
    }
  }
  return ribbon(parts);
}

/** Slice of a path between two arc lengths. */
export function slice(path: Path, s0: number, s1: number, step = 1.5): Vec2[] {
  const out: Vec2[] = [];
  const a = Math.max(0, s0);
  const b = Math.min(path.length, s1);
  for (let s = a; s <= b + 1e-6; s += step) {
    let i = 0;
    while (i < path.cum.length - 2 && path.cum[i + 1] < s) i++;
    const t = (s - path.cum[i]) / (path.cum[i + 1] - path.cum[i] || 1);
    const p = path.pts[i];
    const q = path.pts[i + 1];
    out.push({ x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t });
  }
  return out;
}
