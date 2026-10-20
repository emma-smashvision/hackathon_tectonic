"use client";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useCityEngine } from "./runtime";
import { dashes, ribbon } from "./geom";
import { HALF_W, ROAD_W } from "./network";
export function Greybox() {
  const { net, generated, blocks } = useCityEngine();
  const buildings = useRef<THREE.InstancedMesh>(null);
  const geometries = useMemo(() => ({
    road: ribbon(net.paths.map(p => ({ pts: p.pts, offset: 0, width: ROAD_W, y: .02 }))),
    edges: ribbon(net.paths.flatMap(p => [-1, 1].map(side => ({ pts: p.pts, offset: side * HALF_W, width: .17, y: .055, color: new THREE.Color(net.avenues.find(a => a.road.id === p.roadId)?.road.hue ?? '#c5bb8f') })))),
    dashes: dashes(net.paths),
  }), [net]);
  useEffect(() => () => Object.values(geometries).forEach(g => g.dispose()), [geometries]);
  useLayoutEffect(() => {
    const mesh = buildings.current; if (!mesh) return;
    const dummy = new THREE.Object3D();
    generated.buildings.forEach((b, i) => { dummy.position.set(b.x, b.h / 2, b.z); dummy.scale.set(b.w, b.h, b.d); dummy.rotation.y = b.rot; dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, new THREE.Color(i % 3 ? '#34495f' : '#536277')); });
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [generated]);
  return <>
    <color attach="background" args={['#142237']} /><fog attach="fog" args={['#142237', 150, 750]} />
    <ambientLight intensity={1.4} color="#a9c7ed" /><directionalLight position={[100, 160, -50]} intensity={2.2} color="#d4e5ff" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.05, 0]}><planeGeometry args={[3200, 3200]} /><meshStandardMaterial color="#1b3041" roughness={.85} /></mesh>
    <mesh geometry={geometries.road}><meshStandardMaterial color="#253447" roughness={.35} metalness={.3} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={geometries.edges}><meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={geometries.dashes}><meshBasicMaterial color="#c0c8cb" side={THREE.DoubleSide} /></mesh>
    <instancedMesh ref={buildings} args={[undefined, undefined, generated.buildings.length]}><boxGeometry /><meshStandardMaterial roughness={.7} metalness={.2} /></instancedMesh>
    {blocks.map((b, i) => <group key={b.id} position={[b.x, 0, b.z]}>
      <mesh position={[0, 7 + i * 2, 0]}><boxGeometry args={[b.width, 14 + i * 4, b.depth]} /><meshStandardMaterial color="#43778c" roughness={.3} metalness={.4} /></mesh>
      <mesh position={[0, 15 + i * 4, 0]}><boxGeometry args={[b.width + .4, .4, b.depth + .4]} /><meshBasicMaterial color="#9effde" toneMapped={false} /></mesh>
    </group>)}
  </>;
}
