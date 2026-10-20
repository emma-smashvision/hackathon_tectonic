"use client";
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCityEngine } from '../engine/runtime';
const COUNT=28;
type TrailPoint={x:number;z:number;heading:number};
/** A short history in world space lets the two rear lights trace a real bend. */
export function VehicleTrails({reducedMotion=false}:{reducedMotion?:boolean}){
 const{rt}=useCityEngine();const history=useRef<TrailPoint[]>([]);const mesh=useRef<THREE.Mesh>(null);
 const{geometry,material}=useMemo(()=>{const geometry=new THREE.BufferGeometry(),positions=new Float32Array(COUNT*4*3),uvs=new Float32Array(COUNT*4*2),indices:number[]=[];for(let i=0;i<COUNT;i++)for(let side=0;side<2;side++){const o=i*4+side*2;uvs[o*2]=0;uvs[o*2+1]=i/(COUNT-1);uvs[(o+1)*2]=1;uvs[(o+1)*2+1]=i/(COUNT-1);if(i){const a=o-4;indices.push(a,o,a+1,a+1,o,o+1);}}geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geometry.setIndex(indices);
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{opacity:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float opacity;void main(){float edge=1.-abs(vUv.x-.5)*2.;gl_FragColor=vec4(1.3,.005,.07,edge*pow(1.-vUv.y,1.7)*opacity);}'});return{geometry,material};},[]);
 useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
 useFrame((_,delta)=>{const car=rt.current.car,last=history.current[0];if(reducedMotion){history.current=[];if(mesh.current)mesh.current.visible=false;return;}if(mesh.current)mesh.current.visible=true;
 const travel=last?Math.hypot(car.x-last.x,car.z-last.z):1;
 if(travel>15)history.current=[]; // Teleports must never draw a line across the whole city.
 if(travel>.38){history.current.unshift({x:car.x,z:car.z,heading:car.heading});history.current.length=Math.min(COUNT,history.current.length);}
 const visible=Math.abs(car.speed)>2&&history.current.length>2;material.uniforms.opacity.value=THREE.MathUtils.damp(material.uniforms.opacity.value,visible?.6:0,8,delta);
 const points=history.current,attribute=geometry.attributes.position as THREE.BufferAttribute;
 for(let i=0;i<COUNT;i++){const p=points[Math.min(i,points.length-1)];if(!p)break;for(let side=0;side<2;side++)for(let edge=0;edge<2;edge++){const lateral=(side===0?-.76:.76)+(edge===0?-.075:.075);attribute.setXYZ(i*4+side*2+edge,p.x-Math.sin(p.heading)*2.3+Math.cos(p.heading)*lateral,.17,p.z-Math.cos(p.heading)*2.3-Math.sin(p.heading)*lateral);}}
 attribute.needsUpdate=true;
 });
 return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false}/>;
}
