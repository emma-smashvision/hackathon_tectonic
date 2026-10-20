"use client";

import type { Lesson } from "@/one/learning";
import type { KidsMiniWorld } from "../types";
import { Icon } from "./Icon";
import { Stage } from "./AreaContent";
import styles from "./world.module.css";

export function KidsContent({ kids, done, onLesson }: { kids: KidsMiniWorld; done: string[]; onLesson: (lesson: Lesson) => void }) {
  return <>
    <p className={styles.muted}>{kids.childName ? `A small world for ${kids.childName}, built with a parent.` : "A small world to build and learn in together."}</p>
    {kids.preview && <p className={styles.notice}>Family preview. This is a parent’s learning space; no child account or child profile is created.</p>}
    <Stage stage={kids.stage} />
    <div className={styles.kidsPlots} aria-label="Your shared learning plots">{[
      { name: "Plan", icon: "home" }, { name: "Save", icon: "savings" }, { name: "Share", icon: "care" },
    ].map((plot, index) => <div className={styles.kidsPlot} key={plot.name} data-built={kids.stage > index}><Icon name={plot.icon} size={38} /><strong>{plot.name}</strong><small>{kids.stage > index ? "Built together" : "Room to grow"}</small></div>)}</div>
    <h3>Choose a blueprint together</h3>
    <div className={styles.kidsChoice}>{kids.quests.map((quest, index) => <button type="button" key={quest.id} className={styles.button} onClick={() => onLesson(quest)}><Icon name={done.includes(quest.id) ? "check" : "book"} /><span>{index + 1}. {quest.title}<small style={{ display: "block", color: "#b3d3e7" }}>{done.includes(quest.id) ? "Learned together · revisit" : "Talk it through with a parent"}</small></span></button>)}</div>
    {!kids.quests.length && <p className={styles.notice}>Your shared blueprints are being prepared.</p>}
    <p className={styles.small}>Only this family’s learning appears here. No public sharing, rankings or comparison with other children.</p>
  </>;
}
