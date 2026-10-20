"use client";

import { useEffect } from "react";
import { useStore } from "../../components/store";
import { Icon } from "../../components/ui";
import { KIND_LABEL, specForGoal, type TripPick } from "../../engine/plan";
import { maskMoney, type Place, type PlaceAction, placeSuggestion } from "../../engine/world";
import { useGame } from "../runtime";

// Pull over at a place in your own world: your own products, the facts, and only next steps of
// what you already do. Everything you pick goes into the glovebox; nothing happens until you confirm
// it on the way out. On Market Mile there is nothing to trade: read, keep or pause your own plan, talk.

function Action({ place, a }: { place: Place; a: PlaceAction }) {
  const s = useStore();
  const mask = (t: string) => (s.hideAmounts ? maskMoney(t) : t);
  if (a.type === "pick") {
    const id = `place:${place.id}:${a.id}`;
    const on = s.glovebox.some((p) => p.id === id) || (s.view !== "city" && s.plan.some((p) => p.id === id));
    const pick: TripPick = { id, source: { scope: "place", roadId: s.road.id, key: place.id, actionId: a.id }, spec: a.spec };
    return (
      <div className="stack-4">
        <button type="button" className={`chip-btn ${on ? "on" : ""}`} aria-pressed={on} onClick={() => (on ? s.dropPick(id) : s.pickUp(pick))}>
          <Icon name={on ? "check" : "plus"} size={14} />
          {mask(a.spec.title)}
        </button>
        <span className="xs muted tip-next">
          <b className={`kind-tag kind-${a.spec.kind}`}>{KIND_LABEL[a.spec.kind]}</b>{" "}
          {on ? "In your glovebox: you confirm it when you leave." : mask(a.spec.detail)}
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
          <b className="kind-tag kind-setup">{KIND_LABEL.setup}</b> {on ? "In your glovebox: you confirm it when you leave." : mask(`${a.note} ${spec.detail}`)}
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

export function PlacePanel({ placeId }: { placeId: string }) {
  const { places, setPanel } = useGame();
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
    logVisit({
      key: place.id,
      roadId: road.id,
      title: place.title,
      kind: "place",
      suggest: spec && first ? { id: `place:${place.id}:${first.id}`, source: { scope: "place", roadId: road.id, key: place.id, actionId: first.id }, spec } : undefined,
    });
  }, [placeId]);
  if (!place) return null;
  return (
    <aside className="sheet place-sheet" role="dialog" aria-label={place.title} data-hud>
      <div className="row between start">
        <div className="stack-6">
          <div className="kicker" style={{ color: place.accent }}>
            {place.kicker}
          </div>
          <h2 className="sheet-title">{place.title}</h2>
        </div>
        <button type="button" className="icon-btn" aria-label="Close (Esc)" onClick={() => setPanel(null)}>
          ✕
        </button>
      </div>
      <dl className="place-facts">
        {place.facts.map((f) => (
          <div key={f.label} className={`place-fact ${f.tone ? `tone-${f.tone}` : ""}`}>
            <dt>{f.label}</dt>
            <dd>
              {f.tone === "ok" && <Icon name="check" size={12} />} {mask(f.value)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="card-body">{mask(place.body)}</p>
      {place.news && place.news.length > 0 && (
        <div className="place-news">
          <div className="panel-title">
            News <span className="demo-tag">DEMO · generated from synthetic prices</span>
          </div>
          {place.news.map((n) => (
            <div key={n.text} className="news-row">
              <span className="mono xs muted">{n.when}</span>
              <span className="small">{n.text}</span>
            </div>
          ))}
        </div>
      )}
      {place.actions.length > 0 ? (
        <div className="stack-12">
          <div className="panel-title">Your next steps</div>
          {place.actions.map((a) => (
            <Action key={a.id} place={place} a={a} />
          ))}
        </div>
      ) : (
        <div className="xs muted">Nothing to do here. Just yours to see.</div>
      )}
      <p className="fineprint">Your own products, only visible to you. Synthetic demo data.</p>
    </aside>
  );
}
