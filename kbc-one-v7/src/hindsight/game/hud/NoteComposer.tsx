"use client";

import { useState } from "react";
import { checkNote, NOTE_MAX } from "../../engine/moderation";
import { useStore } from "../../components/store";
import { Icon } from "../../components/ui";

/** Leave one line for the drivers behind you. Moderated here and again on the server. */
export function NoteComposer({ roadId, stopId, prompt }: { roadId: string; stopId: string | null; prompt: string }) {
  const { addMyNote, updateMyNote, myNotes } = useStore();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checks = checkNote(text);
  const ok = checks.every((c) => c.pass);
  const mine = myNotes.filter((n) => n.roadId === roadId && n.stopId === stopId);

  const send = async () => {
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roadId, stopId, text }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error ?? "Could not send the note.");
        return;
      }
      const id = data.id;
      addMyNote({ id, roadId, stopId, text, status: "review", createdAt: Date.now() });
      setText("");
      window.setTimeout(async () => {
        try {
          const r = await fetch(`/api/notes?road=${encodeURIComponent(roadId)}`, { cache: "no-store" });
          const list = (await r.json()) as { notes: { id: string }[] };
          if (list.notes.some((n) => n.id === id)) updateMyNote(id, { status: "live" });
        } catch {
          /* stays in review */
        }
      }, 5500);
    } catch {
      setError("You seem to be offline.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack-8">
      <label className="small lh" htmlFor={`note-${roadId}-${stopId}`}>
        {prompt}
      </label>
      <textarea
        id={`note-${roadId}-${stopId}`}
        rows={2}
        maxLength={NOTE_MAX + 20}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="One line. What do you wish someone had told you?"
        className="note-input"
      />
      <div className="chips-wrap">
        {checks.map((c) => (
          <span key={c.id} className={`check-chip ${text ? (c.pass ? "ok" : "bad") : ""}`}>
            {text && c.pass && <Icon name="check" size={12} />}
            {c.label}
          </span>
        ))}
      </div>
      {error && <div className="error-line">{error}</div>}
      <button type="button" className="btn small primary" disabled={!ok || busy} onClick={send}>
        {busy ? "Sending…" : "Leave it on the road"}
      </button>
      {mine.map((n) => (
        <div key={n.id} className="xs muted">
          “{n.text}” · {n.status === "live" ? "live on the road" : "with a reviewer"}
        </div>
      ))}
    </div>
  );
}
