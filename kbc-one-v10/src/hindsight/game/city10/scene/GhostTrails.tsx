"use client";
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { type ArtRoad, roadLength, roadSample } from './art';
/** Only roads whose aggregate count AND density are published may render crowd trails. */
export function GhostTrails({roads,reducedMotion=false}:{roads:ArtRoad[];reducedMotion?:boolean}){
 const mesh=useRef<THREE.InstancedMesh>(null);
 const data=useMemo(()=>roads.filter(r=>r.ghosts).flatMap(road=>Array.from({length:5},(_,i)=>({road,index:i,length:roadLength(road.points)}))),[roads]);
 const material=useMemo(()=>new THREE.MeshBasicMaterial({color:new THREE.Color(.3,1.6,1.8),transparent:true,opacity:.29,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}),[]);
 const obj=useMemo(()=>new THREE.Object3D(),[]);
 useEffect(()=>()=>material.dispose(),[material]);
 useFrame(({clock})=>{if(!mesh.current)return;data.forEach(({road,index,length},i)=>{const distance=((reducedMotion?0:clock.elapsedTime*8)+26+index*29)%Math.max(1,length-10);const p=roadSample(road.points,distance);const off=index%2?2.1:-2.1;obj.position.set(p.x+Math.cos(p.heading)*off,.38,p.z-Math.sin(p.heading)*off);obj.rotation.set(0,p.heading,0);obj.scale.set(.17,.09,9+index*1.4);obj.updateMatrix();mesh.current!.setMatrixAt(i*2,obj.matrix);obj.position.x+=Math.cos(p.heading)*1.3;obj.position.z-=Math.sin(p.heading)*1.3;obj.updateMatrix();mesh.current!.setMatrixAt(i*2+1,obj.matrix);});mesh.current.instanceMatrix.needsUpdate=true;});
 if(!data.length)return null;
 return <instancedMesh ref={mesh} args={[undefined,material,data.length*2]} frustumCulled={false}><boxGeometry args={[1,1,1]}/></instancedMesh>;
}
