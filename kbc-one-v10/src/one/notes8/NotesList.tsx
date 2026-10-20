"use client";

import type { NoteScopeProps } from "./types";
import { useNotes } from "./useNotes";
import styles from "./notes.module.css";

export interface NotesListProps extends NoteScopeProps { includeRoadNotes?: boolean }
/** Approved notes at this exact stop, plus this persona's own pending notes. */
export function NotesList({ includeRoadNotes = true, ...scope }: NotesListProps) {
  const { notes, error, loaded } = useNotes(scope, includeRoadNotes);
  return (
    <section className={`${styles.panel} ${scope.large ? styles.large : ""} ${scope.className ?? ""}`} aria-label="Notes from people ahead">
      <h3 className={styles.heading}>Notes from people ahead</h3>
      <p className={styles.disclosure}>Synthetic notes · Demo: review simulated</p>
      {!loaded && <p className={styles.muted}>Loading notes…</p>}
      {loaded && !error && !notes.length && <p className={styles.muted}>No shared notes here yet. Your experience could help the next person.</p>}
      {error && <p role="status" className={styles.error}>Notes could not refresh. {error}</p>}
      <div className={styles.list}>
        {notes.map((note) => (
          <figure key={note.id} className={styles.note} data-note-id={note.id}>
            <blockquote>“{note.text}”</blockquote>
            <figcaption>
              {note.status === "review" ? <><span className={styles.review}>In review</span> Only you can see this for now.</> : <>{scope.roadId === "moving-house" ? "Moved" : "Completed this road"} in 2025 · reviewed <span className={styles.approved}>Approved</span></>}
              {note.stopId === null && <span className={styles.roadLabel}>Whole road</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
