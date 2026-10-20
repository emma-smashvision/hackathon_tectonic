"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useVillageProgress } from "../village/useVillageProgress";
import type { Choice, Lesson, LessonProgress, LessonStep } from "./types";
import styles from "./lesson.module.css";

export type LessonCardProps = {
  lesson: Lesson;
  variant: "game" | "plain";
  onStep?: (progress: LessonProgress) => void;
  onDone?: (progress: LessonProgress) => void;
};

/** The keyed inner component resets safely when a consumer changes lesson/persona. */
export function LessonCard(props: LessonCardProps) {
  return <LessonSession key={props.lesson.id} {...props} />;
}

function LessonSession({ lesson, variant, onStep, onDone }: LessonCardProps) {
  const [progress, setProgress] = useState<LessonProgress>({ lessonId: lesson.id, step: variant === "plain" ? "reveal" : "guess" });
  const [applied, setApplied] = useState<Choice>();
  const finished = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const store = useVillageProgress(lesson.personaId);
  const { step } = progress;
  const plain = variant === "plain";
  const change = (next: LessonStep, patch: Partial<LessonProgress> = {}) => {
    const value = { ...progress, ...patch, step: next };
    setProgress(value);
    onStep?.(value);
  };
  useEffect(() => { if (step !== "guess") heading.current?.focus(); }, [step]);
  const finish = (saved: boolean) => {
    if (finished.current) return;
    finished.current = true;
    if (saved && lesson.save) store.save(lesson.save.id);
    store.complete(lesson.id);
    const value: LessonProgress = { ...progress, step: "done", saved };
    setProgress(value);
    onStep?.(value);
    onDone?.(value);
  };
  const labels: Record<LessonStep, string> = { guess: plain ? "Think about it" : `Bump ${lesson.order} · Month ${lesson.month}`, reveal: "What the crowd lived", helped: "What helped", apply: "Try it on a new case", save: "Keep one useful step", done: "Lesson complete" };
  const stage: Record<LessonStep, number> = { guess: 1, reveal: 2, helped: 2, apply: 3, save: 4, done: 4 };
  const title = step === "guess" ? lesson.guess.question : step === "reveal" ? lesson.reveal.headline : step === "helped" ? "Small steps people took" : step === "apply" ? lesson.apply.question : step === "save" ? "Would you like to save this step?" : lesson.stamp.label;
  return <section className={`${styles.card} ${plain ? styles.plain : styles.game}`} aria-labelledby={headingId} data-step={step} data-lesson={lesson.id}>
    <header className={styles.meta}><span>{labels[step]}</span><span>Step {plain ? Math.max(1, stage[step] - 1) : stage[step]} of {plain ? 3 : 4}</span></header>
    {plain && <p className={styles.topic}>{lesson.title}</p>}
    <h2 ref={heading} id={headingId} tabIndex={-1}>{title}</h2>
    <div className={styles.body}>
      {step === "guess" && <><div className={styles.choices}>{lesson.guess.choices.map(c => <button type="button" key={c.id} onClick={() => change("reveal", { guessed: c.id })}>{c.label}</button>)}</div><p className={styles.caption}>No score. Your guess is a starting point.</p></>}
      {step === "reveal" && <>
        {lesson.reveal.detail && <p className={styles.detail}>{lesson.reveal.detail}</p>}
        {lesson.reveal.table && <table className={styles.comparison}><caption>{lesson.reveal.table.caption}</caption><thead><tr>{lesson.reveal.table.columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{lesson.reveal.table.rows.map((row, index) => <tr key={index}>{row.map((cell, i) => i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>)}</tr>)}</tbody></table>}
        {lesson.reveal.withheld && <p className={styles.feedback}>{lesson.reveal.withheld}</p>}
        {progress.guessed && !lesson.reveal.table && <p className={styles.feedback}>{lesson.guess.choices.find(c => c.id === progress.guessed)?.why ?? "Let’s look at the evidence together."}</p>}
        <button type="button" className={styles.primary} onClick={() => change("helped")}>See what helped</button>
        {plain && !progress.guessed && <button type="button" className={styles.secondary} onClick={() => change("guess")}>Try the opening question</button>}
      </>}
      {step === "helped" && <>
        {lesson.helped.length > 0 ? <div className={styles.helped}><p>{lesson.helped.some(h => h.share !== undefined) ? "Avoided strain on their buffer" : "A useful principle"}</p>{lesson.helped.map((h, i) => <div className={styles.helpRow} key={i}><div><span>{h.label}</span>{h.share !== undefined && <strong>{h.share}%</strong>}</div>{h.share !== undefined && <div className={styles.track}><span style={{ width: `${h.share}%` }} /></div>}</div>)}</div> : <p className={styles.feedback}>{lesson.apply.explain}</p>}
        <p className={styles.caption}>Associated with these actions, not proof of cause.</p>
        {lesson.note && <blockquote>“{lesson.note.text}”<cite>{lesson.note.by}</cite></blockquote>}
        <button type="button" className={styles.primary} onClick={() => change("apply")}>{plain ? "Try an example" : "Pave this bump"}</button>
      </>}
      {step === "apply" && <><div className={styles.choices}>{lesson.apply.choices.map(c => <button type="button" key={c.id} aria-pressed={applied?.id === c.id} onClick={() => { setApplied(c); change("apply", { applied: c.id }); }}>{c.label}{applied?.id === c.id && c.correct ? " ✓" : ""}</button>)}</div>{applied && <p role="status" className={styles.feedback}>{applied.why}</p>}{applied?.correct && <button type="button" className={styles.primary} onClick={() => change("save")}>Keep this lesson</button>}</>}
      {step === "save" && <><p className={styles.feedback}>{lesson.apply.explain}</p><p>You complete the lesson whether you save a step or choose “Not now”.</p>{lesson.save && <button type="button" className={styles.primary} onClick={() => finish(true)}>{lesson.save.label}</button>}<button type="button" className={styles.secondary} onClick={() => finish(false)}>Not now</button></>}
      {step === "done" && <><div className={styles.stamp}><span aria-hidden="true">{lesson.stamp.icon}</span><p>{plain ? "Your village grows with this lesson." : lesson.reward.label}</p></div><p role="status">{progress.saved ? "Step saved." : "Lesson complete. No step saved."}</p></>}
    </div>
  </section>;
}
