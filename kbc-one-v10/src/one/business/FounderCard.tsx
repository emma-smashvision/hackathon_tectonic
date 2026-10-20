"use client";

import { chapter, chapterTitle, nowNode, routeNodes } from "./founder";
import { FIcon } from "./FounderIcon";
import { useFounderRoad } from "./founderState";
import { customerRoad } from "./model";
import "./founder.css";

/** "Your road" card for a customer with a business road: where they are, the next stop and this chapter. */
export function FounderCard({ personKey, onOpen }: { personKey: string; onOpen: () => void }) {
  const customer = customerRoad(personKey);
  const { road, chosen } = useFounderRoad(personKey, customer?.profile);
  if (!road) return null;
  const now = nowNode(road) ?? routeNodes(road, chosen).find((n) => n.status === "next");
  if (!now) return null;
  const ch = chapter(now.chapter);
  const steps = routeNodes(road, chosen).filter((n) => n.chapter === now.chapter && n.status !== "optional").slice(0, 5);
  const fork = road.fork && !chosen && road.fork.chapter === now.chapter ? road.fork : undefined;
  const pick = fork?.pick ?? "b";
  const form = now.form;
  return <section className="fr-card" aria-labelledby="fr-card-title">
    <div className="fr-card-top"><b>Now · {ch.name}</b><span>Chapter {ch.n} of 7</span></div>
    <h2 id="fr-card-title">{chapterTitle(road, now.chapter)}</h2>
    {fork && <div className="fr-card-graphic" aria-hidden="true">
      <svg viewBox="0 0 340 120" width="100%" height="120">
        <rect x="0" y="28" width="340" height="26" fill="#132a42" /><rect x="0" y="74" width="340" height="26" fill="#132a42" />
        <path d="M0 87 H40" stroke="#59dcff" strokeWidth="4" fill="none" />
        <circle cx="22" cy="87" r="4" fill="#59dcff" />
        <path d={pick === "b" ? "M70 87 C120 87 130 41 190 41 H340" : "M70 87 H340"} stroke="#59dcff" strokeWidth="3.5" strokeDasharray="9 7" fill="none" />
        <path d={pick === "b" ? "M70 87 H340" : "M70 87 C120 87 130 41 190 41 H340"} stroke="#3a536c" strokeWidth="3" strokeDasharray="7 7" fill="none" />
        <circle cx="70" cy="87" r="15" fill="#0f2034" stroke="#59dcff" strokeWidth="3" /><circle cx="70" cy="87" r="8" fill="#fff" />
        <text x="70" y="62" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="600">You</text>
        <circle cx="240" cy="41" r="5" fill="#59dcff" /><path d="M300 30 V54" stroke="#59dcff" strokeWidth="3" />
        <text x="190" y="18" fill="#59dcff" fontSize="13" fontWeight="650">{fork[pick === "b" ? "b" : "a"].label}</text>
        <text x="190" y="116" fill="#8aa0b8" fontSize="13" fontWeight="600">{fork[pick === "b" ? "a" : "b"].label}</text>
      </svg>
    </div>}
    <div className="fr-card-next"><span>Next stop</span><b>{now.status === "now" ? "Today" : "Up next"}</b></div>
    <h3>{now.title}</h3>
    <p className="fr-card-sub">{form ? `Kate filled in ${form.fromKbc.length} of ${form.fromKbc.length + form.needYou.length}` : now.sub}{now.minutes ? ` · about ${now.minutes} min` : ""}</p>
    <button type="button" className="fr-light-button" onClick={onOpen}>Continue <FIcon name="arrow" size={20} /></button>
    <div className="fr-stepper-head"><strong>This chapter</strong><span>{steps.filter((n) => n.status === "done").length} of {steps.length} done</span></div>
    <ol className="fr-stepper">{steps.map((n) => <li key={n.id} className={`fr-step-${n.status}`}><i><FIcon name={n.status === "done" ? "check" : n.icon} size={n.status === "now" ? 22 : 18} /></i>{n.short}</li>)}</ol>
  </section>;
}
