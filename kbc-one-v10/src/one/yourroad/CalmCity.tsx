"use client";
// r2-road: real city engine, without manual controls or mandatory quizzes.
import { Canvas } from "@react-three/fiber";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CityApiContext } from "../../hindsight/game/city10/api";
import { CityEngineContext, createEngine } from "../../hindsight/game/city10/engine/runtime";
import { NightCity, NightCar } from "../../hindsight/game/city10/scene/NightCity";
import { Player } from "../../hindsight/game/city10/drive/Player";
import { GpsLine } from "../../hindsight/game/city10/map/GpsLine";
import { PEOPLE } from "../people";
import { buildPlaces, createDemoState, PlaceView, type PlaceId } from "../places";
import { lessonsFor } from "../learning/lessons";
import { villageFor, useVillageProgress } from "../village";
import type { CityExperienceProps } from "../CityExperience";
import "./calmCity.css";
class CalmSceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function CalmCity({ personaId, focusLessonId, onExit }: CityExperienceProps) {
  const engine = useMemo(() => createEngine(villageFor(personaId)), [personaId]);
  const progress = useVillageProgress(personaId);
  const places = useMemo(() => buildPlaces(PEOPLE[personaId], createDemoState(PEOPLE[personaId])), [personaId]);
  const [placeId, setPlaceId] = useState<PlaceId>();
  const place = places.find(p => p.id === placeId);
  const closePlace = useCallback(() => setPlaceId(undefined), []);
  const lessons = lessonsFor(personaId);
  const [lessonId, setLessonId] = useState(focusLessonId ?? lessons[0]?.id);
  const lesson = lessons.find(l => l.id === lessonId);
  const [destination, setDestination] = useState("Home");
  const [travelling, setTravelling] = useState(false);
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState(0);
  const [saved, setSaved] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    lastFocus.current = document.activeElement as HTMLElement;
    root.current?.focus();
    const background = document.querySelector<HTMLElement>("main.stage");
    const wasInert = background?.inert ?? false;
    if (background) background.inert = true;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => { engine.rt.current.reducedMotion = media.matches; };
    motion(); media.addEventListener("change", motion);
    const timer = setInterval(() => { if (!engine.rt.current.autopilot) setTravelling(false); }, 250);
    return () => { if (background) background.inert = wasInert; clearInterval(timer); media.removeEventListener("change", motion); engine.api.setAutopilot(null); lastFocus.current?.focus(); };
  }, [engine]);
  const destinations = [
    { label: "Home", point: engine.api.home() },
    { label: "Savings", point: engine.blocks.find(b => b.id === `${personaId}:savings`)?.door ?? engine.api.pointOn("everyday-only", .12).pos },
    { label: "Everyday", point: engine.api.pointOn("everyday-only", .24).pos },
    ...(PEOPLE[personaId].world?.pension || PEOPLE[personaId].household.incomes.some(i => i.id === "pension") ? [{ label: "Pension", point: engine.blocks.find(b => b.id === `${personaId}:pension`)?.door ?? engine.api.home() }] : []),
  ];
  const go = (label: string, point: { x: number; z: number }) => {
    setDestination(label);
    setPlaceId(label === "Home" ? "home" : label === "Savings" ? "savings" : label === "Pension" ? "pension" : undefined);
    if (engine.rt.current.reducedMotion) { engine.api.teleport(point); setTravelling(false); }
    else { engine.api.setAutopilot(point); setTravelling(true); }
    setRoute(r => r + 1);
  };
  return <div className="r2-calm-city" role="dialog" aria-modal="true" aria-label="Your city · Calm mode" ref={root} tabIndex={-1} onKeyDown={event => {
    if (event.key === "Escape") { event.stopPropagation(); onExit(); }
    if (event.key === "Tab") {
      const buttons = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select, input, [tabindex="0"]') ?? []);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <header><div><span>Your city</span><h1>Calm mode</h1></div><button onClick={onExit}>Back to app</button></header>
    <div className="r2-calm-layout">
      <section className="r2-calm-scene" aria-label="Your city on autopilot">
        <CityApiContext.Provider value={engine.api}><CityEngineContext.Provider value={engine}>
          <CalmSceneBoundary fallback={<p className="r2-calm-fallback">The city view is unavailable. Your destinations and lessons are still here.</p>}>
            <Canvas dpr={[1, 1.25]} camera={{ fov:58, near:.1, far:2400, position:[0,15,0] }} gl={{ antialias:false, powerPreference:"high-performance" }}><CityApiContext.Provider value={engine.api}><CityEngineContext.Provider value={engine}><NightCity personaId={personaId}/><Player onReady={onReady}><NightCar/></Player><GpsLine version={route}/></CityEngineContext.Provider></CityApiContext.Provider></Canvas>
          </CalmSceneBoundary>
        </CityEngineContext.Provider></CityApiContext.Provider>
        <div className="r2-calm-location" role="status">{travelling ? `Taking you to ${destination}…` : destination}<small>{travelling ? "You can stop or arrive now." : ready ? "Choose a place. We’ll take you there." : "Your city is opening…"}</small></div>
      </section>
      <div className="r2-calm-panel">
        <h2>Where would you like to go?</h2><p>No steering needed. Take your time.</p>
        <nav aria-label="Autopilot destinations">{destinations.map(d => <button key={d.label} aria-pressed={destination === d.label} onClick={() => go(d.label, d.point)}>Go to {d.label}<span aria-hidden="true">→</span></button>)}</nav>
        {travelling && <div className="r2-calm-travel"><button onClick={() => { engine.api.setAutopilot(null); setTravelling(false); }}>Stop here</button><button onClick={() => { const point = destinations.find(d => d.label === destination)?.point; if (point) engine.api.teleport(point); setTravelling(false); }}>Arrive now</button></div>}
        {personaId === "nadia" && <p className="r2-calm-care">Your care road stays in Your road, where you choose what to read.</p>}
        {place && !travelling && <div className="r2-calm-place"><PlaceView key={place.id} place={place} embedded onClose={closePlace} closeLabel="Close place"/></div>}
        {!place && lessons.length > 1 && <label className="r2-calm-select">Your lesson<select value={lessonId} onChange={e => { setLessonId(e.target.value); setSaved(false); }}>{lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></label>}
        {!place && lesson && <article className="r2-calm-lesson" aria-label="Plain mission card"><span>One useful step</span><h2>{lesson.title}</h2><p>{lesson.reveal.headline}</p>{lesson.reveal.detail && <p>{lesson.reveal.detail}</p>}<p>{lesson.apply.explain}</p>{lesson.save && <button disabled={saved || progress.saved.includes(lesson.save.id)} onClick={() => { progress.save(lesson.save!.id); setSaved(true); }}> {saved || progress.saved.includes(lesson.save.id) ? "Step saved ✓" : lesson.save.label}</button>}<button disabled={progress.done.includes(lesson.id)} onClick={() => progress.complete(lesson.id)}>{progress.done.includes(lesson.id) ? "Prepared ✓" : "Mark as read"}</button></article>}
      </div>
    </div>
    <footer>Your demo numbers · Synthetic demo crowd · not a forecast</footer>
  </div>;
}
