"use client";

import { useEffect } from "react";
import { useStore } from "../../components/store";
import { Icon } from "../../components/ui";
import { KIND_LABEL, specForGoal, type TripPick } from "../../engine/plan";
import { maskMoney, type Place, type PlaceAction, placeSuggestion } from "../../engine/world";
import { journeyForPlace, journeyTitle } from "../neighbourhood";
import { useGame } from "../runtime";

// Pull over at a place in your own world: your own products, the facts, and only next steps of
// what you already do. Everything you pick goes into the glovebox; nothing happens until you confirm
// it on the way out. On Market Mile there is nothing to trade: read, keep or pause your own plan, talk.

/** A grouped savings place retains the original product IDs used by the plain app. */
function actionSource(place: Place, action: PlaceAction) {
  const composite = place.id === "savings" ? action.id : `${place.id}:${action.id}`;
  const split = composite.lastIndexOf(":");
  return { id: `place:${composite}`, key: composite.slice(0, split), actionId: composite.slice(split + 1) };
}

function Action({ place, a }: { place: Place; a: PlaceAction }) {
  const s = useStore();
  const mask = (t: string) => (s.hideAmounts ? maskMoney(t) : t);
  if (a.type === "pick") {
    const { id, key, actionId } = actionSource(place, a);
    const inPlan = s.plan.some((p) => p.id === id);
    const on = inPlan || s.glovebox.some((p) => p.id === id);
    const pick: TripPick = { id, source: { scope: "place", roadId: s.road.id, key, actionId }, spec: a.spec };
    return (
      <div className="stack-4">
        <button type="button" className={`chip-btn ${on ? "on" : ""}`} aria-pressed={on} disabled={inPlan} onClick={() => (on ? s.dropPick(id) : s.pickUp(pick))}>
          <Icon name={on ? "check" : "plus"} size={14} />
          {inPlan ? "In your plan ✓" : mask(a.spec.title)}
        </button>
        <span className="xs muted tip-next">
          <b className={`kind-tag kind-${a.spec.kind}`}>{KIND_LABEL[a.spec.kind]}</b>{" "}
          {inPlan ? mask(a.spec.title) : on ? "Saved for later: you confirm it when you leave." : mask(a.spec.detail)}
        </span>
        {!on && a.spec.product && <span className="xs tag-product">KBC product · {a.spec.product}</span>}
      </div>
    );
  }
  if (a.type === "goal") {
    const g = s.life.goals.find((x) => x.id === a.goalId);
    if (!g) return null;
    const on = g.monthly === a.monthly;
    const spec = specForGoal(g.label, a.monthly, g.defaultMonthly);
    return (
      <div className="stack-4">
        <button
          type="button"
          className={`chip-btn ${on ? "on" : ""}`}
          aria-pressed={on}
          onClick={() => s.setGoal(a.goalId, { monthly: on ? g.defaultMonthly : a.monthly })}
        >
          <Icon name={on ? "check" : "plus"} size={14} />
          {mask(a.label)}
        </button>
        <span className="xs muted tip-next">
          <b className="kind-tag kind-setup">{KIND_LABEL.setup}</b> {on ? "Saved for later: you confirm it when you leave." : mask(`${a.note} ${spec.detail}`)}
        </span>
      </div>
    );
  }
  const on = (s.journey.cover ?? []).includes(a.coverId);
  return (
    <div className="stack-4">
      <button type="button" className={`chip-btn ${on ? "on" : ""}`} aria-pressed={on} onClick={() => s.checkCover(a.coverId)}>
        <Icon name={on ? "check" : "plus"} size={14} />
        {a.label}
      </button>
      <span className="xs muted tip-next">
        <b className="kind-tag kind-check">{KIND_LABEL.check}</b> {on ? "Checked. It's on your plan when you confirm on the way out." : a.note}
      </span>
    </div>
  );
}

export function PlacePanel({ placeId, journey = false }: { placeId: string; journey?: boolean }) {
  const { places, setPanel, travelTo } = useGame();
  const s = useStore();
  const place = places.find((p) => p.id === placeId);
  const mask = (t: string) => (s.hideAmounts ? maskMoney(t) : t);
  const { logVisit, road } = s;
  // log the visit once, for the debrief on the way out (with a follow-up worth considering)
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per place
  useEffect(() => {
    if (!place) return;
    const spec = placeSuggestion(place);
    const first = place.actions.find((a) => a.type === "pick");
    const source = first ? actionSource(place, first) : null;
    logVisit({
      key: place.id,
      roadId: road.id,
      title: place.title,
      kind: "place",
      suggest: spec && source ? { id: source.id, source: { scope: "place", roadId: road.id, key: source.key, actionId: source.actionId }, spec } : undefined,
    });
  }, [placeId]);
  if (!place) return null;
  const showActions = journey || place.street === "market";
  const firstTower = places.find((p) => p.kind === "tower");
  return (
    <aside className="sheet place-sheet" role="dialog" aria-label={place.title} data-hud>
      <div className="row between start">
        <div className="stack-6">
          <div className="kicker" style={{ color: place.accent }}>
            {journey ? "YOUR JOURNEY" : place.kicker}
          </div>
          <h2 className="sheet-title">{journey ? journeyTitle(journeyForPlace(place.id)) : place.title}</h2>
        </div>
        <button type="button" className="icon-btn" aria-label="Close (Esc)" onClick={() => setPanel(null)}>
          ✕
        </button>
      </div>
      <p className="city-place-summary">{mask(place.line)}</p>
      <dl className="place-facts">
        {(journey ? (place.id === "garage" ? place.facts.filter((f) => f.label === "Insurance") : place.facts.slice(0, 2)) : place.facts.slice(0, 3)).map((f) => (
          <div key={f.label} className={`place-fact ${f.tone ? `tone-${f.tone}` : ""}`}>
            <dt>{f.label}</dt>
            <dd>
              {f.tone === "ok" && <Icon name="check" size={12} />} {mask(f.value)}
            </dd>
          </div>
        ))}
      </dl>
      {showActions && <p className="card-body">{mask(place.body)}</p>}
      {showActions && (place.actions.length > 0 ? (
        <div className="stack-12">
          <div className="panel-title">Your next steps</div>
          {place.actions.slice(0, 3).map((a) => (
            <Action key={a.id} place={place} a={a} />
          ))}
        </div>
      ) : (
        <div className="xs muted">Nothing to do here. Just yours to see.</div>
      ))}
      {!showActions && <button type="button" className="btn primary city-take-road" onClick={() => travelTo({ kind: "journey", id: journeyForPlace(place.id) })}>Take this road →</button>}
      {place.id === "savings" && firstTower && <button type="button" className="btn ghost" onClick={() => travelTo({ kind: "place", id: firstTower.id })}>Explore Market Mile →</button>}
      {place.street === "market" && <button type="button" className="btn ghost" onClick={() => travelTo({ kind: "place", id: "savings" })}>← Back to my street</button>}
      {place.id === "savings" && place.facts.length > 3 && <details className="city-products">
        <summary>All savings and investment product details</summary>
        <dl className="place-facts">{place.facts.map((fact) => <div key={fact.label} className="place-fact"><dt>{fact.label}</dt><dd>{mask(fact.value)}</dd></div>)}</dl>
      </details>}
      <p className="fineprint">Your own products, only visible to you. Synthetic demo data.</p>
    </aside>
  );
}
