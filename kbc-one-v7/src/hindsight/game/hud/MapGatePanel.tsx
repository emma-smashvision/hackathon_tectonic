"use client";

import { useEffect, useRef } from "react";
import { useStore } from "../../components/store";
import { whenLabel } from "../../engine/plan";
import { useCityControls } from "./useCityControls";

export function MapGatePanel() {
  const api = useCityControls();
  const store = useStore();
  const minorGate = api.currentGate?.weight === "minor";
  const gate = minorGate ? null : api.currentGate;
  const childRoads = gate ? api.roadmap.tracks.filter((track) => track.fromStopId === gate.id) : [];
  const fork = api.currentFork;
  const forkStop = fork ? api.roadmap.tracks.flatMap((track) => track.stops).find((stop) => stop.id === fork.id) : null;
  const ref = useRef<HTMLElement>(null);
  const id = gate?.id ?? fork?.id;
  useEffect(() => { if (id) ref.current?.focus(); }, [id]);
  // Runtime also passes minor stops without pausing. Guard stale/explicit focus here.
  useEffect(() => { if (minorGate) api.dismissGate(); }, [minorGate, api.dismissGate]);
  if (!gate && !fork) return null;
  return <section ref={ref} tabIndex={-1} className="sheet city-gate" role="dialog" aria-label={gate?.title ?? fork?.title} data-hud>
    <div className="city-gate-heading"><div><span>{gate ? `${whenLabel(gate.when)} · ${gate.ready}% ready` : "Choose a road to explore"}</span><h2>{gate?.title ?? fork?.title}</h2></div><button type="button" className="icon-btn" aria-label="Close gate" onClick={api.dismissGate}>×</button></div>
    {gate ? <>
      <p>{gate.detail}</p>
      {gate.product && <p className="city-gate-product">Your product · {gate.product}</p>}
      <div className="city-gate-actions">{gate.actions.map((action) => {
        const done = store.plan.some((item) => item.id === action.pick.id);
        return <button type="button" key={action.pick.id} className={`btn ${done ? "is-ready" : "primary"}`} disabled={done || gate.state === "locked"} onClick={() => api.prepare(gate.id, action.pick.id)}>{done ? `✓ ${action.label}` : action.label}</button>;
      })}</div>
      {childRoads.length > 0 && <div className="city-gate-actions">{childRoads.map((track) => <button type="button" className="btn primary" key={track.id} onClick={() => api.goToTrack(track.id)}>Take the {track.title.toLowerCase()} road</button>)}</div>}
      <p className="city-gate-note" aria-live="polite">{gate.ready === 100 ? "This gate is ready. Your steps are in your plan." : gate.state === "locked" ? "Choose the road at the crossing first." : !gate.actions.length ? "This is where a road starts. Follow it to find the steps to prepare." : "Each step is saved in your plan. You can change it in the app."}</p>
      <button type="button" className="btn ghost" onClick={api.dismissGate}>{gate.ready === 100 ? "Continue on this road" : "Keep exploring"}</button>
    </> : fork && <><p>{fork.question}</p><div className="city-gate-actions">{forkStop?.actions.map((action) => { const done = store.plan.some((item) => item.id === action.pick.id); return <button type="button" key={action.pick.id} className={`btn ${done ? "is-ready" : "primary"}`} disabled={done} onClick={() => api.prepare(fork.id, action.pick.id)}>{done ? `✓ ${action.label}` : action.label}</button>; })}</div><p className="city-gate-note">Explore a branch to see its steps. Your plan stays yours to choose.</p><div className="city-gate-actions">{fork.branches.map((branch) => <button type="button" key={branch.id} className="btn primary" onClick={() => api.chooseBranch(fork.id, branch.id)}>{branch.label}{branch.chosen ? " ✓" : ""}</button>)}</div></>}
  </section>;
}
