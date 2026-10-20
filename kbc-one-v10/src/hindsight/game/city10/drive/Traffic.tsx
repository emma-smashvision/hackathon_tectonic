"use client";
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCityEngine } from '../engine/runtime';
import { stepTraffic } from '../engine/traffic';
/** Ambient vehicles are scenery, not crowd evidence or mission convoy cars. */
export function Traffic() {
  const { rt } = useCityEngine();
  const body = useRef<THREE.InstancedMesh>(null), glass = useRef<THREE.InstancedMesh>(null), lamps = useRef<THREE.InstancedMesh>(null), tails = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = rt.current.traffic.length;
  useLayoutEffect(() => {
    const colors = ['#557889', '#586c80', '#6da5ab', '#3e5065', '#95abb7'];
    rt.current.traffic.forEach((car, i) => body.current?.setColorAt(i, new THREE.Color(colors[car.id % colors.length])));
    if (body.current?.instanceColor) body.current.instanceColor.needsUpdate = true;
  }, [rt]);
  useFrame((_, delta) => {
    const R = rt.current;
    if (!R.frozen && !R.mapOpen && !R.shot) stepTraffic(R.traffic, R.car, delta * R.timeScale);
    for (let i = 0; i < count; i++) {
      const c = R.traffic[i];
      dummy.position.set(c.x, .7, c.z); dummy.rotation.set(0, c.heading, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); body.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 1.22; dummy.updateMatrix(); glass.current?.setMatrixAt(i, dummy.matrix);
      const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
      for (let side = 0; side < 2; side++) {
        const lateral = side ? .74 : -.74;
        dummy.position.set(c.x + fx * 2.18 + fz * lateral, .72, c.z + fz * 2.18 - fx * lateral); dummy.updateMatrix(); lamps.current?.setMatrixAt(i * 2 + side, dummy.matrix);
        dummy.position.set(c.x - fx * 2.18 + fz * lateral, .72, c.z - fz * 2.18 - fx * lateral); dummy.scale.set(1, c.braking ? 1.7 : 1, 1); dummy.updateMatrix(); tails.current?.setMatrixAt(i * 2 + side, dummy.matrix); dummy.scale.set(1, 1, 1);
      }
    }
    for (const mesh of [body.current, glass.current, lamps.current, tails.current]) if (mesh) mesh.instanceMatrix.needsUpdate = true;
  }, -2);
  return <group name="ambient-traffic">
    <instancedMesh ref={body} args={[undefined, undefined, count]} frustumCulled={false}><boxGeometry args={[2.1, .68, 4.3]} /><meshStandardMaterial metalness={.5} roughness={.36} emissive="#26374b" emissiveIntensity={.35} /></instancedMesh>
    <instancedMesh ref={glass} args={[undefined, undefined, count]} frustumCulled={false}><boxGeometry args={[1.65, .5, 2.1]} /><meshStandardMaterial color="#172a40" metalness={.6} roughness={.2} /></instancedMesh>
    <instancedMesh ref={lamps} args={[undefined, undefined, count * 2]} frustumCulled={false}><boxGeometry args={[.46, .14, .05]} /><meshBasicMaterial color="#fff3cc" toneMapped={false} /></instancedMesh>
    <instancedMesh ref={tails} args={[undefined, undefined, count * 2]} frustumCulled={false}><boxGeometry args={[.5, .14, .05]} /><meshBasicMaterial color="#ff5443" toneMapped={false} /></instancedMesh>
  </group>;
}
