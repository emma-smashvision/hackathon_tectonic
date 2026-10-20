"use client";
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Batch } from '../city10/scene/Batch';
import { glowMaterial, roadMaterial } from '../city10/scene/materials';
import { type BoxInstance } from '../city10/scene/art';
import { type DistrictLayout, type SceneArea } from './layout';

function Ocean({reducedMotion}:{reducedMotion:boolean}){
 const {size}=useThree();
 const water=useMemo(()=>{const r=new Reflector(new THREE.PlaneGeometry(1800,1800),{textureWidth:Math.min(768,Math.max(384,size.width/2)),textureHeight:Math.min(512,Math.max(256,size.height/2)),color:0x31405e,multisample:0,clipBias:.01});r.rotation.x=-Math.PI/2;r.position.y=-3.9;
 const m=r.material as THREE.ShaderMaterial;m.uniforms.time={value:0};m.fragmentShader=m.fragmentShader.replace('uniform vec3 color;','uniform vec3 color; uniform float time;').replace('vec4 base = texture2DProj( tDiffuse, vUv );',`vec2 rippleUv=vUv.xy/vUv.w; vec4 uv=vUv; uv.x+=sin(rippleUv.y*120.+time*.65)*.0006*vUv.w; uv.y+=sin(rippleUv.x*160.+time*.4)*.00025*vUv.w; vec4 base=texture2DProj(tDiffuse,uv);`).replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );',`float ripple=sin(rippleUv.x*100.+sin(rippleUv.y*140.)*1.5+time*.2)*.001; gl_FragColor=vec4(mix(mix(vec3(.006,.018,.032),vec3(.025,.018,.064),smoothstep(.55,1.,rippleUv.y)),blendOverlay(base.rgb,color),.48)+ripple,1.);`);return r;},[size.width,size.height]);
 useFrame(({clock})=>{if(!reducedMotion)(water.material as THREE.ShaderMaterial).uniforms.time.value=clock.elapsedTime;});
 useEffect(()=>()=>{water.geometry.dispose();(water.material as THREE.Material).dispose();water.getRenderTarget().dispose();},[water]);
 return <primitive object={water}/>;
}
function BridgeLife({routes,reducedMotion}:{routes:readonly {ax:number;az:number;bx:number;bz:number}[];reducedMotion:boolean}){
 const mesh=useRef<THREE.InstancedMesh>(null),object=useMemo(()=>new THREE.Object3D(),[]);
 useFrame(({clock})=>{routes.forEach((route,i)=>{const t=reducedMotion?.5:(clock.elapsedTime*.045+i*.31)%1;object.position.set(THREE.MathUtils.lerp(route.ax,route.bx,t),2,THREE.MathUtils.lerp(route.az,route.bz,t));object.scale.set(.7,.25,1.6);object.rotation.y=Math.atan2(route.bx-route.ax,route.bz-route.az);object.updateMatrix();mesh.current?.setMatrixAt(i,object.matrix);});if(mesh.current)mesh.current.instanceMatrix.needsUpdate=true;});
 return <instancedMesh ref={mesh} args={[undefined,undefined,routes.length]} frustumCulled={false}><boxGeometry/><meshBasicMaterial color={[1.5,2,2.4]} toneMapped={false}/></instancedMesh>;
}
/** Each district owns its land. Only the bridges and the small central plaza are shared. */
export function Island({areas,plots,reducedMotion}:{areas:readonly SceneArea[];plots:DistrictLayout;reducedMotion:boolean}){
 const m=useMemo(()=>({road:roadMaterial(),glow:glowMaterial(),stone:new THREE.MeshStandardMaterial({color:'#536c7a',roughness:.65,metalness:.2})}),[]);
 const parts=useMemo(()=>{
  const paths:BoxInstance[]=[],lights:BoxInstance[]=[],poles:BoxInstance[]=[],routes:{ax:number;az:number;bx:number;bz:number}[]=[];
  const bridge=(ax:number,az:number,bx:number,bz:number,color:string,fromRadius:number,toRadius:number)=>{
   const length=Math.hypot(bx-ax,bz-az),dx=(bx-ax)/length,dz=(bz-az)/length,rot=Math.atan2(dx,dz);
   const start=fromRadius,end=length-toRadius,len=end-start;if(len<=0)return;
   const x=ax+dx*(start+len/2),z=az+dz*(start+len/2);
   routes.push({ax:ax+dx*start,az:az+dz*start,bx:ax+dx*end,bz:az+dz*end});
   paths.push({at:[x,1.45,z],size:[4,.5,len],rot});
   for(const side of [-1,1]){
    lights.push({at:[x+dz*2*side,1.8,z-dx*2*side],size:[.12,.13,len],rot,color});
    poles.push({at:[x+dz*2*side,1.6,z-dx*2*side],size:[.18,.8,len],rot});
   }
   for(let d=start+3;d<end;d+=9){const px=ax+dx*d,pz=az+dz*d;
    poles.push({at:[px,-1.3,pz],size:[2.6,5,1],rot});
    for(const side of [-1,1]){poles.push({at:[px+dz*2.2*side,2.8,pz-dx*2.2*side],size:[.15,2.5,.15]});lights.push({at:[px+dz*2.2*side,4.1,pz-dx*2.2*side],size:[.45,.24,.45],color:'#ffe1af'});}
   }
  };
  const open=areas.filter(a=>!a.locked&&a.active!==false);
  areas.forEach(area=>{
   const p=plots[area.id];
   const nearest=area.locked?open.reduce<SceneArea|null>((best,a)=>!best||Math.hypot(plots[a.id].x-p.x,plots[a.id].z-p.z)<Math.hypot(plots[best.id].x-p.x,plots[best.id].z-p.z)?a:best,null):null;
   const from=nearest?plots[nearest.id]:{x:0,z:0,scale:.85};
   bridge(from.x,from.z,p.x,p.z,area.locked?'#507384':p.color,20*from.scale,20*p.scale);
  });
  return{paths,lights,poles,routes};
 },[areas,plots]);
 useEffect(()=>()=>Object.values(m).forEach(v=>v.dispose()),[m]);
 return <><Ocean reducedMotion={reducedMotion}/><Batch items={parts.paths} material={m.road}/><Batch items={parts.lights} material={m.glow}/><Batch items={parts.poles} material={m.stone}/><BridgeLife routes={parts.routes} reducedMotion={reducedMotion}/>
 <mesh position={[0,-1.3,0]} receiveShadow><cylinderGeometry args={[18,20,5.5,48]}/><meshStandardMaterial color="#203d4c" roughness={.8}/></mesh>
 <mesh position={[0,1.6,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[17,48]}/><meshStandardMaterial color="#243f50" roughness={.5} metalness={.3}/></mesh>
 <mesh position={[0,1.7,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[14.7,14.85,64]}/><meshBasicMaterial color="#9bc8cc" toneMapped={false}/></mesh>
 <mesh position={[0,2,0]}><cylinderGeometry args={[5.8,6.2,.7,32]}/><meshStandardMaterial color="#47616e" metalness={.6} roughness={.3}/></mesh>
 <mesh position={[0,2.4,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[5.3,32]}/><meshStandardMaterial color="#4aa2b9" emissive="#155473" emissiveIntensity={.4} metalness={.7} roughness={.12}/></mesh>
 <mesh position={[0,5,0]}><torusGeometry args={[3.3,.16,8,40]}/><meshStandardMaterial color="#bbd9dc" metalness={.8} roughness={.18}/></mesh>
 <mesh position={[0,5,0]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[3.3,.12,8,40]}/><meshBasicMaterial color={[1.1,1.9,2.1]} toneMapped={false}/></mesh>
 </>;
}
