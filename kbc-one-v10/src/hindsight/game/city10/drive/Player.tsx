"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { NO_INPUT, step } from "../engine/driving";
import { useCityEngine } from "../engine/runtime";
import { drivingTelemetry } from "../engine/telemetry";
import { HALF_W } from "../engine/network";
import { distance } from "../engine/routing";
export function Player({ children, onReady }: { children?: ReactNode; onReady?: () => void }) {
  const { rt, net, colliders, api } = useCityEngine();
  const gpsElapsed = useRef(0), telemetryElapsed = useRef(0);
  const dynamicColliders = useMemo(() => rt.current.traffic.map(c => ({ x: c.x, z: c.z, w: 2.1, d: 4.3, rot: c.heading })), [rt]);
  const allColliders = useMemo(() => [...colliders, ...dynamicColliders], [colliders, dynamicColliders]);
  const fogDefaults = useRef<{ near: number; far: number } | null>(null);
  const ready = useRef(false);
  const group = useRef<THREE.Group>(null);
  const { camera, scene, gl } = useThree();
  const scratch = useMemo(() => ({ desired: new THREE.Vector3(), look: new THREE.Vector3() }), []);
  useFrame((state, delta) => {
    if (!ready.current) { ready.current = true; onReady?.(); }
    const R = rt.current, dt = Math.min(delta, .15) * R.timeScale, before = { x: R.car.x, z: R.car.z };
    const input = { ...NO_INPUT };
    for (const key of Object.keys(input) as (keyof typeof input)[]) input[key] = R.keys[key] || R.touch[key];
    if (Object.values(input).some(Boolean)) R.autopilot = false;
    const paused = R.frozen || R.mapOpen || !!R.shot;
    if (input.brake || input.down) R.boostMs = 0;
    if (!paused) {
      R.boostMs = Math.max(0, R.boostMs - delta * 1000);
      if (R.autopilot) {
        const target = R.route[R.routeIndex];
        if (target) {
          const remaining = R.route.slice(R.routeIndex).reduce((sum, p, i, all) => sum + distance(i ? all[i - 1] : R.car, p), 0);
          const desiredSpeed = Math.min(R.boostMs > 0 ? 34 : 26, Math.sqrt(remaining * 20));
          R.car.speed += Math.max(-35 * dt, Math.min(18 * dt, desiredSpeed - R.car.speed));
          let travel = R.car.speed * dt;
          while (travel > 0 && R.routeIndex < R.route.length) {
            const p = R.route[R.routeIndex], d = distance(R.car, p);
            if (d > .001) {
              const heading = Math.atan2(p.x - R.car.x, p.z - R.car.z);
              const turn = Math.atan2(Math.sin(heading - R.car.heading), Math.cos(heading - R.car.heading));
              R.car.heading += turn * Math.min(1, dt * 8);
            }
            if (travel >= d) { R.car.x = p.x; R.car.z = p.z; travel -= d; R.routeIndex++; }
            else { R.car.x += (p.x - R.car.x) * travel / d; R.car.z += (p.z - R.car.z) * travel / d; travel = 0; }
          }
        }
        if (R.routeIndex >= R.route.length) { R.autopilot = false; R.car.speed = 0; }
        R.car.travelHeading = R.car.heading;
      } else {
        R.traffic.forEach((c, i) => { Object.assign(dynamicColliders[i], { x: c.x, z: c.z, rot: c.heading }); });
        const wasScraped = R.scraped, impactSpeed = Math.abs(R.car.speed);
        R.scraped = false;
        const count = Math.max(1, Math.ceil(dt / .025));
        for (let i = 0; i < count; i++) {
          const result = step(R.car, input, dt / count, net, { maxSpeed: R.boostMs > 0 ? 54 : 42, throttle: 1, boost: R.boostMs > 0, colliders: allColliders });
          R.car = result.car; R.scraped ||= result.scraped; R.onRoad = result.near.dist < HALF_W + 1;
        }
        if (R.scraped && !wasScraped && impactSpeed > 5) R.jolt = Math.max(R.jolt, Math.min(.65, impactSpeed / 65));
      }
      gpsElapsed.current += dt;
      if (!R.autopilot && R.waypoint && gpsElapsed.current > 1.5 && Math.abs(R.car.speed) > 1) { api.setWaypoint(R.waypoint); gpsElapsed.current = 0; }
      for (const entry of R.zones) {
        const { zone } = entry;
        const inside = distance(R.car, zone.at) <= zone.radius;
        // Swept trigger catches narrow pickup zones even on a slow frame.
        const dx = R.car.x - before.x, dz = R.car.z - before.z;
        const t = Math.max(0, Math.min(1, ((zone.at.x - before.x) * dx + (zone.at.z - before.z) * dz) / (dx * dx + dz * dz || 1)));
        const crossed = distance({ x: before.x + dx * t, z: before.z + dz * t }, zone.at) <= zone.radius;
        if (!entry.inside && (inside || crossed)) entry.cb();
        entry.inside = inside;
      }
    } else R.car.speed = 0;
    R.telemetry = drivingTelemetry(R.car, input, R.boostMs > 0, paused);
    telemetryElapsed.current += delta;
    if (telemetryElapsed.current >= .1) { telemetryElapsed.current %= .1; R.speedListeners.forEach(cb => cb({ ...R.telemetry })); }
    if (group.current) { group.current.position.set(R.car.x, 0, R.car.z); group.current.rotation.y = R.car.heading; }
    const c = R.car, speed = Math.abs(c.speed), fX = Math.sin(c.heading), fZ = Math.cos(c.heading);
    R.overview = R.reducedMotion ? (R.mapOpen ? 1 : 0) : Math.max(0, Math.min(1, R.overview + Math.min(delta, .1) * (R.mapOpen ? 1 / 3 : -1 / .9)));
    const blend = R.overview * R.overview * (3 - 2 * R.overview);
    if (R.shot && !R.mapOpen) {
      const s = R.shot;
      scratch.desired.set(s.from?.x ?? s.target.x + 24, 24, s.from?.z ?? s.target.z + 24);
      scratch.look.set(s.target.x, 2, s.target.z);
    } else {
      scratch.desired.set(c.x - fX * (14 + speed * .14), 7 + speed * .055, c.z - fZ * (14 + speed * .14));
      scratch.look.set(c.x + fX * 8, 1.3, c.z + fZ * 8);
      scratch.desired.x *= 1 - blend;
      scratch.desired.y += (net.radius * 2.35 - scratch.desired.y) * blend;
      scratch.desired.z += (net.radius * .55 - scratch.desired.z) * blend;
      scratch.look.multiplyScalar(1 - blend);
    }
    if (R.cameraCut && !R.mapOpen) { camera.position.copy(scratch.desired); R.cameraCut = false; }
    else camera.position.lerp(scratch.desired, 1 - Math.exp(-Math.min(delta, .1) * 5));
    if (scene.fog instanceof THREE.Fog) {
      fogDefaults.current ??= { near: scene.fog.near, far: scene.fog.far };
      scene.fog.near = fogDefaults.current.near + (net.radius * 1.8 - fogDefaults.current.near) * blend;
      scene.fog.far = fogDefaults.current.far + (net.radius * 5.5 - fogDefaults.current.far) * blend;
    }
    R.jolt = Math.max(0, R.jolt - delta * 1.8);
    if (R.jolt > 0 && !R.reducedMotion && !R.mapOpen) {
      camera.position.x += Math.sin(state.clock.elapsedTime * 41) * R.jolt * .14;
      camera.position.y += Math.sin(state.clock.elapsedTime * 33) * R.jolt * .24;
    }
    camera.lookAt(scratch.look);
    if (camera instanceof THREE.PerspectiveCamera) {
      const driveFov = R.reducedMotion ? 58 : (R.shot ? 52 : 58 + speed * .25 + (R.boostMs > 0 ? 5 : 0));
      const targetFov = driveFov + (58 - driveFov) * blend;
      camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-Math.min(delta, .1) * 3)); camera.updateProjectionMatrix();
      R.frameStats.fov = camera.fov;
    }
    R.frameStats.frames++; R.frameStats.seconds += delta; R.frameStats.cameraY = camera.position.y;
    R.frameStats.drawCalls = gl.info.render.calls; R.frameStats.triangles = gl.info.render.triangles;

  });
  return <group ref={group}>{children ?? <GreyCar />}</group>;
}
function GreyCar() {
  return <group position={[0, .7, 0]}>
    <mesh><boxGeometry args={[2.2, .7, 4.4]} /><meshStandardMaterial color="#58dbe4" metalness={.65} roughness={.3} /></mesh>
    <mesh position={[0, .65, -.3]}><boxGeometry args={[1.8, .7, 2]} /><meshStandardMaterial color="#13273b" metalness={.7} roughness={.15} /></mesh>
    <mesh position={[0, 0, -2.23]}><boxGeometry args={[1.9, .2, .08]} /><meshBasicMaterial color="#ff554b" toneMapped={false} /></mesh>
    {[-.8, .8].map(x => <mesh key={x} position={[x, .1, 2.23]}><boxGeometry args={[.45, .15, .08]} /><meshBasicMaterial color="#fff5dd" toneMapped={false} /></mesh>)}
    {[-1.1, 1.1].flatMap(x => [-1.3, 1.3].map(z => <mesh key={`${x}:${z}`} position={[x, -.25, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.5, .5, .35, 12]} /><meshStandardMaterial color="#101827" /></mesh>))}
    <pointLight color="#9defff" intensity={25} distance={20} position={[0, 1, 3]} />
  </group>;
}
