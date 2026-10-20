"use client";

import { useState } from "react";
import { getRoad } from "../../engine/roads";
import { useStore } from "../store";
import { Icon } from "../ui";
import { BackBar } from "./StopView";

export function PassportView() {
  const { road, journey, access, newDriver } = useStore();
  const [hidden, setHidden] = useState(false);
  const [booked, setBooked] = useState(false);
  const driven = newDriver ? [] : road.persona.driven;

  return (
    <div className="screen detail">
      <BackBar to="today" />
      <div className="stack-6">
        <div className="kicker">YOUR HINDSIGHT PASSPORT</div>
        <h1 className="detail-title">{newDriver ? "You" : road.persona.name}'s roads</h1>
      </div>

      <div className="stamps">
        {driven.map((d) => {
          const r = getRoad(d.roadId);
          if (!r) return null;
          return (
            <div key={d.roadId} className="stamp" style={{ borderColor: r.hue, color: r.hue }}>
              <span className="stamp-name">{r.name}</span>
              <span className="mono xs">{d.year}</span>
            </div>
          );
        })}
        <div className="stamp current" style={{ borderColor: road.hue, color: road.hue }}>
          <span className="stamp-name">{road.name}</span>
          <span className="mono xs">on it now</span>
        </div>
      </div>

      {(road.care || booked) && (
        <section className="panel stack-8">
          <div className="panel-title">Talk to a person</div>
          <p className="small lh muted">
            Someone who has helped hundreds of people through {road.name.toLowerCase()} can call you. They'll see your road, if you allow it, so you don't have to explain everything again.
          </p>
          <button type="button" className={`btn ${booked ? "done" : "primary"}`} onClick={() => setBooked(true)} aria-pressed={booked}>
            {booked ? (
              <>
                <Icon name="check" size={16} /> Call requested for tomorrow morning
              </>
            ) : (
              "Request a quiet call"
            )}
          </button>
        </section>
      )}

      {journey.postcards.length > 0 && (
        <section className="stack-8">
          <div className="panel-title">Road log</div>
          {journey.postcards.map((p) => (
            <div key={p.stopId} className="postcard-row">
              <span className="mono xs">M{p.month}</span>
              <div>
                <div className="small">{p.title}</div>
                <div className="xs muted lh">{p.line}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="panel stack-8">
        <div className="panel-title">What Hindsight uses about you</div>
        <code className="pointer">{hidden ? "{ road: none }" : `{ road: "${road.id}", month: ${journey.month} }`}</code>
        <p className="xs muted lh">
          That's all. One pointer. Every number you see is about the crowd, never a guess about you. Your answers and notes are never linked to your name.
        </p>
        <button type="button" className="btn ghost" onClick={() => setHidden((h) => !h)} aria-pressed={hidden}>
          {hidden ? "Undo: put me back on this road" : "This isn't my road"}
        </button>
        {hidden && <div className="xs mint">Done. Your home goes back to plain banking until you say otherwise.</div>}
      </section>

      <section className="stack-8">
        <div className="panel-title">Who looked at my road</div>
        {access.length === 0 ? (
          <div className="xs muted">Nobody at KBC has opened your road.</div>
        ) : (
          access
            .filter((a) => a.roadId === road.id)
            .map((a) => (
              <div key={`${a.at}-${a.who}-${a.reason}`} className="postcard-row">
                <span className="mono xs">{a.at}</span>
                <div className="small">
                  {a.who} · <span className="muted">{a.reason}</span>
                </div>
              </div>
            ))
        )}
      </section>
    </div>
  );
}
