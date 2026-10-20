"use client";

import { lessonsFor } from "../learning";
import { villageFor, useVillageProgress } from "../village";
import { VillagePicture } from "./VillagePicture";
import "./villagecard.css";

export function VillageCard({ personaId, large, receipt, onOpen }: {
  personaId: string; large: boolean; receipt?: string; onOpen: () => void;
}) {
  const village = villageFor(personaId);
  const progress = useVillageProgress(personaId);
  const lessons = lessonsFor(personaId);
  const built = lessons.filter(lesson => progress.done.includes(lesson.id)).length;
  const care = personaId === "nadia";
  const plain = large || personaId === "margaret";
  const goal = village.destination?.goal.replace(/^Learn .*? to build /i, "Build ").replace(/[.]$/, "");
  return <section className={`v9-village-card ${plain ? "v9-card-large" : ""} ${care ? "v9-card-care" : ""}`} aria-label={care ? "Support at your pace" : "Your village"}>
    {!care && !plain && <div className="v9-thumbnail"><VillagePicture built={built} total={lessons.length}/><span>Your village</span></div>}
    <div className="v9-card-copy">
      {(plain || care) && <small>{care ? "At your pace" : "One step at a time"}</small>}
      <h2>{care ? "Support, when you want it" : plain ? (personaId === "margaret" ? "Your yearly energy bill" : lessons.find(l => !progress.done.includes(l.id))?.title ?? "Your lessons") : `${goal ?? village.destination?.title ?? "Your village"} · ${built}/${lessons.length}`}</h2>
      <p>{care ? "You choose what to open. Start with a person, or look at practical help when you feel ready." : plain ? "A clear explanation and a useful next step. Read at your own pace." : `${lessons.length} short ${lessons.length === 1 ? "lesson" : "lessons"} from people ahead. Each lesson adds a piece to your village.`}</p>
      <button type="button" className="v9-entry-primary" data-village-entry onClick={onOpen}>{care ? "See support options" : plain ? "Read the explanation" : "▶ Play · turn your phone ↄ"}</button>
      {receipt && <p className="v9-entry-receipt" role="status">✓ {receipt}</p>}
      {!care && <footer>Synthetic demo crowd · not a forecast</footer>}
    </div>
  </section>;
}
