"use client";

import { useState } from "react";
import { useStore } from "../hindsight/components/store";
import { Icon } from "../kbc/ui/icons";
import { journeyTiming } from "./nudge/model";
import { useNudge } from "./nudge/NudgeProvider";

/** One plain journey in For you; the city is a secondary choice after opening it. */
export function LookAheadCard({ large, onFlash, onDismiss }: { large: boolean; onFlash: (text: string) => void; onDismiss?: () => void }) {
  const s = useStore();
  const n = useNudge();
  const [hidden, setHidden] = useState<string | null>(null);
  const [why, setWhy] = useState(false);
  const j = n.upcoming;
  if (!j || hidden === j.id || s.view === "city") return null;
  return <section className="intent road-intent journey-card" aria-label="For you: a journey coming up">
    <div className="k"><span><Icon name="calendar" size={13} /> {journeyTiming(j)}</span></div>
    <h3>{j.title}</h3>
    <p className="road-line">{j.prepared} of {j.total} steps prepared. {large ? "We can help you with the next step." : "A little preparation now can help later."}</p>
    <button type="button" className="journey-why" aria-expanded={why} onClick={() => setWhy(!why)}>Why?</button>
    {why && <p className="journey-why-copy">{j.reason}</p>}
    <div className="road-acts">
      <button type="button" className="btn" style={{ flex: 1 }} onClick={n.open}>{large ? "See how we can help" : "Prepare this journey"}</button>
      <button type="button" className="btn sec" onClick={() => { setHidden(j.id); onDismiss?.(); onFlash("Suggestion hidden for now"); }}>Not now</button>
    </div>
  </section>;
}
