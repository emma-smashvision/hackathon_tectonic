"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useStore } from "../../hindsight/components/store";
import { LessonCard, lessonsFor } from "../learning";
import { useVillageProgress } from "../village";
import { VillagePicture } from "./VillagePicture";

function overlayKeys(event: KeyboardEvent<HTMLElement>, onExit: () => void) {
  if (event.key === "Escape") { event.stopPropagation(); onExit(); }
  if (event.key !== "Tab") return;
  const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), textarea, summary, [tabindex='0']")].filter(el => el.getClientRects().length);
  const first = controls[0], last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}

export function PlainPath({ personaId, focusLessonId, adviser, onExit }: {
  personaId: string; focusLessonId?: string; adviser: string; onExit: () => void;
}) {
  const lessons = lessonsFor(personaId);
  const progress = useVillageProgress(personaId);
  const [selected, setSelected] = useState(focusLessonId ?? lessons.find(l => !progress.done.includes(l.id))?.id ?? lessons[0]?.id);
  const [finished, setFinished] = useState(false);
  const [adviserOpen, setAdviserOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const lesson = lessons.find(l => l.id === selected) ?? lessons[0];
  const built = lessons.filter(l => progress.done.includes(l.id)).length;
  useEffect(() => { if (!adviserOpen) root.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, [adviserOpen]);
  useEffect(() => { root.current?.scrollTo(0, 0); }, [selected]);
  return <>{adviserOpen && <EntryAdviser adviser={adviser} roadId={lesson?.roadId ?? "everyday-only"} onExit={() => setAdviserOpen(false)} />}<section hidden={adviserOpen} ref={root} className="v9-plain-path" role="dialog" aria-modal="true" aria-label="Plain lesson path" onKeyDown={e => overlayKeys(e, onExit)}>
    <button type="button" className="v9-back" onClick={onExit}>← Back to Home</button>
    {lesson ? <LessonCard key={lesson.id} lesson={lesson} variant="plain" onStep={() => root.current?.scrollTo(0, 0)} onDone={() => setFinished(true)}/> : <h1>No lessons to read just now.</h1>}
    <details className="v9-optional-village"><summary>Your village, if you want to look</summary><VillagePicture built={built} total={lessons.length}/><p>{built} of {lessons.length} lessons complete.</p></details>
    {finished && <div className="v9-plain-next">{lessons.find(l => !progress.done.includes(l.id)) && <button type="button" className="v9-entry-primary" onClick={() => { setSelected(lessons.find(l => !progress.done.includes(l.id))!.id); setFinished(false); }}>Read the next lesson</button>}<button type="button" className="v9-entry-primary" onClick={onExit}>Back to Home</button></div>}
    <button type="button" className="v9-entry-secondary" onClick={() => setAdviserOpen(true)}>Talk to {adviser}, my adviser</button>
    <footer>Synthetic demo crowd · not a forecast</footer>
  </section></>;
}

export function CareEntry({ adviser, onExit, onConsent }: {
  adviser: string; onExit: () => void; onConsent: () => void;
}) {
  const [adviserOpen, setAdviserOpen] = useState(false);
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!adviserOpen) back.current?.focus(); }, [adviserOpen]);
  return <>{adviserOpen && <EntryAdviser adviser={adviser} roadId="losing-parent" care onExit={() => setAdviserOpen(false)} />}<section hidden={adviserOpen} className="v9-plain-path v9-care-path" role="dialog" aria-modal="true" aria-label="Support options" onKeyDown={e => overlayKeys(e, onExit)}>
    <button ref={back} type="button" className="v9-back" onClick={onExit}>← Back to Home</button>
    <span className="v9-care-symbol" aria-hidden="true">♡</span>
    <h1>At your pace, Nadia.</h1>
    <p>You can start with a person. {adviser} can help you decide what you need, when you want to.</p>
    <button type="button" className="v9-entry-primary" onClick={() => setAdviserOpen(true)}>Talk to {adviser}</button>
    <p>Would you like to see practical steps that helped other people? Nothing opens until you choose.</p>
    <button type="button" className="v9-entry-secondary" onClick={onConsent}>Show what helped others when I’m ready</button>
    <button type="button" className="v9-back" onClick={onExit}>Not now</button>
  </section></>;
}


// v11-shell: reuse the adviser form from the plain world and care garden.
export function EntryAdviser({ adviser, roadId, care = false, onExit }: {
  adviser: string; roadId: string; care?: boolean; onExit: () => void;
}) {
  const store = useStore();
  const [saved, setSaved] = useState(false);
  const confirmation = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (saved) confirmation.current?.focus(); }, [saved]);
  const [question, setQuestion] = useState(care ? "I would like to talk about my next steps, at my pace." : "Can we talk through this lesson and the next step for me?");
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => { back.current?.focus(); }, []);
  return <section className="v9-plain-path" role="dialog" aria-modal="true" aria-label={`Talk to ${adviser}`} onKeyDown={e => overlayKeys(e, onExit)}>
    <button ref={back} type="button" className="v9-back" onClick={onExit}>← Back</button>
    <h1>Talk to {adviser}</h1>
    <p>You can keep a question for your adviser and discuss it when you feel ready.</p>
    <label className="v9-adviser-question">Your question<textarea value={question} onChange={e => { setQuestion(e.target.value); setSaved(false); }} rows={5}/></label>
    <button type="button" className="v9-entry-primary" disabled={!question.trim() || saved} onClick={() => {
      store.addPlanItem({ id: `v9:adviser:${roadId}`, source: { scope: "road", roadId, key: "adviser" }, spec: { kind: "talk", title: `Ask ${adviser}`, detail: question.trim() } });
      setSaved(true);
    }}>{saved ? "Question saved" : "Save my question"}</button>
    {saved && <p ref={confirmation} tabIndex={-1} role="status">Saved in your plan. No message was sent and no appointment was booked.</p>}
    <button type="button" className="v9-back" onClick={onExit}>{saved ? "Back" : "Not now"}</button>
  </section>;
}
