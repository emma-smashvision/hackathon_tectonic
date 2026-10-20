"use client";
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { CityScene, NightPost, PlayerCar } from './CityScene';
import { previewRoads } from './art';
import './look.css';
import { CityGame } from '../CityGame';
import { NightCity, NightCar } from './NightCity';
function PreviewCamera({view}:{view:string}){const {camera}=useThree();useEffect(()=>{if(view==='block'){camera.position.set(65,75,-95);camera.lookAt(0,18,0);}else{camera.position.set(0,7.2,-87);camera.lookAt(0,11,12);}camera.updateProjectionMatrix();},[camera,view]);return null;}
function PreviewStats(){const{gl,scene}=useThree();useEffect(()=>{gl.info.autoReset=false;return()=>{gl.info.autoReset=true;};},[gl]);const stats=useRef({frames:0,last:typeof performance!=="undefined"?performance.now()/1000:0});useFrame(({clock})=>{document.documentElement.dataset.lookBlockState=String(scene.getObjectByName('city10-your-block')?.userData.state??'');const calls=gl.info.render.calls,triangles=gl.info.render.triangles;gl.info.reset();stats.current.frames++;if(performance.now()/1000-stats.current.last>2){const fps=stats.current.frames/(performance.now()/1000-stats.current.last);document.documentElement.dataset.lookFps=String(Math.round(fps));document.documentElement.dataset.lookCalls=String(calls);document.documentElement.dataset.lookTriangles=String(triangles);stats.current={frames:0,last:performance.now()/1000};}});return null;}
function IntegratedLook({personaId}:{personaId:string}){return <div style={{position:'fixed',inset:0}}><CityGame personaId={personaId} onExit={()=>location.href='/dev/look'} onPlain={()=>location.href='/dev/learning'} world={<><NightCity personaId={personaId}/><PreviewStats/></>} carModel={<NightCar/>}/></div>;}
export function LookPreview(){const[postcard,setPostcard]=useState(false);const[ready,setReady]=useState(false);const[mode,setMode]=useState('art');useEffect(()=>{const q=new URLSearchParams(location.search);if(q.has('engine'))setMode('engine');setPostcard(q.has('postcard'));if(q.get('p'))setPersona(q.get('p')!);setReady(true);},[]);const roads=useMemo(previewRoads,[]);const[view,setView]=useState('drive'),[passed,setPassed]=useState(0),[persona,setPersona]=useState('tom');
 if(!ready)return <main className="look-preview" aria-label="Loading city"/>;
 if(mode==='engine')return <IntegratedLook personaId={persona}/>;
 return <main className="look-preview"><Canvas dpr={[1,1.5]} camera={{fov:54,near:.15,far:2200}} gl={{antialias:false,powerPreference:'high-performance',toneMapping:THREE.ACESFilmicToneMapping}}><CityScene roads={roads} personaId={persona} previewPassed={passed} labels={!postcard}/><group position={[0,0,-69]}><PlayerCar speed={()=>18}/></group><PreviewCamera view={view}/><NightPost/><PreviewStats/></Canvas>
 <header className="look-title"><span className="look-mark">KBC</span><div><p>Your city</p><h1>Every road starts with you.</h1></div></header>
 <aside className="look-location"><span>Free roam</span><strong>{view==='drive'?'Home street':'Your block'}</strong><p>Explore the city. Build your next chapter.</p></aside>
 <nav className="look-controls" aria-label="Art review"><button onClick={()=>setView(view==='drive'?'block':'drive')}>{view==='drive'?'View your block':'Street view'}</button><button onClick={()=>setPassed((passed+1)%4)}>{passed} missions passed</button><select aria-label="Persona" value={persona} onChange={e=>setPersona(e.target.value)}>{['tom','karim','sofie','lina'].map(p=><option key={p}>{p}</option>)}</select></nav>
 <div className="look-caption"><span className="look-dot"/>Your next chapter is out there.</div><footer>Synthetic demo crowd · not a forecast</footer>
 </main>;
}
