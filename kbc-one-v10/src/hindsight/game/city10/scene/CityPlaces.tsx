'use client';
// r2-places: the only city-specific adapter; the shared place UI has no engine dependency.
import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFrame } from '@react-three/fiber';
import type { Camera, Scene } from 'three';
import { PlaceView, placeIdForPlot, usePlaces, type PlaceLesson } from '@/one/places';
import { useCityEngine } from '../engine/runtime';
import { useMission } from '../missions/useMission';
import { placePad } from './placePad';
import './places-city.css';
export function CityPlaces({ personaId, mapOpen, closeMap, onPlaceLesson }: { personaId: string; mapOpen: boolean; closeMap: () => void; onPlaceLesson?: (lessonId: string) => void }) {
  const session = usePlaces();
  const { blocks, api, rt } = useCityEngine();
  const { controller } = useMission(personaId);
  const active = useRef(session?.activeId), blockedPad = useRef<string | null>(null);
  active.current = session?.activeId;
  const leave = useCallback(() => session?.open(null), [session?.open]);
  useEffect(() => {
    if (!session) return;
    const unsub = blocks.map(block => api.onEnter({ id: `place:${block.id}`, at: placePad(block), radius: 3.2 }, () => {
      const id = placeIdForPlot(block.plot.kind);
      if (!active.current && blockedPad.current !== id && !rt.current.frozen && !rt.current.shot) session.open(id);
    }));
    const timer = setInterval(() => {
      const block = blocks.find(b => placeIdForPlot(b.plot.kind) === blockedPad.current);
      if (block && !active.current && Math.hypot(api.car().pos.x - placePad(block).x, api.car().pos.z - placePad(block).z) > 6) blockedPad.current = null;
    }, 150);
    return () => { unsub.forEach(fn => fn()); clearInterval(timer); };
  }, [blocks, api, rt, session?.open]);
  useEffect(() => {
    const id = session?.activeId;
    if (!id) return;
    const block = blocks.find(b => placeIdForPlot(b.plot.kind) === id);
    if (!block) return;
    blockedPad.current = id;
    closeMap(); controller.roam();
    const pad = placePad(block);
    api.teleport(pad, Math.atan2(block.door.x - block.x, block.door.z - block.z));
    api.setWaypoint(null); api.freeze(true);
    // Swing smoothly after parking; reduced motion makes the same shot an immediate cut.
    rt.current.cameraCut = rt.current.reducedMotion;
    const from = { x: block.door.x + (block.door.x - block.x) * 1.6 + 16, z: block.door.z + (block.door.z - block.z) * 1.6 + 16 };
    const dx = from.x - block.x, dz = from.z - block.z, distance = Math.hypot(dx, dz);
    // Keep the destination in the exposed left side of the canvas beside the place view.
    const target = { x: block.x + dz / distance * 34, z: block.z - dx / distance * 34 };
    void api.cinematic({ target, from, ms: 3_600_000 });
    return () => { rt.current.cinematicFinish?.(); api.freeze(false); };
  }, [session?.activeId, session?.open, blocks, api, rt, closeMap, controller]);
  // Register before Missions mounts. The ref keeps this listener first when a place opens later.
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (!active.current) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); leave(); }
      else if (['m', 'M'].includes(e.key) && !(e.target instanceof HTMLElement && ['INPUT', 'SELECT'].includes(e.target.tagName))) { e.preventDefault(); e.stopImmediatePropagation(); }
    };
    window.addEventListener('keydown', keys, true);
    return () => window.removeEventListener('keydown', keys, true);
  }, [leave]);
  if (!session) return null;
  const goLesson = (lesson: PlaceLesson) => {
    if (onPlaceLesson && lesson.missionId) { leave(); rt.current.cinematicFinish?.(); onPlaceLesson(lesson.missionId); return; }
    const mission = controller.missions.find(m => m.lesson.id === lesson.missionId);
    leave();
    if (mission) { rt.current.cinematicFinish?.(); controller.roam(); controller.navigate(mission); }
  };
  const mapAside = mapOpen && typeof document !== 'undefined' ? document.querySelector('.c10-map aside') : null;
  return <>
    {mapAside && createPortal(<section className="r2-places-map" aria-label="Your places"><h3>Your places</h3>{session.places.map(place => <button key={place.id} onClick={() => session.open(place.id)} aria-label={`Go there: ${place.title}`}><strong>{place.title}</strong><small>{place.label}</small><span>Go there ↗</span></button>)}</section>, mapAside)}
    {session.activePlace && <PlaceView key={session.activePlace.id} place={session.activePlace} onClose={leave} onMoveToGoal={session.move} onLesson={onPlaceLesson || (typeof document !== 'undefined' && document.querySelector('[data-mission-phase]')) ? goLesson : undefined}/>}
  </>;
}

/** r2-places: run after Player's road camera so a parked shot looks at the building, not its asphalt. */
export function CityPlaceCamera() {
  const session = usePlaces(), { rt } = useCityEngine();
  const heights = { home: 14, car: 4, savings: 17, pension: 20, business: 12, kids: 12 };
  useFrame(({ camera, scene }) => {
    if (session?.activeId && rt.current.shot && !rt.current.mapOpen) {
      camera.lookAt(rt.current.shot.target.x, heights[session.activeId], rt.current.shot.target.z);
    }
    // Reuse the engine's opt-in debug surface for deterministic pointer projection in browser checks.
    const debug = (window as unknown as { __city10?: { view?: { camera: Camera; scene: Scene } } }).__city10;
    if (debug && !debug.view) debug.view = { camera, scene };
  });
  return null;
}
