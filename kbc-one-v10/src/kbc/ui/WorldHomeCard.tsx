"use client";
// v11-shell: Home is a quiet invitation; growth comes from learning and personal goals.
import { WorldPicture } from "../../hindsight/game/world11/WorldPicture";
import { worldFor, useWorldProgress } from "../../one/world";
import "../../one/villagecard/villagecard.css";
import "./world-shell.css";

export function WorldHomeCard({ personaId, large, receipt, onOpen }: {
  personaId: string; large: boolean; receipt?: string; onOpen: () => void;
}) {
  const progress = useWorldProgress(personaId);
  const world = worldFor(personaId, progress);
  const care = personaId === "nadia"; // r2-world: care is an optional district inside her world.
  const plain = large || personaId === "margaret";
  const storm = world.storms.find(item => !item.prepared && item.daysAway !== null && item.daysAway >= 0);
  const timing = storm?.daysAway === 0 ? "Storm today" : storm?.daysAway !== undefined && storm.daysAway !== null
    ? storm.daysAway < 7 ? `Storm in ${storm.daysAway} days` : `Storm in ${Math.ceil(storm.daysAway / 7)} weeks` : undefined;
  const completed = world.areas.reduce((sum, area) => sum + area.completed, 0);
  return <section className={`v9-village-card v11-home-card ${plain ? "v9-card-large" : ""} ${care ? "v9-card-care" : ""}`} aria-label="Your world">
    {!care && !plain && <div className="v11-world-postcard" aria-hidden="true"><span>Your world</span><WorldPicture /></div>}
    <div className="v9-card-copy">
      <h2>{plain ? "Your calm world" : "Your world"}</h2>
      <p>{care ? "Your home and savings, with a quiet care garden when you want it." : plain ? "Tap a place to see your numbers. Read lessons one step at a time." : "Learn from people ahead. Grow the parts of life that matter to you."}</p>
      {!care && !plain && timing && <p className="v11-home-storm">{timing} · {world.areas.find(area => area.id === storm?.areaId)?.title}<small>{storm?.dateLabel}</small></p>}
      <button type="button" className="v9-entry-primary" data-village-entry data-world-entry onClick={onOpen}>{plain ? "Open calm world" : "Open your world"}</button>
      {receipt && !care && <p className="v9-entry-receipt" role="status">✓ {receipt}</p>}
      {!receipt && completed > 0 && !care && <p className="v9-entry-receipt">{completed} {completed === 1 ? "lesson" : "lessons"} complete</p>}
      {!care && <footer>{world.disclosure}</footer>}
    </div>
  </section>;
}
