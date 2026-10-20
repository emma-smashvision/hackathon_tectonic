"use client";
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { DistrictLayout } from './layout';
export function WorldCamera({focus,plots,calm=false,reducedMotion,resetKey=0}:{focus:string|null;plots:DistrictLayout;calm?:boolean;reducedMotion:boolean;resetKey?:number}){
 const {camera,gl,size}=useThree();const flying=useRef(true);const destination=useRef({position:new THREE.Vector3(),target:new THREE.Vector3()});
 const controlsRef=useRef<OrbitControls|null>(null);
 useEffect(()=>{const controls=new OrbitControls(camera,gl.domElement);controlsRef.current=controls;controls.enableRotate=false;controls.enablePan=!calm;controls.enableZoom=!calm;controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=65;controls.maxDistance=1800;controls.maxPolarAngle=Math.PI*.42;controls.mouseButtons.LEFT=THREE.MOUSE.PAN;controls.mouseButtons.RIGHT=THREE.MOUSE.PAN;controls.touches.ONE=THREE.TOUCH.PAN;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;controls.screenSpacePanning=false;controls.zoomSpeed=.65;const stop=()=>{flying.current=false;};controls.addEventListener('start',stop);return()=>{controls.removeEventListener('start',stop);controls.dispose();controlsRef.current=null;};},[camera,gl,calm]);
 useEffect(()=>{const p=(focus?plots[focus]:null)??{x:9,z:13,scale:1},scale=Math.max(1,1.25/(size.width/size.height));destination.current.target.set(p.x+(focus?8:0),focus?5:0,p.z+(focus?-5:0));destination.current.position.copy(destination.current.target).add(new THREE.Vector3(...(focus?(p.scale>1?[78,94,112]:[48,59,70]):[199,256,283]) as [number,number,number]).multiplyScalar(scale));flying.current=true;},[focus,plots,size.width,size.height,resetKey]);
 useFrame((_,delta)=>{const controls=controlsRef.current;if(!controls)return;if(flying.current){const alpha=reducedMotion?1:1-Math.exp(-delta*(calm?1.2:3));camera.position.lerp(destination.current.position,alpha);controls.target.lerp(destination.current.target,alpha);if(camera.position.distanceTo(destination.current.position)<.05)flying.current=false;}else{controls.target.x=THREE.MathUtils.clamp(controls.target.x,-190,190);controls.target.z=THREE.MathUtils.clamp(controls.target.z,-190,190);controls.target.y=focus?5:0;}controls.update();});return null;
}
