"use client";
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
function hull(rings:{z:number;w:number;bottom:number;top:number}[]){const positions:number[]=[],indices:number[]=[];for(const r of rings)positions.push(-r.w,r.bottom,r.z,r.w,r.bottom,r.z,r.w,r.top,r.z,-r.w,r.top,r.z);for(let i=1;i<rings.length;i++)for(let j=0;j<4;j++){const a=(i-1)*4+j,b=(i-1)*4+(j+1)%4,c=i*4+(j+1)%4,d=i*4+j;indices.push(a,b,d,b,c,d);}indices.push(0,3,1,1,3,2);const e=(rings.length-1)*4;indices.push(e,e+1,e+3,e+1,e+2,e+3);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;}
function Box({at,size,material}:{at:[number,number,number];size:[number,number,number];material:THREE.Material}){return <mesh position={at} material={material}><boxGeometry args={size}/></mesh>;}
/** Local +Z is the nose. The engine owns the enclosing pose, speed and camera. */
export function PlayerCar({speed=()=>0,reducedMotion=false}:{speed?:()=>number;reducedMotion?:boolean}){
 const trail=useRef<THREE.Group>(null);
 const assets=useMemo(()=>{
  const body=hull([{z:-2.3,w:.91,bottom:.35,top:.72},{z:-1.5,w:1.06,bottom:.3,top:.93},{z:.95,w:1.04,bottom:.3,top:.78},{z:2.25,w:.91,bottom:.39,top:.58}]);
  const cabin=hull([{z:-1.45,w:.78,bottom:.86,top:.96},{z:-.9,w:.74,bottom:.89,top:1.59},{z:.22,w:.72,bottom:.83,top:1.57},{z:1.05,w:.79,bottom:.75,top:.82}]);
  const metal=new THREE.MeshPhysicalMaterial({color:'#377c98',metalness:.65,roughness:.3,clearcoat:1,clearcoatRoughness:.25});
  const glass=new THREE.MeshPhysicalMaterial({color:'#102a40',metalness:.75,roughness:.13,clearcoat:1});const black=new THREE.MeshStandardMaterial({color:'#09121c',roughness:.65});const rim=new THREE.MeshStandardMaterial({color:'#9db5c2',metalness:.9,roughness:.22});
  const white=new THREE.MeshBasicMaterial({color:new THREE.Color(3.6,4.5,5),toneMapped:false});const red=new THREE.MeshBasicMaterial({color:new THREE.Color(2.2,.006,.014),toneMapped:false});const cyan=new THREE.MeshBasicMaterial({color:new THREE.Color(.12,1.3,1.8),toneMapped:false});
  const beam=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{color:{value:new THREE.Color('#bce8ff')}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform vec3 color;void main(){float spread=mix(.10,.48,vUv.y);float side=1.-smoothstep(spread*.4,spread,abs(vUv.x-.5));float alpha=side*pow(1.-vUv.y,1.8)*.24;gl_FragColor=vec4(color,alpha);}'});
  const tail=new THREE.MeshBasicMaterial({color:'#ff365c',transparent:true,opacity:.23,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  return{body,cabin,metal,glass,black,rim,white,red,cyan,beam,tail};},[]);
 useEffect(()=>()=>Object.values(assets).forEach(a=>a.dispose()),[assets]);
 useFrame(()=>{if(trail.current){const v=Math.abs(speed());trail.current.scale.z=reducedMotion?.04:Math.min(3.5,.08+v*.12);trail.current.visible=!reducedMotion&&v>.6;}});
 return <group>
  <mesh geometry={assets.body} material={assets.metal}/><mesh geometry={assets.cabin} material={assets.glass}/>
  <Box at={[0,1.6,-.37]} size={[1.44,.035,1.04]} material={assets.metal}/><Box at={[0,.4,0]} size={[1.95,.18,4.45]} material={assets.black}/>
  <Box at={[0,.79,-2.29]} size={[1.77,.065,.08]} material={assets.red}/><Box at={[0,.54,-2.32]} size={[.44,.17,.04]} material={assets.rim}/>
  <Box at={[0,.33,0]} size={[1.84,.025,3.4]} material={assets.cyan}/>
  {[-1,1].map(side=><group key={side}>
   <Box at={[side*.68,.62,2.16]} size={[.46,.075,.13]} material={assets.white}/><Box at={[side*1.05,.92,.42]} size={[.27,.12,.3]} material={assets.metal}/>
   {[-1.35,1.35].map(z=><group key={z} position={[side*1.035,.4,z]} rotation={[0,0,Math.PI/2]}><mesh material={assets.black}><cylinderGeometry args={[.4,.4,.24,16]}/></mesh><mesh position={[0,side*.13,0]} material={assets.rim}><cylinderGeometry args={[.25,.25,.015,10]}/></mesh></group>)}
   <mesh position={[side*.7,.065,9.2]} rotation={[-Math.PI/2,0,Math.PI]} material={assets.beam}><planeGeometry args={[7,15]}/></mesh>
  </group>)}
  <group ref={trail}>{[-.76,.76].map(x=><mesh key={x} position={[x,.12,-5.2]} rotation={[-Math.PI/2,0,0]} material={assets.tail}><planeGeometry args={[.16,6]}/></mesh>)}</group>
 </group>;
}
