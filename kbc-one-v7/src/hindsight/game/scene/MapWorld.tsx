"use client";
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { dashes, ribbon, slice } from '../geom';
import { nearest, pointAt, ROAD_W, type Path } from '../network';
import { useGame } from '../runtime';
import type { MapGate } from '../mapNetwork';
import { roadSignVisible, visibleGates } from '../gateFlow';

const AZURE='#40c4ee',GREEN='#67e6a8',AMBER='#e7b66b';
/** Physical signpost only; accessible readable names are projected by WS6's label layer. */
function Sign({color=AZURE,position,onClick,heading=0}:{title:string;detail:string;color?:string;heading?:number;position:[number,number,number];onClick?:()=>void}) {
  const ref=useRef<THREE.Group>(null),{rt}=useGame();
  useFrame(({camera})=>{if(ref.current)ref.current.visible=roadSignVisible({x:position[0],z:position[2]},camera.position,rt.current.car);});
  return <group ref={ref} position={position} rotation={[0,heading,0]} onClick={e=>{e.stopPropagation();onClick?.();}}>
    <mesh position={[0,-5,0]}><boxGeometry args={[.7,10,.7]}/><meshStandardMaterial color="#36536b"/></mesh>
    <mesh><boxGeometry args={[14,5,1]}/><meshStandardMaterial color="#19384c" emissive={color} emissiveIntensity={.4}/></mesh>
    <mesh position={[0,0,-.56]}><boxGeometry args={[6,.6,.1]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh>
    <mesh position={[3,0,-.56]} rotation={[0,0,-Math.PI/2]}><coneGeometry args={[1.5,2.5,3]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh>
  </group>;
}

function Road({path,status,ready}:{path:Path;status:string;ready:number}){
  const base=useMemo(()=>ribbon([{pts:path.pts,offset:0,width:ROAD_W,y:.02}]),[path]);
  const edges=useMemo(()=>ribbon([-1,1].map(side=>({pts:path.pts,offset:side*(ROAD_W/2-.3),width:.24,y:.08}))),[path]);
  const lines=useMemo(()=>dashes([path],9,3,.28,.09),[path]);
  const prepared=useMemo(()=>ribbon([{pts:slice(path,0,Math.max(1,path.length*ready/100)),offset:0,width:ROAD_W-.8,y:.05}]),[path,ready]);
  useEffect(()=>()=>{base.dispose();edges.dispose();lines.dispose();prepared.dispose();},[base,edges,lines,prepared]);
  const color=status==='possible'?'#54647d':status==='upcoming'?AMBER:AZURE;
  return <group>
    <mesh geometry={base}><meshStandardMaterial color={status==='possible'?'#111b28':'#223647'} roughness={.9} side={THREE.DoubleSide}/></mesh>
    {ready>0&&<mesh geometry={prepared}><meshStandardMaterial color='#1e4a43' emissive='#1a7054' emissiveIntensity={.2} side={THREE.DoubleSide}/></mesh>}
    <mesh geometry={edges}><meshBasicMaterial color={ready===100?GREEN:color} transparent opacity={status==='possible'?.35:.9} side={THREE.DoubleSide} toneMapped={false}/></mesh>
    <mesh geometry={lines}><meshBasicMaterial color={color} transparent opacity={status==='possible'?.3:.6} side={THREE.DoubleSide}/></mesh>
    {status==='upcoming'&&[15,25].map(s=>{const {p,tan}=pointAt(path,s);return <group key={s} position={[p.x-tan.z*7,0,p.z+tan.x*7]}><mesh position={[0,.9,0]}><coneGeometry args={[.65,1.8,4]}/><meshStandardMaterial color={AMBER}/></mesh><mesh position={[0,.2,0]}><boxGeometry args={[1.5,.3,1.5]}/><meshStandardMaterial color='#242a30'/></mesh></group>;})}
  </group>;
}
function Gate({gate}:{gate:MapGate}){
  const {rt,gameApi,mapNetwork}=useGame(),ref=useRef<THREE.Group>(null);
  const previousRank=useRef(-2);
  const stop=gate.stop,ready=stop.ready>=100,color=ready?GREEN:stop.state==='locked'?'#63708b':AMBER;
  useFrame(({camera})=>{
    if(!ref.current)return;
    const selected=visibleGates(mapNetwork.majorGates,rt.current.near?.path.id,rt.current.car.laneS??0,camera.position);
    const rank=selected.findIndex(g=>g.stop.id===stop.id);
    ref.current.visible=rank>=0;
    if(rank!==previousRank.current){
      previousRank.current=rank;
      ref.current.traverse(object=>{
        if(!(object instanceof THREE.Mesh))return;
        const materials=Array.isArray(object.material)?object.material:[object.material];
        for(const material of materials){
          if(material.userData.baseOpacity===undefined)material.userData.baseOpacity=material.opacity;
          material.transparent=true; material.opacity=material.userData.baseOpacity*(rank===1?.18:1);
          material.depthWrite=rank!==1;
        }
      });
    }
  });
  return <group ref={ref} name={`major-gate:${stop.id}`} position={[gate.pos.x,0,gate.pos.z]} onClick={e=>{e.stopPropagation();gameApi.goToStop(stop.id);}}>
    <group rotation={[0,gate.heading,0]}>
      {[-1,1].map(side=><group key={side} position={[side*7,0,0]}><mesh position={[0,4.4,0]}><boxGeometry args={[1.1,8.8,1.1]}/><meshStandardMaterial color='#23465b' metalness={.6} roughness={.35}/></mesh><mesh position={[0,4.8,-.58]}><boxGeometry args={[.42,7,.08]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh></group>)}
      <mesh position={[0,8.8,0]}><boxGeometry args={[15,1.1,1.1]}/><meshStandardMaterial color='#18364b' emissive={color} emissiveIntensity={.35}/></mesh>
      <mesh position={[0,.1,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[12,2]}/><meshBasicMaterial color={color} transparent opacity={.3} toneMapped={false}/></mesh>
      <mesh position={[0,10.3,0]}><torusGeometry args={[1.3,.22,6,24]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh>
    </group>

  </group>;
}
export function MapWorld(){
  const {net,mapNetwork,gameApi,rt,mapView}=useGame();
  const tracks=gameApi.roadmap.tracks;
  return <>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.05,0]}><circleGeometry args={[Math.max(1000,net.radius+300),64]}/><meshStandardMaterial color='#081420' roughness={1}/></mesh>
    {[net.ring,...net.streets].map(path=><Road key={path.id} path={path} status='active' ready={0}/>)}
    {tracks.map(track=>{const path=mapNetwork.trackPaths[track.id];if(!path)return null;const at=pointAt(path,9),color=track.status==='possible'?'#8996b2':track.status==='upcoming'?AMBER:AZURE;return <group key={track.id}>
      <Road path={path} status={track.status} ready={gameApi.readyByTrack[track.id]??0}/>
      {Array.from({length:Math.floor(path.length/45)},(_,i)=>{const at=pointAt(path,20+i*45),side=i%2?1:-1,x=at.p.x-at.tan.z*side*24,z=at.p.z+at.tan.x*side*24;if(nearest(net,x,z).dist<16)return null;return <group key={i} position={[x,0,z]}>
        <mesh position={[0,2.5,0]}><cylinderGeometry args={[.4,.6,5,6]}/><meshStandardMaterial color='#6d6b52'/></mesh>
        <mesh position={[0,6,0]}><icosahedronGeometry args={[3.3,0]}/><meshStandardMaterial color='#236658' emissive='#123c35' emissiveIntensity={.35} flatShading/></mesh>
        <mesh position={[side*4,1.4,0]}><boxGeometry args={[.4,2.8,.4]}/><meshStandardMaterial color='#34566a'/></mesh><mesh position={[side*4,3,0]}><boxGeometry args={[1.2,.35,1.2]}/><meshBasicMaterial color='#7ddbf3' toneMapped={false}/></mesh>
      </group>;})}
      <Sign title={track.title} detail={track.status==='possible'?'TEST DRIVE · EXPLORE AN OPTION':track.status==='upcoming'?'COMING UP · PREPARE THIS ROAD':`${gameApi.readyByTrack[track.id]??0}% READY · YOUR ROAD`} color={color} heading={Math.atan2(at.tan.x,at.tan.z)} position={[at.p.x-at.tan.z*11,10,at.p.z+at.tan.x*11]} onClick={()=>gameApi.goToTrack(track.id)}/>
    </group>;})}
    {mapNetwork.majorGates.map(g=><Gate key={g.stop.id} gate={g}/>)}
    {mapNetwork.bundles.map(b=><group key={b.bundle.id} position={[b.pos.x,0,b.pos.z]} rotation={[0,b.heading,0]}>
      <mesh position={[0,2,0]}><boxGeometry args={[.35,4,.35]}/><meshStandardMaterial color="#426477"/></mesh>
      <mesh position={[0,4,0]}><boxGeometry args={[5,2.3,.4]}/><meshStandardMaterial color="#244856" emissive="#50b1bb" emissiveIntensity={.15}/></mesh>
      {[0,1,2].map(i=><mesh key={i} position={[-1.2+i*1.2,4,-.23]}><circleGeometry args={[.17,8]}/><meshBasicMaterial color="#96cbd0"/></mesh>)}
    </group>)}
    {mapNetwork.forks.map(f=><group key={f.crossing.id} position={[f.pos.x,0,f.pos.z]}>
      <mesh position={[0,.13,0]} rotation={[-Math.PI/2,0,Math.PI/4]}><planeGeometry args={[16,16]}/><meshBasicMaterial color='#4e4080' transparent opacity={.55}/></mesh>

    </group>)}
    {/* A quiet skyline stays away from both the personal landmarks and every lane. */}
    {Array.from({length:14},(_,i)=>{const a=i/14*Math.PI*2,r=260+(i%3)*50,x=Math.cos(a)*r,z=Math.sin(a)*r; if(net.paths.some(p=>p.pts.some(pt=>Math.hypot(pt.x-x,pt.z-z)<45)))return null;const h=12+(i%4)*8;return <group key={i} position={[x,0,z]}><mesh position={[0,h/2,0]}><boxGeometry args={[14,h,13]}/><meshStandardMaterial color='#1c3046' roughness={.9}/></mesh>{[.3,.6,.85].map(y=><mesh key={y} position={[0,h*y,-6.6]}><boxGeometry args={[10,.8,.1]}/><meshBasicMaterial color='#426b88'/></mesh>)}</group>;})}
  </>;
}
