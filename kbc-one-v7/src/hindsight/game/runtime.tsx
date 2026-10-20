"use client";

import type * as THREE from "three";
import { createContext, type ReactNode, useContext, useMemo, useRef, useState } from "react";
import type { Car, Input } from "./driving";
import { NO_INPUT } from "./driving";
import { GATE_COOLDOWN_MS } from "./gateFlow";
import { useStore } from "../components/store";
import { buildPlaces, type MarketInfo, type Place } from "../engine/world";
import { nearest, pointAt, type CityNet, type Nearest, type StreetId } from "./network";
import { generateCity } from "./cityGen";
import { type Landmark, placeLandmarks } from "./landmarks";
import { layoutPlaces, type Spot } from "./streets";
import { type CityFocus, focusTarget, neighbourhoodPlaces, layoutNeighbourhood, routeTo } from "./neighbourhood";
import { streetTourFrame, TOUR_MS } from "./streetTour";

import { PEOPLE } from "../../one/people";
import { roadmapFor, trackReady, majorStops } from "../../one/roadmap/model";
import type { CityGameApi, GameEvent } from "./gameApi";
import { buildMapNetwork, gateFor, laneRoute, type MapNetwork } from "./mapNetwork";

// Shared state between the 3D scene (60 fps, refs) and the HUD (React, ~10 fps).

export type Panel =
  | { type: "mapStop"; id: string }
  | { type: "mapFork"; id: string }
  | { type: "stop"; key: string }
  | { type: "fork"; roadId: string }
  | { type: "care"; roadId: string }
  | { type: "complete"; roadId: string }
  | { type: "passport" }
  | { type: "map" }
  | { type: "closed"; roadId: string }
  | { type: "everyday"; key: string }
  | { type: "recap" }
  | { type: "place"; id: string }
  | { type: "journey"; id: string }
  | null;

export interface Hud {
  touring: boolean;
  tourPlaceId: string | null;
  tourFinished: boolean;
  roadId: string | null;
  branch: "trunk" | "a" | "b" | "ring" | "street";
  /** on one of your streets inside the ring */
  street: StreetId | null;
  /** the place in your world you're in front of */
  place: { id: string; dist: number } | null;
  month: number;
  speed: number;
  forward: boolean;
  /** next stop ahead on this road, in months */
  ahead: { key: string; months: number } | null;
  /** last stop just passed within half a month */
  here: { key: string } | null;
  /** an Everyday Road stop close by on the ring (journey done-key) */
  ring: { key: string; dist: number } | null;
  /** salary-day autopilot is driving */
  autopilot: boolean;
  flash: { kind: "hit" | "paved" | "boost" | "info"; text: string; at: number } | null;
}

export interface Runtime {
  car: Car;
  tour: { startedAt: number | null } | null;
  tourFinished: boolean;
  tourPlaceId: string | null;
  cutCamera: boolean;
  travel: { points: { x: number; z: number }[]; speed: number; updatedAt: number; panel: Panel; heading: number } | null;
  gateCooldownUntil: number;
  near: Nearest | null;
  keys: Input;
  touch: Input;
  teleport: { x: number; z: number; heading: number } | null;
  jolt: number;
  paused: boolean;
  smooth: number;
  hits: number;
  /** the scene camera, so the label layer can project world anchors to the screen */
  cam: THREE.Camera | null;
  /** salary day: the car drives itself one month along your road */
  autopilot: { roadId: string; month: number; to: number } | null;
}

interface GameCtx {
  gameApi: CityGameApi;
  mapNetwork: MapNetwork;
  reachGate: (id: string, fork?: boolean) => void;
  passMinor: (id: string) => void;
  focus?: CityFocus;
  startTour: () => void;
  stopTour: () => void;
  hoverRoad: string | null;
  setHoverRoad: (id: string | null) => void;
  travelTo: (focus: CityFocus) => void;
  net: CityNet;
  dressing: ReturnType<typeof generateCity>;
  /** a landmark per road, and the civic buildings on the Everyday Road */
  landmarks: Landmark[];
  /** your own world: places on your streets, and where they stand */
  places: Place[];
  market: MarketInfo | null;
  spots: Spot[];
  rt: React.MutableRefObject<Runtime>;
  hud: Hud;
  setHud: (h: Hud) => void;
  panel: Panel;
  setPanel: (p: Panel) => void;
  mapView: boolean;
  setMapView: (v: boolean) => void;
  flash: (kind: NonNullable<Hud["flash"]>["kind"], text: string) => void;
}

const Ctx = createContext<GameCtx | null>(null);

export const EMPTY_HUD: Hud = {
  touring: false, tourPlaceId: null, tourFinished: false,
  roadId: null,
  branch: "ring",
  street: null,
  place: null,
  month: Number.NaN,
  speed: 0,
  forward: true,
  ahead: null,
  here: null,
  ring: null,
  autopilot: false,
  flash: null,
};

export function GameProvider({ children, focus }: { children: ReactNode; focus?: CityFocus }) {
  const store = useStore();
  const { world, life, advisor } = store;
  const person = PEOPLE[store.person?.key ?? "tom"] ?? PEOPLE.tom;
  const roadmap = useMemo(() => roadmapFor(person, store), [person, store.road, store.journey, life, store.plan]);
  const mapNetwork = useMemo(() => buildMapNetwork(roadmap), [roadmap]);
  const net = mapNetwork.net;
  const landmarks = useMemo(() => [] as Landmark[], []);
  const dressing = useMemo(() => generateCity(net, landmarks), [net, landmarks]);
  const built = useMemo(() => (world ? buildPlaces(world, life, advisor) : null), [world, life, advisor]);
  const places = useMemo(() => [...neighbourhoodPlaces(built?.places ?? []), ...(built?.places.filter((p) => p.street === "market") ?? [])], [built]);
  const market = built?.market ?? null;
  const spots = useMemo(() => (built ? [...layoutNeighbourhood(places), ...layoutPlaces(places.filter((p) => p.street === "market"), built.market)] : []), [built, places]);
  const rt = useRef<Runtime>({
    car: { x: 0, z: 0, heading: 0, speed: 0 },
    travel: null,
    tour: null, tourFinished: false, tourPlaceId: null, cutCamera: false,
    gateCooldownUntil: 0,
    near: null,
    keys: { ...NO_INPUT },
    touch: { ...NO_INPUT },
    teleport: null,
    jolt: 0,
    paused: false,
    smooth: 0,
    hits: 0,
    cam: null,
    autopilot: null,
  });
  const [hud, setHudState] = useState<Hud>(EMPTY_HUD);
  const [panel, setPanelState] = useState<Panel>(null);
  const [mapView, setMapView] = useState(false);
  const [hoverRoad, setHoverRoad] = useState<string | null>(null);
  const flashRef = useRef<Hud["flash"]>(null);

  const stopTour = () => {
    if (!spots.some((p) => p.street === "home")) return;
    const end = streetTourFrame(spots, TOUR_MS);
    rt.current.tour = null;
    rt.current.tourFinished = true;
    rt.current.tourPlaceId = null;
    rt.current.teleport = end.pose;
    rt.current.cutCamera = true;
    setHudState((old) => ({ ...old, touring: false, tourPlaceId: null, tourFinished: true }));
  };
  const startTour = () => {
    if (!spots.some((p) => p.street === "home")) return;
    rt.current.travel = null;
    rt.current.autopilot = null;
    rt.current.teleport = null;
    rt.current.paused = false;
    setPanelState(null);
    setMapView(false);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { stopTour(); return; }
    rt.current.tour = { startedAt: null };
    rt.current.tourFinished = false;
    setHudState((old) => ({ ...old, touring: true, tourFinished: false }));
  };

  const [events, setEvents] = useState<GameEvent[]>([]);
  const sequence = useRef(0);
  const pendingPicks = useRef(new Set<string>());
  const passedMinors = useRef(new Set<string>());
  const [previewBranch, setPreviewBranch] = useState<CityGameApi["previewBranch"]>(null);
  const emit = (event: Omit<GameEvent,"seq">) => { const entry = { ...event, seq: ++sequence.current }; setEvents(old => [...old.slice(-19), entry]); };
  const openPanel = (nextPanel: Panel) => {
    if (!nextPanel && (panel?.type === "mapStop" || panel?.type === "mapFork")) {
      rt.current.gateCooldownUntil = performance.now() + GATE_COOLDOWN_MS;
      rt.current.travel = null;
      rt.current.keys = { ...NO_INPUT }; rt.current.touch = { ...NO_INPUT };
    }
    rt.current.paused = !!nextPanel && nextPanel.type !== "closed";
    rt.current.car.speed = 0; setPanelState(nextPanel);
  };
  const passMinor = (id: string) => {
    const stop = mapNetwork.gates.find(g => g.stop.id === id)?.stop;
    if (!stop || stop.weight !== "minor" || id === "today" || passedMinors.current.has(id)) return;
    passedMinors.current.add(id);
    emit({ type: "minorPassed", stopId: id, trackId: stop.trackId });
  };
  const reachGate = (id: string, fork = false) => {
    if (fork) {
      const gate = mapNetwork.forks.find(g => g.crossing.id === id);
      if (!gate) return;
      openPanel({ type: "mapFork", id });
      emit({ type: "forkReached", crossingId: id, trackId: gate.crossing.trackId });
    } else {
      const gate = mapNetwork.gates.find(g => g.stop.id === id);
      if (!gate) return;
      if (gate.stop.weight === "minor") { openPanel(null); passMinor(id); return; }
      openPanel({ type: "mapStop", id });
      emit({ type: "gateReached", stopId: id, trackId: gate.stop.trackId });
    }
  };
  const driveTo = (pose: {x:number;z:number;heading:number}, panel:Panel) => {
    rt.current.tour=null; rt.current.teleport=null; rt.current.autopilot=null; rt.current.paused=false;
    rt.current.keys={...NO_INPUT}; rt.current.touch={...NO_INPUT};
    const points=laneRoute(net,rt.current.car,pose);
    if(!points.length)return;
    let previous=rt.current.car;
    const distance=points.reduce((sum,p)=>{const length=Math.hypot(p.x-previous.x,p.z-previous.z);previous={...previous,...p};return sum+length;},0);
    rt.current.travel={points,speed:Math.max(42,distance/3),updatedAt:performance.now(),panel,heading:pose.heading};
    setPanelState(null);setMapView(false);
  };
  const goToStop = (id:string) => {
    const gate=gateFor(mapNetwork,id);if(!gate){goToTrack(id);return;}
    id=gate.stop.id;
    const crossing=mapNetwork.forks.find(f=>f.crossing.id===id);
    driveTo({...gate.pos,heading:gate.heading}, crossing?{type:"mapFork",id}:{type:"mapStop",id});
  };
  const goToTrack = (id:string) => {
    const track=roadmap.tracks.find(t=>t.id===id); if(!track)return;
    const stop=majorStops(track).find(s=>s.ready<100 && s.state!=="done" && s.state!=="locked")??majorStops(track).find(s=>s.state!=="done");
    if(stop)goToStop(stop.id);
    else {const path=mapNetwork.trackPaths[id];if(path){const at=pointAt(path,15);driveTo({...at.p,heading:Math.atan2(at.tan.x,at.tan.z)},null);}}
  };
  const resolveMapFocus = (id:string) => {
    const stop=gateFor(mapNetwork,id)?.stop;
    if(stop){goToStop(stop.id);return true;}
    const track=roadmap.tracks.find(t=>t.id===id||t.roadId===id);
    if(track){goToTrack(track.id);return true;}return false;
  };
  const track=roadmap.tracks.find(t=>t.id===hud.roadId)??null;
  const currentS=rt.current.car.laneS??0;
  const next=mapNetwork.majorGates.find(g=>g.stop.trackId===track?.id && g.s>=currentS-2 && g.stop.state!=="done")?.stop
    ?? roadmap.tracks.flatMap(t=>t.stops).find(s=>s.id===roadmap.nextUp?.stopId)??null;
  const gameApi:CityGameApi = {
    roadmap,currentTrackId:track?.id??null,currentTrack:track,nextGate:next,
    currentGate:panel?.type==="mapStop"?roadmap.tracks.flatMap(t=>t.stops).find(s=>s.id===panel.id)??null:null,
    currentFork:panel?.type==="mapFork"?roadmap.tracks.flatMap(t=>t.crossings).find(c=>c.id===panel.id)??null:null,
    readyByTrack:Object.fromEntries(roadmap.tracks.map(t=>[t.id,trackReady(t)??0])),
    events,previewBranch,
    setInput:(input)=>{rt.current.touch={...rt.current.touch,...input};if(Object.values(input).some(Boolean))rt.current.travel=null;},
    releaseInput:()=>{rt.current.touch={...NO_INPUT};rt.current.keys={...NO_INPUT};},
    goToStop,goToTrack,
    chooseBranch:(crossingId,branchId)=>{
      const crossing=roadmap.tracks.flatMap(t=>t.crossings).find(c=>c.id===crossingId);
      const branch=crossing?.branches.find(b=>b.id===branchId);if(!branch)return;
      const path=mapNetwork.trackPaths[branch.trackId];if(!path)return;
      setPreviewBranch({crossingId,branchId});const at=pointAt(path,20);
      driveTo({...at.p,heading:Math.atan2(at.tan.x,at.tan.z)},null);
    },
    prepare:(stopId,actionId)=>{
      const stop=roadmap.tracks.flatMap(t=>t.stops).find(s=>s.id===stopId);
      const action=stop?.actions.find(a=>a.pick.id===actionId);
      if(!stop||!action||stop.state==="locked"||store.plan.some(p=>p.id===actionId)||pendingPicks.current.has(actionId))return false;
      pendingPicks.current.add(actionId);store.addPlanItem(action.pick);
      emit({type:"stepAdded",trackId:stop.trackId,stopId,actionId});return true;
    },
    dismissGate:()=>openPanel(null),
  };

  const value: GameCtx = {
    gameApi,mapNetwork,reachGate,passMinor,
    focus,
    startTour, stopTour,
    hoverRoad, setHoverRoad,
    travelTo: (target) => {
      if(target.kind==="journey" && resolveMapFocus(target.id)) return;
      const dest=focusTarget(target,net,spots,world?.car?.insurance.renews);
      if(dest)driveTo(dest.pose,dest.panel);
      else if(target.kind==="journey"&&roadmap.nextUp)goToStop(roadmap.nextUp.stopId);
    },
    net,
    dressing,
    landmarks,
    places,
    market,
    spots,
    rt,
    hud,
    setHud: (h) => setHudState({ ...h, flash: flashRef.current }),
    panel,
    setPanel: openPanel,
    mapView,
    setMapView,
    flash: (kind, text) => {
      flashRef.current = { kind, text, at: Date.now() };
      if (kind === "paved") rt.current.smooth += 1;
      if (kind === "hit") rt.current.hits += 1;
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameCtx {
  const g = useContext(Ctx);
  if (!g) throw new Error("useGame outside GameProvider");
  return g;
}
