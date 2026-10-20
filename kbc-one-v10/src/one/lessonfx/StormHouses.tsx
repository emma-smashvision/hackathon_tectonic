'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { ratioFor } from './data';

/** World variant of the road proportion. Rain/house units depict the published rate.
 * `prepared` only raises an illustrative dam; it never changes the historical crowd rate.
 * Pair with the same headline/Plain lessons DOM used for GhostConvoy. */
export function StormHouses({ rate, prepared = 0, reducedMotion = false }: { rate?: number; prepared?: number; reducedMotion?: boolean }) {
  const drops = useRef<Group>(null), dam = useRef<Group>(null), time = useRef(0);
  const valid = rate !== undefined && Number.isFinite(rate) && rate >= 0 && rate <= 1;
  const ratio = ratioFor(rate), count = !valid ? 0 : ratio ?? 100, affected = ratio ? 1 : Math.round((rate ?? 0) * 100);
  const progress = Math.max(0, Math.min(1, Number.isFinite(prepared) ? prepared : 0));
  useFrame((_, dt) => {
    time.current += dt;
    drops.current?.children.forEach((drop, i) => { drop.position.y = reducedMotion ? 3 : 4.8 - ((time.current * 1.7 + i * .27) % 3.8); });
    dam.current?.children.forEach((brick, i) => { const target = Math.min(1, Math.max(0, progress * 7 - i)); brick.scale.y += (target - brick.scale.y) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 5)); });
  });
  if (!valid) return null;
  const position = (i: number): [number, number, number] => ratio ? [(i - (count - 1) / 2) * 2.5, 0, 0] : [(i % 20 - 9.5) * .85, 0, Math.floor(i / 20) * 1.2 - 2.4];
  return <group name="crowd-storm-houses">
    {Array.from({ length: count }, (_, i) => <group key={i} position={position(i)} scale={ratio ? 1 : .38}>
      <mesh position={[0, .6, 0]}><boxGeometry args={[1.2, 1.2, 1.2]} /><meshStandardMaterial color={i < affected ? '#ff657b' : '#a2ffdf'} emissive={i < affected ? '#b92e53' : '#2b675e'} emissiveIntensity={.4} /></mesh>
      <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.1, .75, 4]} /><meshStandardMaterial color="#35728c" /></mesh>
      <mesh position={[0, .6, .61]}><boxGeometry args={[.35, .5, .02]} /><meshBasicMaterial color="#ffe4aa" /></mesh>
      {i < affected && <mesh position={[0, .12, 0]}><boxGeometry args={[2, .24, 1.9]} /><meshBasicMaterial color="#ff657b" transparent opacity={.45} /></mesh>}
    </group>)}
    <group ref={drops}>{Array.from({ length: count }, (_, i) => <mesh key={i} position={[position(i)[0], 3, position(i)[2]]} scale={ratio ? [1, 2, 1] : [.5, 1, .5]}><sphereGeometry args={[.12, 8, 8]} /><meshBasicMaterial color={i < affected ? '#ff8293' : '#80dfff'} /></mesh>)}</group>
    {[-5, -2.5, 0, 2.5, 5].map((x, i) => <mesh key={x} position={[x, 5.3 + i % 2 * .4, -.2]} scale={[2.7, .8, 1.3]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#567384" transparent opacity={.6} /></mesh>)}
    <group ref={dam} position={[position(0)[0], 0, 1.25]}>{Array.from({ length: 7 }, (_, i) => <group key={i} position={[(i - 3) * .31, 0, 0]} scale={[1, progress * 7 > i ? 1 : 0, 1]}><mesh position={[0, .65, 0]}><boxGeometry args={[.3, 1.3, .35]} /><meshStandardMaterial color="#b7ffdd" emissive="#4caa89" emissiveIntensity={.4} /></mesh></group>)}</group>
  </group>;
}
