"use client";

import { useEffect, useRef } from "react";
import { useStore } from "../hindsight/components/store";
import { MONTH_LONG } from "../hindsight/engine/everyday";
import type { RoadProgress } from "../hindsight/game/hud/CitySession";

export function TripDebrief({ month, startPlanIds = [], startRoads = [], roads = [], onDone }: {
  month: string; startPlanIds?: string[]; startRoads?: RoadProgress[]; roads?: RoadProgress[];
  onDone: (kept: boolean, count: number) => void;
}) {
  const s = useStore();
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { button.current?.focus(); }, []);
  const prepared = s.plan.filter((item) => !startPlanIds.includes(item.id));
  const saved = s.glovebox.filter((item) => !s.plan.some((plan) => plan.id === item.id));
  const moved = roads.flatMap((road) => {
    const before = startRoads.find((item) => item.id === road.id)?.ready;
    return before !== undefined && before !== null && road.ready !== null && road.ready > before ? [{ ...road, before }] : [];
  });
  return <div className="debrief city-debrief" role="dialog" aria-modal="true" aria-labelledby="city-debrief-title" onKeyDown={(event) => { if (event.key === "Tab") { event.preventDefault(); button.current?.focus(); } }}>
    <div className="city-debrief-heading"><span aria-hidden="true">✓</span><div><h2 id="city-debrief-title">{prepared.length || saved.length ? "A little more ready." : "Your city, at your pace."}</h2><p>Your dates stay the same. You are still in {month}.</p></div></div>
    <div className="city-debrief-content"><section><h3>What you prepared</h3>{prepared.length || saved.length ? <ul>{prepared.map((item) => <li key={item.id}>✓ {item.title}</li>)}{saved.map((item) => <li key={item.id}>{item.spec.title} <small>Saved with your plan when you return</small></li>)}</ul> : <p>No new steps this time. Tap a gate next time to get ready.</p>}</section>
    <section><h3>Which roads moved</h3>{moved.length ? <ul>{moved.map((road) => <li className="city-debrief-road" key={road.id}><span>{road.title}</span><strong>{road.before}% → {road.ready}% ready</strong></li>)}</ul> : <p>Your roads have the same readiness as before.</p>}</section></div>
    <div className="city-debrief-footer"><p>Your steps are in your plan. You can review or change them in the app.</p><button ref={button} type="button" className="btn primary" onClick={() => { s.finishTrip(saved.map((pick) => ({ pick }))); onDone(prepared.length + saved.length > 0, prepared.length + saved.length); }}>Back to the app</button></div>
  </div>;
}

export const monthName = (month: number) => MONTH_LONG[month];
