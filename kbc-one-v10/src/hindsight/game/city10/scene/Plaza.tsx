"use client";
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Batch } from './Batch';
import { distanceToRoad, type ArtRoad, type BoxInstance, type Point } from './art';
import { glowMaterial } from './materials';
/** Ground-level urban detail stays outside every drivable road. */
export function Plaza({roads,home}:{roads:ArtRoad[];home:Point}){
 const parts=useMemo(()=>{const tiles:BoxInstance[]=[],strips:BoxInstance[]=[],beds:BoxInstance[]=[],reeds:BoxInstance[]=[];
 for(let x=-84;x<=84;x+=12)for(let z=-84;z<=84;z+=12){if(Math.hypot(x,z)>96)continue;const p={x:x+home.x,z:z+home.z};if(roads.some(r=>distanceToRoad(p,r)<(r.width??11)/2+8))continue;
 tiles.push({at:[p.x,-.015,p.z],size:[11.8,.06,11.8],color:(x+z)%24===0?'#1c3445':'#1f3848'});
 if((x+z)%36===0){strips.push({at:[p.x,.025,p.z-5.7],size:[8,.025,.045],color:'#639aad'});}
 if(x%36===0&&z%36===0){beds.push({at:[p.x,.12,p.z],size:[3.5,.24,7]});for(let j=0;j<6;j++){reeds.push({at:[p.x-.9+j%2*1.8,.5,p.z-2.4+Math.floor(j/2)*2.4],size:[.08,.6+(j%3)*.2,.1],color:'#648e87'});}}
 }return{tiles,strips,beds,reeds};},[roads,home]);
 const m=useMemo(()=>({tile:new THREE.MeshStandardMaterial({color:'#ffffff',metalness:.3,roughness:.64}),line:glowMaterial(.55),bed:new THREE.MeshStandardMaterial({color:'#101e2a',metalness:.35,roughness:.5}),reed:new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.8})}),[]);
 useEffect(()=>()=>Object.values(m).forEach(v=>v.dispose()),[m]);
 return <><Batch items={parts.tiles} material={m.tile}/><Batch items={parts.strips} material={m.line}/><Batch items={parts.beds} material={m.bed}/><Batch items={parts.reeds} material={m.reed}/></>;
}
