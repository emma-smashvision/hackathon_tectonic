"use client";

import { useId, useState } from "react";
import { checkNote, NOTE_MAX, NOTE_MIN } from "../../hindsight/engine/moderation";
import { canPassItOn, type NoteScopeProps } from "./types";
import { notesRequest, useNotes } from "./useNotes";
import styles from "./notes.module.css";

export interface PassItOnProps extends NoteScopeProps {
  hasPassedStop?: boolean;
  hasCompletedRoad?: boolean;
  demoAlumnus?: boolean;
  onDemoAlumnusChange?: (on: boolean) => void;
  starterText?: string;
}

/** One line for the next traveller. See README.md for the full integration contract. */
export function PassItOn(props: PassItOnProps) {
  // A new person/stop starts a fresh form and turns off uncontrolled jury mode.
  return <PassItOnForm key={`${props.personId}:${props.roadId}:${props.stopId ?? "road"}`} {...props} />;
}
function PassItOnForm({
  hasPassedStop = false, hasCompletedRoad = false, demoAlumnus,
  onDemoAlumnusChange, starterText, ...scope
}: PassItOnProps) {
  const inputId = useId();
  const [localAlumnus, setLocalAlumnus] = useState(false);
  const alumnus = demoAlumnus ?? localAlumnus;
  const [text, setText] = useState(starterText ?? (["first-home", "moving-house"].includes(scope.roadId)
    ? "Photograph the meters on the day you get the keys."
    : "Give yourself time to ask questions before the next step."));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawn, setWithdrawn] = useState(false);
  const { notes, token, refresh, remember } = useNotes(scope);
  const latest = notes.find((n) => n.own);
  const pending = notes.find((n) => n.own && n.status === "review");
  const eligible = canPassItOn(scope.stopId, hasPassedStop, hasCompletedRoad, alumnus);
  const failed = checkNote(text).filter((c) => !c.pass);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || busy || pending || !eligible) return;
    setError(null);
    setWithdrawn(false);
    if (failed.length) { setError(`Please check: ${failed.map((c) => c.label).join("; ")}.`); return; }
    setBusy(true);
    try {
      const result = await notesRequest({ roadId: scope.roadId, stopId: scope.stopId ?? null, text, ownerToken: token }, "POST");
      remember(result.note);
      void refresh(true);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not send the note. Please try again."); }
    finally { setBusy(false); }
  }
  async function withdraw() {
    if (!pending || !token || busy) return;
    setBusy(true);
    setError(null);
    try {
      await notesRequest({ id: pending.id, ownerToken: token }, "DELETE");
      setWithdrawn(true);
      await refresh(true);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not withdraw the note."); await refresh(true); }
    finally { setBusy(false); }
  }
  return (
    <section className={`${styles.panel} ${scope.large ? styles.large : ""} ${scope.className ?? ""}`} aria-label="Pass it on">
      <h3 className={styles.heading}>Pass it on</h3>
      <p className={styles.muted}>One thing you wish someone had told you.</p>
      {!canPassItOn(scope.stopId, hasPassedStop, hasCompletedRoad, false) && (
        <>
          <p className={styles.muted}>Leave a note after you pass this stop or complete this road.</p>
          <label className={styles.toggle}>
            <input type="checkbox" checked={alumnus} onChange={(e) => { setLocalAlumnus(e.target.checked); onDemoAlumnusChange?.(e.target.checked); }} />
            <span>Demo: someone who completed this road</span>
          </label>
        </>
      )}
      {eligible && (
        <form onSubmit={submit} className={styles.form}>
          <label htmlFor={inputId}>Your line for the next person</label>
          <input id={inputId} type="text" value={text} maxLength={NOTE_MAX} disabled={busy || Boolean(pending)}
            onChange={(e) => { setText(e.target.value); setError(null); setWithdrawn(false); }}
            aria-describedby={`${inputId}-help`} className={styles.input} />
          <p id={`${inputId}-help`} className={styles.muted}>{NOTE_MIN}–{NOTE_MAX} characters. No names, amounts, places, links or contacts.</p>
          <button type="submit" disabled={!token || busy || Boolean(pending) || text.trim().length < NOTE_MIN} className={styles.primary}>
            {busy ? "Please wait…" : pending ? "Note in review" : "Leave it on the road"}
          </button>
        </form>
      )}
      <div role="status" className={styles.status}>
        {withdrawn ? <span className={styles.chip}>Withdrawn · you can edit and send again</span> : latest && <span className={latest.status === "review" ? styles.review : styles.approved}>{latest.status === "review" ? "In review" : "Approved"}</span>}
      </div>
      {pending && <button type="button" className={styles.secondary} disabled={busy} onClick={() => { void withdraw(); }}>Undo / withdraw note</button>}
      {error && <p role="alert" className={styles.error}><strong>Note not published.</strong> {error}</p>}
      <p className={styles.disclosure}>Demo: review simulated · synthetic notes</p>
    </section>
  );
}
