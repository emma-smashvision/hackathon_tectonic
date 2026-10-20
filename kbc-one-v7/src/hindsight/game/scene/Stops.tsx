"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { readiness } from "../../engine/game";
import type { ForkDef } from "../../engine/types";
import { useLiveNotes } from "../../components/phone/useLiveNotes";
import { useStore } from "../../components/store";
import { type Anchor, BEACON_H, destinationAnchor, forkBranchAnchor, noteAnchors, stopAnchor } from "../anchors";
import { dayAngle, everydayAnchorAt, everydayAngles, ringAt } from "../everydayRing";
import { ribbon, slice } from "../geom";
import { stripeTexture } from "../labels";
import { type Avenue, HALF_W, MONTH_LEN, type PlacedStop, pointAt, ROAD_W, sAtMonth } from "../network";
import { useGame } from "../runtime";

// Physical stops. There is deliberately NO text in the 3D scene: text drawn into the world
// can be hidden behind buildings, lamp posts and cars. Every readable word lives in the
// label layer (hud/WorldLabels.tsx), pinned above the beacons placed here.

function pathFor(av: Avenue, branch: PlacedStop["branch"]) {
  if (branch === "trunk" || !av.branches) return av.trunk;
  return branch === "a" ? av.branches[0] : av.branches[1];
}

/** A glowing beacon where a sign stands. */
function Beacon({ at, color }: { at: Anchor; color: string }) {
  return (
    <group position={[at.x, 0, at.z]}>
      <mesh position={[0, (BEACON_H - 0.6) / 2, 0]}>
        <cylinderGeometry args={[0.14, 0.18, BEACON_H - 0.6, 6]} />
        <meshStandardMaterial color="#2a3a55" />
      </mesh>
      <mesh position={[0, BEACON_H - 0.3, 0]}>
        <sphereGeometry args={[0.55, 12, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Bump({ ps, av, ready, care }: { ps: PlacedStop; av: Avenue; ready: number; care: boolean }) {
  const path = pathFor(av, ps.branch);
  const s = sAtMonth(path, ps.month);
  const paved = ready >= 50;
  const zone = useMemo(() => ribbon([{ pts: slice(path, s - MONTH_LEN * 0.35, s + MONTH_LEN * 0.35), offset: 0, width: ROAD_W - 1, y: 0.035 }]), [path, s]);
  const ridges = useMemo(() => [-4, 0, 4].map((d) => pointAt(path, s + d)), [path, s]);
  const ridgeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lights = useRef<(THREE.Mesh | null)[]>([]);
  const stripes = useMemo(() => {
    const t = stripeTexture().clone();
    t.needsUpdate = true;
    return t;
  }, []);
  useFrame((state, dt) => {
    const target = paved || care ? 0.05 : 1;
    for (const r of ridgeRefs.current) if (r) r.scale.y += (target - r.scale.y) * Math.min(1, dt * 3);
    const on = Math.sin(state.clock.elapsedTime * 5) > 0;
    for (const l of lights.current) if (l) l.visible = paved || care ? true : on;
  });
  const side = { x: -ps.tan.z, z: ps.tan.x };
  const color = care ? "#B7B0DA" : paved ? "#7FD6A8" : "#F3A93C";
  return (
    <group>
      <mesh geometry={zone}>
        {paved || care ? (
          <meshBasicMaterial color={care ? "#3d3a5e" : "#1f5a45"} transparent opacity={0.8} side={THREE.DoubleSide} />
        ) : (
          <meshBasicMaterial map={stripes} transparent opacity={0.85} side={THREE.DoubleSide} />
        )}
      </mesh>
      {ridges.map((r, i) => (
        <mesh
          key={i}
          ref={(m) => {
            ridgeRefs.current[i] = m;
          }}
          position={[r.p.x, 0.25, r.p.z]}
          rotation={[0, Math.atan2(r.tan.x, r.tan.z), 0]}
        >
          <boxGeometry args={[ROAD_W - 1.6, 0.5, 0.9]} />
          <meshStandardMaterial color={paved ? "#2c6e57" : "#4a3613"} emissive={paved ? "#1f5a45" : "#3a2508"} />
        </mesh>
      ))}
      {[-1, 1].map((k, i) => (
        <mesh
          key={k}
          ref={(m) => {
            lights.current[i] = m;
          }}
          position={[ps.pos.x + side.x * (HALF_W + 0.8) * k, 1, ps.pos.z + side.z * (HALF_W + 0.8) * k]}
        >
          <coneGeometry args={[0.5, 1.6, 6]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
      <Beacon at={stopAnchor(ps)} color={color} />
    </group>
  );
}

function Boost({ ps }: { ps: PlacedStop }) {
  const coin = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (coin.current) {
      coin.current.rotation.y = state.clock.elapsedTime * 1.6;
      coin.current.position.y = 8.4 + Math.sin(state.clock.elapsedTime * 2) * 0.4;
    }
  });
  const rot = Math.atan2(ps.tan.x, ps.tan.z);
  return (
    <group position={[ps.pos.x, 0, ps.pos.z]} rotation={[0, rot, 0]}>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * (HALF_W + 0.4), 3.5, 0]}>
          <boxGeometry args={[0.7, 7, 0.7]} />
          <meshBasicMaterial color="#7FD6A8" toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 7.2, 0]}>
        <boxGeometry args={[ROAD_W + 1.5, 0.6, 0.7]} />
        <meshBasicMaterial color="#7FD6A8" toneMapped={false} />
      </mesh>
      <group ref={coin} position={[0, 8.4, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.1, 1.1, 0.25, 20]} />
          <meshBasicMaterial color="#c8f5dd" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Milestone({ ps, done }: { ps: PlacedStop; done: boolean }) {
  return (
    <group>
      <mesh position={[ps.pos.x, 0.04, ps.pos.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.7, 32]} />
        <meshBasicMaterial color="#5ED4E8" toneMapped={false} transparent opacity={0.7} />
      </mesh>
      <Beacon at={stopAnchor(ps)} color={done ? "#7FD6A8" : "#5ED4E8"} />
    </group>
  );
}

function Fork({ ps, av, chosen }: { ps: PlacedStop; av: Avenue; chosen?: string }) {
  const fork = ps.stop as ForkDef;
  if (!av.branches) return null;
  return (
    <group>
      {([0, 1] as const).map((i) => {
        const at = forkBranchAnchor(av, i);
        if (!at) return null;
        const color = chosen === fork.branches[i].id ? "#7FD6A8" : i === 0 ? "#F3A93C" : "#5ED4E8";
        return <Beacon key={i} at={at} color={color} />;
      })}
      <mesh position={[ps.pos.x, 0.05, ps.pos.z]} rotation={[-Math.PI / 2, 0, Math.atan2(ps.tan.x, ps.tan.z)]}>
        <ringGeometry args={[3, 3.6, 4]} />
        <meshBasicMaterial color="#EDE7D7" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Notes left by other drivers: a small green post beside the stop. */
function TrailMarkers() {
  const { net, hud } = useGame();
  const notes = useLiveNotes(hud.roadId ?? "");
  const placed = useMemo(() => noteAnchors(net, notes), [notes, net]);
  return (
    <>
      {placed.map((m) => (
        <group key={m.id} position={[m.x, 0, m.z]}>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 4, 5]} />
            <meshStandardMaterial color="#2a6a50" />
          </mesh>
          <mesh position={[0, 4.1, 0]}>
            <sphereGeometry args={[0.35, 8, 6]} />
            <meshBasicMaterial color="#7FD6A8" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Hide things far from the camera: the fog hides them anyway, the GPU doesn't need to draw them. */
function Cull({ x, z, children, range = 430 }: { x: number; z: number; children: React.ReactNode; range?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (!ref.current) return;
    const far = camera.position.y > 300; // bird's eye: show everything
    ref.current.visible = far || Math.hypot(camera.position.x - x, camera.position.z - z) < range;
  });
  return <group ref={ref}>{children}</group>;
}

/** The Everyday Road's stops for the next twelve months, on the inside of the ring. */
function EverydayStops() {
  const { life } = useStore();
  const list = life.upcoming.filter((u) => u.scope === "everyday");
  const angles = everydayAngles(list.map((u) => ({ key: u.ref.key, month: u.cal.month, day: u.day })));
  return (
    <>
      {list.map((u) => {
        const a = everydayAnchorAt(angles.get(u.ref.key) ?? 0);
        const g = ringAt(a.angle);
        const color = u.kind === "bump" ? (u.ready >= 50 ? "#7FD6A8" : "#F3A93C") : u.kind === "boost" ? "#7FD6A8" : "#5ED4E8";
        return (
          <group key={u.ref.key}>
            <mesh position={[g.x, 0.06, g.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.7, 2.3, 24]} />
              <meshBasicMaterial color="#D8C9A3" toneMapped={false} transparent opacity={0.85} />
            </mesh>
            <Beacon at={a} color={color} />
          </group>
        );
      })}
    </>
  );
}

/** Today on the Everyday Road: a soft column of light where the year is now. */
function TodayMarker() {
  const { life } = useStore();
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.sin(state.clock.elapsedTime * 2) * 0.06;
  });
  const a = dayAngle(life.today.cal.month, life.today.day);
  const p = ringAt(a);
  return (
    <group position={[p.x, 0, p.z]}>
      <mesh ref={ref} position={[0, 9, 0]}>
        <cylinderGeometry args={[2.4, 2.4, 18, 20, 1, true]} />
        <meshBasicMaterial color="#D8C9A3" transparent opacity={0.25} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.6, 3.4, 32]} />
        <meshBasicMaterial color="#D8C9A3" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Your goals as destination pins along your road. */
function DestinationPins() {
  const { net } = useGame();
  const { road, life, journey } = useStore();
  const pins = useRef<(THREE.Group | null)[]>([]);
  useFrame((state) => {
    pins.current.forEach((g, i) => {
      if (g) g.position.y = Math.sin(state.clock.elapsedTime * 1.4 + i) * 0.35;
    });
  });
  const av = net.avenues.find((a) => a.road.id === road.id);
  if (!av || road.care) return null;
  const fork = road.fork;
  const branch = fork && journey.forkChoice[fork.id] === fork.branches[1].id ? 1 : 0;
  return (
    <>
      {life.goals.map((g, i) => {
        if (g.etaMonths == null) return null;
        const month = Math.min(road.months - 0.4, journey.month + Math.max(0.6, g.etaMonths));
        const at = destinationAnchor(av, month, branch, i);
        return (
          <group key={g.id} position={[at.x, 0, at.z]}>
            <group
              ref={(m) => {
                pins.current[i] = m;
              }}
            >
              <mesh position={[0, 3, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 6, 6]} />
                <meshStandardMaterial color="#2a3a55" />
              </mesh>
              <mesh position={[0, 6.6, 0]}>
                <sphereGeometry args={[1, 16, 12]} />
                <meshBasicMaterial color={g.reached ? "#7FD6A8" : "#5ED4E8"} toneMapped={false} />
              </mesh>
            </group>
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.4, 1.9, 24]} />
              <meshBasicMaterial color="#5ED4E8" toneMapped={false} transparent opacity={0.7} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

export function Stops() { return null; }

function LegacyStops() {
  const { net } = useGame();
  const { roads, journeyFor } = useStore();
  return (
    <>
      <TrailMarkers />
      <EverydayStops />
      <TodayMarker />
      <DestinationPins />
      {net.stops.map((ps) => {
        const av = net.avenues.find((a) => a.road.id === ps.roadId);
        const road = roads.find((r) => r.id === ps.roadId);
        if (!av || !road) return null;
        const j = journeyFor(road.id);
        if (road.care && !j.careOptIn) return null;
        const done = ps.stop.kind === "fork" ? [] : (j.done[ps.stop.id] ?? []);
        const inner =
          ps.stop.kind === "fork" ? (
            <Fork ps={ps} av={av} chosen={j.forkChoice[ps.stop.id]} />
          ) : ps.stop.kind === "bump" ? (
            <Bump ps={ps} av={av} ready={readiness(ps.stop, done)} care={road.care} />
          ) : ps.stop.kind === "boost" ? (
            <Boost ps={ps} />
          ) : (
            <Milestone ps={ps} done={done.length > 0} />
          );
        return (
          <Cull key={ps.key} x={ps.pos.x} z={ps.pos.z}>
            {inner}
          </Cull>
        );
      })}
    </>
  );
}
