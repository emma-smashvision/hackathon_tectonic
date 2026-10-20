"use client";
import { useCityEngine } from '../engine/runtime';
/** Optional marker helper only: missions continue to own their existing beams. */
export function EngineMarkers() {
  const { rt } = useCityEngine();
  return <group name="engine-markers">{Array.from(rt.current.spawnedMarkers.values()).map(m => {
    const radius = m.radius ?? 2, color = m.color ?? '#93ffda';
    return <group key={m.id} position={[m.at.x, 0, m.at.z]}>
      <mesh position={[0, 5, 0]}><cylinderGeometry args={[radius * .35, radius, 10, 12, 1, true]} /><meshBasicMaterial color={color} transparent opacity={.12} depthWrite={false} toneMapped={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .12, 0]}><ringGeometry args={[radius * .85, radius, 32]} /><meshBasicMaterial color={color} transparent opacity={.8} depthWrite={false} toneMapped={false} /></mesh>
    </group>;
  })}</group>;
}
