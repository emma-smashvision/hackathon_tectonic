"use client";

import { useMemo, useState } from "react";
import { int } from "../../engine/format";
import { checkNote, NOTE_MAX } from "../../engine/moderation";
import { getRoad } from "../../engine/roads";
import { useStore } from "../store";
import { Icon } from "../ui";
import { BackBar } from "./StopView";

interface Target {
  key: string;
  roadId: string;
  stopId: string | null;
  label: string;
  audience: string;
}

export function NotesView() {
  const { road, journey, myNotes, addMyNote, updateMyNote, newDriver } = useStore();
  const persona = road.persona;
  const targets = useMemo<Target[]>(() => {
    const t: Target[] = road.stops
      .filter((s) => s.month <= journey.month)
      .map((s) => ({
        key: `${road.id}:${s.id}`,
        roadId: road.id,
        stopId: s.id,
        label: `${s.short} · ${road.name}`,
        audience: `${int(Math.round(road.current * (1 - s.month / road.months)))} people still have this ahead`,
      }))
      .reverse();
    if (!newDriver)
      for (const d of persona.driven) {
        const r = getRoad(d.roadId);
        if (r)
          t.push({
            key: `${r.id}:road`,
            roadId: r.id,
            stopId: null,
            label: `${r.name} · finished ${d.year}`,
            audience: `${int(r.current)} people are on this road now`,
          });
      }
    return t;
  }, [road, journey.month, persona.driven, newDriver]);
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const target = targets.find((t) => t.key === targetKey) ?? targets[0];
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checks = checkNote(text);
  const ok = checks.every((c) => c.pass);

  const send = async () => {
    if (!target || !ok) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roadId: target.roadId, stopId: target.stopId, text }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error ?? "Could not send the note.");
        return;
      }
      const id = data.id;
      addMyNote({ id, roadId: target.roadId, stopId: target.stopId, text, status: "review", createdAt: Date.now() });
      setText("");
      window.setTimeout(async () => {
        try {
          const r = await fetch(`/api/notes?road=${encodeURIComponent(target.roadId)}`, { cache: "no-store" });
          const list = (await r.json()) as { notes: { id: string }[] };
          if (list.notes.some((n) => n.id === id)) updateMyNote(id, { status: "live" });
        } catch {
          /* stays in review */
        }
      }, 5500);
    } catch {
      setError("You seem to be offline.");
    } finally {
      setSending(false);
    }
  };

  const earlier = !newDriver && persona.driven.length ? getRoad(persona.driven[0].roadId) : undefined;

  return (
    <div className="screen detail">
      <BackBar />
      <div className="stack-6">
        <div className="kicker mint">PASS IT ON</div>
        <h1 className="detail-title">Someone behind you is about to hit what you just passed.</h1>
      </div>

      {targets.length === 0 ? (
        <div className="panel small lh">
          You haven't passed a stop yet. Once you do, you can leave one line for the people behind you.
        </div>
      ) : (
        <>
          <div className="stack-8">
            <div className="xs muted">Leave a line about</div>
            <div className="chips-wrap">
              {targets.map((t) => (
                <button key={t.key} type="button" className={`chip-btn ${t.key === target?.key ? "on" : ""}`} aria-pressed={t.key === target?.key} onClick={() => setTargetKey(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
            {target && <div className="xs muted">{target.audience}</div>}
          </div>
          <div className="stack-8">
            <label htmlFor="note" className="small lh">
              One line. What do you wish someone had told you?
            </label>
            <textarea
              id="note"
              rows={3}
              maxLength={NOTE_MAX + 20}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Photograph the meter on the day you get the keys."
              className="note-input"
            />
            <div className="chips-wrap">
              {checks.map((c) => (
                <span key={c.id} className={`check-chip ${text ? (c.pass ? "ok" : "bad") : ""}`}>
                  {text && c.pass && <Icon name="check" size={12} />}
                  {c.label}
                </span>
              ))}
              <span className="check-chip">A person reviews it first</span>
            </div>
            {error && <div className="error-line">{error}</div>}
          </div>
          <button type="button" className="btn primary" disabled={!ok || sending} onClick={send}>
            {sending ? "Sending…" : "Leave it on the road"}
          </button>
        </>
      )}

      <div className="stack-8 push-down">
        {myNotes.map((n) => (
          <figure key={n.id} className={`note-card ${n.status === "live" ? "" : "outline"}`}>
            <blockquote>“{n.text}”</blockquote>
            <figcaption>
              <span>{getRoad(n.roadId)?.name}</span>
              <span className="mono">{n.status === "live" ? "live on the road" : "with a reviewer"}</span>
            </figcaption>
          </figure>
        ))}
        {earlier && earlier.stops[0] && (
          <>
            <div className="xs muted">Your note from {persona.driven[0].year}</div>
            <figure className="note-card">
              <blockquote>“{earlier.stops[0].notes[0].text}”</blockquote>
              <figcaption>
                <span>
                  Shown at {earlier.name} · {earlier.stops[0].short}
                </span>
                <span className="mono">{int(2418)} found it useful</span>
              </figcaption>
            </figure>
          </>
        )}
      </div>
    </div>
  );
}
