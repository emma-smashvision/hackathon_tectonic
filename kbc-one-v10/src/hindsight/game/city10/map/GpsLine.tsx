"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ribbon } from "../engine/geom";
import { useCityEngine } from "../engine/runtime";
export function GpsLine({ version }: { version: number }) {
  const { rt } = useCityEngine();
  const geometry = useMemo(() => ribbon(rt.current.route.length > 1 ? [{ pts: rt.current.route, offset: 0, width: .65, y: .1 }] : []), [rt, version]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshBasicMaterial color="#91ffce" transparent opacity={.8} toneMapped={false} side={THREE.DoubleSide} /></mesh>;
}
