"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { euro, oneIn } from "../../engine/format";
import { readiness } from "../../engine/game";
import { statsFor } from "../../engine/simulate";
import type { StopDef } from "../../engine/types";
import { useStore } from "../../components/store";
import { type Input, NO_INPUT, step } from "../driving";
import { everydayAngles, monthAngle, ringAt, ringDist, ringHeading } from "../everydayRing";
import { MONTH_LEN, type Nearest, nearest, pointAt, sAtMonth, spawnOn } from "../network";
import { type Hud, useGame } from "../runtime";

const MAX_SPEED = 34;
const CARE_SPEED = 14;

function merge(a: Input, b: Input): Input {
  return { up: a.up || b.up, down: a.down || b.down, left: a.left || b.left, right: a.right || b.right, brake: a.brake || b.brake };
}

export function Player() {
  const game = useGame();
  const store = useStore();
  const { net, rt, mapView } = game;
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Mesh[]>([]);
  const spot = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);
  const { camera, scene } = useThree();

  // latest React values for the frame loop
  const live = useRef({ store, game });
  live.current = { store, game };
  const prevNear = useRef<Nearest | null>(null);
  const lastHud = useRef(0);
  const prompted = useRef<{ care: string | null; complete: string | null; closed: number }>({ care: null, complete: null, closed: 0 });
  const sent = useRef<{ month: string; fork: string }>({ month: "", fork: "" });

  // spawn on your own road, at your month (or where the App asked to test-drive)
  const spawnedFor = useRef<string | null>(null);
  useEffect(() => {
    const key = `${store.road.id}:${store.newDriver}`;
    const pending = live.current.store.takePendingDrive();
    if (pending) {
      spawnedFor.current = key;
      rt.current.autopilot = null;
      rt.current.teleport = spawnOn(net, pending.roadId, pending.month);
      return;
    }
    if (spawnedFor.current === key) return;
    spawnedFor.current = key;
    rt.current.autopilot = null;
    const sp = spawnOn(net, store.road.id, store.journey.month);
    rt.current.teleport = sp;
  }, [store.road.id, store.newDriver, store.journey.month, store.pendingDrive, net, rt]);

  /** Pose on an avenue at a month, following the branch you chose at the crossroads. */
  const poseAt = (roadId: string, month: number) => {
    const av = net.avenues.find((a) => a.road.id === roadId);
    if (!av) return null;
    const S = live.current.store;
    const fork = av.road.fork;
    const choice = fork ? S.journeyFor(roadId).forkChoice[fork.id] : undefined;
    const bi = fork && choice === fork.branches[1].id ? 1 : 0;
    const path = av.branches && av.forkMonth !== null && month > av.forkMonth ? av.branches[bi] : av.trunk;
    const { p, tan } = pointAt(path, sAtMonth(path, month));
    return { x: p.x, z: p.z, heading: Math.atan2(tan.x, tan.z), path };
  };

  useEffect(() => {
    if (spot.current && target.current) spot.current.target = target.current;
  }, []);

  // test hook for automated screenshots: /?debug=1
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    const w = window as unknown as { __hindsight?: unknown };
    w.__hindsight = {
      teleport: (roadId: string, month: number, branch: "a" | "b" = "a") => {
        rt.current.teleport = spawnOn(net, roadId, month, branch);
      },
      car: () => ({ ...rt.current.car }),
      ring: (month: number, frac = 0.5) => {
        const a = monthAngle(month, frac);
        rt.current.teleport = { ...ringAt(a), heading: ringHeading(a) };
      },
    };
  }, [net, rt]);

  useFrame((state, dt) => {
    const R = rt.current;
    R.cam = camera;
    const { store: S, game: G } = live.current;
    if (R.teleport) {
      R.car = { ...R.teleport, speed: 0 };
      R.teleport = null;
      prevNear.current = null;
    }
    const input = R.paused || R.autopilot ? { ...NO_INPUT, brake: true } : merge(R.keys, R.touch);
    const curRoad = prevNear.current?.roadId ? S.roads.find((r) => r.id === prevNear.current?.roadId) : undefined;
    const maxSpeed = curRoad?.care ? CARE_SPEED : MAX_SPEED;
    const prevCar = R.car;
    let near: Nearest;
    const ap = R.autopilot;
    if (ap) {
      // salary day: the car drives itself one month along your road
      ap.month = Math.min(ap.to, ap.month + Math.min(dt, 0.25) * 0.75);
      const pose = poseAt(ap.roadId, ap.month);
      if (pose) {
        R.car = { x: pose.x, z: pose.z, heading: pose.heading, speed: 0.75 * MONTH_LEN };
        near = nearest(net, pose.x, pose.z, (p) => p.roadId === ap.roadId);
      } else near = nearest(net, R.car.x, R.car.z);
      if (ap.month >= ap.to || !pose) {
        R.autopilot = null;
        R.car = { ...R.car, speed: 0 };
        G.setPanel({ type: "recap" });
      }
    } else {
      // fixed sub-steps so slow machines still drive at the right speed
      const total = Math.min(dt, 0.25);
      const n = Math.max(1, Math.ceil(total / 0.04));
      let res = step(R.car, input, total / n, net, { maxSpeed, throttle: 1 });
      for (let i = 1; i < n; i++) res = step(res.car, input, total / n, net, { maxSpeed, throttle: 1 });
      near = res.near;

      // a road under review is closed
      const nearRoad = near.roadId ? S.roads.find((r) => r.id === near.roadId) : undefined;
      if (nearRoad && nearRoad.status === "pending" && near.month > -1.1) {
        R.car = { ...prevCar, speed: 0 };
        near = prevNear.current ?? near;
        if (state.clock.elapsedTime - prompted.current.closed > 3) {
          prompted.current.closed = state.clock.elapsedTime;
          G.flash("info", "Closed: this road awaits a human yes. Approve it in the Atlas.");
        }
      } else {
        R.car = res.car;
      }
    }
    R.near = near;

    const prev = prevNear.current;
    const road = near.roadId ? S.roads.find((r) => r.id === near.roadId) : undefined;
    if (road && !Number.isNaN(near.month)) {
      const j = S.journeyFor(road.id);
      if (near.month > 0.3 && !S.explored.includes(road.id)) S.markExplored(road.id);
      // care roads: ask before showing anything
      if (road.care && !j.careOptIn && near.month > -0.8 && prompted.current.care !== road.id && !G.panel) {
        prompted.current.care = road.id;
        G.setPanel({ type: "care", roadId: road.id });
      }
      if (prev && prev.path === near.path && R.car.speed > 0) {
        const from = prev.month;
        const to = near.month;
        for (const ps of G.net.stops) {
          if (ps.roadId !== road.id || ps.stop.kind === "fork") continue;
          if (ps.branch !== "trunk" && ps.branch !== near.branch) continue;
          if (ps.month > from && ps.month <= to) passedStop(road.id, ps.stop, j.done[ps.stop.id] ?? [], road.care);
        }
      }
      // your own road: driving forward is living forward
      if (road.id === S.road.id) {
        const m = Math.floor(near.month + 1e-6);
        const mKey = `${road.id}:${m}`;
        if (m > S.journey.month && sent.current.month !== mKey) {
          sent.current.month = mKey;
          S.setMonth(m);
        }
        if (road.fork && near.branch !== "trunk" && !S.journey.forkChoice[road.fork.id] && sent.current.fork !== road.fork.id) {
          sent.current.fork = road.fork.id;
          S.chooseFork(road.fork.id, road.fork.branches[near.branch === "a" ? 0 : 1].id);
        }
        if (near.month >= road.months - 0.15 && prompted.current.complete !== road.id && !S.stamps.some((x) => x.roadId === road.id)) {
          prompted.current.complete = road.id;
          S.addStamp(road.id);
          G.setPanel({ type: "complete", roadId: road.id });
        }
      }
    }
    prevNear.current = near;

    // ---- visuals ----
    const g = group.current;
    if (g) {
      g.position.set(R.car.x, 0, R.car.z);
      g.rotation.y = R.car.heading;
    }
    R.jolt = Math.max(0, R.jolt - dt);
    if (body.current) {
      body.current.position.y = 0.55 + (R.jolt > 0 ? Math.abs(Math.sin(R.jolt * 22)) * 0.7 : 0);
      body.current.rotation.x = R.jolt > 0 ? Math.sin(R.jolt * 18) * 0.08 : -R.car.speed * 0.0015;
      body.current.rotation.z = (input.left ? 1 : input.right ? -1 : 0) * Math.min(1, Math.abs(R.car.speed) / 30) * -0.04;
    }
    for (const w of wheels.current) if (w) w.rotation.x += (R.car.speed * dt) / 0.55;

    // ---- camera ----
    const fwd = new THREE.Vector3(Math.sin(R.car.heading), 0, Math.cos(R.car.heading));
    const carPos = new THREE.Vector3(R.car.x, 0, R.car.z);
    const k = 1 - Math.exp(-dt * (G.mapView ? 2.2 : 4.5));
    if (G.mapView) {
      const desired = new THREE.Vector3(R.car.x * 0.3, 1050, R.car.z * 0.3 + 380);
      camera.position.lerp(desired, k);
      camera.lookAt(R.car.x * 0.3, 0, R.car.z * 0.3);
      if (scene.fog instanceof THREE.Fog) scene.fog.far += (2600 - scene.fog.far) * k;
    } else {
      const portrait = state.size.width < state.size.height;
      const speedBack = (portrait ? 17 : 13) + Math.abs(R.car.speed) * 0.12;
      const desired = carPos.clone().addScaledVector(fwd, -speedBack).add(new THREE.Vector3(0, (portrait ? 9 : 6) + Math.abs(R.car.speed) * 0.04, 0));
      camera.position.lerp(desired, k);
      if (R.jolt > 0) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * R.jolt, (Math.random() - 0.5) * R.jolt, 0));
      const look = carPos.clone().addScaledVector(fwd, 9).add(new THREE.Vector3(0, 1.6, 0));
      camera.lookAt(look);
      if (scene.fog instanceof THREE.Fog) scene.fog.far += (curRoad?.care && !S.journeyFor(curRoad.id).careOptIn ? 90 - scene.fog.far : 460 - scene.fog.far) * k;
    }

    // ---- HUD, ~10 times a second ----
    if (state.clock.elapsedTime - lastHud.current > 0.1) {
      lastHud.current = state.clock.elapsedTime;
      G.setHud(hudFrom(near, R.car.speed, R.car.heading));
    }
  });

  function passedStop(roadId: string, st: StopDef, done: string[], care: boolean) {
    const { game: G, store: S } = live.current;
    const road = S.roads.find((r) => r.id === roadId);
    if (!road) return;
    const s = statsFor(road, st);
    if (st.kind === "bump" && s.kind === "bump") {
      const r = readiness(st, done);
      if (care) G.flash("info", `${st.short} · you don't have to face this alone`);
      else if (r >= 50) G.flash("paved", `Smooth. You prepared for “${st.short}”.`);
      else {
        rt.current.jolt = 0.7;
        G.flash("hit", `${st.short}! ${s.hitRate.value != null ? `${oneIn(s.hitRate.value)} drivers felt this one.` : ""}`);
      }
    } else if (st.kind === "boost" && s.kind === "boost") {
      G.flash("boost", `${st.short} · ${s.median.value != null ? `+${euro(s.median.value)}` : ""}`);
    } else {
      G.flash("info", st.title);
    }
  }

  function hudFrom(near: Nearest, speed: number, heading: number): Omit<Hud, "flash"> & { flash: null } {
    const { game: G, store: S } = live.current;
    let ring: Hud["ring"] = null;
    if (near.branch === "ring") {
      const c = rt.current.car;
      const at = Math.atan2(c.z, c.x);
      const ev = S.life.upcoming.filter((u) => u.scope === "everyday");
      const angles = everydayAngles(ev.map((u) => ({ key: u.ref.key, month: u.cal.month, day: u.day })));
      for (const u of ev) {
        const d = ringDist(at, angles.get(u.ref.key) ?? 0);
        if (d < 26 && (!ring || d < ring.dist)) ring = { key: u.ref.key, dist: d };
      }
    }
    const forward = Math.sin(heading) * near.tangent.x + Math.cos(heading) * near.tangent.z >= 0;
    let ahead: Hud["ahead"] = null;
    let here: Hud["here"] = null;
    if (near.roadId && !Number.isNaN(near.month)) {
      for (const ps of G.net.stops) {
        if (ps.roadId !== near.roadId) continue;
        if (ps.branch !== "trunk" && ps.branch !== near.branch) continue;
        const diff = ps.month - near.month;
        if (Math.abs(diff) < 0.6 && (!here || Math.abs(diff) < 0.6)) here = { key: ps.key };
        const along = forward ? diff : -diff;
        if (along > 0.05 && along < 3 && (!ahead || along < ahead.months)) ahead = { key: ps.key, months: along };
      }
    }
    return { roadId: near.roadId, branch: near.branch, month: near.month, speed, forward, ahead, here, ring, autopilot: !!rt.current.autopilot, flash: null };
  }

  const wheelPos: [number, number, number][] = [
    [-1.05, 0.05, 1.35],
    [1.05, 0.05, 1.35],
    [-1.05, 0.05, -1.35],
    [1.05, 0.05, -1.35],
  ];
  const care = store.road.care;
  const paint = care ? "#B7B0DA" : "#5ED4E8";

  return (
    <group ref={group}>
      <group ref={body} position={[0, 0.55, 0]}>
        <mesh castShadow position={[0, 0.35, 0]}>
          <boxGeometry args={[2.2, 0.75, 4.4]} />
          <meshStandardMaterial color={paint} metalness={0.4} roughness={0.35} emissive={paint} emissiveIntensity={0.15} />
        </mesh>
        <mesh position={[0, 0.98, -0.25]}>
          <boxGeometry args={[1.8, 0.6, 2.2]} />
          <meshStandardMaterial color="#0b1626" metalness={0.6} roughness={0.2} />
        </mesh>
        {[-0.65, 0.65].map((x) => (
          <mesh key={`h${x}`} position={[x, 0.4, 2.21]}>
            <boxGeometry args={[0.55, 0.22, 0.05]} />
            <meshBasicMaterial color="#fffbe8" toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, 0.45, -2.21]}>
          <boxGeometry args={[1.9, 0.18, 0.05]} />
          <meshBasicMaterial color="#ff5a4a" toneMapped={false} />
        </mesh>
        {wheelPos.map((p, i) => (
          <mesh
            key={p.join(",")}
            ref={(m) => {
              if (m) wheels.current[i] = m;
            }}
            position={p}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.55, 0.55, 0.4, 14]} />
            <meshStandardMaterial color="#05080d" roughness={0.9} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.4, 24]} />
        <meshBasicMaterial color={paint} transparent opacity={0.16} toneMapped={false} />
      </mesh>
      <spotLight ref={spot} position={[0, 1.6, 2.2]} angle={0.55} penumbra={0.7} intensity={180} distance={90} decay={1.2} color="#fff4dc" />
      <object3D ref={target} position={[0, 0, 24]} />
      <pointLight position={[0, 1, 0]} intensity={14} distance={14} color={paint} decay={1.5} />
      {mapView && (
        <mesh position={[0, 60, 0]}>
          <cylinderGeometry args={[6, 6, 120, 16, 1, true]} />
          <meshBasicMaterial color={paint} transparent opacity={0.35} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
