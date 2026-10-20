"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "../../components/store";
import { whenLabel } from "../../engine/plan";
import type { Input } from "../driving";
import { useGame } from "../runtime";
import { CarePanel, CompletePanel, EverydayPanel, ForkPanel, StopPanel } from "./Panels";
import { PlacePanel } from "./PlacePanel";
import { CityIntro } from "./CityIntro";
import { MinorStopToast } from "./MinorStopToast";
import { DrivingPad } from "./DrivingPad";
import { MapGatePanel } from "./MapGatePanel";
import { useCityControls } from "./useCityControls";
import { useCitySession } from "./CitySession";
import { majorStops, trackReady } from "../../../one/roadmap/model";

const KEYMAP: Record<string, keyof Input> = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", Space: "brake" };

export function Hud() {
  const { hud, panel, setPanel, rt, places, travelTo } = useGame();
  const s = useStore();
  const api = useCityControls();
  const session = useCitySession();
  const exiting = session?.exiting ?? s.exitAsk;
  const requestExit = session?.requestExit ?? s.requestExit;
  const introKey = `kbcone.v71.city-intro.${s.person?.key ?? s.road.id}`;
  const [intro, setIntro] = useState(() => { try { return localStorage.getItem(introKey) !== "seen"; } catch { return true; } });
  const [celebration, setCelebration] = useState<string | null>(null);
  const [startedTracks, setStartedTracks] = useState<Set<string>>(() => new Set());
  useEffect(() => { if (api.currentTrackId) setStartedTracks((visited) => new Set(visited).add(api.currentTrackId!)); }, [api.currentTrackId]);
  const previousReady = useRef<Record<string, number>>({});
  const closeIntro = () => { api.releaseInput(); setIntro(false); try { localStorage.setItem(introKey, "seen"); } catch { /* Optional memory. */ } };
  const suggestedNext = api.nextGate ?? api.roadmap.tracks.flatMap((track) => track.stops).find((stop) => stop.id === api.roadmap.nextUp?.stopId);
  const tracks = api.roadmap.tracks.filter((track) => track.status !== "possible").sort((a, b) => Number(b.id === api.currentTrackId || b.id === api.roadmap.nextUp?.trackId) - Number(a.id === api.currentTrackId || a.id === api.roadmap.nextUp?.trackId)).slice(0, 3);
  const firstRoad = tracks[0];
  const next = suggestedNext ?? (firstRoad ? majorStops(firstRoad).find((stop) => stop.state !== "done" && stop.state !== "locked") : null);
  const possibleTracks = api.roadmap.tracks.filter((track) => track.status === "possible");
  const latest = useRef({ api, intro, panel, exitAsk: exiting, closeIntro, requestExit });
  latest.current = { api, intro, panel, exitAsk: exiting, closeIntro, requestExit };
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const current = latest.current;
      const target = event.target as HTMLElement;
      if (event.defaultPrevented || target.closest("input,textarea,select,[contenteditable=true]")) return;
      if (event.key === "Escape") { if (current.intro) current.closeIntro(); else if (!current.exitAsk) { if (current.panel) current.api.dismissGate(); else current.requestExit(); } return; }
      if (current.intro || current.panel || current.exitAsk) return;
      const key = KEYMAP[event.code];
      if (key && !(event.code === "Space" && target.closest("button"))) { event.preventDefault(); current.api.setInput({ [key]: true }); }
    };
    const up = (event: KeyboardEvent) => { const key = KEYMAP[event.code]; if (key) latest.current.api.setInput({ [key]: false }); };
    const release = () => latest.current.api.releaseInput();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", release);
    return () => { release(); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", release); };
  }, []);
  useEffect(() => {
    rt.current.paused = intro || !!panel || exiting;
    if (rt.current.paused) latest.current.api.releaseInput();
  }, [intro, panel, exiting, rt]);
  const readinessKey = JSON.stringify(api.roadmap.tracks.map((track) => [track.id, trackReady(track)]));
  useEffect(() => {
    const progress = api.roadmap.tracks.map((track) => ({ id: track.id, title: track.title, ready: trackReady(track) }));
    session?.updateRoads(progress);
    for (const track of progress) {
      const before = previousReady.current[track.id];
      if (before !== undefined && before < 100 && track.ready === 100) setCelebration(track.title);
    }
    previousReady.current = Object.fromEntries(progress.filter((track) => track.ready !== null).map((track) => [track.id, track.ready!]));
    // Snapshot values, not the runtime's render identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readinessKey]);
  useEffect(() => { if (celebration) { const timer = window.setTimeout(() => setCelebration(null), 5000); return () => window.clearTimeout(timer); } }, [celebration]);
  return <div className={`hud city-simple city-v71 ${panel ? "has-sheet" : ""} ${exiting ? "is-exiting" : ""}`}>
    <div className="city-title" data-hud><strong>Your city · {s.person?.persona.name ?? s.road.persona.name}</strong><span>Get each road ready before its date.</span></div>
    <div className="city-top-actions" data-hud><button type="button" className="city-help" aria-label="How your city works" onClick={() => { setPanel(null); setIntro(true); }}>?</button><button type="button" className="btn city-back" onClick={requestExit}>← Back to the app</button></div>
    {!intro && !exiting && <>
      <nav className="city-roads" aria-label="Your roads" data-hud><h2>Your roads <span>Tap to drive there</span></h2>
        {tracks.map((track) => {
          const ready = trackReady(track);
          const stops = majorStops(track);
          const stop = (api.currentTrackId === track.id && api.nextGate?.trackId === track.id ? api.nextGate : null) ?? stops.find((item) => item.ready < 100 && item.state !== "locked" && item.state !== "done") ?? stops.find((item) => ["next", "ready", "later"].includes(item.state));
          return <button key={track.id} type="button" className={`city-road ${api.currentTrackId === track.id ? "selected" : ""}`} aria-label={`${track.title}, ${ready === null ? "Done" : `${ready}% ready`}. Drive there`} onClick={() => api.goToTrack(track.id)}>
            <span className="city-ready-ring" style={{ background: `conic-gradient(${ready === 100 ? "#6fe0b5" : "#54caff"} ${ready ?? 0}%, #294057 0)` }}><b>{ready === null ? "✓" : `${ready}%`}</b></span>
            <span className="city-road-copy"><strong>{track.title}</strong><span>{ready === null ? "Done ✓" : `${stop ? whenLabel(stop.when) : "Your plans"} · ${ready === 100 ? "Ready" : "Get ready"}`}</span><small>{startedTracks.has(track.id) ? (stop ? `Next: ${stop.title} · ${whenLabel(stop.when)}` : "All stops are ready") : track.origin.text}</small></span>
          </button>;
        })}
        {possibleTracks.length > 0 && <div className="city-try-roads"><h3>Try another road</h3>{possibleTracks.map((track) => <button type="button" key={track.id} onClick={() => api.goToTrack(track.id)} aria-label={`${track.title}. Try it`}><span>{track.title}</span><b>Try it ↗</b></button>)}</div>}
      </nav>
      {!panel && <>
        {next && <button type="button" className="city-next-gate" data-hud onClick={() => api.goToStop(next.id)}><span aria-hidden="true">↗</span><span><small>{!suggestedNext ? "Tap to start driving" : hud.autopilot ? "On the way to your gate" : "Next gate · tap to go"}</small><strong>{!suggestedNext ? `Drive your ${firstRoad.title} →` : next.title}</strong></span></button>}
      </>}
      <DrivingPad compact={!!panel} setInput={(input) => { if (panel && Object.values(input).some(Boolean)) api.dismissGate(); api.setInput(input); }} releaseInput={api.releaseInput} />
      {!panel && hud.place && <button type="button" className="btn city-open-place" data-hud onClick={() => setPanel({ type: "place", id: hud.place!.id })}>Open {places.find((place) => place.id === hud.place?.id)?.title ?? "this place"}</button>}
      {!panel && !api.currentTrackId && <button type="button" className="city-neighbourhood" data-hud onClick={() => travelTo({ kind: "place", id: "home" })}>⌂ Your neighbourhood</button>}
      <MinorStopToast />
      <MapGatePanel />
      {panel?.type === "stop" && <StopPanel stopKey={panel.key} />}
      {panel?.type === "fork" && <ForkPanel roadId={panel.roadId} />}
      {panel?.type === "care" && <CarePanel roadId={panel.roadId} />}
      {panel?.type === "complete" && <CompletePanel roadId={panel.roadId} />}
      {panel?.type === "everyday" && <EverydayPanel stopKey={panel.key} />}
      {(panel?.type === "place" || panel?.type === "journey") && <PlacePanel placeId={panel.id} journey={panel.type === "journey"} />}
    </>}
    {celebration && !intro && !exiting && <div className="city-celebration" role="status" data-hud><span aria-hidden="true">✦ ✓ ✦</span><strong>{celebration} is 100% ready!</strong><span>Your plan is ready for the date.</span><div className="city-confetti" aria-hidden="true">{Array.from({length: 9}, (_, i) => <i key={i} style={{left: `${i * 12}%`, animationDelay: `${i * 70}ms`}} />)}</div></div>}
    {intro && !exiting && <CityIntro onClose={closeIntro} />}
  </div>;
}
