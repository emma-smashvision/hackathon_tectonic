"use client";
import { useEffect, useMemo, useState } from 'react';
import { useCityEngine } from '../engine/runtime';
import { ROAD_W } from '../engine/network';
import { roadViewFor } from '@/one/crowd';
import { publishedGhosts } from '../../driveModel';
import { CityScene, NightPost, PlayerCar } from './CityScene';
import { ArtViewContext } from './Hologram';
import { VehicleTrails } from './VehicleTrails';
import { DISTRICT_COLORS, type ArtRoad } from './art';
export function useReducedCityMotion(){const[reduced,setReduced]=useState(false);useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(q.matches);update();q.addEventListener('change',update);return()=>q.removeEventListener('change',update);},[]);return reduced;}
/** Engine-connected replacement world. Mount inside CityGame's world slot. */
export function NightCity({personaId}:{personaId:string}){
 const {net,generated,blocks,api,rt}=useCityEngine();const reduced=useReducedCityMotion();
 const roads=useMemo<ArtRoad[]>(()=>net.paths.map(p=>{const avenue=net.avenues.find(a=>a.road.id===p.roadId),view=p.roadId?roadViewFor(personaId,p.roadId):null;return{id:p.id,points:p.pts,width:ROAD_W,color:avenue?DISTRICT_COLORS[avenue.district]??avenue.road.hue:p.branch==='ring'?'#ffca80':'#63e5ff',name:p.branch==='trunk'?avenue?.road.name:p.branch==='ring'?'Everyday ring':undefined,ghosts:!!view&&view.canDrive&&publishedGhosts(view).length>0};}),[net,personaId]);
 const towers=useMemo(()=>generated.buildings.map(b=>({...b,h:Math.max(18,b.h*(b.seed%7===0?2.2:1.3)),color:DISTRICT_COLORS[b.district]??'#63e5ff'})),[generated]);
 const home=useMemo(()=>api.home(),[api]);
 return <ArtViewContext.Provider value={()=>rt.current.car}><CityScene roads={roads} personaId={personaId} home={home} reducedMotion={reduced} towers={towers} blocks={blocks}/><VehicleTrails reducedMotion={reduced}/><NightPost speed={()=>Math.abs(rt.current.car.speed)} reducedMotion={reduced}/></ArtViewContext.Provider>;
}
export function NightCar(){const{rt}=useCityEngine();const reduced=useReducedCityMotion();return <PlayerCar speed={()=>rt.current.car.speed} reducedMotion={reduced}/>;}
