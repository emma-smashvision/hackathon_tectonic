"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Vector3 } from "three";
import { stopEvidenceFor, type PersonInput, type PersonPointers } from "../../one/crowd";
import { RoadStopSheet } from "../../one/road8/RoadStopSheet";
import { RoadForkSheet } from "../../one/road8/RoadForkSheet";
import { driveCamera } from "./DriveScene";
import { driveStops, driveViewFor, nextDriveStop, publishedGhosts, MONTH_DISTANCE as U, type DriveView, type DriveStop } from "./driveModel";
import "./drive.css";
import "../../one/road8/road8.css";
const Scene = dynamic(() => import("./DriveScene").then(m=>m.DriveScene), { ssr:false });

export interface DriveThisRoadProps {
  person: PersonInput;
  roadId: string;
  stopId?: string;
  onExit: (roadId: string, stopId?: string) => void;
  /** Preserve live confirmed/exploring stages from All roads. */
  pointers?: PersonPointers;
  large?: boolean;
}
export function DriveThisRoad(props: DriveThisRoadProps) {
  const view = useMemo(()=>driveViewFor(props.person,props.roadId,{pointers:props.pointers,largeSimple:props.large}),[props.person,props.roadId,props.pointers,props.large]);
  if (!view) return null;
  return <Drive key={`${typeof props.person === "string" ? props.person : props.person.key}:${props.roadId}:${props.stopId ?? ""}`} {...props} view={view}/>;
}
function Drive({ view, stopId, onExit }: DriveThisRoadProps & { view: DriveView }) {
  const stops = useMemo(()=>driveStops(view),[view]);
  const initial = stops.find(s=>s.stopId===stopId);
  const [month,setMonth] = useState(initial?.month ?? view.position.month ?? 0);
  const [selected,setSelected] = useState<string | undefined>(initial?.stopId);
  const [sheet,setSheet] = useState<string>();
  const [travel,setTravel] = useState(false);
  const [branch,setBranch] = useState<string | null>(null);
  const [reduced,setReduced] = useState(false);
  const [size,setSize] = useState({width:1280,height:720});
  const root = useRef<HTMLElement>(null);
  const raf = useRef(0);
  const held = useRef(0);
  const monthRef = useRef(month);
  monthRef.current = month;
  const minMonth = Math.min(view.position.month ?? 0, stops[0]?.month ?? 0);
  const maxMonth = Math.max(...stops.map(s=>s.month), view.position.month ?? 0);
  const next = nextDriveStop(stops,month,selected);
  const nextEvidence = useMemo(()=>next && next.kind!=="fork" ? stopEvidenceFor(view.roadId,next.stopId) : null,[view.roadId,next]);
  const ghosts = publishedGhosts(view);
  const camera = useMemo(()=>driveCamera(month,size.width/size.height),[month,size]);
  const point = (x:number,m:number,y=1): CSSProperties => {
    const p = new Vector3(x,y,m*U).project(camera);
    return { left:`${Math.max(8,Math.min(92,(p.x+1)*50))}%`, top:`${Math.max(25,Math.min(79,(1-p.y)*50))}%` };
  };
  useEffect(()=> {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>setReduced(media.matches); update(); media.addEventListener("change",update);
    const resize = new ResizeObserver(([entry])=>setSize({width:entry.contentRect.width,height:entry.contentRect.height}));
    if(root.current)resize.observe(root.current);
    return ()=>{media.removeEventListener("change",update);resize.disconnect();cancelAnimationFrame(raf.current);};
  },[]);
  const go = (target: DriveStop, chosenBranch?: string) => {
    cancelAnimationFrame(raf.current); held.current=0;
    if(chosenBranch)setBranch(chosenBranch);
    else if(view.fork && target.month>view.fork.month && !branch)setBranch(view.fork.comparisons[0].branches[0].id);
    setSheet(undefined); setTravel(true);
    const from=monthRef.current;
    const destination=target.month+(chosenBranch ? 2 : 0);
    const finish=()=>{setMonth(destination);setSelected(target.stopId);setTravel(false);setSheet(target.stopId);};
    if(reduced){finish();return;}
    let start:number | null=null;
    const tick=(time:number)=>{
      if(start===null)start=time;
      const t=Math.min(1,(time-start)/3000); const ease=t*t*(3-2*t);
      setMonth(from+(destination-from)*ease);
      if(t<1)raf.current=requestAnimationFrame(tick);else finish();
    };
    raf.current=requestAnimationFrame(tick);
  };
  useEffect(()=>{
    if(travel || sheet)return;
    let frame=0, last=0;
    const tick=(now:number)=>{
      if(held.current){
        const from=monthRef.current;
        const value=Math.max(minMonth,Math.min(maxMonth,from+held.current*Math.min((now-last)/1000,.05)*2));
        const crossed=stops.find(s=>held.current>0 ? s.month>from+.001 && s.month<=value : s.month<from-.001 && s.month>=value);
        if(crossed){setMonth(crossed.month);setSelected(crossed.stopId);setSheet(crossed.stopId);held.current=0;}
        else setMonth(value);
      }
      last=now;if(held.current)frame=requestAnimationFrame(tick);else frame=0;
    };
    const down=(e:KeyboardEvent)=>{
      if((e.target as HTMLElement).closest("input,textarea,select,[role=dialog]"))return;
      if(["ArrowUp","ArrowRight","ArrowDown","ArrowLeft"].includes(e.key)){e.preventDefault();held.current=e.key==="ArrowUp" || e.key==="ArrowRight" ? 1 : -1;if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}}
    };
    const up=()=>{held.current=0;};
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);window.addEventListener("blur",up);
    return ()=>{cancelAnimationFrame(frame);up();window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);window.removeEventListener("blur",up);};
  },[travel,sheet,minMonth,maxMonth,stops]);
  const previewX = branch && view.fork ? (branch===view.fork.comparisons[0].branches[0].id ? -1 : 1)*Math.min(12,Math.max(0,month-view.fork.month)*3)-1.2 : -1.2;
  const forkStop=stops.find(s=>s.kind==="fork");
  const isFork=sheet===view.fork?.stopId;
  const titlePosition=view.position.preview ? view.position.label.replace(/^[A-Z]/, c=>c.toLowerCase()) : `you are ${view.position.label.replace(/^[A-Z]/, c=>c.toLowerCase())}`;
  return <section ref={root} className="drive8 hs road8" aria-label={`Drive this road: ${view.road.name}`}>
    <div className="drive8-scene" inert={!!sheet}><Scene view={view} month={month} stops={stops} branch={branch} reduced={reduced}/></div>
    <header className="drive8-title"><p>Drive this road</p><h1>{view.road.name} <span>· {titlePosition}</span></h1><p>{view.position.preview ? "A preview, with no personal position set." : "Your position stays here while you look ahead."}</p></header>
    <button disabled={!!sheet} className="drive8-map" onClick={()=>onExit(view.roadId,selected)}>Map view</button>
    <div className="drive8-crowd"><span className="drive8-ghost-symbol" aria-hidden="true">▰ ▰</span><strong>Earlier travellers, ahead of you</strong><span>{ghosts.length ? "Anonymous groups of ≥ 500 · not a prediction" : "Ghost groups withheld: too few people to publish"}</span></div>
    <div className="drive8-labels" inert={!!sheet}>
      {Array.from({length:4},(_,i)=>Math.floor(month)+i*2).filter(m=>m<=maxMonth+2).map(m=><span className="drive8-month" key={m} style={point(6.5,m,.9)}>Month {m}</span>)}
      {view.position.confirmed && view.position.month!==null && <span className="drive8-you" data-actual-month={view.position.month} style={point(3.2,view.position.month,1.4)}>● You · {view.position.label}</span>}
      <span className="drive8-preview" style={point(previewX,month,2.8)}>Your preview · exploring month {Math.round(month)}</span>
      {next && <button className="drive8-stop" style={point(-6,next.month,2.5)} onClick={()=>go(next)} disabled={travel}><span>◇ {next.kind==="fork" ? "A choice ahead" : "What surprised people"}</span><strong>Month {next.month} · {next.title}</strong></button>}
      {nextEvidence?.helped.some(h=>h.outcome.shown) && <button className="drive8-help" style={point(11,next!.month+1,3.5)} onClick={()=>go(next!)} disabled={travel}><span>What helped ↗</span><strong>{nextEvidence.helped.find(h=>h.outcome.shown)!.label}</strong></button>}
    </div>
    {nextEvidence?.notes[0] && <aside className="drive8-note"><span>A note from ahead</span><q>{nextEvidence.notes[0].text}</q><small>Synthetic example</small></aside>}
    {forkStop && view.fork && view.fork.month-month<=6 && <div className="drive8-fork" aria-label="Preview either branch"><p>Month {view.fork.month} · preview either route</p><div>{view.fork.comparisons[0].branches.map((b,index)=><button key={b.id} aria-pressed={branch===b.id} disabled={travel || !!sheet} onClick={()=>go(forkStop,b.id)}>{index===0 ? "↖" : "↗"} {b.label}</button>)}</div></div>}
    <footer className="drive8-footer"><div><p>{view.disclosure}</p><span>Same stops and notes as the map · distance means months</span><small>Optional: hold arrow keys to move along the lane</small></div><div className="drive8-action"><span aria-live="polite">{travel ? "Travelling to the next stop…" : next ? `Next: ${next.title}` : "You have reached the last published stop"}</span><button disabled={travel || !next || !!sheet} onClick={()=>next && go(next)}>{travel ? "Looking ahead…" : "Show me ahead →"}</button></div></footer>
    {sheet && (isFork ? <RoadForkSheet roadId={view.roadId} onClose={()=>setSheet(undefined)}/> : <RoadStopSheet roadId={view.roadId} stopId={sheet} passed={stops.find(s=>s.stopId===sheet)?.passed} onClose={()=>setSheet(undefined)}/>)}
  </section>;
}
export default DriveThisRoad;
