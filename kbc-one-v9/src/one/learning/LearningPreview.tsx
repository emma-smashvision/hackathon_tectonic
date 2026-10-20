"use client";

import { useState } from "react";
import { LessonCard } from "./LessonCard";
import { lessonsFor } from "./lessons";
import { villageFor } from "../village/model";
import { useVillageProgress } from "../village/useVillageProgress";
import styles from "./preview.module.css";

/** Isolated dev story: the host/world are deliberately outside this workstream. */
export function LearningPreview({ initialPersona = "tom", initialVariant = "game" }: { initialPersona?: string; initialVariant?: "plain" | "game" }) {
  const [persona, setPersona] = useState(initialPersona);
  const [variant, setVariant] = useState(initialVariant);
  const [index, setIndex] = useState(0);
  const [session, setSession] = useState(0);
  const [events, setEvents] = useState<string[]>([]);
  const lessons = lessonsFor(persona);
  const lesson = lessons[index] ?? lessons[0];
  const village = villageFor(persona);
  const progress = useVillageProgress(persona);
  const secondSubscriber = useVillageProgress(persona);
  return <main className={`${styles.preview} ${variant === "plain" ? styles.plain : ""}`}>
    <header className={styles.controls}>
      <strong>Learning component preview</strong>
      <label>Persona <select aria-label="Persona" value={persona} onChange={e => { setPersona(e.target.value); setIndex(0); setEvents([]); }}>
        {["tom", "karim", "sofie", "lina", "margaret", "nadia"].map(id => <option key={id}>{id}</option>)}
      </select></label>
      <label>View <select aria-label="View" value={variant} onChange={e => { setVariant(e.target.value as "plain" | "game"); setSession(s => s + 1); }}><option>game</option><option>plain</option></select></label>
      {lessons.length > 0 && <label>Lesson <select aria-label="Lesson" value={index} onChange={e => setIndex(Number(e.target.value))}>{lessons.map((l, i) => <option key={l.id} value={i}>{l.title}</option>)}</select></label>}
      <button onClick={() => { progress.reset(); setSession(s => s + 1); setEvents([]); }}>Reset persona</button>
      <button onClick={() => setSession(s => s + 1)}>Replay lesson</button>
    </header>
    <div className={styles.stage}>
      <aside className={styles.context}>
        <p>Component test story · world integration belongs to W1/W3</p>
        <h1>{village.destination?.goal ?? "Support at your own pace"}</h1>
        <p data-testid="progress">{progress.done.length}/{lessons.length} lessons complete · {progress.saved.length} saved steps</p>
        <p data-testid="subscriber">Second subscriber: {secondSubscriber.done.length} complete</p>
        <output data-testid="events">{events.join(", ")}</output>
      </aside>
      <div className={styles.panel}>
        {lesson ? <LessonCard key={`${lesson.id}:${session}`} lesson={lesson} variant={variant} onStep={p => setEvents(old => [...old, p.step])} onDone={() => setEvents(old => [...old, "onDone"])} /> : <section className={styles.care}><h2>Take things at your own pace</h2><p>No game, lessons or rewards. The app’s care invitation asks permission before showing support.</p></section>}
      </div>
    </div>
    <footer>Synthetic demo crowd · not a forecast</footer>
  </main>;
}
