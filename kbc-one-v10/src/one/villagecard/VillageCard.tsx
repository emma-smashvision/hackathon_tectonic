"use client";

import { lessonsFor } from "../learning";
import { useVillageProgress } from "../village";
// v10-shell: a static preview keeps Home free of WebGL.
import { NightCityPicture } from "../../hindsight/game/city10/scene/NightCityPicture";
import "./villagecard.css";

export function VillageCard({ personaId, large, receipt, onOpen }: {
  personaId: string; large: boolean; receipt?: string; onOpen: () => void;
}) {
  const progress = useVillageProgress(personaId);
  const lessons = lessonsFor(personaId);
  const built = lessons.filter(lesson => progress.done.includes(lesson.id)).length;
  const care = personaId === "nadia";
  const plain = large || personaId === "margaret";
  // v10-shell: the same entry guard keeps plain lessons and care outside the game.
  const next = Math.min(built + 1, lessons.length);
  return <section className={`v9-village-card ${plain ? "v9-card-large" : ""} ${care ? "v9-card-care" : ""}`} aria-label={care ? "Support at your pace" : plain ? "Your village" : "Your city"}>
    {!care && !plain && <div className="v9-thumbnail"><NightCityPicture style={{ height: "auto", aspectRatio: "2 / 1" }}/><span>Your city</span></div>}
    <div className="v9-card-copy">
      {(plain || care) && <small>{care ? "At your pace" : "One step at a time"}</small>}
      <h2>{care ? "Support, when you want it" : plain ? (personaId === "margaret" ? "Your yearly energy bill" : lessons.find(l => !progress.done.includes(l.id))?.title ?? "Your lessons") : `Your city · ${built === lessons.length ? `${built}/${lessons.length} missions passed` : `Mission ${next}/${lessons.length}`}`}</h2>
      <p>{care ? "You choose what to open. Start with a person, or look at practical help when you feel ready." : plain ? "A clear explanation and a useful next step. Read at your own pace." : "Drive freely. Collect what helped people ahead, prepare for the bumps, and build your block."}</p>
      <button type="button" className="v9-entry-primary" data-village-entry onClick={onOpen}>{care ? "See support options" : plain ? "Read the explanation" : "▶ Drive"}</button>
      {receipt && <p className="v9-entry-receipt" role="status">✓ {receipt}</p>}
      {!care && <footer>Synthetic demo crowd · not a forecast</footer>}
    </div>
  </section>;
}
