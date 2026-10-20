"use client";
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ToneMappingMode, type ChromaticAberrationEffect } from 'postprocessing';
import type { ArtRoad } from './art';
import { Bloom, EffectComposer, Vignette, ToneMapping, ChromaticAberration, SMAA } from '@react-three/postprocessing';

export function NightPost({speed,reducedMotion=false}:{speed?:()=>number;reducedMotion?:boolean}={}){
 const aberration=useRef<ChromaticAberrationEffect>(null),offset=useMemo(()=>new THREE.Vector2(),[]);
 useFrame((_,delta)=>{const strength=reducedMotion?0:Math.max(0,Math.min(1,((speed?.()??0)-18)/30));if(aberration.current){const value=THREE.MathUtils.damp(aberration.current.offset.x,strength*.00065,5,delta);aberration.current.offset.set(value,value*.35);}});
 return <EffectComposer multisampling={0}><Bloom intensity={.5} luminanceThreshold={.9} luminanceSmoothing={.6} mipmapBlur/><ChromaticAberration ref={aberration} offset={offset} radialModulation modulationOffset={.7}/><ToneMapping mode={ToneMappingMode.ACES_FILMIC}/><Vignette eskil={false} offset={.18} darkness={.28}/><SMAA/></EffectComposer>;
}
export function Atmosphere(){
 const {gl,scene}=useThree();
 useEffect(()=>{const oldIntensity=scene.environmentIntensity,oldEnvironment=scene.environment,oldTone=gl.toneMapping,oldExposure=gl.toneMappingExposure;const pmrem=new THREE.PMREMGenerator(gl),room=new RoomEnvironment();const env=pmrem.fromScene(room,.06);scene.environment=env.texture;scene.environmentIntensity=.16;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.03;return()=>{scene.environment=oldEnvironment;scene.environmentIntensity=oldIntensity;gl.toneMapping=oldTone;gl.toneMappingExposure=oldExposure;env.dispose();room.dispose();pmrem.dispose();};},[gl,scene]);
 const sky=useMemo(()=>new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{},vertexShader:`varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vPos;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){vec3 p=normalize(vPos);float h=max(0.,p.y);vec3 col=mix(vec3(.018,.045,.085),vec3(.003,.006,.022),pow(h,.38));
 float glow=exp(-pow((p.x+.32)*2.4,2.)-pow((p.y-.045)*6.,2.));col+=vec3(.018,.045,.065)*glow;
 float magenta=exp(-pow((p.x-.6)*4.,2.)-pow((p.y-.06)*10.,2.));col+=vec3(.025,.007,.028)*magenta;
 float cloud=sin(p.x*17.+sin(p.z*13.))*sin(p.z*19.+p.x*9.);col+=vec3(.004,.007,.012)*cloud*exp(-h*10.);
 vec2 uv=vec2(atan(p.z,p.x),asin(p.y))*700.;float stars=step(.9991,hash(floor(uv)))*smoothstep(.22,.6,h);col+=stars*.3;
 gl_FragColor=vec4(col,1.);}`}),[]);
 useEffect(()=>()=>sky.dispose(),[sky]);
 return <><color attach="background" args={['#102338']}/><fog attach="fog" args={['#28384f',95,700]}/><hemisphereLight args={['#95ceff','#233047',1.0]}/><directionalLight position={[-60,130,70]} color="#c1ddff" intensity={.4}/><directionalLight position={[80,45,-80]} color="#9c87d9" intensity={.25}/><mesh position={[-260,230,440]}><sphereGeometry args={[9,24,16]}/><meshBasicMaterial color="#c0d9e9" fog={false} toneMapped={false}/></mesh><mesh material={sky}><sphereGeometry args={[1800,32,16]}/></mesh></>;
}
/** One half-resolution planar reflection, shared by every avenue. */
export function WetGround({roads}:{roads:ArtRoad[]}){
 const {size}=useThree();
 const reflector=useMemo(()=>{const plane=new THREE.PlaneGeometry(3200,3200);const c=document.createElement('canvas');c.width=c.height=2048;const ctx=c.getContext('2d')!;ctx.fillStyle='#000';ctx.fillRect(0,0,2048,2048);ctx.strokeStyle='#fff';ctx.lineCap='round';ctx.lineJoin='round';for(const road of roads){ctx.lineWidth=(road.width??11)*2048/3200;ctx.beginPath();road.points.forEach((p,i)=>{const x=(p.x/3200+.5)*2048,y=(.5-p.z/3200)*2048;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();}const mask=new THREE.CanvasTexture(c);const r=new Reflector(plane,{clipBias:.015,textureWidth:Math.min(1024,Math.max(512,size.width>>1)),textureHeight:Math.min(768,Math.max(384,size.height>>1)),color:0x354d68,multisample:0});r.rotation.x=-Math.PI/2;r.position.y=-.08;
 const material=r.material as THREE.ShaderMaterial;
 material.uniforms.roadMask={value:mask};material.vertexShader=material.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 groundUv;').replace('vUv = textureMatrix', 'groundUv = (modelMatrix * vec4(position,1.)).xz/3200.+.5; vUv = textureMatrix');material.fragmentShader=material.fragmentShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 groundUv; uniform sampler2D roadMask;').replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','float road = texture2D(roadMask,groundUv).r; vec3 terrain = vec3(.012,.024,.036); float haze=smoothstep(120.,850.,length(cameraPosition.xz-(groundUv-.5)*3200.)); vec3 surface=mix(terrain,blendOverlay(base.rgb,color)*.48,road); gl_FragColor = vec4(mix(surface,vec3(.018,.045,.085),haze),1.);');
 material.fragmentShader=material.fragmentShader.replace('vec4 base = texture2DProj( tDiffuse, vUv );',`vec4 wetUv = vUv; wetUv.x += sin(vUv.y*390.)*.00022*vUv.w; vec4 base = texture2DProj(tDiffuse,wetUv)*.4; vec4 blurUv=wetUv; blurUv.x+=.003*wetUv.w; base+=texture2DProj(tDiffuse,blurUv)*.15; blurUv.x-=.006*wetUv.w; base+=texture2DProj(tDiffuse,blurUv)*.15; blurUv=wetUv; blurUv.y+=.004*wetUv.w; base+=texture2DProj(tDiffuse,blurUv)*.15; blurUv.y-=.008*wetUv.w; base+=texture2DProj(tDiffuse,blurUv)*.15;`);
 return r;},[size.width,size.height,roads]);
 useEffect(()=>()=>{((reflector.material as THREE.ShaderMaterial).uniforms.roadMask.value as THREE.Texture).dispose();reflector.geometry.dispose();(reflector.material as THREE.Material).dispose();reflector.getRenderTarget().dispose();},[reflector]);
 return <primitive object={reflector}/>;
}
