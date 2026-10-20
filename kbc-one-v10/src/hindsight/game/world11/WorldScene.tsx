"use client";
import type { World, WorldAhead } from '@/one/world';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { Atmosphere, NightPost } from '../city10/scene/Atmosphere';
import { useReducedCityMotion } from '../city10/scene/NightCity';
import { Island } from './Island';
import { BlueHour } from './BlueHour';
import { AreaPlot } from './AreaPlot';
import { Weather } from './Weather';
import { WorldCamera } from './Camera';
import { isFogged, plotFor, districtPlots, type DistrictLayout, type SceneStorm } from './layout';
import './world11.css';
export type WorldSceneProps={
 world:World;
 onArea:(areaId:string)=>void;
 focus?:string|null;
 onOverview?:()=>void;
 /** Optional model adapter for visits; neither visit nor camera movement writes progress. */
 ahead?:WorldAhead|null;
 storms?:readonly SceneStorm[];
 className?:string;
 /** Tap-only, slower camera and larger labels for Calm world. */
 calm?:boolean;
};
function Labels({world,plots,container,focus,storm,stormLabel}:{world:World;plots:DistrictLayout;container:RefObject<HTMLDivElement|null>;focus:string|null;storm?:SceneStorm;stormLabel:RefObject<HTMLDivElement|null>}){
 const {camera,size}=useThree(),point=useRef(new THREE.Vector3());
 useFrame(()=>{if(!container.current)return;for(let i=0;i<world.areas.length;i++){const area=world.areas[i],plot=plots[area.id],el=container.current.children[i] as HTMLElement|undefined;if(!el)continue;const locked=isFogged(area),radius=Math.hypot(plot.x,plot.z),dx=locked?plot.x/radius:.576,dz=locked?plot.z/radius:.817,offset=locked?22:25*plot.scale;point.current.set(plot.x+dx*offset,2,plot.z+dz*offset).project(camera);const x=(point.current.x*.5+.5)*size.width,y=(-point.current.y*.5+.5)*size.height;el.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,${locked&&(.576*plot.x+.817*plot.z)<0?'-100%':'0'})`;el.style.visibility=point.current.z<1&&x>15&&x<size.width-15&&y>20&&y<size.height-28&&(!focus||area.id===focus)?'visible':'hidden';}if(storm&&stormLabel.current){const plot=plots[storm.areaId];point.current.set(plot.x-5*plot.scale,19*plot.scale,plot.z+14*plot.scale).project(camera);stormLabel.current.style.transform=`translate3d(${(point.current.x*.5+.5)*size.width}px,${(-point.current.y*.5+.5)*size.height}px,0) translate(-50%,-100%)`;stormLabel.current.style.visibility=focus===storm.areaId?'visible':'hidden';}});return null;
}
function SceneStats(){const {gl,camera}=useThree(),stats=useRef({frames:0,last:0});useEffect(()=>{gl.info.autoReset=false;return()=>{gl.info.autoReset=true;};},[gl]);useFrame(()=>{const now=performance.now(),calls=gl.info.render.calls,triangles=gl.info.render.triangles;gl.info.reset();if(!stats.current.last)stats.current.last=now;stats.current.frames++;if(now-stats.current.last>2000){document.documentElement.dataset.worldFps=(stats.current.frames*1000/(now-stats.current.last)).toFixed(1);document.documentElement.dataset.worldDpr=String(gl.getPixelRatio());document.documentElement.dataset.worldCalls=String(calls);document.documentElement.dataset.worldTriangles=String(triangles);if(process.env.NODE_ENV==='development')document.documentElement.dataset.worldCamera=JSON.stringify({position:camera.position.toArray(),quaternion:camera.quaternion.toArray()});stats.current={frames:0,last:now};}});return null;}
export function WorldScene({world,onArea,focus=null,onOverview,ahead,storms,className='',calm=false}:WorldSceneProps){
 const geography=useMemo(()=>districtPlots(world.areas),[world.personaId]);
 const accessKey=world.areas.map(a=>`${a.id}:${isFogged(a)}`).join('|');
 const plots=useMemo(()=>Object.fromEntries(world.areas.map(area=>[area.id,{...geography[area.id],scale:isFogged(area)?.7:1.6}])) as DistrictLayout,[geography,accessKey]);
 const storm=calm?undefined:(storms??world.storms).find(s=>s.status!=='preview');
 const stormLabel=useRef<HTMLDivElement>(null);
 const [overviewOverride,setOverviewOverride]=useState(false);
 const effectiveFocus=overviewOverride?null:focus;
 useEffect(()=>{setOverviewOverride(false);},[focus]);
 const selectArea=(id:string)=>{setOverviewOverride(false);onArea(id);};
 const reducedMotion=useReducedCityMotion(),labels=useRef<HTMLDivElement>(null),[resetKey,setResetKey]=useState(0),[ready,setReady]=useState(false);
 useEffect(()=>()=>{document.body.style.cursor='';},[]);
 const overview=()=>{setOverviewOverride(true);onOverview?.();setResetKey(n=>n+1);};
 return <div className={`world11-scene ${calm?'world11-calm':''} ${className}`} data-world-scene data-world-ready={ready} data-world-focus={effectiveFocus??'overview'}>
 <Canvas shadows="soft" dpr={[1,1.5]} camera={{position:[190,244,270],fov:40,near:.2,far:2200}} gl={{antialias:false,powerPreference:'high-performance',toneMapping:THREE.ACESFilmicToneMapping}} onCreated={()=>setReady(true)}>
 <Atmosphere/><BlueHour/><fog attach="fog" args={['#142b40',380,950]}/><directionalLight position={[20,70,-110]} intensity={.7} color="#899bea"/><directionalLight castShadow position={[-65,100,45]} intensity={.8} color="#b9d5e6" shadow-mapSize={[2048,2048]} shadow-camera-left={-130} shadow-camera-right={130} shadow-camera-top={115} shadow-camera-bottom={-115} shadow-camera-far={350} shadow-bias={-.0006} shadow-normalBias={.25}/>
 <Island areas={world.areas} plots={plots} reducedMotion={reducedMotion}/>
 {world.areas.map((area,i)=><AreaPlot key={`${world.personaId}:${area.id}`} area={area} plot={plots[area.id]} index={i} onArea={selectArea} focused={effectiveFocus===area.id} reducedMotion={reducedMotion} energyPrepared={area.id==='home'&&(storms??world.storms).some(s=>s.areaId==='home'&&s.id.includes('energy')&&(s.prepared||s.status==='prepared'))} aheadStage={ahead?.available&&(ahead.areaId===area.id||ahead.buildOrder.some(a=>a.areaId===area.id))?Math.max(1,area.stage):undefined}/>)}
 {!calm&&<Weather plots={plots} storms={storms??world.storms??[]} reducedMotion={reducedMotion}/>}<WorldCamera plots={plots} calm={calm} focus={effectiveFocus} reducedMotion={reducedMotion} resetKey={resetKey}/><Labels world={world} plots={plots} container={labels} focus={effectiveFocus} storm={storm} stormLabel={stormLabel}/><NightPost reducedMotion={reducedMotion}/><SceneStats/>
 </Canvas>
 <div ref={labels} className="world11-labels">{world.areas.map(area=><button key={area.id} className={`world11-area-label ${isFogged(area)?'is-fogged':''}`} onClick={()=>selectArea(area.id)} aria-label={area.care?area.title:`${area.title}${isFogged(area)?`, explore: ${area.unlock.hint}`:calm?'':`, stage ${area.stage} of 4`}`} aria-pressed={effectiveFocus===area.id}>
 <span className="world11-label-title">{isFogged(area)?<svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="6" cy="6" r="4"/><path d="m9 9 8 8m-3-3 3-3m-6 0 3-3"/></svg>:<span className="world11-area-dot" style={{background:plotFor(area.id).color}}/>}{area.title}</span>
 {isFogged(area)&&<span className="world11-unlock-hint">{area.unlock.hint}</span>}
 {effectiveFocus===area.id&&!isFogged(area)&&!area.care&&<span className="world11-finance-summary">{area.finance.summary}{area.id==='home'&&(storms??world.storms).some(s=>s.areaId==='home'&&s.id.includes('energy')&&(s.prepared||s.status==='prepared'))&&<span className="world11-energy-plan">Energy plan · solar roof preview</span>}</span>}
 </button>)}</div>
 {storm&&<div ref={stormLabel} className="world11-storm-caption">{storm.prepared||storm.status==='prepared'?'Illustrative storm · dam built':'Illustrative storm · build a dam'}</div>}
 <div className="world11-camera-tools"><button onClick={overview} aria-label="Return to world overview">⌖ <span>Overview</span></button><span className="world11-gesture-hint">{calm?'Tap a place to visit':'Drag to explore · Pinch to zoom'}</span></div>
 </div>;
}
