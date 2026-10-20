"use client";

import { useState } from "react";
import { PEOPLE } from "@/one/people";
import { engineRoad } from "@/one/crowd/catalogue";
import { Icon } from "./Icon";
import styles from "./world.module.css";

/** Consent stays in this world session. Care never calls a game-progress action. */
export function CareContent({ personaId, accepted, onAccept, onClose }: { personaId: string; accepted: boolean; onAccept: () => void; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [savedQuestion, setSavedQuestion] = useState("");
  const person = PEOPLE[personaId];
  const adviser = person?.advisor?.name ?? "your adviser";
  const careRoad = engineRoad(person?.roadId ?? "");
  const steps = careRoad?.care ? careRoad.stops : [];
  return <section className={styles.careContent} aria-label={accepted ? "Care garden" : "Support options"}>
    <Icon name="care" size={38} />
    <h3>At your pace{person ? `, ${person.persona.name}` : ""}.</h3>
    <p>Some moments need space and a person who listens. {adviser} can help you decide what feels useful.</p>
    {!accepted ? <><p>Would you like to see practical steps that helped other people? Nothing opens until you choose.</p><button type="button" className={styles.primary} onClick={onAccept}>Show what helped others when I’m ready</button><button type="button" className={styles.button} onClick={onClose}>Not now</button></> : <>
      <h3>Practical help, when you want it</h3>
      {steps.map(step => <details key={step.id}><summary>{step.title}</summary><p>{step.advice}</p></details>)}
      {!steps.length && <p>You can start with a question for your adviser. There is no need to choose a life event here.</p>}
      <form onSubmit={event => { event.preventDefault(); setSavedQuestion(question.trim()); }}><label htmlFor="world-care-question">A question for {adviser}</label><textarea id="world-care-question" rows={3} value={question} onChange={event => setQuestion(event.target.value)} /><button type="submit" className={styles.button} disabled={!question.trim()}>Keep my question in this session</button>{savedQuestion && <p role="status">Your question is kept here until you close this garden. No message was sent or appointment booked.</p>}</form>
      <button type="button" className={styles.button} onClick={onClose}>Enough for now</button>
    </>}
  </section>;
}
