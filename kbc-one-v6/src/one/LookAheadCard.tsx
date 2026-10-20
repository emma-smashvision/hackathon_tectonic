"use client";

// KBC One · on the Home: when KBC notices something that changes the road (a move the customer
// told us about, a crossroads coming up, an unprepared bump, a road they're about to enter),
// one card offers the driving world. It never opens by itself. Lives inside Kate's phone (.ph).

import { useState } from "react";
import { potHint } from "../hindsight/components/phone/TodayView";
import { useStore } from "../hindsight/components/store";
import { stopOf } from "../hindsight/engine/life";
import type { StopDef } from "../hindsight/engine/types";
import { Icon } from "../kbc/ui/icons";
import { PEOPLE } from "./people";
import { lookAhead } from "./road";

export function LookAheadCard({ large, onFlash }: { large: boolean; onFlash: (text: string) => void }) {
  const s = useStore();
  const [hidden, setHidden] = useState(false);
  const p = s.person ? PEOPLE[s.person.key] : undefined;
  if (!p || hidden || s.view === "city") return null;
  const la = lookAhead(p, s.road, s.journey, s.life, { large });
  if (!la) return null;
  const tip = la.tip;
  const tipOn = tip ? (s.journey.done[tip.key] ?? []).includes(tip.id) : false;
  const tipStop = tip ? (s.life.upcoming.find((u) => u.ref.key === tip.key)?.ref ?? null) : null;
  const stop = tipStop ? (stopOf(s.road, tipStop) as StopDef | undefined) : undefined;
  const hint = tip && stop ? potHint(s.road.id, stop, tip.id) : null;
  return (
    <section className={`intent road-intent kind-${la.kind}`} aria-label="Your road ahead">
      <div className="k">
        <span>
          <Icon name="road" size={13} /> {la.kicker}
        </span>
      </div>
      <h3>{la.title}</h3>
      <p className="road-line">{la.line}</p>
      <div className="road-acts">
        <button type="button" className="btn" style={{ flex: 1 }} onClick={() => s.testDrive(la.drive.roadId, la.drive.month)}>
          {la.button}
        </button>
        <button type="button" className="btn sec" onClick={() => setHidden(true)}>
          Not now
        </button>
      </div>
      {tip && (
        <button
          type="button"
          className={`road-tip ${tipOn ? "on" : ""}`}
          onClick={() => {
            s.toggleAction(tip.key, tip.id);
            onFlash(tipOn ? `Stopped: ${tip.label}` : `${tip.label}${hint ? ` · ${hint}` : ""}`);
          }}
        >
          <span className="road-tip-ic">{tipOn ? <Icon name="check" size={15} /> : <Icon name="plus" size={15} />}</span>
          <span className="grow">
            <b>{tip.label}</b>
            {hint && <span className="road-tip-hint">{tipOn ? "Started. It paves the bump on your road." : `One tap: ${hint}`}</span>}
          </span>
        </button>
      )}
    </section>
  );
}
