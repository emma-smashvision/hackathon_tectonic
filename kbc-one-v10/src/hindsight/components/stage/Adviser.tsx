"use client";

import { useEffect, useState } from "react";
import { channelCardFor, type RoadFocus } from "../../../one/nudge/channels";
import { PEOPLE } from "../../../one/people";
import { getRoad } from "../../engine/roads";
import { catalogueRoad, questionsFor, stopEvidenceFor, type PersonPointers } from "../../../one/crowd";
import { useStore } from "../store";

/** v8-channels: the customer and adviser share one explicit road/stop identity. */
export function Adviser({ focus, pointers }: { focus?: RoadFocus; pointers?: PersonPointers }) {
  const s = useStore();
  const [shared, setShared] = useState(true);
  const person = s.person ? PEOPLE[s.person.key] : undefined;
  const card = person ? channelCardFor(person, { pointers }) : null;
  const destination = focus ?? card;
  const roadId = destination?.roadId ?? s.road.id;
  const road = getRoad(roadId);
  const stop = road?.stops.find(item => item.id === destination?.stopId);
  const fork = road?.fork?.id === destination?.stopId ? road?.fork : undefined;
  const name = person?.persona.name ?? "This customer";
  const care = !!catalogueRoad(roadId)?.care;
  const careOptIn = s.journeyFor(roadId).careOptIn;
  const evidence = destination?.stopId ? stopEvidenceFor(roadId, destination.stopId, { careOptIn }) : null;
  const questions = questionsFor(roadId, { careOptIn });
  const denominator = questions[0]?.denominator;
  const saved = s.plan.filter(item => item.source.roadId === roadId);
  useEffect(() => {
    if (!shared) return;
    s.logAccess({ who: "Adviser desk", reason: "customer-shared road for this demo call", roadId: roadId });
    // Log once for each road opened, not each store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadId, shared]);
  return <div className="desk" data-road-id={roadId} data-stop-id={destination?.stopId}>
    <header className="desk-head">
      <div className="kicker dark">KBC · ADVISER DESK · SYNTHETIC DEMO</div>
      <h1 className="desk-title">{name}{shared ? ` · ${catalogueRoad(roadId)?.name ?? "Your road"}` : ""}</h1>
      <p className="consent-pill">{shared ? `Demo consent: ${name} shared this road for this call. Access appears in their access log.` : "Demo sharing ended."}</p>
      <button type="button" className="btn small outline-dark" onClick={() => setShared(!shared)}>{shared ? "End demo sharing" : "Share for this demo call"}</button>
    </header>
    {!shared ? <p>Sharing ended. The adviser cannot see road details.</p> : <>
    <section className="desk-road"><h2>{evidence?.title ?? stop?.title ?? fork?.title ?? card?.title ?? catalogueRoad(roadId)?.name}</h2><p>Same road and stop as the customer’s app.</p></section>
    <div className="desk-grid">
      <section className="desk-card"><h2>Common questions at this stop</h2>
        <p className="xs muted">Synthetic questions for this road; discussed at the selected stop. {denominator?.shown ? `Denominator: ${denominator.value?.toLocaleString("en-GB")} earlier travellers (privacy-noised).` : care && !careOptIn ? "The customer has not asked to see crowd support yet." : "Numbers withheld: the group is too small."}</p>
        <ul className="desk-list plain">{questions.map(question => <li key={question.question}>“{question.question}” {question.share.shown && question.denominator.shown ? <strong> · {Math.round(question.share.value! * 100)}% of {question.denominator.value?.toLocaleString("en-GB")} earlier travellers</strong> : <span> · withheld</span>}</li>)}</ul>
      </section>
      <section className="desk-card"><h2>Saved steps</h2>
        {saved.length ? <ul className="desk-list plain">{saved.map(item => <li key={item.id}><strong>{item.title}</strong><p>{item.detail}</p></li>)}</ul> : <p>No saved steps on this road yet. Steps saved in the app appear here.</p>}
        {care && <p>A person first. No offers or unsolicited reminders.</p>}
      </section>
    </div></>}
  </div>;
}
