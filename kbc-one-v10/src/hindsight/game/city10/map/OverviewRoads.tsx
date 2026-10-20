"use client";
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCityEngine } from '../engine/runtime';
import { ribbon } from '../engine/geom';
/** The high camera needs wider road lines than the street-level edge paint. */
export function OverviewRoads() {
  const { net, rt } = useCityEngine();
  const mesh = useRef<THREE.Mesh>(null), material = useRef<THREE.MeshBasicMaterial>(null);
  const geometry = useMemo(() => ribbon(net.paths.map(path => ({ pts: path.pts, offset: 0, width: 3.2, y: .16, color: new THREE.Color(net.avenues.find(a => a.road.id === path.roadId)?.road.hue ?? '#cfc59a') }))), [net]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (mesh.current) mesh.current.visible = rt.current.overview > .15;
    if (material.current) material.current.opacity = Math.max(0, (rt.current.overview - .15) / .85) * .8;
  });
  return <mesh ref={mesh} geometry={geometry} visible={false}><meshBasicMaterial ref={material} vertexColors transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>;
}
