"use client";
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WorldBatch } from './WorldBatch';
import { glowMaterial } from '../city10/scene/materials';
import type { BoxInstance } from '../city10/scene/art';
import { type DistrictLayout, type DistrictPlot, type SceneStorm } from './layout';

/** Seven homes are the denominator; one blue flood is the affected share. */
function Storm({storm,plot:p,reducedMotion}:{storm:SceneStorm;plot:DistrictPlot;reducedMotion:boolean}){
 const prepared=!!(storm.prepared||storm.status==='prepared');
 const drops=useRef<THREE.InstancedMesh>(null),dam=useRef<THREE.InstancedMesh>(null),flood=useRef<THREE.Mesh>(null),cloud=useRef<THREE.Group>(null);
 const object=useMemo(()=>new THREE.Object3D(),[]),preparation=useRef(prepared?1:0);
 const parts=useMemo(()=>{const homes:BoxInstance[]=[],lights:BoxInstance[]=[];for(let i=0;i<7;i++){const x=(i-3)*2.5;
  homes.push({at:[x,1,0],size:[1.75,2,2],color:i===5?'#c5837b':'#91b7c6'});
  homes.push({at:[x,2.1,0],size:[2.05,.3,2.3],color:'#4a667f'});
  lights.push({at:[x,1.15,1.03],size:[.65,.6,.08],color:i===5?'#ff958c':'#ffdf99'});
 }return {homes,lights};},[]);
 const materials=useMemo(()=>({homes:new THREE.MeshStandardMaterial({roughness:.65,metalness:.2}),light:glowMaterial()}),[]);
 useEffect(()=>()=>Object.values(materials).forEach(m=>m.dispose()),[materials]);
 useFrame(({clock},delta)=>{
  const t=reducedMotion?1.4:clock.elapsedTime;
  preparation.current=reducedMotion?(prepared?1:0):THREE.MathUtils.damp(preparation.current,prepared?1:0,1.3,delta);
  if(cloud.current){cloud.current.position.y=preparation.current*5;cloud.current.scale.setScalar(1-preparation.current*.22);}
  for(let i=0;i<7;i++){
   // One visible drop per tiny home. Each falls through the same measured column.
   const y=3+(1-((t*.65+i*.09)%1))*10;
   object.position.set((i-3)*2.5,y,-.2);object.scale.set(.16,(1-preparation.current)*.9,.16);object.updateMatrix();drops.current?.setMatrixAt(i,object.matrix);
   // The barrier rises block by block in the order of those seven columns.
   const h=THREE.MathUtils.clamp(preparation.current*8-i,0,1)*2.8;
   object.position.set((i-3)*2.5,h/2,-2.2);object.scale.set(2.4,Math.max(.001,h),1);object.updateMatrix();dam.current?.setMatrixAt(i,object.matrix);
  }
  if(drops.current)drops.current.instanceMatrix.needsUpdate=true;
  if(dam.current)dam.current.instanceMatrix.needsUpdate=true;
  if(flood.current){flood.current.scale.y=Math.max(.001,1-preparation.current);flood.current.visible=preparation.current<.99;}
 });
 return <group position={[p.x,2,p.z+14*p.scale]} scale={p.scale}>
  <mesh position={[0,-.1,-.2]}><boxGeometry args={[20,.3,6.5]}/><meshStandardMaterial color="#213f54"/></mesh>
  <WorldBatch items={parts.homes} material={materials.homes}/><WorldBatch items={parts.lights} material={materials.light}/>
  <mesh ref={flood} position={[5,.55,.2]}><boxGeometry args={[2.45,1.1,3.1]}/><meshStandardMaterial color="#4b9ed9" emissive="#3779c0" emissiveIntensity={.45} transparent opacity={.72}/></mesh>
  <instancedMesh ref={dam} args={[undefined,undefined,7]} frustumCulled={false}><boxGeometry/><meshStandardMaterial color="#78b8b1" emissive="#4da98e" emissiveIntensity={.4} roughness={.5}/></instancedMesh>
  <instancedMesh ref={drops} args={[undefined,undefined,7]} frustumCulled={false}><sphereGeometry args={[1,6,6]}/><meshBasicMaterial color={[.7,1.8,2.8]} toneMapped={false}/></instancedMesh>
  <group ref={cloud}>{[-6,-2,2,6].map((x,i)=><mesh key={x} position={[x,15+Math.sin(i)*.7,-.2]} scale={[3.7,1.8,2.3]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color={prepared?'#648391':'#334757'} transparent opacity={prepared?.35:.92} roughness={1}/></mesh>)}</group>
 </group>;
}
export function Weather({storms,plots,reducedMotion}:{storms:readonly SceneStorm[];plots:DistrictLayout;reducedMotion:boolean}){
 // One demonstration per persona, including when a host supplies a storm override.
 const storm=storms.find(s=>s.status!=='preview');
 return storm?<Storm key={storm.id} storm={storm} plot={plots[storm.areaId]} reducedMotion={reducedMotion}/>:null;
}
