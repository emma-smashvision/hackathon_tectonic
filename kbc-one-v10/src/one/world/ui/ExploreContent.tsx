import type { exploreArea } from "..";
import { crowdFrequency, humanDates } from "./presentation";
import { Icon } from "./Icon";
import styles from "./world.module.css";

export function ExploreContent({ preview, onReturn }: { preview: NonNullable<ReturnType<typeof exploreArea>>; onReturn: () => void }) {
  return <>
    <p className={styles.notice}>You are exploring {preview.title}. Your plans, goals and progress stay as they are.</p>
    <h3>What you can learn here</h3>
    <div className={styles.previewLessons}>{preview.quests.map(lesson => <details key={lesson.id}><summary>{lesson.title}</summary><p>{humanDates(lesson.guess.question)}</p><p>{humanDates(lesson.apply.explain)}</p></details>)}</div>
    {preview.crowd.length > 0 && <><h3>From people who came before</h3>{preview.crowd.map(hit => <div className={styles.metric} key={`${hit.roadId}:${hit.stopId}`}><Icon name="storm" /><span>{hit.title}{hit.denominator.shown && hit.denominator.value !== null && <small style={{ display: "block" }}>{hit.denominator.value.toLocaleString("nl-BE")} people on this road</small>}</span>{crowdFrequency(hit.share) && <strong>{crowdFrequency(hit.share)}</strong>}</div>)}</>}
    <button type="button" className={styles.primary} onClick={onReturn}><Icon name="key" />Back to unlock keys</button>
  </>;
}
