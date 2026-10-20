"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { hashSeed, mulberry32 } from "../../engine/rng";
import { statsFor } from "../../engine/simulate";
import { useStore } from "../../components/store";
import { type Path, pointAt, sAtMonth } from "../network";
import { useGame } from "../runtime";

// Ghost cars: the people on each road right now. More cars where the crowd is bigger.
// They slow down at bumps, and the share of the crowd that got hit there bounces.

interface Ghost {
  trunk: Path;
  branches: [Path, Path] | null;
  path: Path;
  s: number;
  v: number;
  bounce: number;
  rand: () => number;
  bumps: { path: Path; s: number; hit: number }[];
  care: boolean;
  share: number;
}

const tmp = new THREE.Object3D();

export function Ghosts() {
  const { net, rt } = useGame();
  const { roads } = useStore();
  const ref = useRef<THREE.InstancedMesh>(null);
  const lights = useRef<THREE.InstancedMesh>(null);
  const ghosts = useMemo(() => {
    const list: Ghost[] = [];
    for (const av of net.avenues) {
      const road = roads.find((r) => r.id === av.road.id) ?? av.road;
      if (road.status !== "live") continue;
      const rand = mulberry32(hashSeed(`ghosts:${road.id}`));
      const paths = av.branches ? [av.trunk, ...av.branches] : [av.trunk];
      const bumps = road.stops
        .filter((s) => s.kind === "bump")
        .flatMap((s) => {
          const st = statsFor(road, s);
          const hit = st.kind === "bump" ? (st.hitRate.value ?? 0.2) : 0;
          return paths.filter((p) => s.month >= p.months[0] && s.month <= p.months[p.months.length - 1]).map((p) => ({ path: p, s: sAtMonth(p, s.month), hit }));
        });
      const count = Math.max(6, Math.min(34, Math.round(road.current / 260)));
      for (let i = 0; i < count; i++) {
        const path = av.trunk;
        const total = av.trunk.length;
        list.push({
          trunk: av.trunk,
          branches: av.branches,
          path,
          s: rand() * total,
          v: (road.care ? 5 : 8) + rand() * 6,
          bounce: 0,
          rand,
          bumps,
          care: road.care,
          share: road.fork ? road.fork.branches[0].share : 0.5,
        });
      }
    }
    return list;
  }, [net, roads]);

  useEffect(() => {
    ref.current?.computeBoundingSphere();
  }, []);

  useFrame((_, dt) => {
    const mesh = ref.current;
    const tail = lights.current;
    if (!mesh || !tail) return;
    const d = Math.min(dt, 0.05);
    ghosts.forEach((g, i) => {
      // slow down around bumps
      let slow = 1;
      for (const b of g.bumps) {
        if (b.path !== g.path) continue;
        const ahead = b.s - g.s;
        if (ahead > -6 && ahead < 18) slow = Math.min(slow, 0.45);
        if (ahead <= 0 && ahead > -g.v * d * 1.2 && g.rand() < b.hit) g.bounce = 0.7;
      }
      g.s += g.v * slow * d;
      if (g.s >= g.path.length) {
        if (g.path === g.trunk && g.branches) {
          g.path = g.rand() < g.share ? g.branches[0] : g.branches[1];
          g.s = 0;
        } else {
          g.path = g.trunk;
          g.s = 0;
          g.v = (g.care ? 5 : 8) + g.rand() * 6;
        }
      }
      g.bounce = Math.max(0, g.bounce - d);
      const { p, tan } = pointAt(g.path, g.s);
      const lane = 2.4;
      const x = p.x - tan.z * lane;
      const z = p.z + tan.x * lane;
      const y = 0.6 + (g.bounce > 0 ? Math.abs(Math.sin(g.bounce * 14)) * 0.9 : 0);
      tmp.position.set(x, y, z);
      tmp.rotation.set(g.bounce > 0 ? Math.sin(g.bounce * 14) * 0.15 : 0, Math.atan2(tan.x, tan.z), 0);
      // fade out of the way when you drive through a ghost
      const close = Math.hypot(x - rt.current.car.x, z - rt.current.car.z);
      const sc = close < 12 ? Math.max(0.001, (close - 4) / 8) : 1;
      tmp.scale.set(sc, sc, sc);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      tmp.position.set(x - tan.x * 1.95 * sc, y + 0.1, z - tan.z * 1.95 * sc);
      tmp.updateMatrix();
      tail.setMatrixAt(i, tmp.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    tail.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, ghosts.length]} frustumCulled={false}>
        <boxGeometry args={[1.8, 0.9, 3.6]} />
        <meshStandardMaterial color="#d9d3c2" emissive="#8a8572" emissiveIntensity={0.7} transparent opacity={0.32} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={lights} args={[undefined, undefined, ghosts.length]} frustumCulled={false}>
        <boxGeometry args={[1.5, 0.25, 0.15]} />
        <meshBasicMaterial color="#ff6b5b" toneMapped={false} />
      </instancedMesh>
    </>
  );
}

