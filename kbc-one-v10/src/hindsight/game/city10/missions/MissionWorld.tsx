'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { useMission } from './useMission';
import { route } from './controller';
import { RewardBuild, useLessonMotion } from '@/one/lessonfx';

/** Replace these meshes freely; trigger/collection/preparation rules stay in controller.ts. */
export function MissionWorld({ personaId }: { personaId: string }) {
  if (!['tom', 'karim', 'sofie', 'lina'].includes(personaId)) return null;
  return <World personaId={personaId} />;
}
function World({ personaId }: { personaId: string }) {
  const { controller, state: s, api } = useMission(personaId);
  const still = useLessonMotion();
  const animated = useRef<Group>(null);
  const ghosts = useRef<Group>(null);
  const bump = useRef<Mesh>(null);
  const mint = new Color('#91ffce');
  useFrame(({ clock }, dt) => {
    if (s.paused) return;
    if (!still) animated.current?.children.forEach((mesh, i) => { mesh.rotation.y += dt * .9; mesh.position.y = 2.4 + Math.sin(clock.elapsedTime * 2.3 + i) * .45; });
    if (bump.current) { (bump.current.material as MeshStandardMaterial).color.set('#efb160').lerp(mint, s.pave); (bump.current.material as MeshStandardMaterial).emissive.set('#efb160').lerp(mint, s.pave); bump.current.scale.y = 1 - s.pave * .91; }
    if (!still && ghosts.current && s.mission) {
      const car = api.car().pos;
      let nearest = route.marker, best = Infinity;
      for (let t = route.marker; t < .86; t += .01) { const p = controller.point(t).pos; const d = Math.hypot(car.x - p.x, car.z - p.z); if (d < best) { best = d; nearest = t; } }
      ghosts.current.children.forEach((ghost, i) => { const p = controller.point(Math.min(.94, Math.max(s.ghostT, nearest + .055) + i * .025)); ghost.position.set(p.pos.x, .7, p.pos.z); ghost.rotation.y = p.heading; });
    }
  });
  const active = !!s.mission && s.phase !== 'roam';
  return <group name="mission-world">
    {!active && controller.markers().map(m => { const p = controller.point(route.marker, m); return <group key={m.id} position={[p.pos.x, 0, p.pos.z]} name={`mission-beam:${m.roadId}`}>
      <mesh position={[0, 10, 0]}><cylinderGeometry args={[2.6, 4, 20, 24, 1, true]} /><meshBasicMaterial color={m.testDrive ? '#87d8ff' : '#b4ffdb'} transparent opacity={.19} depthWrite={false} side={2} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .12, 0]}><ringGeometry args={[4.1, 4.6, 40]} /><meshBasicMaterial color={m.testDrive ? '#87d8ff' : '#b4ffdb'} toneMapped={false} /></mesh>
      <mesh position={[0, 4, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[1.6, 1.6, .4]} /><meshStandardMaterial color="#e3fff3" emissive="#9dffcd" emissiveIntensity={2} /></mesh>
    </group>; })}
    {!active && controller.informationMarkers().map(marker => <group key={marker.id} position={[marker.at.x, 0, marker.at.z]}>
      <mesh position={[0, 8, 0]}><cylinderGeometry args={[2, 3, 16, 20, 1, true]} /><meshBasicMaterial color="#a7c4e0" transparent opacity={.12} depthWrite={false} side={2} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .12, 0]}><ringGeometry args={[3.5, 4, 32]} /><meshBasicMaterial color="#b5cfe4" toneMapped={false} /></mesh>
    </group>)}
    {active && <>
      {['pave', 'passed'].includes(s.phase) && !s.mission?.testDrive && <group position={[controller.point(route.bump).pos.x + 12, .2, controller.point(route.bump).pos.z]}><RewardBuild progress={s.pave} reducedMotion={still} /></group>}
      <group ref={ghosts} visible={['convoy', 'collect', 'cross'].includes(s.phase)}>{[0, 1, 2].map(i => <group key={i}>
        <mesh><boxGeometry args={[1.8, .65, 3.5]} /><meshStandardMaterial color="#80daef" emissive="#6bdcf7" emissiveIntensity={1.8} transparent opacity={.45 - i * .07} depthWrite={false} /></mesh>
        <mesh position={[0, -.35, 4]}><boxGeometry args={[1.5, .04, 7]} /><meshBasicMaterial color="#6be8ff" transparent opacity={.12} depthWrite={false} /></mesh>
      </group>)}</group>
      <group ref={animated}>{route.pickups.map((t, i) => { const p = controller.point(t); return <group key={i} position={[p.pos.x, 2.4, p.pos.z]} visible={!s.collected.includes(i)} name={`hindsight-pickup:${i}`}>
        <mesh><octahedronGeometry args={[1.7]} /><meshStandardMaterial color={i === 2 ? '#d6b8ff' : '#a9ffd2'} emissive={i === 2 ? '#bd89ff' : '#7affbb'} emissiveIntensity={2.5} /></mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[2.3, .07, 8, 32]} /><meshBasicMaterial color="#e0ffed" toneMapped={false} /></mesh>
      </group>; })}</group>
      <group position={[controller.point(route.bump).pos.x, .25, controller.point(route.bump).pos.z]} rotation={[0, controller.point(route.bump).heading, 0]}>
        <mesh ref={bump}><boxGeometry args={[8, .8, 2.5]} /><meshStandardMaterial color="#efb160" emissive="#efb160" emissiveIntensity={.65} /></mesh>
        <mesh position={[0, -.1, 0]}><boxGeometry args={[8.3, .05, 5]} /><meshBasicMaterial color="#ffd48f" transparent opacity={.2} /></mesh>
      </group>
    </>}
  </group>;
}
