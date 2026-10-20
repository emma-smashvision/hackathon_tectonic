"use client";
// v11-shell: readable areas and lessons, with no canvas or game controls.
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { LessonCard } from "../../one/learning";
import { worldFor, useWorldProgress, worldLessonById } from "../../one/world";
import { EntryAdviser } from "../../one/villagecard/PlainPath";
import "./world-shell.css";

function keys(event: KeyboardEvent<HTMLElement>, back: () => void) {
  if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); back(); }
  if (event.key !== "Tab") return;
  const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),summary,textarea,[tabindex="0"]')].filter(el => el.getClientRects().length);
  const first = controls[0], last = controls.at(-1);
  if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}

export function PlainWorld({ personaId, focusLessonId, adviser, onExit }: {
  personaId: string; focusLessonId?: string; adviser: string; onExit: () => void;
}) {
  const progress = useWorldProgress(personaId);
  const world = worldFor(personaId, progress);
  const [selected, setSelected] = useState(focusLessonId);
  const [adviserOpen, setAdviserOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const lesson = selected ? worldLessonById(selected) : undefined;
  const ownedLesson = lesson?.personaId === personaId ? lesson : undefined;
  useEffect(() => {
    root.current?.scrollTo(0, 0);
    root.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [selected, adviserOpen]);
  if (adviserOpen) return <EntryAdviser adviser={adviser} roadId={ownedLesson?.roadId ?? "everyday-only"} onExit={() => setAdviserOpen(false)} />;
  const back = () => ownedLesson ? setSelected(undefined) : onExit();
  return <section ref={root} className="v9-plain-path v11-plain-world" role="dialog" aria-modal="true" aria-label="Plain world" onKeyDown={event => keys(event, back)}>
    <button className="v9-back" onClick={back}>← {ownedLesson ? "Back to your areas" : "Back to Home"}</button>
    {ownedLesson ? <LessonCard key={ownedLesson.id} lesson={ownedLesson} variant="plain" /> : <>
      <h1>Your world, at your pace</h1><p>Choose an area. Read one lesson at a time. You can stop whenever you want.</p>
      {world.areas.filter(area => area.active && !area.care).map(area => <section className="v11-plain-area" key={area.id}>
        <h2>{area.title}</h2><p>{area.subtitle}</p>
        {area.quests.length ? <ul>{area.quests.map(quest => <li key={quest.id}><button className="v11-lesson-button" onClick={() => setSelected(quest.id)}>{quest.title}<small>{progress.done.includes(quest.id) ? "Read again" : "Read this lesson"}</small></button></li>)}</ul> : <p>No lesson to read here just now.</p>}
      </section>)}
      <details className="v11-plain-area"><summary>Other areas you can explore</summary>{world.areas.filter(area => !area.active && !area.care).map(area => <section className="v11-plain-area" key={area.id}><h2>{area.title}</h2><p>{area.subtitle}</p><small>A preview only. Nothing changes in your plan.</small></section>)}</details>
    </>}
    <button className="v9-entry-secondary" onClick={() => setAdviserOpen(true)}>Talk to {adviser}, my adviser</button>
    <footer>{world.disclosure}</footer>
  </section>;
}

export function CareGarden({ adviser, onExit, onSteps }: {
  adviser: string; onExit: () => void; onSteps: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const [adviserOpen, setAdviserOpen] = useState(false);
  useEffect(() => { root.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, [adviserOpen]);
  if (adviserOpen) return <EntryAdviser adviser={adviser} roadId="losing-parent" care onExit={() => setAdviserOpen(false)} />;
  return <section ref={root} className="v9-plain-path v11-plain-world" role="dialog" aria-modal="true" aria-label="Care garden" onKeyDown={event => keys(event, onExit)}>
    <button className="v9-back" onClick={onExit}>← Back to Home</button>
    <h1>Your care garden</h1><p>There is no rush, Nadia. You choose the help that feels useful today.</p>
    <section className="v11-care-garden"><h2>A person to talk to</h2><p>{adviser} can help you make sense of the next steps.</p><button className="v9-entry-secondary" onClick={() => setAdviserOpen(true)}>Talk to {adviser}</button></section>
    <section className="v11-care-garden"><h2>Practical help, when you want it</h2><p>You chose to see what helped others. Open the steps when you feel ready.</p><button className="v9-entry-primary" onClick={onSteps}>Read the practical steps</button></section>
    <button className="v9-back" onClick={onExit}>Enough for now</button>
    <footer>Synthetic demo crowd · not a forecast</footer>
  </section>;
}
