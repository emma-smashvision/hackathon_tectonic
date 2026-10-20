"use client";
import { useMemo } from 'react';
import { Atmosphere, WetGround } from './Atmosphere';
import { Roads, Skyline } from './Architecture';
import { YourBlock } from './YourBlock';
import { Plaza } from './Plaza';
import { Hologram, LabelRegistryContext } from './Hologram';
import { GhostTrails } from './GhostTrails';
import { roadSample, type ArtRoad, type Point, type Tower } from './art';
const origin={x:0,z:0};
export type CitySceneProps={roads:ArtRoad[];personaId:string;home?:Point;reducedMotion?:boolean;previewPassed?:number;reflections?:boolean;labels?:boolean;towers?:Tower[];blocks?:{x:number;z:number;door?:Point}[]};
export function CityScene({roads,personaId,home=origin,reducedMotion=false,previewPassed,reflections=true,towers,blocks,labels=true}:CitySceneProps){
 const labelRegistry=useMemo(()=>new Map(),[]);
 const signs=useMemo(()=>roads.filter(r=>r.name&&!r.id.includes('street')&&!r.id.includes('market')).map(r=>({road:r,at:roadSample(r.points,r.id==='everyday'?70:40)})),[roads]);
 return <LabelRegistryContext.Provider value={labelRegistry}><Atmosphere/>{reflections&&<WetGround roads={roads}/>}<Roads roads={roads}/><Plaza roads={roads} home={home}/><Skyline roads={roads} home={home} towers={towers}/><YourBlock personaId={personaId} home={home} previewPassed={previewPassed} blocks={blocks} labels={labels}/><GhostTrails roads={roads} reducedMotion={reducedMotion}/>
 {labels&&signs.map(({road,at})=><Hologram key={road.id} title={road.name!} color={road.color} subtitle={road.id==='everyday'?'Everyday life, connected':undefined} position={[at.x+Math.cos(at.heading)*((road.width??11)/2+12),10,at.z-Math.sin(at.heading)*((road.width??11)/2+12)]} width={22}/>)}
 </LabelRegistryContext.Provider>;
}
export { PlayerCar } from './PlayerCar';
export { NightPost } from './Atmosphere';
