"use client";

import { useState } from "react";
import type { Lesson } from "@/one/learning";
import { catalogueRoad } from "@/one/crowd";
import { PassItOn } from "@/one/notes8";
import { useNotes } from "@/one/notes8/useNotes";
import { signpostsFor } from "..";
import type { WorldArea } from "../types";
import { Icon } from "./Icon";
import styles from "./world.module.css";

export function SignpostContent({ area, personaId, done }: { area: WorldArea; personaId: string; done: string[] }) {
  const eligible = area.quests.filter(q => !!catalogueRoad(q.roadId));
  const [lessonId, setLessonId] = useState(eligible.find(q => done.includes(q.id))?.id ?? eligible[0]?.id);
  const lesson = eligible.find(q => q.id === lessonId);
  if (!lesson) return <p className={styles.notice}>These education blueprints do not have a shared road for signposts. You can still save what you learn.</p>;
  return <>
    <p className={styles.muted}>One thing you wish someone had told you. A reviewed note becomes a signpost for people on the same road.</p>
    <label className={styles.compose}>Choose a blueprint<select aria-label="Signpost blueprint" value={lesson.id} onChange={event => setLessonId(event.target.value)} className={styles.select}>{eligible.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}</select></label>
    <SignpostStop key={lesson.id} lesson={lesson} area={area} personaId={personaId} completed={done.includes(lesson.id)} />
  </>;
}
function SignpostStop({ lesson, area, personaId, completed }: { lesson: Lesson; area: WorldArea; personaId: string; completed: boolean }) {
  const scope = { roadId: lesson.roadId, stopId: lesson.stopId.slice(lesson.roadId.length + 1), personId: personaId };
  const { notes, loaded, error, markUseful } = useNotes(scope, true);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  async function useful(id: string) {
    if (busy) return;
    setBusy(id); setFeedback(""); setFeedbackError("");
    try { await markUseful(id); setFeedback("Marked useful. A lantern lights in the writer’s world."); }
    catch (cause) { setFeedbackError(cause instanceof Error ? cause.message : "Could not save feedback. Please try again."); }
    finally { setBusy(null); }
  }
  const posts = signpostsFor(personaId, area.id, notes);
  const lanterns = posts.filter(n => n.own).reduce((total, n) => total + n.usefulCount, 0);
  return <>
    <div className={styles.metric}><Icon name="lantern" size={30} /><strong>{lanterns}</strong><span>{lanterns === 1 ? "lantern lit" : "lanterns lit"}<br />From people who marked your signposts useful</span></div>
    {completed ? <PassItOn {...scope} hasPassedStop className={styles.noteComposer} /> : <p className={styles.notice}>Complete this blueprint before you plant a signpost. You can read other people’s notes now.</p>}
    <h3>Signposts on this road</h3>
    {!loaded && <p className={styles.muted}>Loading signposts…</p>}
    {error && <p role="status" className={styles.error}>{error}</p>}
    {loaded && !posts.length && <p className={styles.muted}>No reviewed signposts at this stop yet. A useful experience can be the first.</p>}
    {posts.map(note => <article className={styles.note} key={note.id}><blockquote>“{note.text}”</blockquote><footer><span>{note.own ? "Your reviewed signpost" : "Reviewed signpost"}</span><span><Icon name="lantern" size={14} /> {note.usefulCount} found this useful</span></footer>{!note.own && <button type="button" className={styles.button} disabled={!!busy || note.usefulByMe} onClick={() => void useful(note.id)}><Icon name="lantern" size={16} />{busy === note.id ? "Saving…" : note.usefulByMe ? "Marked useful" : "Mark useful"}</button>}</article>)}
    {feedback && <p role="status" className={styles.status}>{feedback}</p>}{feedbackError && <p role="alert" className={styles.error}>{feedbackError}</p>}
    <p className={styles.small}>Lanterns light only when someone marks a reviewed note useful. Reading or writing a note does not add a lantern.</p>
  </>;
}
