"use client";
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCityEngine } from '../engine/runtime';
const SKIDS = 384, SMOKE = 80;
interface Particle { x: number; z: number; heading: number; age: number; length: number; drift: number }
const inactive = (): Particle => ({ x: 0, z: 0, heading: 0, age: 99, length: 1, drift: 0 });
/** Fixed pools: two tyre traces and a small smoke puff at 20 Hz while slipping. */
export function DrivingEffects() {
  const { rt } = useCityEngine();
  const skids = useRef<THREE.InstancedMesh>(null), smoke = useRef<THREE.InstancedMesh>(null);
  const pool = useMemo(() => ({ skids: Array.from({ length: SKIDS }, inactive), smoke: Array.from({ length: SMOKE }, inactive), mark: 0, puff: 0, elapsed: 0, x: 0, z: 0 }), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const smokeGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('particleAlpha', new THREE.InstancedBufferAttribute(new Float32Array(SMOKE), 1));
    return geometry;
  }, []);
  useEffect(() => () => smokeGeometry.dispose(), [smokeGeometry]);
  useFrame(({ camera }, delta) => {
    const R = rt.current, c = R.car, dt = Math.min(delta, .1), active = !R.frozen && !R.mapOpen && !R.shot && !R.reducedMotion;
    pool.elapsed += dt;
    if (active && R.telemetry.slip > .28 && Math.abs(c.speed) > 10 && pool.elapsed >= .05) {
      const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
      const length = Math.min(3, Math.max(.65, Math.abs(c.speed) * pool.elapsed * 1.1));
      for (const side of [-1, 1]) {
        const x = c.x - fx * 1.35 + fz * side, z = c.z - fz * 1.35 - fx * side;
        if (R.onRoad) Object.assign(pool.skids[pool.mark++ % SKIDS], { x, z, heading: c.travelHeading ?? c.heading, age: 0, length, drift: 0 });
        Object.assign(pool.smoke[pool.puff++ % SMOKE], { x, z, heading: c.heading, age: 0, length: 1, drift: side });
      }
      pool.elapsed = 0;
    }
    pool.x = c.x; pool.z = c.z;
    let marks = 0, puffs = 0;
    pool.skids.forEach((p, i) => {
      p.age += dt; const fade = Math.max(0, Math.min(1, (9 - p.age) / 2));
      if (fade) marks++;
      dummy.position.set(p.x, .075, p.z); dummy.rotation.set(0, p.heading, 0); dummy.scale.set(.23 * fade, 1, p.length); dummy.updateMatrix(); skids.current?.setMatrixAt(i, dummy.matrix);
    });
    const alpha = smokeGeometry.getAttribute('particleAlpha') as THREE.InstancedBufferAttribute;
    pool.smoke.forEach((p, i) => {
      p.age += dt; const fade = Math.max(0, 1 - p.age / 1.45); if (fade) puffs++;
      dummy.position.set(p.x + Math.cos(p.heading) * p.drift * p.age * .8, .4 + p.age * 1.6, p.z - Math.sin(p.heading) * p.drift * p.age * .8);
      dummy.quaternion.copy(camera.quaternion); dummy.scale.setScalar(fade ? .65 + p.age * 2.1 : 0); dummy.updateMatrix(); smoke.current?.setMatrixAt(i, dummy.matrix); alpha.setX(i, fade * fade);
    });
    alpha.needsUpdate = true;
    if (skids.current) skids.current.instanceMatrix.needsUpdate = true;
    if (smoke.current) smoke.current.instanceMatrix.needsUpdate = true;
    R.effects.skidCount = marks; R.effects.smokeCount = puffs;
  });
  return <group name="driving-effects">
    <instancedMesh ref={skids} args={[undefined, undefined, SKIDS]} frustumCulled={false}><boxGeometry args={[1, .009, 1]} /><meshBasicMaterial color="#050c12" transparent opacity={.52} depthWrite={false} /></instancedMesh>
    <instancedMesh ref={smoke} args={[smokeGeometry, undefined, SMOKE]} frustumCulled={false}>
      <shaderMaterial transparent depthWrite={false} toneMapped={false}
        vertexShader={'attribute float particleAlpha; varying vec2 vUv; varying float vAlpha; void main(){vUv=uv;vAlpha=particleAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }'}
        fragmentShader={'varying vec2 vUv; varying float vAlpha; void main(){float a=pow(max(0.,1.-length(vUv-.5)*2.),2.)*vAlpha*.6;gl_FragColor=vec4(.7,.78,.84,a);}'}/>
    </instancedMesh>
  </group>;
}
