"use client";
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ribbon } from '../engine/geom';
import { BuildingSigns } from './BuildingSigns';
import { Batch } from './Batch';
import type { ArtRoad, BoxInstance, Point, Tower } from './art';
import { makeTowers, roadLength, roadSample } from './art';
import { facadeMaterial, glowMaterial, roadMaterial, lightPoolMaterial } from './materials';

function perimeter(items:BoxInstance[],x:number,y:number,z:number,w:number,d:number,rot:number,color:string){for(const side of [-1,1]){items.push({at:[x+Math.sin(rot)*d/2*side,y,z+Math.cos(rot)*d/2*side],size:[w,.07,.08],rot,color});items.push({at:[x+Math.cos(rot)*w/2*side,y,z-Math.sin(rot)*w/2*side],size:[.08,.07,d],rot,color});}}
function towerParts(towers:Tower[]){const bodies:BoxInstance[]=[],edges:BoxInstance[]=[],bases:BoxInstance[]=[];
 for(const t of towers){const {x,z,w,d,h,rot,color,seed}=t;bodies.push({at:[x,h/2,z],size:[w,h,d],rot,color:seed%3===0?'#d3e3ee':'#91aabd'});bases.push({at:[x,.3,z],size:[w+5,.6,d+5],rot});
  if(seed%3!==0){const tier=4+h*.12;bodies.push({at:[x,h+tier/2,z],size:[w*.7,tier,d*.7],rot});perimeter(edges,x,h+tier,z,w*.72,d*.72,rot,color);if(seed%4===0){bodies.push({at:[x,h+tier+2,z],size:[w*.43,4,d*.43],rot});perimeter(edges,x,h+tier+4,z,w*.45,d*.45,rot,color);}}
  // Warm retail glazing and canopies make the ground floor read at driving height.
  if(seed%3!==0){for(const side of [-1,1]){const front=side*(d/2+.06);edges.push({at:[x+Math.sin(rot)*front,2.1,z+Math.cos(rot)*front],size:[w*.72,2.7,.07],rot,color:seed%2?'#6c9eae':'#ba8b56'});const flank=side*(w/2+.06);edges.push({at:[x+Math.cos(rot)*flank,2.1,z-Math.sin(rot)*flank],size:[.07,2.7,d*.66],rot,color:seed%2?'#6c9eae':'#ba8b56'});}bases.push({at:[x,3.7,z],size:[w+1.1,.18,d+1.1],rot});}
  // Cornices and one vertical light seam make distinct silhouettes without outlining every face.
  for(const y of [h*.33,h*.67,h])perimeter(edges,x,y,z,w+.12,d+.12,rot,color);
  const dx=Math.cos(rot)*w*.5+Math.sin(rot)*d*.5,dz=-Math.sin(rot)*w*.5+Math.cos(rot)*d*.5;
  edges.push({at:[x+dx,h/2,z+dz],size:[.13,h,.13],color});if(seed%4===1)for(const off of [-.25,.25])edges.push({at:[x+Math.cos(rot)*w*off+Math.sin(rot)*(d/2+.03),h/2,z-Math.sin(rot)*w*off+Math.cos(rot)*(d/2+.03)],size:[.07,h,.07],color});
  if(seed%5===0){bodies.push({at:[x,h+6,z],size:[.5,12,.5]});edges.push({at:[x,h+12,z],size:[.4,.5,.4],color:'#ffadb7'});}
 }return{bodies,edges,bases};}
export function Skyline({roads,home,towers}:{roads:ArtRoad[];home:Point;towers?:Tower[]}){
 const allTowers=useMemo(()=>towers??makeTowers(roads,home),[roads,home,towers]);
 const parts=useMemo(()=>towerParts(allTowers),[allTowers]);
 const materials=useMemo(()=>({body:facadeMaterial(),edge:glowMaterial(),base:new THREE.MeshStandardMaterial({color:'#253b4d',roughness:.52,metalness:.5})}),[]);
 useEffect(()=>()=>Object.values(materials).forEach(m=>m.dispose()),[materials]);
 return <><Batch items={parts.bodies} material={materials.body}/><Batch items={parts.edges} material={materials.edge}/><Batch items={parts.bases} material={materials.base}/><BuildingSigns towers={allTowers}/></>;
}
export function Roads({roads}:{roads:ArtRoad[]}){
 const roadGeometry=useMemo(()=>ribbon(roads.map(r=>({pts:r.points,offset:0,width:r.width??11,y:.005}))),[roads]);useEffect(()=>()=>roadGeometry.dispose(),[roadGeometry]);
 const data=useMemo(()=>{const asphalt:BoxInstance[]=[],edges:BoxInstance[]=[],dashes:BoxInstance[]=[],walks:BoxInstance[]=[],lamps:BoxInstance[]=[],lights:BoxInstance[]=[],pools:BoxInstance[]=[];
 for(const road of roads){const width=road.width??11;
 for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],len=Math.hypot(b.x-a.x,b.z-a.z),rot=Math.atan2(b.x-a.x,b.z-a.z),x=(a.x+b.x)/2,z=(a.z+b.z)/2;asphalt.push({at:[x,.005,z],size:[width,.04,len+.3],rot});for(const side of [-1,1]){const off=side*(width/2+.13);edges.push({at:[x+Math.cos(rot)*off,.055,z-Math.sin(rot)*off],size:[.13,.06,len+.25],rot,color:road.color});const walk=side*(width/2+2.15);walks.push({at:[x+Math.cos(rot)*walk,-.01,z-Math.sin(rot)*walk],size:[4,.14,len+.3],rot});}}
 const length=roadLength(road.points);
 for(let s=2;s<length;s+=9){const p=roadSample(road.points,s);dashes.push({at:[p.x,.038,p.z],size:[.12,.02,3],rot:p.heading,color:'#c0d9e2'});}
 for(let s=8;s<length;s+=38){const p=roadSample(road.points,s);for(const side of [-1,1]){const off=side*(width/2+1.6),x=p.x+Math.cos(p.heading)*off,z=p.z-Math.sin(p.heading)*off;lamps.push({at:[x,3.9,z],size:[.16,7.8,.16]});lights.push({at:[x,7.8,z],size:[.35,.1,2.1],rot:p.heading,color:'#c4e9ff'});lights.push({at:[x,.14,z],size:[.3,.2,.3],color:road.color});pools.push({at:[x,.082,z],size:[9,.006,12],color:'#abd5ee'});}}
 }return{asphalt,edges,dashes,walks,lamps,lights,pools};},[roads]);
 const m=useMemo(()=>({pool:lightPoolMaterial(),road:roadMaterial(),glow:glowMaterial(),paint:new THREE.MeshBasicMaterial({color:'#a4bdcb'}),walk:new THREE.MeshStandardMaterial({color:'#2a4050',metalness:.4,roughness:.43}),pole:new THREE.MeshStandardMaterial({color:'#51677a',metalness:.7,roughness:.25})}),[]);
 useEffect(()=>()=>{m.pool.map?.dispose();Object.values(m).forEach(v=>v.dispose());},[m]);
 return <><mesh geometry={roadGeometry} material={m.road} renderOrder={1}/><Batch items={data.edges} material={m.glow}/><Batch items={data.dashes} material={m.paint}/><Batch items={data.walks} material={m.walk}/><Batch items={data.lamps} material={m.pole}/><Batch items={data.lights} material={m.glow}/><Batch items={data.pools} material={m.pool} renderOrder={2}/></>;
}
