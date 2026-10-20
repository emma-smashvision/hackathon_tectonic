"use client";
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Tower } from './art';
/** A few facade-mounted neon signs give the skyline human scale. */
export function BuildingSigns({towers}:{towers:Tower[]}){
 const picked=useMemo(()=>towers.filter(t=>t.seed%37===0&&Math.hypot(t.x,t.z)<500).slice(0,8),[towers]);
 const textures=useMemo(()=>['#32cfff','#ec7bd6','#ffc57e'].map(color=>{const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#071523';ctx.fillRect(0,0,512,256);ctx.strokeStyle=color;ctx.lineWidth=8;ctx.strokeRect(10,10,492,236);ctx.textAlign='center';ctx.fillStyle=color;ctx.font='700 102px Arial';ctx.fillText('KBC',256,118);ctx.font='400 54px Arial';ctx.fillText('ONE',256,204);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}),[]);
 useEffect(()=>()=>textures.forEach(t=>t.dispose()),[textures]);
 return <>{picked.map((t,i)=><mesh key={`${t.x}:${t.z}`} position={[t.x+Math.sin(t.rot)*(t.d/2+.08),Math.min(t.h-4,12+t.h*.3),t.z+Math.cos(t.rot)*(t.d/2+.08)]} rotation={[0,t.rot,0]}><planeGeometry args={[Math.min(10,t.w*.85),Math.min(5,t.w*.425)]}/><meshBasicMaterial map={textures[i%3]} color={new THREE.Color(1.4,1.4,1.4)} toneMapped={false}/></mesh>)}</>;
}
