"use client";

import { lessonsFor } from "../learning";
import { useVillageProgress } from "../village";
import "./villagecard.css";

export function VillageCard({ personaId, large, receipt, onOpen }: {
  personaId: string; large: boolean; receipt?: string; onOpen: () => void;
}) {
  const progress = useVillageProgress(personaId);
  const lessons = lessonsFor(personaId);
  const care = personaId === "nadia";
  return <section className={`v9-village-card ${care ? "v9-card-care" : "v9-card-large"}`} aria-label={care ? "Support at your pace" : "Your village"}>
    <div className="v9-card-copy">
      <small>{care ? "At your pace" : "One step at a time"}</small>
      <h2>{care ? "Support, when you want it" : personaId === "margaret" ? "Your yearly energy bill" : lessons.find(l => !progress.done.includes(l.id))?.title ?? "Your lessons"}</h2>
      <p>{care ? "You choose what to open. Start with a person, or look at practical help when you feel ready." : "A clear explanation and a useful next step. Read at your own pace."}</p>
      <button type="button" className="v9-entry-primary" data-village-entry onClick={onOpen}>{care ? "See support options" : "Read the explanation"}</button>
      {receipt && <p className="v9-entry-receipt" role="status">✓ {receipt}</p>}
      {!care && <footer>Synthetic demo crowd · not a forecast</footer>}
    </div>
  </section>;
}
