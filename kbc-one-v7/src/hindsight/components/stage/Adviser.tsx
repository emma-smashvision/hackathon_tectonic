"use client";

import { useEffect, useMemo, useState } from "react";
import { pct } from "../../engine/format";
import { allStops } from "../../engine/game";
import { statsFor } from "../../engine/simulate";
import type { StopDef } from "../../engine/types";
import { useStore } from "../store";
import { Icon } from "../ui";

export function Adviser() {
  const { road, journey, logAccess, newDriver } = useStore();
  const [sent, setSent] = useState(false);
  const name = newDriver ? "A new driver" : road.persona.name;

  useEffect(() => {
    logAccess({ who: "Adviser desk", reason: "scheduled call", roadId: road.id });
    // biome-ignore lint/correctness/useExhaustiveDependencies: log once per road opened
  }, [road.id]);

  const stops = allStops(road);
  const nextBump = road.stops.find((s) => s.kind === "bump" && s.month > journey.month) as StopDef | undefined;
  const helped = useMemo(() => {
    if (!nextBump) return [];
    const s = statsFor(road, nextBump);
    if (s.kind !== "bump") return [];
    return [...s.behaviours]
      .map((b) => ({ ...b, gap: (b.calm.value ?? 0) - (b.hit.value ?? 0) }))
      .sort((a, b) => b.gap - a.gap);
  }, [road, nextBump]);

  const doneList = Object.entries(journey.done).flatMap(([stopId, ids]) => {
    const st = road.stops.find((s) => s.id === stopId);
    if (!st) return [];
    return ids.map((id) => {
      const label = st.kind === "bump" ? st.behaviours?.find((b) => b.id === id)?.action.label : st.action?.label;
      return `${label ?? id} (${st.short})`;
    });
  });

  return (
    <div className="desk">
      <header className="desk-head">
        <div className="row gap center">
          <div className="kicker dark">KBC · ADVISER DESK</div>
          <h1 className="desk-title">
            Call with {name} · {road.name}
          </h1>
        </div>
        <div className="consent-pill">
          <Icon name="check" size={14} /> {name} shared their road for this call · they can see that you opened it
        </div>
      </header>

      <section className="desk-road">
        <div className="row between baseline">
          <div className="desk-road-title">
            Month {journey.month} of {road.months}
          </div>
          <div className="mono xs">{road.care ? "care road · no offers" : `${road.alumni.toLocaleString("en-GB")} drove it`}</div>
        </div>
        <div className="strip">
          <div className="strip-track" />
          <div className="strip-past" style={{ width: `${(journey.month / road.months) * 100}%` }} />
          <div className="strip-you" style={{ left: `${(journey.month / road.months) * 100}%` }} />
          {stops.map((s) => (
            <div key={s.id} className={`strip-stop kind-${s.kind}`} style={{ left: `${(s.month / road.months) * 100}%` }}>
              <span className="strip-dot" />
              <span className="strip-label">{s.short}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="desk-grid">
        <section className="desk-card">
          <h2>What people at this point call about</h2>
          {road.callReasons.map((c) => (
            <div key={c.q} className="stack-4">
              <div className="row between small">
                <span>“{c.q}”</span>
                <span className="mono">{pct(c.share)}</span>
              </div>
              <div className="bar-track light">
                <div className="bar navy" style={{ width: `${c.share * 100}%` }} />
              </div>
            </div>
          ))}
        </section>

        <section className="desk-card">
          <h2>What helped people like {name.split(" ")[0]}</h2>
          <div className="xs muted">
            {nextBump ? `Before “${nextBump.short}”, ranked by outcome, not by product` : "No bumps ahead on this road"}
          </div>
          <ol className="desk-list">
            {helped.map((h) => (
              <li key={h.id}>
                {h.label}
                <span className="muted">
                  {" "}
                  · {h.calm.value != null ? pct(h.calm.value) : "–"} of calm drivers vs {h.hit.value != null ? pct(h.hit.value) : "–"}
                </span>
              </li>
            ))}
          </ol>
          <div className="blocked-box">Blocked on this road: {road.blocked.join(", ")}.</div>
        </section>

        <section className="desk-card">
          <h2>What {name.split(" ")[0]} already did</h2>
          {doneList.length ? (
            <ul className="desk-list plain">
              {doneList.map((d) => (
                <li key={d}>
                  <Icon name="check" size={14} /> {d}
                </li>
              ))}
            </ul>
          ) : (
            <div className="small muted">Nothing yet. Prepare something on the phone and it appears here.</div>
          )}
          <div className="row gap wrap push-down">
            <button type="button" className={`btn small ${sent ? "done-dark" : "dark"}`} onClick={() => setSent(true)}>
              {sent ? "Summary sent to the app" : "Send the call summary"}
            </button>
            <button type="button" className="btn small outline-dark">
              Flag a missing bump
            </button>
          </div>
        </section>
      </div>
      <div className="xs muted-dark">
        Access log, visible to the customer in their passport: Adviser desk opened this road · reason: scheduled call.
      </div>
    </div>
  );
}
