"use client";

import { useEffect, useRef, useState } from "react";
import { gateCount, gateNumber } from "../../hindsight/engine/gate";
import { POPULATION, runPlacement } from "../../hindsight/engine/placement";
import type { PlacementResult } from "../../hindsight/engine/placement";
import "./atlas8.css";

/** Technical run measurements use the processed population as their gate denominator. */
export function scaleMeasurements(processed: number, elapsedMs: number, result: PlacementResult | null) {
  return {
    processed: gateCount("atlas-scale:processed", processed),
    elapsed: gateNumber("atlas-scale:elapsed-seconds", elapsedMs / 1000, processed, .01),
    shared: gateNumber("atlas-scale:shared-road-views", result?.pointers ?? 0, result ? POPULATION : 0, 1),
    matched: gateCount("atlas-scale:matched", result?.placed ?? 0),
    everyday: gateCount("atlas-scale:everyday", result?.quiet ?? 0),
    progress: gateNumber("atlas-scale:progress", processed / POPULATION, processed, .01),
  };
}
export function ScaleAtlas() {
  const [processed, setProcessed] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(false);
  const start = useRef(0);
  const active = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setElapsed(performance.now() - start.current), 80);
    return () => clearInterval(timer);
  }, [running]);
  const run = async () => {
    if (active.current) return;
    active.current = true; start.current = performance.now();
    setRunning(true); setResult(null); setProcessed(0); setElapsed(0); setError(false);
    try {
      const next = await runPlacement(done => { if (mounted.current) setProcessed(done); });
      if (mounted.current) { setResult(next); setElapsed(performance.now() - start.current); }
    } catch { if (mounted.current) setError(true); }
    finally { active.current = false; if (mounted.current) setRunning(false); }
  };
  const shown = scaleMeasurements(processed, elapsed, result);
  const population = gateCount("atlas-scale:population", POPULATION);
  const populationLabel = population.value === null ? "the" : `${(population.value / 1_000_000).toFixed(1)}M`;
  return <section className="a8-scale" aria-label="Synthetic customer scale proof">
    <header><span className="a8-scale-tag">Presenter · synthetic demonstration</span><h2 className="a8-scale-title">Shared calculations,<br />small pointers.</h2><p>Many people share the same road ahead. Calculate each road view once, then give each person a small pointer.</p></header>
    <div className="a8-scale-diagram" aria-hidden="true"><div className="a8-population">{Array.from({length: 35}, (_,i) => <i key={i} />)}</div><span>→</span><div className="a8-shared"><i /><i /><i /></div></div>
    <button type="button" className="a8-scale-run" disabled={running} onClick={run}>{running ? "Placing synthetic customers…" : `Place ${populationLabel} synthetic customers`}</button>
    <p className="a8-scale-caveat">Runs live in this browser. Synthetic matching rules only; a customer still confirms their own situation.</p>
    <div className="a8-scale-progress" role="progressbar" aria-label="Synthetic placement progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={shown.progress.value === null ? undefined : Math.round(shown.progress.value * 100)}><span style={{width: `${(shown.progress.value ?? 0) * 100}%`}} /></div>
    <div className="a8-scale-metrics" aria-live="polite" aria-busy={running}>
      <div><strong>{shown.processed.value === null ? "—" : `${(shown.processed.value / 1_000_000).toFixed(2)}M`}</strong><span>Synthetic customers processed</span></div>
      <div><strong>{shown.elapsed.value === null ? "—" : `${shown.elapsed.value.toFixed(2)} s`}</strong><span>Elapsed time, including UI pauses</span></div>
      <div><strong>{shown.shared.value === null ? "—" : shown.shared.value.toLocaleString("en-GB")}</strong><span>Shared road views</span></div>
    </div>
    {result && <div className="a8-scale-result" role="status"><strong>Live run complete</strong><p>{shown.matched.value?.toLocaleString("en-GB") ?? "Withheld"} synthetic life-road candidates. {shown.everyday.value?.toLocaleString("en-GB") ?? "Withheld"} remain on Everyday.</p><p>Shared views count occupied road/month slots, including unpublished candidates. This benchmark does not publish their insights or confirm anyone’s road.</p></div>}
    {error && <p role="alert">The run could not finish. Try the live placement again.</p>}
    <footer>All displayed measurements pass the crowd gate. Small samples stay private. Synthetic data only.</footer>
  </section>;
}
