"use client";
import { Canvas } from "@react-three/fiber";
import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
// r2-places: shared local place state, with city arrival adapter.
import { PEOPLE } from "../../../one/people";
import { PlacesProvider, PlacesContext, usePlaces } from "../../../one/places";
import { CityPlaces, CityPlaceCamera } from "./scene/CityPlaces";
import { villageFor } from "../../../one/village/model";
import { CityApiContext } from "./api";
import { CityEngineContext, createEngine, useCityEngine } from "./engine/runtime";
import { Greybox } from "./engine/Greybox";
import { Traffic } from "./drive/Traffic";
import { DrivingEffects } from "./drive/DrivingEffects";
import { EngineMarkers } from "./drive/Markers";
import { Player } from "./drive/Player";
import { useDriveControls } from "./drive/controls";
import { CityMap } from "./map/CityMap";
import { OverviewRoads } from "./map/OverviewRoads";
import { GpsLine } from "./map/GpsLine";
import type { Input } from "./engine/driving";
import "./drive/city.css";
export { useCityEngine } from "./engine/runtime";
export type CityGameProps = {
  personaId: string;
  onExit: () => void;
  onPlain?: () => void;
  focusLessonId?: string;
  canvasEnabled?: boolean;
  onReady?: () => void;
  /** r2-places: optional host lesson handoff when no city Missions HUD is mounted. */
  onPlaceLesson?: (lessonId: string) => void;
  /** The shell can own the sole disclosure and exit controls. */
  showFooter?: boolean;
  compactHud?: boolean;
  /** DOM mission / HUD content, outside Canvas and inside both contexts. */
  children?: ReactNode;
  /** R3F layers, e.g. mission markers. Added to the default world. */
  scene?: ReactNode;
  /** Replacement R3F world. Omit to use the drivable greybox. */
  world?: ReactNode;
  /** R3F car model; local origin at road level, forward +Z. */
  carModel?: ReactNode;
};
export function CityGame(props: CityGameProps) { return <CitySession key={props.personaId} {...props} />; }
function CitySession(props: CityGameProps) {
  const engine = useMemo(() => createEngine(villageFor(props.personaId)), [props.personaId]);
  if (!engine.village.playable || props.personaId === 'margaret') return <div className="c10-plain"><h2>Your next step</h2><p>Open your lessons in plain view.</p><button onClick={props.onPlain ?? props.onExit}>Continue</button><button onClick={props.onExit}>Back to app</button></div>;
  return <CityApiContext.Provider value={engine.api}><CityEngineContext.Provider value={engine}><PlacesProvider key={props.personaId} person={PEOPLE[props.personaId]}><CityView {...props} /></PlacesProvider></CityEngineContext.Provider></CityApiContext.Provider>;
}
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function CityView({ personaId, onExit, onPlain, onPlaceLesson, children, scene, world, carModel, canvasEnabled = true, onReady, showFooter = true, compactHud = false }: CityGameProps) {
  const engine = useCityEngine(), { rt, api } = engine;
  const placeSession = usePlaces(); // r2-places: bridge local state explicitly into the Canvas root.
  const [mapOpen, setMapOpen] = useState(false);
  const [, tick] = useState(0);
  const closeMap = useCallback(() => setMapOpen(false), []); // r2-places
  const toggleMap = useCallback(() => setMapOpen(open => !open), []);
  useDriveControls(toggleMap);
  useEffect(() => { rt.current.mapOpen = mapOpen; if (mapOpen) rt.current.car.speed = 0; }, [mapOpen, rt]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => { rt.current.reducedMotion = media.matches; }; motion(); media.addEventListener('change', motion);
    const timer = setInterval(() => tick(t => t + 1), 100);
    const escape = (e: KeyboardEvent) => { if (e.code === 'Escape' && rt.current.mapOpen) { e.stopImmediatePropagation(); setMapOpen(false); } };
    window.addEventListener('keydown', escape, true);
    const debug = new URLSearchParams(location.search).has('debug');
    const w = window as unknown as { __city10?: unknown };
    if (debug) w.__city10 = { api, engine, car: api.car, map: () => setMapOpen(true) };
    return () => { media.removeEventListener("change", motion); clearInterval(timer); window.removeEventListener('keydown', escape, true); rt.current.cinematicFinish?.(); if (debug) delete w.__city10; };
  }, [rt, api, engine]);
  const R = rt.current;
  const fallback = <div className="c10-plain"><h2>The city could not start</h2><button onClick={onPlain ?? onExit}>Open plain lessons</button><button onClick={onExit}>Back to app</button></div>;
  return <section className="c10-game" aria-label="Free-roam city driving game" data-testid="city10" data-city-map-open={mapOpen ? "true" : "false"}>
    {canvasEnabled && <SceneBoundary fallback={fallback}><Canvas dpr={[1, 1.5]} camera={{ fov: 58, near: .1, far: 2400, position: [0, 15, 0] }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
      <CityApiContext.Provider value={api}><CityEngineContext.Provider value={engine}><PlacesContext.Provider value={placeSession}>
        {world ?? <Greybox />}<Traffic /><Player onReady={onReady}>{carModel}</Player><DrivingEffects /><EngineMarkers /><OverviewRoads /><GpsLine version={R.routeVersion} />{scene}<CityPlaceCamera/>
      </PlacesContext.Provider></CityEngineContext.Provider></CityApiContext.Provider>
    </Canvas></SceneBoundary>}
    <div className="c10-speed-lines" aria-hidden="true" style={{ opacity: !R.mapOpen && !R.frozen && !R.reducedMotion ? Math.max(0, Math.min(.5, (Math.abs(R.car.speed) - 33) / 35 + (R.boostMs > 0 ? .18 : 0))) : 0 }}>{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ transform: `rotate(${i * 30}deg)` }} />)}</div>
    <div className={`c10-top${compactHud ? " c10-top-compact" : ""}`}><span>YOUR CITY <small>Free roam</small></span><nav><button onClick={toggleMap}>Map · M</button>{!compactHud && <>{onPlain && <button onClick={onPlain}>Plain view</button>}<button onClick={onExit}>Back to app</button></>}</nav></div>
    <CityMap onOpen={() => setMapOpen(true)} />
    <div className="c10-speed"><strong>{Math.round(Math.abs(R.car.speed) * 3.6)}</strong><small>km/h</small>{R.boostMs > 0 && <em className="c10-boost">BOOST</em>}{R.autopilot && <button onClick={() => api.setAutopilot(null)}>Stop autopilot</button>}</div>
    <div className="c10-controls" aria-label="Driving controls">{([['left', '←', 'Steer left'], ['up', '↑', 'Accelerate'], ['down', '↓', 'Brake or reverse'], ['right', '→', 'Steer right'], ['brake', '▰', 'Handbrake']] as [keyof Input, string, string][]).map(([key, label, name]) => <button key={key} aria-label={name}
      onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); R.touch[key] = true; }}
      onPointerUp={() => { R.touch[key] = false; }} onPointerCancel={() => { R.touch[key] = false; }} onLostPointerCapture={() => { R.touch[key] = false; }}>{label}</button>)}</div>
    {!compactHud && <div className="c10-help">WASD / arrows · drive <span>Space · handbrake</span> <span>M · map</span></div>}
    {/* r2-places: capture place keys before mission handlers. */}
    <CityPlaces personaId={personaId} mapOpen={mapOpen && R.overview >= .999} closeMap={closeMap} onPlaceLesson={onPlaceLesson}/>
    <div className="c10-overlays">{children}</div>
    {showFooter && <small className="c10-disclosure">Synthetic demo crowd · not a forecast</small>}
    {mapOpen && R.overview < .999 && <div className="c10-overview" role="status"><small>YOUR CITY</small><strong>Overview</strong><span>Opening your city map</span><button onClick={() => { R.overview = 1; tick(t => t + 1); }}>Open map now</button></div>}
    {mapOpen && R.overview >= .999 && <CityMap full onClose={() => setMapOpen(false)} />}

  </section>;
}
