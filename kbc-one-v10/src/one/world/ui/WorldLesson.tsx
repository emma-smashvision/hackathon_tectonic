"use client";

import { useRef, useState } from "react";
import { LessonCard, type Choice, type Lesson } from "@/one/learning";
import { LessonCinema, LessonReward } from "@/one/lessonfx";
import { useWorldProgress } from "..";
import { humanDates } from "./presentation";
import { Icon } from "./Icon";
import styles from "./world.module.css";

/** The shared cinema teaches; only a correct application can reach the save step. */
export function WorldLesson({ lesson, onReturn, returnLabel, plain = false }: { plain?: boolean; lesson: Lesson; onReturn: () => void; returnLabel: string }) {
  const progress = useWorldProgress(lesson.personaId);
  const [phase, setPhase] = useState<"cinema" | "retry" | "save" | "done">("cinema");
  const [choice, setChoice] = useState<Choice>();
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState(false);
  const finished = useRef(false);
  const choose = (id: string) => {
    const next = lesson.apply.choices.find(option => option.id === id);
    if (!next) return;
    setChoice(next);
    setPhase(next.correct ? "save" : "retry");
  };
  const finish = (save: boolean) => {
    if (finished.current || !choice?.correct) return;
    finished.current = true;
    if (save && lesson.save) progress.save(lesson.save.id);
    progress.complete(lesson.id);
    setSaved(save && !!lesson.save);
    setPhase("done");
  };
  if (plain) return <div className={styles.plainLesson}><LessonCard lesson={lesson} variant="plain" onDone={() => setPhase("done")} />{phase === "done" && <button type="button" className={styles.primary} onClick={onReturn}>{returnLabel}</button>}</div>;
  return <section className={styles.worldLesson} data-lesson={lesson.id} data-step={phase}>
    {phase === "cinema" && <LessonCinema key={attempt} lesson={lesson} onChoose={choose} initialStep={attempt ? "apply" : "guess"} showFooter={false} />}
    {phase === "retry" && <div className={styles.lessonResult}><Icon name="ahead" size={40} /><h2>A second chance</h2><p role="status">{humanDates(choice?.why ?? lesson.apply.explain)}</p><p className={styles.muted}>Take another look at the choices. Your world stays as it is.</p><button type="button" className={styles.primary} onClick={() => { setAttempt(n => n + 1); setPhase("cinema"); }}>Try another lane</button></div>}
    {phase === "save" && <div className={styles.lessonResult}><Icon name="shield" size={42} /><h2>Keep one useful step</h2><p>{humanDates(choice?.why ?? lesson.apply.explain)}</p><p className={styles.muted}>You earn the blueprint either way. Saving the step also helps prepare your area.</p>{lesson.save && <button type="button" className={styles.primary} onClick={() => finish(true)}>{humanDates(lesson.save.label)}</button>}<button type="button" className={styles.button} onClick={() => finish(false)}>Not now</button></div>}
    {phase === "done" && <div className={styles.lessonResult}><LessonReward lesson={lesson} /><p role="status">{saved ? "Blueprint earned. Your preparation step is saved." : "Blueprint earned. No preparation step saved."}</p><button type="button" className={styles.primary} onClick={onReturn}>{returnLabel}</button></div>}
  </section>;
}
