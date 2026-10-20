"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useStore } from "../../components/store";
import { type Input, NO_INPUT, step } from "../driving";
import { gateFor } from "../mapNetwork";
import { nearest, pointAt } from "../network";
import { crossedForward } from "../gateFlow";
import { placeAt, STREET_Z } from "../streets";
import { focusTarget } from "../neighbourhood";
import { streetTourFrame } from "../streetTour";
import { useGame } from "../runtime";
const merged=(a:Input,b:Input):Input=>({up:a.up||b.up,down:a.down||b.down,left:a.left||b.left,right:a.right||b.right,brake:a.brake||b.brake});
export function Player(){
  const game=useGame(),store=useStore();const {net,rt,mapView}=game;
  const group=useRef<THREE.Group>(null),body=useRef<THREE.Group>(null),wheels=useRef<THREE.Mesh[]>([]),spot=useRef<THREE.SpotLight>(null),target=useRef<THREE.Object3D>(null);
  const {camera,scene}=useThree();const live=useRef({game,store});live.current={game,store};
  const spawned=useRef(false),lastHud=useRef(0),latched=useRef<string|null>(null),look=useRef(new THREE.Vector3(0,10,STREET_Z+25));
  useEffect(()=>{
    if(spawned.current)return;spawned.current=true;
    const G=live.current.game;live.current.store.takePendingDrive();
    const focus=G.focus;
    const gate=focus?.kind==='journey'?gateFor(G.mapNetwork,focus.id):null;
    const track=focus?.kind==='journey'?G.gameApi.roadmap.tracks.find(t=>t.id===focus.id||t.roadId===focus.id):null;
    const destination=gate??(track?G.mapNetwork.majorGates.find(g=>g.stop.trackId===track.id&&g.stop.ready<100):null);
    if(destination){rt.current.teleport={...destination.pos,heading:destination.heading};G.reachGate(destination.stop.id, G.mapNetwork.forks.some(f=>f.crossing.id===destination.stop.id));latched.current=destination.stop.id;}
    else {const place=focus?focusTarget(focus,net,G.spots):null;rt.current.teleport=place?.pose??{x:-25,z:STREET_Z,heading:Math.PI/2};if(place?.panel)G.setPanel(place.panel);}
    if(spot.current&&target.current)spot.current.target=target.current;
  },[net,rt]);
  // Keyboard driving belongs to the HUD so focused buttons and intro remain accessible.
  useEffect(()=>{
    const skip=(event:Event)=>{if(!rt.current.tour)return;live.current.game.stopTour();if(event.type==='keydown'){event.preventDefault();event.stopImmediatePropagation();}};
    window.addEventListener('pointerdown',skip,true);window.addEventListener('keydown',skip,true);
    return()=>{window.removeEventListener('pointerdown',skip,true);window.removeEventListener('keydown',skip,true);};
  },[rt]);
  useEffect(()=>{
    if(!new URLSearchParams(location.search).has('debug'))return;
    (window as any).__hindsight={inspect:()=>{
      const arches:{id:string;cameraDistance:number;opacity:number}[]=[];
      scene.traverse(object=>{if(object.name.startsWith('major-gate:')&&object.visible){let opacity=1;object.traverse(child=>{if(child instanceof THREE.Mesh&&!Array.isArray(child.material))opacity=Math.min(opacity,child.material.opacity);});arches.push({id:object.name.slice(11),cameraDistance:Math.hypot(camera.position.x-object.position.x,camera.position.z-object.position.z),opacity});}});
      return {arches,cooldownRemaining:Math.max(0,rt.current.gateCooldownUntil-performance.now()),travel:!!rt.current.travel,
        checkpoints:live.current.game.mapNetwork.gates.map(g=>({id:g.stop.id,weight:g.stop.weight,s:g.s,pathId:g.pathId})),
        bundles:live.current.game.mapNetwork.bundles.map(b=>({title:b.title,s:b.s,pathId:b.pathId}))};
    },car:()=>({...rt.current.car}),tour:()=>({active:!!rt.current.tour,place:rt.current.tourPlaceId,finished:rt.current.tourFinished}),game:()=>live.current.game.gameApi,goToStop:(id:string)=>live.current.game.gameApi.goToStop(id),input:(input:Partial<Input>)=>live.current.game.gameApi.setInput(input),snapshot:()=>({currentTrack:live.current.game.gameApi.currentTrackId,ready:live.current.game.gameApi.readyByTrack,panel:live.current.game.panel,events:live.current.game.gameApi.events}),place:(id:string)=>live.current.game.travelTo({kind:'place',id})};
  },[rt]);
  useFrame((state,dt)=>{
    const R=rt.current,{game:G}=live.current;R.cam=camera;
    if(R.teleport){R.car={...R.teleport,speed:0};R.teleport=null;}
    const before=nearest(net,R.car.x,R.car.z,R.car.pathId?p=>p.id===R.car.pathId:undefined);
    const beforeS=before.path.cum[before.seg]+before.t*(before.path.cum[before.seg+1]-before.path.cum[before.seg]);
    const input=merged(R.keys,R.touch);let tourFrame:ReturnType<typeof streetTourFrame>|null=null;
    if(R.tour){if(R.tour.startedAt===null)R.tour.startedAt=performance.now();tourFrame=streetTourFrame(G.spots,performance.now()-R.tour.startedAt);R.car={...tourFrame.pose,speed:tourFrame.done?0:18};R.tourPlaceId=tourFrame.placeId;if(tourFrame.done){R.tour=null;R.tourFinished=true;}}
    else if(R.travel&&!R.paused){const travel=R.travel,now=performance.now();let remaining=(now-travel.updatedAt)/1000*travel.speed;travel.updatedAt=now;
      while(travel.points.length&&remaining>0){const next=travel.points[0],dx=next.x-R.car.x,dz=next.z-R.car.z,distance=Math.hypot(dx,dz);if(distance<=remaining){R.car={...next,heading:Math.atan2(dx,dz),speed:30};remaining-=distance;travel.points.shift();}else{R.car={x:R.car.x+dx/distance*remaining,z:R.car.z+dz/distance*remaining,heading:Math.atan2(dx,dz),speed:30};remaining=0;}}
      if(!travel.points.length){R.car.speed=0;R.car.heading=travel.heading;R.travel=null;if(travel.panel?.type==='mapStop'||travel.panel?.type==='mapFork'){latched.current=travel.panel.id;G.reachGate(travel.panel.id,travel.panel.type==='mapFork');}else G.setPanel(travel.panel);}
    }else if(!R.paused)R.car=step(R.car,input,dt,net,{maxSpeed:38,throttle:1}).car;
    else {R.car.speed=0;if(R.travel)R.travel.updatedAt=performance.now();}
    let near=nearest(net,R.car.x,R.car.z,R.car.pathId?p=>p.id===R.car.pathId:undefined);
    let s=near.path.cum[near.seg]+near.t*(near.path.cum[near.seg+1]-near.path.cum[near.seg]);
    R.car.laneS=s;R.near=near;
    const prior=G.mapNetwork.gates.find(g=>g.stop.id===latched.current)??G.mapNetwork.forks.find(f=>f.crossing.id===latched.current);
    if(prior&&Math.hypot(R.car.x-prior.pos.x,R.car.z-prior.pos.z)>18)latched.current=null;
    if(!R.travel&&!R.tour&&!R.paused){
      const crossed=(pathId:string,at:number)=>crossedForward(near.path.id,before.path.id,beforeS,s,pathId,at);
      for(const minor of G.mapNetwork.gates.filter(g=>g.stop.weight==='minor'&&g.stop.id!=='today')) {
        if(crossed(minor.pathId,minor.s)) G.passMinor(minor.stop.id);
      }
      if(performance.now()>=R.gateCooldownUntil){
        const fork=G.mapNetwork.forks.find(f=>f.crossing.id!==latched.current&&crossed(f.pathId,f.s));
        const gate=G.mapNetwork.majorGates.find(g=>g.stop.id!==latched.current&&g.stop.state!=='done'&&crossed(g.pathId,g.s));
        const hit=fork??gate;
        if(hit){
          const id='crossing'in hit?hit.crossing.id:hit.stop.id; latched.current=id;
          // Clamp this frame's forward travel, never pull back from a passed checkpoint.
          const stopS=Math.max(beforeS,Math.min(s,hit.s-2)),at=pointAt(near.path,stopS);
          R.car={...at.p,heading:Math.atan2(at.tan.x,at.tan.z),speed:0,pathId:hit.pathId,laneS:stopS,laneDirection:1};
          G.reachGate(id,!!fork);
        }
      }
    }
    if(group.current){group.current.position.set(R.car.x,0,R.car.z);group.current.rotation.y=R.car.heading;}
    if(body.current){body.current.position.y=.55;body.current.rotation.x=-R.car.speed*.0008;body.current.rotation.z=0;}
    for(const wheel of wheels.current)if(wheel)wheel.rotation.x+=R.car.speed*Math.min(dt,1)/.55;
    const k=1-Math.exp(-dt*2.4),fwd=new THREE.Vector3(Math.sin(R.car.heading),0,Math.cos(R.car.heading)),carPos=new THREE.Vector3(R.car.x,0,R.car.z);
    let desired:THREE.Vector3,targetLook:THREE.Vector3;
    if(tourFrame){desired=new THREE.Vector3(tourFrame.camera.x,tourFrame.camera.y,tourFrame.camera.z);targetLook=new THREE.Vector3(tourFrame.look.x,tourFrame.look.y,tourFrame.look.z);camera.position.copy(desired);look.current.copy(targetLook);}
    else if(G.mapView){desired=new THREE.Vector3(0,Math.max(350,net.radius*1.25),net.radius*.45);targetLook=new THREE.Vector3(0,0,net.radius*.2);}
    else if(near.branch==='street'&&Math.abs(R.car.speed)<.2&&!R.travel){const market=near.path.street==='market';desired=market?new THREE.Vector3(5,100,65):new THREE.Vector3(0,105,-62);targetLook=new THREE.Vector3(0,10,market?-STREET_Z-20:STREET_Z+25);}
    else {desired=carPos.clone().addScaledVector(fwd,-27).add(new THREE.Vector3(0,17,0));targetLook=carPos.clone().addScaledVector(fwd,18).add(new THREE.Vector3(0,5,0));}
    if(R.cutCamera){camera.position.copy(desired);look.current.copy(targetLook);R.cutCamera=false;}else if(!tourFrame){camera.position.lerp(desired,k);look.current.lerp(targetLook,k);}
    camera.lookAt(look.current);if(scene.fog instanceof THREE.Fog)scene.fog.far=G.mapView?Math.max(1200,net.radius*3):650;
    if(state.clock.elapsedTime-lastHud.current>.1){lastHud.current=state.clock.elapsedTime;const street=near.path.street??null;G.setHud({touring:!!R.tour,tourPlaceId:R.tourPlaceId,tourFinished:R.tourFinished,roadId:near.roadId,branch:near.branch,street,place:street?placeAt(G.spots,street,R.car.x,R.car.z):null,month:near.month,speed:R.car.speed,forward:true,ahead:null,here:null,ring:null,autopilot:!!R.travel,flash:null});}
  }, -1);
  const wheelPos: [number, number, number][] = [
    [-1.05, 0.05, 1.35],
    [1.05, 0.05, 1.35],
    [-1.05, 0.05, -1.35],
    [1.05, 0.05, -1.35],
  ];
  const care = store.road.care;
  const paint = care ? "#B7B0DA" : "#5ED4E8";

  return (
    <group ref={group}>
      <group ref={body} position={[0, 0.55, 0]}>
        <mesh castShadow position={[0, 0.35, 0]}>
          <boxGeometry args={[2.2, 0.75, 4.4]} />
          <meshStandardMaterial color={paint} metalness={0.4} roughness={0.35} emissive={paint} emissiveIntensity={0.15} />
        </mesh>
        <mesh position={[0, 0.98, -0.25]}>
          <boxGeometry args={[1.8, 0.6, 2.2]} />
          <meshStandardMaterial color="#0b1626" metalness={0.6} roughness={0.2} />
        </mesh>
        {[-0.65, 0.65].map((x) => (
          <mesh key={`h${x}`} position={[x, 0.4, 2.21]}>
            <boxGeometry args={[0.55, 0.22, 0.05]} />
            <meshBasicMaterial color="#fffbe8" toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, 0.45, -2.21]}>
          <boxGeometry args={[1.9, 0.18, 0.05]} />
          <meshBasicMaterial color="#ff5a4a" toneMapped={false} />
        </mesh>
        {wheelPos.map((p, i) => (
          <mesh
            key={p.join(",")}
            ref={(m) => {
              if (m) wheels.current[i] = m;
            }}
            position={p}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.55, 0.55, 0.4, 14]} />
            <meshStandardMaterial color="#05080d" roughness={0.9} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.4, 24]} />
        <meshBasicMaterial color={paint} transparent opacity={0.16} toneMapped={false} />
      </mesh>
      <spotLight ref={spot} position={[0, 1.6, 2.2]} angle={0.55} penumbra={0.7} intensity={180} distance={90} decay={1.2} color="#fff4dc" />
      <object3D ref={target} position={[0, 0, 24]} />
      <pointLight position={[0, 1, 0]} intensity={14} distance={14} color={paint} decay={1.5} />
      {mapView && (
        <mesh position={[0, 60, 0]}>
          <cylinderGeometry args={[6, 6, 120, 16, 1, true]} />
          <meshBasicMaterial color={paint} transparent opacity={0.35} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
