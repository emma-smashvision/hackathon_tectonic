"use client";
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WorldBatch as Batch } from './WorldBatch';
import { facadeMaterial, glowMaterial } from '../city10/scene/materials';
import type { BoxInstance } from '../city10/scene/art';
import { growthStage, isFogged, type DistrictPlot } from './layout';

import type { WorldArea } from '@/one/world';
import { districtNumbers, financeParts, FinanceAttachments, type Parts } from './FinanceBuildings';
export function buildingParts(kind:string,stage:number,color:string):Parts {
 const p:Parts={body:[],stone:[],roof:[],light:[],detail:[]};
 const box=(target:keyof Parts,x:number,y:number,z:number,w:number,h:number,d:number,c?:string,rot=0)=>p[target].push({at:[x,y,z],size:[w,h,d],color:c,rot});
 const pavilion=(x:number,z:number,w:number,d:number,h:number)=>{box('body',x,h/2,z,w,h,d);box('stone',x,.3,z,w+1.1,.6,d+1.1,'#88979a');box('roof',x,h+.25,z,w+1.1,.5,d+1.1,'#51656b');box('light',x,h-.15,z+d/2+.05,w,.16,.12,color);for(const side of [-1,1])box('light',x+side*w/2,h/2,z+d/2+.08,.11,h,.11,color);box('light',x,h+.6,z,.3,.5,.3,color);for(let i=-w/2+1;i<w/2;i+=2.1)box('light',x+i,h*.45,z+d/2+.06,.65,h*.25,.08,'#f6ce8f');};
 box('stone',0,.14,0,23,.28,21,'#445a5d');
 const h=16+stage*4;
 switch(kind){
 case 'home':case 'family':pavilion(-3,0,9,9,h);pavilion(4,2,5,7,h*.65);box('roof',-3,h+.8,0,9.8,1.4,10,'#4b6572');if(stage>=2){box('body',-3,h+1.8,-.5,6,2.8,6);box('roof',-3,h+3.3,-.5,6.8,.35,6.8,'#526c75');}if(stage>=3){box('stone',6,.5,-5,6,1,4,'#7c8c83');box('light',6,1.05,-5,4,.08,2,'#7cc2c8');}break;
 case 'car':pavilion(-3,-1,12,9,10);box('roof',-3,10.5,-1,13,.35,10,'#547885');for(let i=0;i<stage;i++){box('detail',-6+i*4,1.1,6,2.2,1.3,4,i%2?'#b8c9d1':'#7ca3b7');box('body',-6+i*4,1.95,6,1.7,.65,2.2);box('light',-6+i*4,.9,8.02,1.7,.2,.08,'#fff0c9');}box('light',7,1.9,2,.4,3.8,.4,'#8bd8c7');break;
 case 'kids':pavilion(-5,0,7,9,h);pavilion(4,0,7,9,h*.8);box('roof',0,h*.55,0,8,.6,5,'#92a695');for(let i=0;i<stage;i++)box('stone',i*3-4,.6,7,2,1.2,1.5,'#a2b4a6');break;
 case 'savings':pavilion(0,0,12,10,h);for(let i=0;i<stage;i++){box('roof',-5+i*3,h+.7,0,2,.4,7,'#88a2a1',-.12);box('light',-5+i*3,h+.95,3,1.5,.12,.4,'#e9ca83');}for(const x of [-7,7])box('stone',x,1.1,5,1,2.2,6,'#99a58f');break;
 case 'investments':case 'private-banking':pavilion(-3,0,8,9,h+stage*1.5);pavilion(5,2,6,8,h*.8);if(stage>=2)pavilion(-3,-1,5,5,h+stage*2);break;
 case 'work':pavilion(-4,0,9,10,h+stage);pavilion(5,2,6,7,5);for(let i=0;i<3;i++)box('detail',-7+i*3,h+stage+.7,-1,2,.5,5,'#557e91');break;
 case 'pension':pavilion(0,0,11,9,h);for(let i=0;i<5;i++)box('stone',-5+i*2.5,2.8,5,.45,5.6,.45,'#a4b5bb');box('roof',0,5.8,5,13,.5,2,'#748d9b');break;
 case 'abroad':pavilion(0,0,13,8,5);box('body',5,6.2,-2,3,12.4,3);box('light',5,12.8,-2,4,.5,4,color);break;
 case 'care':for(const x of [-6,6]){box('stone',x,.5,0,3,1,12,'#718f82');for(let i=0;i<5;i++)box('detail',x,1.3,-4+i*2,1.2,1.7,1.2,'#759a87');}for(const x of [-4,4])box('roof',x,3.5,0,.3,7,.3,'#748b87');for(let z=-4;z<=4;z+=2)box('roof',0,7,z,9,.25,.3,'#748b87');box('stone',0,.4,3,5,.8,1.5,'#a1aaa1');break;
 default:pavilion(0,0,10,9,h);
 }
 if(kind==='home'){const top=h*.65+3;for(const x of [1.3,6.7])for(const z of [-1.7,5.7])box('light',x,top/2,z,.085,top,.085,'#ffb45e');for(let level=1;level<=stage+3;level++){const y=level*3.2;for(const z of [-1.7,5.7])box('light',4,y,z,5.4,.08,.08,'#ffb45e');for(const x of [1.3,6.7])box('light',x,y,2,.08,.08,7.4,'#ffb45e');}}
 if(stage>=2)for(const x of [-9,9]){box('stone',x,.45,6,2,.9,3,'#7a8b86');box('detail',x,1.2,6,1.6,1.6,2.6,'#61846e');}
 if(stage>=3){box('stone',0,.5,9,5,1,.7,'#a3afa7');for(const x of [-2,2])box('roof',x,.3,9,.2,.6,.6);}
 if(stage>=4){for(const x of [-9,9]){box('roof',x,3,-7,.16,6,.16);box('light',x,6,-7,.7,.24,.7,'#ffdfae');}box('roof',0,h+1,0,3,.2,3,'#9ab5b4');}
 return p;
}
function FogVeil({reducedMotion,locked}:{reducedMotion:boolean;locked:boolean}){
 const opacity=useRef(locked?1:0);
 const material=useMemo(()=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0},fade:{value:locked?1:0}},vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform float time;uniform float fade;varying vec2 uv0;void main(){vec2 p=(uv0-.5)*2.;float a=exp(-dot(p,p)*3.5);float n=.7+.3*sin(p.x*13.+sin(p.y*8.+time*.13))*sin(p.y*9.+time*.1);gl_FragColor=vec4(.09,.15,.22,a*n*.65*fade);}`}),[]);
 useEffect(()=>()=>material.dispose(),[material]);
 const group=useRef<THREE.Group>(null);
 useFrame(({clock},delta)=>{if(!reducedMotion)material.uniforms.time.value=clock.elapsedTime;opacity.current=reducedMotion?(locked?1:0):THREE.MathUtils.damp(opacity.current,locked?1:0,1.8,delta);material.uniforms.fade.value=opacity.current;if(group.current){group.current.visible=opacity.current>.005;group.current.position.y=(1-opacity.current)*13;}});
 return <group ref={group}>{[4,8].map((y,i)=><mesh key={y} position={[i-1,y,0]} rotation={[-Math.PI/2,0,i*.7]} material={material}><planeGeometry args={[44,42]}/></mesh>)}</group>;
}
function LockedKey(){
 const group=useRef<THREE.Group>(null);
 const geometry=useMemo(()=>{
  const ring=new THREE.TorusGeometry(1.25,.16,6,24).translate(-1.2,1.2,0);
  const shaft=new THREE.BoxGeometry(.3,4,.3).rotateZ(Math.PI/4).translate(.9,-.9,0);
  const teeth=[1.1,2].map(n=>new THREE.BoxGeometry(1,.3,.3).rotateZ(Math.PI/4).translate(n+.25,-n+.4,0));
  const parts=[ring,shaft,...teeth],merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());return merged;
 },[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(({camera})=>{group.current?.quaternion.copy(camera.quaternion);});
 return <group ref={group} position={[0,10,0]}><mesh geometry={geometry}><meshBasicMaterial color="#a0cce3" toneMapped={false}/></mesh></group>;
}
export function AreaPlot({area,plot,index,onArea,focused,reducedMotion,aheadStage,energyPrepared=false}:{area:WorldArea;plot:DistrictPlot;index:number;onArea:(id:string)=>void;focused:boolean;reducedMotion:boolean;aheadStage?:number;energyPrepared?:boolean}){
 const initial=useMemo(()=>({position:[plot.x,1.65,plot.z] as [number,number,number],scale:plot.scale}),[]);
 const stage=growthStage(area.stage),fogged=isFogged(area);
 const position=useRef<THREE.Group>(null),land=useRef<THREE.Group>(null),rise=useRef<THREE.Group>(null),previousLocked=useRef(fogged),elapsed=useRef(10);
 const finance=useMemo(()=>({...districtNumbers(area),solar:energyPrepared}),[area,energyPrepared]);
 const parts=useMemo(()=>financeParts(finance,plot.color)??buildingParts(plot.kind,stage,plot.color),[finance,plot.kind,stage,plot.color]);
 const ghost=useMemo(()=>aheadStage===undefined?null:buildingParts(plot.kind,growthStage(aheadStage),plot.color),[plot.kind,plot.color,aheadStage]);
 const landscape=useMemo(()=>{const items:BoxInstance[]=[];for(let i=0;i<9;i++){const a=i*2.4,r=17.5+(i%2)*1.5;items.push({at:[Math.cos(a)*r,.7,Math.sin(a)*r],size:[1.5,1.4,1.8],color:i%2?'#59796c':'#315d54'});}return items;},[]);
 const m=useMemo(()=>({body:Object.assign(facadeMaterial(2.8),{color:new THREE.Color('#284a64'),metalness:.7,roughness:.29}),stone:new THREE.MeshStandardMaterial({color:'#8ca4af',roughness:.65,metalness:.25}),roof:new THREE.MeshStandardMaterial({color:'#87a2b8',roughness:.48,metalness:.5}),detail:new THREE.MeshStandardMaterial({color:'#a2b4af',roughness:.65}),light:glowMaterial(),ghost:new THREE.MeshBasicMaterial({color:'#bce5ff',transparent:true,opacity:.18,wireframe:true,depthWrite:false})}),[]);
 useEffect(()=>()=>Object.values(m).forEach(v=>v.dispose()),[m]);
 useEffect(()=>{if(previousLocked.current&&!fogged&&!reducedMotion){elapsed.current=0;if(rise.current)rise.current.scale.y=.015;}previousLocked.current=fogged;},[fogged,reducedMotion]);
 useFrame((_,delta)=>{
  elapsed.current+=delta;
  if(position.current){const alpha=reducedMotion?1:1-Math.exp(-delta*2.4);position.current.position.x=THREE.MathUtils.lerp(position.current.position.x,plot.x,alpha);position.current.position.z=THREE.MathUtils.lerp(position.current.position.z,plot.z,alpha);const scale=THREE.MathUtils.lerp(position.current.scale.x,plot.scale,alpha);position.current.scale.setScalar(scale);}
  if(land.current)land.current.position.y=reducedMotion?(fogged?-2:0):THREE.MathUtils.damp(land.current.position.y,fogged?-2:0,2.4,delta);
  if(rise.current){const target=elapsed.current<.35?.015:1;rise.current.scale.y=reducedMotion?1:THREE.MathUtils.damp(rise.current.scale.y,target,3,delta);}
 });
 const click=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();if(e.delta<6)onArea(area.id);};
 const lanterns=Math.min(12,Math.max(0,area.lanterns??0));
 return <group ref={position} position={initial.position} scale={initial.scale} onClick={click}><group ref={land}>
 <mesh position={[0,-3.7,0]} receiveShadow onClick={click}><cylinderGeometry args={[20,22,7,40]}/><meshStandardMaterial color={fogged?'#1c3443':'#294957'} roughness={.85}/></mesh>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,.03,0]} onClick={click} onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='';}}><circleGeometry args={[20,48]}/><meshStandardMaterial color={fogged?'#18303d':new THREE.Color('#203b46').lerp(new THREE.Color(plot.color),.1)} roughness={.8}/></mesh>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,.09,0]}><ringGeometry args={[19.5,focused?19.98:19.8,64]}/><meshBasicMaterial color={new THREE.Color(plot.color).multiplyScalar(3.2)} transparent opacity={fogged?.32:focused?1:.9} toneMapped={false}/></mesh>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,.08,0]}><ringGeometry args={[18.9,20.5,64]}/><meshBasicMaterial color={plot.color} transparent opacity={fogged?.03:.12} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>
 <group ref={rise} onClick={click}>{!fogged&&<><Batch items={parts.body} material={m.body}/><Batch items={parts.stone} material={m.stone}/><Batch items={parts.roof} material={m.roof}/><Batch items={parts.detail} material={m.detail}/><Batch items={parts.light} material={m.light}/><Batch items={landscape} material={m.detail}/><FinanceAttachments finance={finance} color={plot.color}/></>}</group>
 {!fogged&&plot.kind==='savings'&&<group position={[0,22,-5]}><mesh position={[0,3,0]}><cylinderGeometry args={[.22,.65,6,12]}/><meshBasicMaterial color={[.4,2.2,1.7]} toneMapped={false}/></mesh><mesh position={[0,5,0]}><torusGeometry args={[2,.09,6,32]}/><meshBasicMaterial color={[.4,1.8,1.7]} toneMapped={false}/></mesh></group>}
 {ghost&&<group position={[0,.2,0]}><Batch items={ghost.body} material={m.ghost}/><Batch items={ghost.roof} material={m.ghost}/></group>}
 {!fogged&&!!area.signposts?.length&&<><mesh position={[-12,1.6,10]}><boxGeometry args={[.18,3.2,.18]}/><meshStandardMaterial color="#8c9c9c"/></mesh><mesh position={[-12,2.7,10]} rotation={[0,-.2,0]}><boxGeometry args={[2.6,1.1,.2]}/><meshStandardMaterial color="#89a6ad" emissive={plot.color} emissiveIntensity={.13}/></mesh></>}
 {Array.from({length:lanterns},(_,i)=>{const a=i/12*Math.PI*2;return <mesh key={i} position={[Math.cos(a)*18,2.6,Math.sin(a)*18]}><boxGeometry args={[.6,.9,.6]}/><meshBasicMaterial color={[2.7,1.7,.65]} toneMapped={false}/></mesh>;})}
 <FogVeil reducedMotion={reducedMotion} locked={fogged}/>{fogged&&<LockedKey/>}
 </group></group>;
}
