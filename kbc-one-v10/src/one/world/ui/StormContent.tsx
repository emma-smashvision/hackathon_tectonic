"use client";

import type { Lesson } from "@/one/learning";
import type { WorldStorm } from "../types";
import { StormData } from "./StormData";
import { Icon } from "./Icon";
import { humanDates } from "./presentation";
import styles from "./world.module.css";

export function StormContent({ storm, lesson, done, saved, onLesson, onPrepare, onReturn }: {
  storm: WorldStorm; lesson?: Lesson; done: string[]; saved: string[]; onLesson: (lesson: Lesson) => void; onPrepare: () => void; onReturn: () => void;
}) {
  const learned = done.includes(storm.lessonId);
  const stepSaved = !!storm.saveId && saved.includes(storm.saveId);
  return <>
    <StormData storm={storm} learned={learned} />
    <section className={styles.stormCard} data-prepared={storm.prepared}>
      <header><Icon name={storm.prepared ? "shield" : "storm"} size={34} /><h3>{storm.prepared ? "Prepared. Your world stays yours." : storm.status === "repair" ? "A new chance to prepare" : "A little preparation goes a long way"}</h3></header>
      <p className={styles.stormDate}>{humanDates(storm.dateLabel)}</p>
      <p>{storm.prepared ? "Your lesson and saved step have built a shield in this area." : "Complete the blueprint and save one useful step to build a shield."}</p>
    </section>
    <p className={styles.muted}>Nothing is destroyed if a storm passes. You can always return to its repair quest.</p>
    <ol className={styles.checklist}>
      <li data-done={learned}><span className={styles.checkCircle}>{learned ? <Icon name="check" size={15} /> : "1"}</span><span>Learn the blueprint{learned && " · complete"}</span></li>
      <li data-done={stepSaved}><span className={styles.checkCircle}>{stepSaved ? <Icon name="check" size={15} /> : "2"}</span><span>Save a preparation step{stepSaved && " · saved"}</span></li>
    </ol>
    {!learned && lesson && <button type="button" className={styles.primary} onClick={() => onLesson(lesson)}><Icon name="book" />{storm.status === "repair" ? "Start repair quest" : "Learn how to prepare"}</button>}
    {learned && !stepSaved && storm.saveId && <><p className={styles.notice}>You have earned the blueprint. Save the step when you are ready to prepare this area.</p><button type="button" className={styles.primary} onClick={onPrepare}><Icon name="shield" />{lesson?.save?.label ?? "Save preparation step"}</button></>}
    {learned && !storm.saveId && <p className={styles.notice}>Blueprint earned. This lesson has no preparation step to save.</p>}
    {storm.prepared && <p role="status" className={`${styles.notice} ${styles.success}`}>Shield built. Your preparation is saved.</p>}
    <button type="button" className={styles.button} onClick={onReturn}>Return to your area</button>
  </>;
}
