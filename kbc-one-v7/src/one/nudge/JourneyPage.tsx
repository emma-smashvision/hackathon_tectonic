"use client";

import { useState } from "react";
import { useReport, useStore } from "../../hindsight/components/store";
import { MONTH_LONG } from "../../hindsight/engine/everyday";
import { Icon } from "../../kbc/ui/icons";
import { journeyTiming, type UpcomingJourney } from "./model";
import { useNudge } from "./NudgeProvider";

export function JourneyPage({ journey, onClose, onPlan, onCity }: {
  journey: UpcomingJourney; onClose: () => void; onPlan: () => void; onCity: (focus?: string) => void;
}) {
  const s = useStore();
  const { allowCity } = useNudge();
  const [added, setAdded] = useState("");
  useReport(journey.crowd.decisions);
  return <>
    <header className="journey-header">
      <button className="journey-back" type="button" onClick={onClose} aria-label="Back to the app"><Icon name="back" size={18} /> Back</button>
      <span>Your journey</span>
    </header>
    <div className="journey-content">
      <p className="journey-date">{journey.when.day} {MONTH_LONG[journey.when.month]} · {journeyTiming(journey)}</p>
      <h1 id="journey-title">{journey.title}</h1>
      <p className="journey-summary">{journey.summary}</p>
      <dl className="journey-product"><dt>Your product</dt><dd>{journey.product}</dd></dl>
      <section className="journey-crowd" aria-label="People like you"><h2>{journey.crowd.decisions.length ? "People like you" : "Why this suggestion"}</h2><p>{journey.crowd.text}</p></section>
      <div className="journey-prepared">
        <span>Prepared <b>{journey.prepared} of {journey.total} steps</b></span>
        <progress aria-label="Preparation steps" value={journey.prepared} max={journey.total} />
      </div>
      <div className="journey-actions">
        {journey.actions.map((action, i) => {
          const on = s.plan.some((item) => item.id === action.pick.id);
          return <button type="button" className={`journey-action ${i === 0 ? "primary" : ""} ${on ? "added" : ""}`} key={action.pick.id} disabled={on} onClick={() => {
            s.addPlanItem(action.pick);
            setAdded(action.label);
          }}><span>{action.label}</span><Icon name={on ? "check" : "plus"} size={18} />{on && <small>On your plan</small>}</button>;
        })}
      </div>
      {added && <div className="journey-success" role="status"><Icon name="check" size={17} /><span>Added to your plan.</span><button type="button" onClick={onPlan}>See your plan</button></div>}
      <p className="journey-footnote">One tap adds a step to your plan. You can remove it there.</p>
      {journey.cityFocus && allowCity && <button className="journey-city" type="button" onClick={() => onCity(journey.cityFocus)}>See it in your city <span aria-hidden="true">›</span></button>}
    </div>
  </>;
}
