"use client";
import * as THREE from 'three';
import type { WorldArea } from '@/one/world';
import type { BoxInstance } from '../city10/scene/art';

/** Render-only values: all amounts and percentages are supplied by the world model. */
export type DistrictNumbers = {
 kind: string; percent: number | null; payments?: number | null;
 tenure?: 'own' | 'rent'; maintenance?:number; foundation?: boolean; insured?: boolean; solar?: boolean;
 futurePercent?: number | null; futureHome?:boolean; years?: number | null;
 goals?: readonly {id:string;label:string;percent:number}[];
};
export function districtNumbers(area:WorldArea):DistrictNumbers {
 const f=area.finance;
 return {kind:area.id,percent:f.percent,payments:f.mortgage?.paymentsMade??f.rent?.paymentsMade,
  tenure:f.mortgage?'own':f.rent?'rent':undefined,
  foundation:!!(f.mortgage?.fixedRate||f.mortgage?.balanceInsurance),
  insured:f.attachments.some(attachment=>attachment.visual==='shield'),
  futurePercent:f.rent?.nextHome?.goalPercent??f.goals[0]?.percent,futureHome:!!f.rent?.nextHome||f.goals.length>0,
  years:f.pension?.yearsContributed,maintenance:f.car?.maintenance.length??0,goals:f.goals};
}
export type Parts={body:BoxInstance[];stone:BoxInstance[];roof:BoxInstance[];light:BoxInstance[];detail:BoxInstance[]};
const ratio=(value:number|null|undefined)=>THREE.MathUtils.clamp((value??0)/100,0,1);
export function financeParts(f:DistrictNumbers,color:string):Parts|null {
 if(!['home','car','savings','pension','kids'].includes(f.kind))return null;
 const p:Parts={body:[],stone:[],roof:[],light:[],detail:[]};
 const box=(target:keyof Parts,x:number,y:number,z:number,w:number,h:number,d:number,c?:string)=>p[target].push({at:[x,y,z],size:[w,h,d],color:c});
 const flat=(x:number,z:number,w:number,d:number,h:number)=>{
  box('body',x,h/2+.8,z,w,h,d);box('stone',x,.4,z,w+1,.8,d+1,'#8c9da5');
  box('roof',x,h+1,z,w+1,.5,d+1,'#7196af');box('light',x,h+1.3,z+d/2,w+1,.13,.13,color);
  for(const side of [-1,1])box('light',x+side*w/2,h/2+.8,z+d/2+.1,.1,h,.1,color);
 };
 const scaffold=(x:number,z:number,w:number,d:number,h:number,filled:number)=>{
  for(const sx of [-1,1])for(const sz of [-1,1])box('roof',x+sx*w/2,h/2+.8,z+sz*d/2,.24,h,.24,'#93acb7');
  for(let y=1;y<=h;y+=3){for(const sz of [-1,1])box('light',x,y,z+sz*d/2,w,.09,.09,'#ffbb6b');for(const sx of [-1,1])box('roof',x+sx*w/2,y,z,.16,.16,d,'#93acb7');}
  if(filled>0){box('body',x,.8+filled/2,z,w-.6,filled,d-.6);box('roof',x,.8+filled,z,w,.25,d,'#8c9da5');}
 };
 box('stone',0,.12,0,23,.24,22,'#56707d');
 switch(f.kind){
  case 'home':{
   if(f.tenure==='own'){
    // Complete structural outline plus built storeys makes even a small paid share legible.
    const built=ratio(f.percent)*23;
    scaffold(-2,0,12,10,23,built);
    box('stone',-2,.5,0,14,1,12,'#8ea8ac');
    if(built>1)box('light',-2,built+.95,5.1,11,.2,.2,color);
    if(f.foundation){box('stone',-7,1.3,7,6,1.6,3,'#b8af91');box('light',-7,2.15,7,4,.12,1.2,'#ffe1a5');}
    if(f.solar){for(let i=0;i<3;i++)box('detail',-5+i*3.1,24.2,-.5,2.7,.25,6,'#3886b0');}
   }else{
    flat(-5,-1,8,8,24);
    if(f.futureHome)scaffold(6,2,7,7,18,ratio(f.futurePercent)*18);
    if(f.solar)for(let i=0;i<2;i++)box('detail',-7+i*3.4,25.4,-1,2.8,.3,6,'#3886b0');
   }
   // Every known payment has its own brick, stacked into a wall beside the front path.
   const count=Math.max(0,Math.floor(f.payments??0));
   for(let i=0;i<count;i++){const col=i%18,row=Math.floor(i/18);box('detail',-10+col*1.15,.5+row*.52,10,1.04,.43,.65,row%2?'#d9ac78':'#a8c0c7');}
   break;
  }
  case 'car':{
   flat(-4,-3,12,9,9);
   // A roof strip is the loan's own repaid share, never a wealth comparison.
   if(f.percent!==null)box('light',-10+6*ratio(f.percent),10.5,1.6,Math.max(.08,12*ratio(f.percent)),.16,.3,color);
   box('detail',3,1.4,6,4.8,1.6,8,'#b8d8e7');box('body',3,2.7,5.5,4,1.4,4.2);box('roof',3,3.5,5.5,4.1,.2,4.3,'#7c9caf');
   for(const x of [.6,5.4])for(const z of [3.4,8.3])box('stone',x,.9,z,.5,1.5,1.5,'#182c3c');
   for(const x of [1.5,4.5])box('light',x,1.5,10.1,.9,.35,.15,'#fff3cd');
   for(let i=0;i<Math.min(6,f.maintenance??0);i++)box('light',-8+i*1.6,7,1.6,1.2,.25,.2,'#a8eccb');
   break;
  }
  case 'savings':{
   flat(0,-5,14,6,21);
   for(const x of [-9,9]){box('roof',x,10,3,.45,20,.45,'#b7d2d6');box('light',x,10,3,.1,20,.1,color);}
   box('roof',0,20,3,19,.45,12,'#91b5c3');box('light',0,20.3,9,19,.16,.16,color);
   box('stone',0,.55,5,20,1,12,'#668a94');
   break;
  }
  case 'pension':{
   const years=Math.max(0,f.years??0),base=10+Math.min(years,30)*.45,h=base+ratio(f.percent)*14;
   flat(0,0,9,9,base);scaffold(0,0,10,10,base+14,h);
   box('light',0,h+1.2,0,11,.28,11,color);
   for(let y=3;y<h;y+=3)box('roof',0,y,-.4,11,.25,10,'#7796af');
   break;
  }
  case 'kids':{
   const h=7+ratio(f.percent)*15;flat(-4,0,7,8,h);flat(5,1,6,7,h*.7);
   for(let i=0;i<6;i++)box('detail',-8+i*3,1,8,2,1.5,2,['#e5ae86','#83cfc4','#d4badc'][i%3]);
   box('roof',0,5,-5,16,.4,2,'#99bcae');
   break;
  }
 }
 return p;
}

/** A low-opacity dome and a bright rim keep the protected building visible. */
export function FinanceAttachments({finance,color}:{finance:DistrictNumbers;color:string}){
 const dome=finance.insured&&(finance.kind==='home'||finance.kind==='car');
 const goals=finance.kind==='savings'?finance.goals??[]:[];
 return <>
 {dome&&<group position={[finance.kind==='home'&&finance.tenure==='rent'?-5:0,.6,0]} scale={finance.kind==='car'?[13,13,13]:[16,29,16]}>
  <mesh><sphereGeometry args={[1,32,16,0,Math.PI*2,0,Math.PI/2]}/><meshPhysicalMaterial color="#88daff" transparent opacity={.075} roughness={.22} metalness={.2} side={THREE.DoubleSide} forceSinglePass depthWrite={false}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1,.006,5,48]}/><meshBasicMaterial color="#7ae3ff" transparent opacity={.65} toneMapped={false}/></mesh>
  <mesh rotation={[0,0,Math.PI/2]}><torusGeometry args={[1,.003,4,48,Math.PI]}/><meshBasicMaterial color="#9ce8ff" transparent opacity={.4} toneMapped={false}/></mesh>
 </group>}
 {goals.map((goal,i)=>{const n=Math.max(1,goals.length),width=Math.min(5,17/n),x=(i-(n-1)/2)*(width+.6),height=15,fill=ratio(goal.percent)*height;return <group key={goal.id} position={[x,1.2,5]}>
  <mesh position={[0,height/2,0]}><boxGeometry args={[width,height,6]}/><meshPhysicalMaterial color="#9edacb" transparent opacity={.12} roughness={.15} metalness={.1} depthWrite={false}/></mesh>
  {fill>0&&<><mesh position={[0,fill/2,0]}><boxGeometry args={[width-.4,fill,5.6]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.3} transparent opacity={.7}/></mesh><mesh position={[0,fill+.1,0]}><boxGeometry args={[width-.2,.16,5.8]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh></>}
  {[0,5,10,15].map(y=><mesh key={y} position={[width/2,y,3.1]}><boxGeometry args={[.5,.12,.15]}/><meshBasicMaterial color="#c4e9e5"/></mesh>)}
 </group>;})}
 </>;
}
