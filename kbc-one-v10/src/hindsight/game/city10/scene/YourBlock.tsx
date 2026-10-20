"use client";
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { villageFor } from '@/one/village/model';
import { useVillageProgress } from '@/one/village/useVillageProgress';
import { Batch } from './Batch';
import type { BoxInstance, Point } from './art';
import { facadeMaterial, glowMaterial } from './materials';
import { Hologram } from './Hologram';
import { PlayerCar } from './PlayerCar';
// r2-places: finance-backed labels, goal tanks and tappable arrival pads.
import { usePlaces, buildPlaces, placeIdForPlot } from '@/one/places';
import { PEOPLE } from '@/one/people';
import { placePad } from './placePad';
const colors=['#ffca87','#63e5ff','#83f4d0','#8ee9ad','#ff9bb1'];
const positions=[[-30,-30],[30,-30],[-30,30],[30,30],[52,0]];
const heights=[28,8,34,45,25];
function rim(items:BoxInstance[],x:number,y:number,z:number,w:number,d:number,color:string){
 for(const side of [-1,1]){items.push({at:[x,y,z+side*d/2],size:[w,.085,.085],color});items.push({at:[x+side*w/2,y,z],size:[.085,.085,d],color});}
}
export function YourBlock({personaId,home,previewPassed,blocks,labels=true}:{personaId:string;home:Point;previewPassed?:number;labels?:boolean;blocks?:{x:number;z:number;door?:Point}[]}){
 const placeSession=usePlaces();
 const fallbackPlaces=useMemo(()=>Object.hasOwn(PEOPLE,personaId)?buildPlaces(PEOPLE[personaId]):[],[personaId]);
 const places=placeSession?.places??fallbackPlaces;
 const village=useMemo(()=>villageFor(personaId),[personaId]),progress=useVillageProgress(personaId);
 const spots=useMemo(()=>village.plots.map((_,i)=>blocks?.[i]??{x:home.x+positions[i][0],z:home.z+positions[i][1]}),[blocks,home,village]);
 const passed=previewPassed??progress.done.filter(id=>village.destination?.lessonIds.includes(id)).length;
 const state=passed===0?'bare':passed<(village.destination?.lessonIds.length??3)?'lit':'crowned';
 const data=useMemo(()=>{
  const body:BoxInstance[]=[],warm:BoxInstance[]=[],trim:BoxInstance[]=[],slab:BoxInstance[]=[],glass:BoxInstance[]=[],garden:BoxInstance[]=[];
  village.plots.forEach((plot,i)=>{
   const{x,z}=spots[i],color=colors[i];slab.push({at:[x,.3,z],size:[17,.6,17]});rim(trim,x,.65,z,16.7,16.7,color);
   if(i===0){ // Residential tower: warm apartments and deep, continuous balconies.
    warm.push({at:[x,13,z],size:[12,26,12]},{at:[x-2,27,z+1],size:[8,2,8]});
    for(const y of [4,8,12,16,20,24]){slab.push({at:[x,y,z],size:[15,.24,15]});for(const side of [-1,1]){glass.push({at:[x,y+.65,z+side*7.4],size:[14.5,1.1,.08]});trim.push({at:[x,y+1.2,z+side*7.4],size:[14.5,.06,.06],color:'#e0bb80'});}}
   }else if(i===1){ // Open showroom: a car displayed on a circular, illuminated turntable.
    for(const side of [-1,1]){slab.push({at:[x+side*7,4.4,z],size:[.65,8,14]});glass.push({at:[x+side*6.9,3.8,z],size:[.1,6,13]});}
    slab.push({at:[x,8.4,z],size:[17,.65,16]});glass.push({at:[x,4,z+6.5],size:[13,7,.1]});rim(trim,x,8.8,z,17,16,color);
   }else if(i===2){ // Glass vault: each goal fills its own tank from the shared demo model.
    body.push({at:[x,17,z],size:[4,34,4]});
    for(const a of [-1,1])for(const b of [-1,1]){slab.push({at:[x+a*6,17,z+b*6],size:[.5,34,.5]});trim.push({at:[x+a*6.15,17,z+b*6.15],size:[.075,34,.075],color});}
    for(const side of [-1,1]){glass.push({at:[x+side*6,17,z],size:[.08,34,12]},{at:[x,17,z+side*6],size:[12,34,.08]});}
    for(const y of [1,11,22,34])rim(trim,x,y,z,12,12,color);
    // r2-places: one reservoir per goal; money determines fill, never lesson completion.
    const goals=places.find(p=>p.id==='savings')?.goals??[];
    const vaultDoor=blocks?.[i]?.door??{x,z:z-19},vx=vaultDoor.x-x,vz=vaultDoor.z-z,vn=Math.hypot(vx,vz)||1;
    goals.forEach((goal,j)=>{const offset=(j-(goals.length-1)/2)*Math.min(3,10/goals.length),tx=x+vx/vn*4-vz/vn*offset,tz=z+vz/vn*4+vx/vn*offset,fill=Math.max(.08,goal.percent/100*27);glass.push({at:[tx,15,tz],size:[2,28,2]});trim.push({at:[tx,1+fill/2,tz],size:[1.7,fill,1.7],color:'#67ffd3'});});
   }else if(i===3){ // Planted arcology: progressively narrower terraces and a green spine.
    [[6,12,12],[18,12,9],[31,14,7],[42,8,4]].forEach(([y,h,w])=>{body.push({at:[x,y,z],size:[w,h,w]});slab.push({at:[x,y+h/2,z],size:[w+2,.35,w+2]});rim(trim,x,y+h/2+.3,z,w+2,w+2,color);for(const side of [-1,1])garden.push({at:[x+side*(w/2+.25),y+h/2+.55,z],size:[.65,.6,w+1],color:'#345f48'});});
    // r2-places: the pension spine fills with this year's own contribution ratio.
    const fill=42*(places.find(p=>p.id==='pension')?.progress?.percent??0)/100;
    if(fill>0)trim.push({at:[x,2+fill/2,z-3.6],size:[.35,fill,.35],color});
   }else{body.push({at:[x-3,12,z],size:[7,24,13]},{at:[x+4,9,z],size:[5,18,11]});slab.push({at:[x,24.4,z],size:[16,.65,14]});rim(trim,x,24.8,z,16,14,color);}
   // Each building has a lit lobby and a clear curb; no asset value controls its scale.
   const door=blocks?.[i]?.door??{x,z:z-19};const dx=door.x-x,dz=door.z-z,n=Math.hypot(dx,dz)||1;
   const rot=Math.atan2(dx,dz);if(i!==1)trim.push({at:[x+dx/n*7.15,2,z+dz/n*7.15],size:[4.5,2.7,.08],rot,color:state==='bare'?'#718f9b':color});
  });return{body,warm,trim,slab,glass,garden};
 },[village,spots,state,blocks,places]);
 const mat=useMemo(()=>({
  body:facadeMaterial(state==='bare'?.45:1.1),warm:facadeMaterial(state==='bare'?.6:1.35,'#ffc581'),glow:glowMaterial(),
  slab:new THREE.MeshStandardMaterial({color:'#274356',roughness:.35,metalness:.58}),
  glass:new THREE.MeshPhysicalMaterial({color:'#4ba6c8',metalness:.2,roughness:.12,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide}),
  garden:new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.85}),
 }),[state]);
 useEffect(()=>()=>Object.values(mat).forEach(m=>m.dispose()),[mat]);
 return <group name="city10-your-block" userData={{state,passed}}>
  <Batch items={data.body} material={mat.body}/><Batch items={data.warm} material={mat.warm}/><Batch items={data.trim} material={mat.glow}/><Batch items={data.slab} material={mat.slab}/><Batch items={data.glass} material={mat.glass}/><Batch items={data.garden} material={mat.garden}/>
  {village.plots.map((p,i)=><group key={p.id}>
   {/* r2-places: transparent hit box covers the whole building; pad is off the through road. */}
   {placeSession&&<mesh name={`place-building-${placeIdForPlot(p.kind)}`} position={[spots[i].x,heights[i]/2,spots[i].z]} onClick={e=>{e.stopPropagation();placeSession.open(placeIdForPlot(p.kind));}}><boxGeometry args={[17,heights[i],17]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>}
   {blocks?.[i]?.door&&<mesh position={[placePad({x:spots[i].x,z:spots[i].z,door:blocks[i].door!}).x,.12,placePad({x:spots[i].x,z:spots[i].z,door:blocks[i].door!}).z]} rotation={[-Math.PI/2,0,0]} onClick={e=>{e.stopPropagation();placeSession?.open(placeIdForPlot(p.kind));}}><ringGeometry args={[2.7,3.2,48]}/><meshBasicMaterial color={colors[i]} transparent opacity={.85} toneMapped={false} depthWrite={false}/></mesh>}
   {/* r2-places: an insurance attachment belongs to this home, not lesson progress. */}
   {p.kind==='home'&&places.find(place=>place.id==='home')?.attachments.some(a=>a.label.includes('insurance')&&a.state==='ok')&&<mesh position={[spots[i].x,.7,spots[i].z]} scale={[1,2.5,1]}><sphereGeometry args={[12,24,12,0,Math.PI*2,0,Math.PI/2]}/><meshPhysicalMaterial color="#8bded4" transparent opacity={.045} roughness={.2} metalness={.1} side={THREE.DoubleSide} depthWrite={false}/></mesh>}
   <Halo position={[spots[i].x,heights[i]+3,spots[i].z]} color={colors[i]} state={state} radius={i===1?8:7}/>
   {labels&&<Hologram position={[spots[i].x+((blocks?.[i]?.door?.x??spots[i].x)-spots[i].x)*.58,6.2,spots[i].z+((blocks?.[i]?.door?.z??spots[i].z-19)-spots[i].z)*.58]} title={places.find(place=>place.id===placeIdForPlot(p.kind))?.title??p.title} subtitle={places.find(place=>place.id===placeIdForPlot(p.kind))?.label??p.subtitle} color={colors[i]} width={12}/>}
  </group>)}
  {spots[1]&&places.find(p=>p.id==='car')?.attachments.length!==0&&<group position={[spots[1].x,0,spots[1].z]}><mesh position={[0,.55,0]}><cylinderGeometry args={[5.3,5.6,.5,48]}/><meshStandardMaterial color="#1c3346" metalness={.6} roughness={.26}/></mesh><mesh rotation={[-Math.PI/2,0,0]} position={[0,.82,0]}><ringGeometry args={[5,5.15,64]}/><meshBasicMaterial color="#6ee7ff" toneMapped={false}/></mesh><group position={[0,.82,0]} rotation={[0,Math.PI/4,0]}><PlayerCar reducedMotion/></group></group>}
 </group>;
}
function Halo({position,color,state,radius}:{position:[number,number,number];color:string;state:string;radius:number}){
 return <group position={position}>{Array.from({length:state==='crowned'?3:1},(_,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} position={[0,i*1.45,0]}><torusGeometry args={[radius-i*.7,.065,6,64]}/><meshBasicMaterial color={new THREE.Color(color).multiplyScalar(state==='bare'?.5:2)} transparent opacity={state==='bare'?.32:.85} depthWrite={false} toneMapped={false}/></mesh>)}</group>;
}
