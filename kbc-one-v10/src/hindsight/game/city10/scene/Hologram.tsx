"use client";
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
type LabelBounds={left:number;right:number;top:number;bottom:number;distance:number;active:boolean};
export const LabelRegistryContext=createContext<Map<symbol,LabelBounds>|null>(null);
export const ArtViewContext=createContext<(()=>{x:number;z:number;heading:number})|null>(null);
/** World anchor, bounded screen size: readable without becoming a camera-filling billboard. */
export function Hologram({title,subtitle,color='#8ceaff',position,width=16}:{title:string;subtitle?:string;color?:string;position:[number,number,number];width?:number}){
 const sprite=useRef<THREE.Sprite>(null),getCar=useContext(ArtViewContext),registry=useContext(LabelRegistryContext),id=useRef(Symbol('label')),{size}=useThree();
 useEffect(()=>()=>{registry?.delete(id.current);},[registry]);
 const scratch=useMemo(()=>({point:new THREE.Vector3(),forward:new THREE.Vector3(),relative:new THREE.Vector3(),projected:new THREE.Vector3()}),[]);
 const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=1024;c.height=290;const ctx=c.getContext('2d')!;
 ctx.fillStyle='rgba(5,20,37,.92)';ctx.fillRect(2,2,1020,286);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(4,4,1016,282);ctx.fillStyle=color;ctx.fillRect(4,4,8,282);
 ctx.font='500 94px "Space Grotesk",Arial,sans-serif';ctx.fillStyle='#effaff';ctx.textAlign='center';ctx.fillText(title,512,132,940);
 if(subtitle){ctx.font='400 45px "IBM Plex Sans",Arial,sans-serif';ctx.fillStyle=color;ctx.fillText(subtitle,512,224,940);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;},[title,subtitle,color]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 useFrame(({camera},delta)=>{const node=sprite.current;if(!node)return;scratch.point.set(...position);const distance=camera.position.distanceTo(scratch.point);camera.getWorldDirection(scratch.forward);scratch.relative.copy(scratch.point).sub(camera.position);const depth=Math.max(1,scratch.relative.dot(scratch.forward));const cameraFactor=camera instanceof THREE.PerspectiveCamera?2*Math.tan(camera.fov*Math.PI/360):1;
 const projectedWidth=width*size.height/(depth*cameraFactor);const screenWidth=Math.min(235,Math.max(200,projectedWidth));const worldWidth=screenWidth*depth*cameraFactor/size.height;node.scale.set(worldWidth,worldWidth*290/1024,1);
 const projected=scratch.projected.copy(scratch.point).project(camera);camera.getWorldDirection(scratch.forward);scratch.relative.copy(scratch.point).sub(camera.position);let opacity=THREE.MathUtils.smoothstep(distance,15,24)*(1-THREE.MathUtils.smoothstep(distance,140,200));
 const car=getCar?.();if(car){const ahead=(position[0]-car.x)*Math.sin(car.heading)+(position[2]-car.z)*Math.cos(car.heading);opacity*=THREE.MathUtils.smoothstep(ahead,-2,5);}
 if(scratch.relative.dot(scratch.forward)<0||Math.abs(projected.x)>1-screenWidth/size.width-.03||Math.abs(projected.y)>.78)opacity=0;
 // Keep the driving corridor clear even when perspective moves a roadside sign inward.
 if(Math.abs(projected.x)<.18&&projected.y<.32)opacity=0;
 const halfW=screenWidth/size.width,halfH=screenWidth*290/1024/size.height;const bounds={left:projected.x-halfW,right:projected.x+halfW,top:projected.y+halfH,bottom:projected.y-halfH,distance,active:opacity>.1};registry?.set(id.current,bounds);if(registry)for(const[otherId,other]of registry){if(otherId===id.current||!other.active||other.distance>=distance)continue;if(bounds.left<other.right+.025&&bounds.right>other.left-.025&&bounds.bottom<other.top+.03&&bounds.top>other.bottom-.03){opacity=0;break;}}
 const material=node.material as THREE.SpriteMaterial;material.opacity=THREE.MathUtils.damp(material.opacity,opacity,12,delta);node.visible=material.opacity>.01;
 });
 return <sprite ref={sprite} position={position} scale={[width,width*290/1024,1]}><spriteMaterial map={texture} transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false} fog={false}/></sprite>;
}
