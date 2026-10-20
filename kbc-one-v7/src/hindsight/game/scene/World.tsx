"use client";

import { MapWorld } from "./MapWorld";
import { nearest } from "../network";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "../../components/store";
import { dashes, ribbon } from "../geom";
import { gateAnchor } from "../anchors";
import { stripeTexture } from "../labels";
import { MONTH_ARC, monthAngle } from "../everydayRing";
import { DISTRICTS, type District, HALF_W, JUNCTION_R, pointAt, RING_R, ROAD_W, STREET_COLOR } from "../network";
import { useGame } from "../runtime";

const tmp = new THREE.Object3D();

function useBuildingMaterial(lit: number) {
  const uniform = useMemo(() => ({ value: lit }), []);
  useEffect(() => {
    uniform.value = lit;
  }, [lit, uniform]);
  return useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: "#1a2740", roughness: 0.85, metalness: 0.15 });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uLit = uniform;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nattribute vec3 aWin;\nattribute float aSeed;\nvarying vec3 vHsWorld;\nvarying vec3 vHsNormal;\nvarying vec3 vWin;\nvarying float vSeed;",
        )
        .replace(
          "#include <project_vertex>",
          `#include <project_vertex>
          #ifdef USE_INSTANCING
            vHsWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
            vHsNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
          #else
            vHsWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
            vHsNormal = normalize(mat3(modelMatrix) * objectNormal);
          #endif
          vWin = aWin;
          vSeed = aSeed;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float uLit;\nvarying vec3 vHsWorld;\nvarying vec3 vHsNormal;\nvarying vec3 vWin;\nvarying float vSeed;",
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          {
            float side = 1.0 - step(0.5, abs(vHsNormal.y));
            float cx = abs(vHsNormal.x) > abs(vHsNormal.z) ? vHsWorld.z : vHsWorld.x;
            float fy = fract(vHsWorld.y / 3.4);
            float fx = fract(cx / 2.8);
            float win = step(0.32, fy) * step(fy, 0.74) * step(0.24, fx) * step(fx, 0.76);
            float cell = floor(cx / 2.8) * 12.9898 + floor(vHsWorld.y / 3.4) * 78.233 + vSeed * 3.7;
            float lit = step(1.0 - uLit, fract(sin(cell) * 43758.5453));
            float ground = step(2.0, vHsWorld.y);
            totalEmissiveRadiance += vWin * win * lit * side * ground * 1.6;
            float roof = step(0.9, vHsNormal.y);
            totalEmissiveRadiance += vWin * roof * 0.04;
          }`,
        );
    };
    m.customProgramCacheKey = () => "hs-building";
    return m;
  }, [uniform]);
}

function Buildings() {
  const { dressing } = useGame();
  const { stamps, roads } = useStore();
  const ref = useRef<THREE.InstancedMesh>(null);
  const list = dressing.buildings;
  // the tower in the square is building 0
  const all = useMemo(
    () => [{ x: 0, z: 0, w: 18, d: 18, h: 12, rot: Math.PI / 4, district: "home" as District, seed: 7 }, ...list],
    [list],
  );
  const completedDistricts = new Set(stamps.map((s) => roads.find((r) => r.id === s.roadId)?.family));
  const material = useBuildingMaterial(0.42 + Math.min(0.3, stamps.length * 0.06));
  const geom = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.translate(0, 0.5, 0);
    const win = new Float32Array(all.length * 3);
    const seed = new Float32Array(all.length);
    all.forEach((b, i) => {
      const c = new THREE.Color(DISTRICTS[b.district].window);
      win.set([c.r, c.g, c.b], i * 3);
      seed[i] = b.seed;
    });
    g.setAttribute("aWin", new THREE.InstancedBufferAttribute(win, 3));
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    return g;
  }, [all]);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    all.forEach((b, i) => {
      tmp.position.set(b.x, 0, b.z);
      tmp.rotation.set(0, b.rot, 0);
      tmp.scale.set(b.w, b.h, b.d);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [all]);

  useEffect(() => {
    // completed districts glow brighter
    const attr = geom.getAttribute("aWin") as THREE.InstancedBufferAttribute;
    all.forEach((b, i) => {
      const c = new THREE.Color(DISTRICTS[b.district].window);
      if (completedDistricts.has(b.district)) c.multiplyScalar(1.6);
      attr.setXYZ(i, c.r, c.g, c.b);
    });
    attr.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geom, material, all.length]} frustumCulled={false} />;
}

function Trees() {
  const { dressing } = useGame();
  const crowns = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const list = dressing.trees;
  useEffect(() => {
    list.forEach((t, i) => {
      tmp.position.set(t.x, 1.6 * t.s, t.z);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(t.s, t.s, t.s);
      tmp.updateMatrix();
      trunks.current?.setMatrixAt(i, tmp.matrix);
      tmp.position.set(t.x, 4.6 * t.s, t.z);
      tmp.updateMatrix();
      crowns.current?.setMatrixAt(i, tmp.matrix);
    });
    if (crowns.current) {
      crowns.current.instanceMatrix.needsUpdate = true;
      crowns.current.computeBoundingSphere();
    }
    if (trunks.current) {
      trunks.current.instanceMatrix.needsUpdate = true;
      trunks.current.computeBoundingSphere();
    }
  }, [list]);
  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, undefined, list.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.35, 0.45, 3.2, 6]} />
        <meshStandardMaterial color="#2a2a2a" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, list.length]} frustumCulled={false}>
        <coneGeometry args={[2.6, 6, 7]} />
        <meshStandardMaterial color="#1c3f3c" roughness={0.9} emissive="#0d2a28" emissiveIntensity={0.6} />
      </instancedMesh>
    </>
  );
}

function Lamps() {
  const { dressing } = useGame();
  const poles = useRef<THREE.InstancedMesh>(null);
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const list = dressing.lamps;
  useEffect(() => {
    list.forEach((l, i) => {
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      tmp.position.set(l.x, 3.2, l.z);
      tmp.updateMatrix();
      poles.current?.setMatrixAt(i, tmp.matrix);
      tmp.position.set(l.x, 6.6, l.z);
      tmp.updateMatrix();
      bulbs.current?.setMatrixAt(i, tmp.matrix);
    });
    for (const m of [poles.current, bulbs.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [list]);
  return (
    <>
      <instancedMesh ref={poles} args={[undefined, undefined, list.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.12, 0.16, 6.4, 5]} />
        <meshStandardMaterial color="#2a3a55" />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[undefined, undefined, list.length]} frustumCulled={false}>
        <sphereGeometry args={[0.42, 8, 6]} />
        <meshBasicMaterial color="#ffe7b0" toneMapped={false} />
      </instancedMesh>
    </>
  );
}

function Roads() {
  const { net } = useGame();
  const { roads } = useStore();
  const { asphalt, edges, centre } = useMemo(() => {
    const asphalt = ribbon(net.paths.map((p) => ({ pts: p.pts, offset: 0, width: ROAD_W, y: 0.02 })));
    const edgeParts = net.paths.flatMap((p) => {
      const road = roads.find((r) => r.id === p.roadId);
      const hue = new THREE.Color(
        p.branch === "ring" ? "#D8C9A3" : p.street ? STREET_COLOR[p.street] : road?.care ? "#B7B0DA" : road?.status === "pending" ? "#F3A93C" : (road?.hue ?? "#C9C2AE"),
      );
      hue.multiplyScalar(p.branch === "ring" ? 0.95 : 1.1);
      return [
        { pts: p.pts, offset: HALF_W - 0.45, width: 0.35, y: 0.05, color: hue },
        { pts: p.pts, offset: -(HALF_W - 0.45), width: 0.35, y: 0.05, color: hue },
      ];
    });
    return { asphalt, edges: ribbon(edgeParts), centre: dashes(net.paths) };
  }, [net, roads]);
  return (
    <>
      <mesh geometry={asphalt} receiveShadow>
        <meshStandardMaterial color="#131d30" roughness={0.75} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={edges}>
        <meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {net.junctions.map((j) => (
        <mesh key={`${j.x}:${j.z}`} rotation={[-Math.PI / 2, 0, 0]} position={[j.x, 0.015, j.z]}>
          <circleGeometry args={[JUNCTION_R, 32]} />
          <meshStandardMaterial color="#131d30" roughness={0.75} />
        </mesh>
      ))}
      <mesh geometry={centre}>
        <meshBasicMaterial color="#c9c2ae" transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function AvenueGates() {
  const { net } = useGame();
  const { roads } = useStore();
  return (
    <>
      {net.avenues.map((av) => {
        const road = roads.find((r) => r.id === av.road.id) ?? av.road;
        const g = gateAnchor(av);
        const perp = { x: -g.tan.z, z: g.tan.x };
        const color = road.care ? "#B7B0DA" : road.status === "pending" ? "#F3A93C" : road.hue;
        const end = av.branches ? av.branches : [av.trunk];
        return (
          <group key={av.road.id}>
            {/* gantry over the on-ramp; its name is shown by the label layer */}
            {[-1, 1].map((k) => (
              <mesh key={k} position={[g.x + perp.x * (HALF_W + 0.6) * k, 4.5, g.z + perp.z * (HALF_W + 0.6) * k]}>
                <boxGeometry args={[0.5, 9, 0.5]} />
                <meshStandardMaterial color="#22385A" />
              </mesh>
            ))}
            <mesh position={[g.x, 8.6, g.z]} rotation={[0, Math.atan2(g.tan.x, g.tan.z), 0]}>
              <boxGeometry args={[ROAD_W + 1.6, 0.5, 0.5]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            {road.status === "pending" && <Barrier x={g.x} z={g.z} rot={Math.atan2(g.tan.x, g.tan.z)} />}
            {end.map((path) => {
              const q = pointAt(path, path.length - 1);
              return (
                <group key={path.id} position={[q.p.x, 0, q.p.z]} rotation={[0, Math.atan2(q.tan.x, q.tan.z), 0]}>
                  <mesh position={[0, 0.6, 0]}>
                    <boxGeometry args={[ROAD_W, 1.2, 0.6]} />
                    <meshBasicMaterial color={color} toneMapped={false} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}
    </>
  );
}

function Barrier({ x, z, rot }: { x: number; z: number; rot: number }) {
  const stripes = useMemo(() => {
    const t = stripeTexture().clone();
    t.repeat.set(6, 1);
    t.needsUpdate = true;
    return t;
  }, []);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 1.4, 2]}>
        <boxGeometry args={[ROAD_W, 1.4, 0.4]} />
        <meshBasicMaterial map={stripes} toneMapped={false} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (HALF_W - 0.5), 2.6, 2]}>
          <sphereGeometry args={[0.4, 8, 6]} />
          <meshBasicMaterial color="#F3A93C" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** The year clock on the square side of the ring: twelve month arcs, this month lit. */
function YearClock() {
  const { life } = useStore();
  const now = life.today.cal.month;
  const arcs = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) => {
        const a0 = monthAngle(m, 0.04);
        const len = MONTH_ARC * 0.92;
        // three.js ring angles run counter-clockwise from +x in the XY plane; rotated flat, +y maps to −z
        return { m, start: -a0 - len, len };
      }),
    [],
  );
  return (
    <group>
      {arcs.map((a) => (
        <mesh key={a.m} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[RING_R - HALF_W - 3.2, RING_R - HALF_W - 1.6, 24, 1, a.start, a.len]} />
          <meshBasicMaterial color={a.m === now ? "#D8C9A3" : "#4a4433"} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Square() {
  const crown = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (crown.current) crown.current.rotation.y += dt * 0.3;
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[RING_R - HALF_W - 1, 64]} />
        <meshStandardMaterial color="#0e1a2c" roughness={0.9} />
      </mesh>
      {[34, 70, 96].map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[r, r + 0.4, 96]} />
          <meshBasicMaterial color="#1f4a5c" toneMapped={false} />
        </mesh>
      ))}
      <mesh ref={crown} position={[0, 134, 0]}>
        <torusGeometry args={[12, 0.8, 8, 48]} />
        <meshBasicMaterial color="#5ED4E8" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Bird's-eye overlay: thick glowing roads, only in map view (names come from the label layer). */
export function MapOverlay() {
  const { net, mapView, setHoverRoad, travelTo } = useGame();
  const { roads, road: own } = useStore();
  const geom = useMemo(
    () =>
      ribbon(
        net.paths.map((p) => {
          const road = roads.find((r) => r.id === p.roadId);
          const hue = new THREE.Color(
            p.branch === "ring" ? "#D8C9A3" : p.street ? STREET_COLOR[p.street] : road?.care ? "#B7B0DA" : road?.status === "pending" ? "#F3A93C" : (road?.hue ?? "#C9C2AE"),
          );
          if (p.roadId && p.roadId !== own.id) hue.multiplyScalar(0.75);
          return { pts: p.pts, offset: 0, width: p.roadId === own.id ? 30 : 20, y: 1.2, color: hue };
        }),
      ),
    [net, roads, own.id],
  );
  if (!mapView) return null;
  return (
    <mesh geometry={geom}
      onPointerMove={(event) => { event.stopPropagation(); setHoverRoad(nearest(net, event.point.x, event.point.z).roadId); }}
      onPointerOut={() => setHoverRoad(null)}
      onClick={(event) => { event.stopPropagation(); const road = nearest(net, event.point.x, event.point.z).roadId; if (road) travelTo({ kind: "journey", id: road }); }}
    >
      <meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function World() {
  return <MapWorld />;
}

function LegacyWorld() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[1400, 64]} />
        <meshStandardMaterial color="#08111d" roughness={1} />
      </mesh>
      <Square />
      <YearClock />
      <Roads />
      <Buildings />
      <Trees />
      <Lamps />
      <AvenueGates />
    </>
  );
}

