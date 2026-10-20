"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { MONTH_DISTANCE as U, publishedGhosts, type DriveStop, type DriveView } from "./driveModel";

export function driveCamera(month: number, aspect: number) {
  const camera = new THREE.PerspectiveCamera(48, aspect, .1, 800);
  camera.position.set(0, 19, month * U - 30);
  camera.lookAt(0, 0, month * U + 23);
  camera.updateMatrixWorld();
  return camera;
}
function Camera({ month }: { month: number }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const target = driveCamera(month, size.width / size.height);
    camera.position.copy(target.position); camera.quaternion.copy(target.quaternion); camera.updateMatrixWorld();
  }, [camera, month, size]);
  return null;
}
function Box({ at, size, color, opacity = 1 }: { at: [number, number, number]; size: [number, number, number]; color: string; opacity?: number }) {
  return <mesh position={at}><boxGeometry args={size}/><meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity}/></mesh>;
}
function Car({ x = 0, z, color = "#42c5fa", ghost = false }: { x?: number; z: number; color?: string; ghost?: boolean }) {
  return <group position={[x, 0, z]}>
    <Box at={[0,.6,0]} size={[1.65,.7,3]} color={color} opacity={ghost ? .3 : 1}/>
    <Box at={[0,1.15,-.15]} size={[1.3,.6,1.5]} color={ghost ? color : "#b7eaff"} opacity={ghost ? .25 : 1}/>
    {!ghost && <>{[-.83,.83].flatMap(x => [-.9,.9].map(z => <Box key={`${x}:${z}`} at={[x,.3,z]} size={[.25,.5,.6]} color="#09101b"/>))}<Box at={[0,.65,-1.52]} size={[1.4,.16,.06]} color="#ffc284"/></>}
  </group>;
}
function GhostGroup({ z, density, reduced }: { z: number; density: number; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const { invalidate } = useThree();
  useFrame(({ clock }) => { if (ref.current && !reduced) { ref.current.position.z = Math.sin(clock.elapsedTime * .35) * 2; } });
  // A low-frequency redraw is sufficient for aggregate illustrations.
  useLayoutEffect(() => { if (reduced) return; const timer = setInterval(invalidate, 70); return () => clearInterval(timer); }, [invalidate, reduced]);
  return <group ref={ref}>
    <Car x={-2} z={z} color="#d2e6f4" ghost/><Car x={1} z={z+2.8} color="#d2e6f4" ghost/>
    <mesh position={[0,.08,z+1.4]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[6,7]}/><meshBasicMaterial color="#b9dbf5" transparent opacity={Math.min(.2,.07 + density * .2)} depthWrite={false}/></mesh>
  </group>;
}
function Landmark({ roadId, z }: { roadId: string; z: number }) {
  if (roadId === "moving-house") return <group position={[-11,0,z]}>
    <Box at={[0,1.6,0]} size={[3,2.8,5]} color="#d4e3e7"/><Box at={[0,1.2,3]} size={[3,2,1.8]} color="#4cc5ef"/>
    <Box at={[0,1.8,3.92]} size={[2.5,.7,.1]} color="#17354b"/>
    {[-1.5,1.5].flatMap(x => [-1.4,2.5].map(z => <Box key={`${x}:${z}`} at={[x,.45,z]} size={[.4,.8,.9]} color="#111e2c"/>))}
    <Box at={[5,1.4,2]} size={[1.4,2.8,.6]} color="#b8d4df"/><Box at={[5,2,1.65]} size={[1,.5,.1]} color="#63d7ad"/>
    <Box at={[-2.8,.5,2]} size={[1,1,1]} color="#d2b17c"/>
  </group>;
  if (roadId === "freelance") return <group position={[-14,0,z]}>
    <Box at={[0,2.2,0]} size={[7,4.4,5]} color="#426478"/><Box at={[0,4.6,0]} size={[8,.6,6]} color="#7593a5"/>
    <Box at={[0,1.8,-2.55]} size={[4,3.5,.1]} color="#203a4b"/><Box at={[5,2,-2]} size={[2.5,3,.2]} color="#f4f0df"/>
    {[1.1,1.7,2.3].map(y => <Box key={y} at={[5,y,-2.15]} size={[1.7,.09,.05]} color="#6b8795"/>)}
  </group>;
  if (roadId === "first-home") return <group position={[-13,0,z]}>
    <Box at={[0,2.2,0]} size={[6,4.4,5]} color="#a7c9d4"/>
    <mesh position={[0,5.2,0]} rotation={[0,Math.PI/4,0]}><coneGeometry args={[5,2.8,4]}/><meshStandardMaterial color="#52768d"/></mesh>
    <Box at={[1.2,1.4,-2.55]} size={[1.4,2.8,.1]} color="#397ca2"/><Box at={[-1.5,2.4,-2.55]} size={[1.5,1.4,.1]} color="#ffe2a2"/>
    <mesh position={[5,2.8,0]}><torusGeometry args={[.75,.17,6,16]}/><meshStandardMaterial color="#e9c46a"/></mesh><Box at={[5,1.4,0]} size={[.25,2,.25]} color="#e9c46a"/><Box at={[5.3,.65,0]} size={[.7,.25,.25]} color="#e9c46a"/>
  </group>;
  return null;
}
function Avenue({ view, month, stops, branch, reduced }: { view: DriveView; month: number; stops: DriveStop[]; branch: string | null; reduced: boolean }) {
  const fork = view.fork?.month;
  const start = Math.max(0, Math.floor(month)-4);
  const end = Math.ceil(month)+24;
  const z0 = start*U, z1 = end*U;
  const hasFork = fork !== undefined && fork <= end;
  const roadEnd = hasFork ? Math.max(z0,fork * U) : z1;
  const branchX = branch && fork !== undefined ? (branch === view.fork?.comparisons[0].branches[0].id ? -1 : 1) * Math.min(12, Math.max(0, month-fork)*3) : 0;
  return <>
    <Camera month={month}/><color attach="background" args={["#0c192a"]}/><fog attach="fog" args={["#0c192a",90,290]}/>
    <ambientLight intensity={1.7}/><directionalLight position={[-30,80,-20]} intensity={2}/>
    <Box at={[0,-.5,month*U+80]} size={[250,.6,400]} color="#142c38"/>
    <Box at={[0,-.1,(z0+roadEnd)/2]} size={[9,.25,roadEnd-z0]} color="#30465b"/>
    {[-5,5].map(x => <Box key={x} at={[x,.01,(z0+roadEnd)/2]} size={[.22,.1,roadEnd-z0]} color="#7b9eae"/>)}
    {Array.from({length:end-start},(_,i)=>start+i).map(m => <group key={m}>
      {(!hasFork || m < fork!) && <Box at={[0,.06,m*U+2]} size={[.16,.04,3]} color="#9cbbc7"/>}
      <Box at={[6,.7,m*U]} size={[.15,1.4,.15]} color="#9cb7c3"/>
    </group>)}
    {hasFork && [-1,1].map(sign => <group key={sign} position={[sign*6,0,fork!*U+19]} rotation={[0,sign*.3,0]}>
      <Box at={[0,-.05,0]} size={[7,.2,40]} color={branch === view.fork?.comparisons[0].branches[sign === -1 ? 0 : 1].id ? "#3c6378" : "#30465b"}/>
      {[0,8,16].map(z => <Box key={z} at={[0,.07,z-12]} size={[.16,.03,3]} color="#a5c1cf"/>)}
    </group>)}
    {hasFork && [-1,1].map(sign => <group key={`continuation:${sign}`}>
      <Box at={[sign*12,-.05,(fork!*U+38+z1)/2]} size={[7,.2,Math.max(0,z1-fork!*U-38)]} color="#30465b"/>
    </group>)}
    {stops.filter(s=>s.month>=start && s.month<=end).map(s=><group key={s.stopId} position={[-5.3,0,s.month*U]}>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.12,0]}><ringGeometry args={[.7,1.1,20]}/><meshBasicMaterial color="#ffbf62"/></mesh>
      <Box at={[0,1,0]} size={[.2,2,.2]} color="#e2ad62"/>
    </group>)}
    <Landmark roadId={view.roadId} z={(view.position.month ?? 0)*U+5}/>
    {publishedGhosts(view).filter(g=>g.month>=month && g.month<=end).slice(0,5).map(g=><GhostGroup key={g.id} z={Math.max(month*U+12,g.month*U)} density={g.density.value!} reduced={reduced}/>)}
    {view.position.confirmed && view.position.month !== null && <mesh position={[2.8,.15,view.position.month*U]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.5,.85,24]}/><meshBasicMaterial color="#e9f8ff"/></mesh>}
    <Car x={branchX-1.2} z={month*U}/>
  </>;
}
export function DriveScene(props: Parameters<typeof Avenue>[0]) {
  return <Canvas frameloop="demand" dpr={[1,1.25]} camera={{fov:48,near:.1,far:800}} gl={{antialias:true, powerPreference:"low-power"}} aria-hidden="true"><Avenue {...props}/></Canvas>;
}
