"use client";

import { type CSSProperties, Fragment, useState } from "react";
import { useStore } from "../../hindsight/components/store";
import { Sheet } from "../yourroad/Sheet";
import {
  type BizPhase, type BizProfile, type BizStep, CROWD_TOTAL, crowdFor, detectedProfile, firstNeed,
  FORM_ORDER, FORMS, PARTNERS, type PartnerId, partnersOf, PROFILES, profileById, SYNTHETIC,
} from "./model";
import "./business.css";

export interface BusinessRoadsProps {
  /** demo customer: decides which road KBC already recognises */
  personKey?: string;
  advisorName?: string;
  large?: boolean;
  onClose: () => void;
  /** opens the Kate chat with a question; the roadmap also answers inline */
  onAskKate?: (question: string) => void;
}

type Open = { kind: "step"; phase: BizPhase; step: BizStep } | { kind: "partner"; id: PartnerId } | { kind: "fork" } | null;

const pct = (share: number) => `${Math.round(share * 100)}%`;
const int = (n: number) => n.toLocaleString("en-GB");
const KIND_LABEL = { public: "Public", professional: "Professional", kbc: "KBC" } as const;

export function BusinessRoads(props: BusinessRoadsProps) {
  // A persona switch must start from that person's own road.
  return <BusinessRoadsContent key={props.personKey ?? "none"} {...props} />;
}

function BusinessRoadsContent({ personKey, advisorName, large, onClose, onAskKate }: BusinessRoadsProps) {
  const s = useStore();
  const detected = detectedProfile(personKey);
  const [profileId, setProfileId] = useState(detected ?? PROFILES[0].id);
  const [open, setOpen] = useState<Open>(null);
  const [notice, setNotice] = useState("");
  const profile = profileById(profileId) ?? PROFILES[0];
  const mine = profile.id === detected;
  const nowForm = profile.phases.find((p) => p.id === profile.now)?.form;
  const adviser = advisorName ?? s.advisor?.name ?? "your KBC adviser";

  const remind = (step: BizStep) => {
    s.addPlanItem({
      id: `biz:${profile.id}:${step.id}`,
      source: { scope: "road", roadId: `business:${profile.id}`, key: step.id },
      spec: { kind: "remind", title: step.title, detail: `${profile.headline} · ${step.when}. ${step.todo[0]}.` },
    });
    setNotice(`Saved to your plan: ${step.title}.`);
  };
  const talk = () => {
    s.addPlanItem({
      id: `biz:${profile.id}:adviser`,
      source: { scope: "road", roadId: `business:${profile.id}`, key: "adviser" },
      spec: { kind: "talk", title: `Talk to ${adviser} about your business`, detail: `${profile.headline}. Bring your questions from the roadmap.`, topic: "Starting a business" },
    });
    setNotice(`Saved to your plan: a talk with ${adviser}.`);
  };
  const choose = (id: string) => { setProfileId(id); setOpen(null); setNotice(""); };

  return <div className={`biz ${large ? "biz-large" : ""}`} data-testid="business-roads" style={{ "--biz-hue": profile.hue } as CSSProperties}>
    <header className="biz-header">
      <div className="biz-top"><button type="button" className="biz-back" onClick={onClose}>← Your road</button><small>Synthetic demo data</small></div>
      <h1>Business roadmaps</h1>
      <p>From a side activity to an eenmanszaak, a BV and your first employee. Each road is what people in your job did before you.</p>
      <div className="biz-kate" role="note"><span className="biz-kate-mark" aria-hidden="true">✦</span><p><b>You are not alone.</b> {int(CROWD_TOTAL)} KBC customers walked these roads before you. Kate shares what they did, what it cost them and who helped.</p></div>
    </header>

    <section className="biz-section" aria-labelledby="biz-pick">
      <h2 id="biz-pick">Which road is yours?</h2>
      <div className="biz-profiles" role="radiogroup" aria-labelledby="biz-pick">
        {PROFILES.map((p) => <button type="button" role="radio" aria-checked={p.id === profile.id} key={p.id} className="biz-profile" style={{ "--biz-chip": p.hue } as CSSProperties} onClick={() => choose(p.id)}>
          {p.id === detected && <span className="biz-noticed-badge">KBC noticed</span>}
          <strong>{p.job}</strong>
          <small>{p.headline}</small>
        </button>)}
      </div>
    </section>

    <section className="biz-hero" aria-label={`${profile.job} road`}>
      <small>{mine ? "Your road · KBC knows your job" : `Example · ${profile.name}, ${profile.age}, ${profile.city}`}</small>
      <h2>{profile.headline}</h2>
      <p className="biz-noticed">{mine ? "KBC noticed" : "What KBC would notice"}: {profile.noticed.charAt(0).toLowerCase() + profile.noticed.slice(1)}.</p>
      <p className="biz-crowd-big"><b>{int(profile.crowd)}</b> people in this job walked this road before you</p>
      <ol className="biz-ladder" aria-label="Legal forms on this road">
        {FORM_ORDER.map((form) => {
          const on = profile.forms.includes(form);
          return <li key={form} className={`${on ? "biz-on" : ""} ${form === nowForm ? "biz-here" : ""}`} aria-current={form === nowForm ? "step" : undefined}>
            <span className="biz-ladder-dot" aria-hidden="true" />
            <b>{FORMS[form].short}</b>
            {form === nowForm && <em>{mine ? "You" : profile.name}</em>}
            {!on && <span className="sr-only"> (not on this road)</span>}
          </li>;
        })}
      </ol>
    </section>

    <section className="biz-section" aria-labelledby="biz-map">
      <div className="biz-title-row"><h2 id="biz-map">The roadmap</h2><small>Tap a step</small></div>
      <ol className="biz-road">
        {profile.phases.map((phase) => <Fragment key={phase.id}>
          <li className={`biz-phase ${phase.id === profile.now ? "biz-phase-now" : ""}`}>
            <div className="biz-phase-head">
              <span className={`biz-form biz-form-${phase.form}`}>{FORMS[phase.form].label}</span>
              <h3>{phase.title}</h3>
              <small>{phase.when}</small>
              {phase.id === profile.now && <span className="biz-you">{mine ? "You are here" : `${profile.name} is here`}</span>}
            </div>
            <ol className="biz-steps">
              {phase.steps.map((step) => <li key={step.id}>
                <button type="button" className="biz-step" onClick={() => setOpen({ kind: "step", phase, step })}>
                  <span className="biz-step-dot" aria-hidden="true" />
                  <span className="biz-step-copy">
                    <small>{step.when}</small>
                    <strong>{step.title}</strong>
                    <span className="biz-bar" aria-hidden="true"><i style={{ width: pct(step.crowd.share) }} /></span>
                    <span className="biz-step-crowd"><b>{pct(step.crowd.share)}</b> {step.crowd.label}</span>
                    <span className="biz-tags">{step.partners.map((id) => <span key={id} className={`biz-tag biz-tag-${PARTNERS[id].kind}`}>{PARTNERS[id].name}</span>)}</span>
                  </span>
                </button>
              </li>)}
            </ol>
          </li>
          {profile.fork?.after === phase.id && <li className="biz-fork">
            <div className="biz-fork-card">
              <small>Crossroads</small>
              <h3>{profile.fork.title}</h3>
              <p>{profile.fork.intro}</p>
              {profile.fork.branches.map((b) => <div key={b.id} className="biz-branch">
                <div className="biz-branch-row"><strong>{b.label}</strong><b>{pct(b.share)}</b></div>
                <span className="biz-bar" aria-hidden="true"><i style={{ width: pct(b.share) }} /></span>
                <small>{b.line}</small>
              </div>)}
              <button type="button" className="biz-secondary" onClick={() => setOpen({ kind: "fork" })}>What both groups said</button>
            </div>
          </li>}
        </Fragment>)}
      </ol>
    </section>

    <section className="biz-section" aria-labelledby="biz-team">
      <div className="biz-title-row"><h2 id="biz-team">Your team on this road</h2><small>{partnersOf(profile).length} partners</small></div>
      <p className="biz-sub">Who people in your job worked with, and when they first needed them.</p>
      <ul className="biz-team">
        {partnersOf(profile).map((partner) => {
          const need = firstNeed(profile, partner.id);
          return <li key={partner.id}><button type="button" className="biz-partner" onClick={() => setOpen({ kind: "partner", id: partner.id })}>
            <span className={`biz-kind biz-kind-${partner.kind}`}>{KIND_LABEL[partner.kind]}</span>
            <strong>{partner.name}</strong>
            {partner.local && <small>{partner.local}</small>}
            {need && <span className="biz-need">First needed: {need.step.when.toLowerCase()} · {need.phase.title.toLowerCase()}</span>}
          </button></li>;
        })}
      </ul>
      <button type="button" className="biz-primary" onClick={talk}>Talk to {adviser} about this road</button>
      <p role="status" aria-live="polite" className="biz-notice">{notice}</p>
    </section>
    <p className="biz-footnote">{SYNTHETIC}. Rules and amounts change; your partners confirm what applies to you.</p>

    {open?.kind === "step" && <StepSheet profile={profile} phase={open.phase} step={open.step} onClose={() => setOpen(null)}
      onPartner={(id) => setOpen({ kind: "partner", id })} onRemind={() => remind(open.step)} onAskKate={onAskKate} />}
    {open?.kind === "partner" && <PartnerSheet profile={profile} id={open.id} adviser={adviser} onClose={() => setOpen(null)} onTalk={talk} />}
    {open?.kind === "fork" && profile.fork && <Sheet title={profile.fork.title} onClose={() => setOpen(null)}>
      <div className="biz-sheet">
        {profile.fork.branches.map((b) => <div key={b.id} className="biz-branch">
          <div className="biz-branch-row"><strong>{b.label}</strong><b>{pct(b.share)}</b></div>
          <p>{b.line}</p>
          <blockquote>“{b.quote}”</blockquote>
          <small>{int(crowdFor(profile, b.share))} people took this branch</small>
        </div>)}
        <KateBox text={profile.fork.kate} question={`I am a ${profile.job.toLowerCase()}. ${profile.fork.title} What did people in my job choose?`} onAskKate={onAskKate} />
      </div>
    </Sheet>}
  </div>;
}

function KateBox({ text, question, onAskKate }: { text: string; question: string; onAskKate?: (q: string) => void }) {
  return <div className="biz-kate biz-kate-answer">
    <span className="biz-kate-mark" aria-hidden="true">✦</span>
    <div><b>Kate</b><p>{text}</p>{onAskKate && <button type="button" className="biz-text-button" onClick={() => onAskKate(question)}>Ask Kate more →</button>}</div>
  </div>;
}

function StepSheet({ profile, phase, step, onClose, onPartner, onRemind, onAskKate }: {
  profile: BizProfile; phase: BizPhase; step: BizStep; onClose: () => void;
  onPartner: (id: PartnerId) => void; onRemind: () => void; onAskKate?: (q: string) => void;
}) {
  const s = useStore();
  const saved = s.plan.some((p) => p.id === `biz:${profile.id}:${step.id}`);
  return <Sheet title={step.title} onClose={onClose}>
    <div className="biz-sheet">
      <p className="biz-sheet-meta"><span className={`biz-form biz-form-${phase.form}`}>{FORMS[phase.form].label}</span> {phase.title} · {step.when}</p>
      <p>{step.detail}</p>
      <h3>What to do</h3>
      <ul className="biz-todo">{step.todo.map((t) => <li key={t}>{t}</li>)}</ul>
      <h3>Who helps</h3>
      <div className="biz-sheet-partners">{step.partners.map((id) => <button type="button" key={id} className={`biz-tag biz-tag-${PARTNERS[id].kind}`} onClick={() => onPartner(id)}>{PARTNERS[id].name} ›</button>)}</div>
      <div className="biz-evidence">
        <b>{pct(step.crowd.share)}</b>
        <span>{int(crowdFor(profile, step.crowd.share))} of {int(profile.crowd)} people on this road {step.crowd.label}.</span>
      </div>
      {step.quote && <blockquote>“{step.quote.text}”<cite>{step.quote.by}</cite></blockquote>}
      <KateBox text={step.kate} question={`I am a ${profile.job.toLowerCase()}. What did people in my job do about this step: ${step.title.toLowerCase()}?`} onAskKate={onAskKate} />
      <button type="button" className="biz-primary" disabled={saved} onClick={onRemind}>{saved ? "In your plan" : "Remind me in my plan"}</button>
    </div>
  </Sheet>;
}

function PartnerSheet({ profile, id, adviser, onClose, onTalk }: { profile: BizProfile; id: PartnerId; adviser: string; onClose: () => void; onTalk: () => void }) {
  const partner = PARTNERS[id];
  const steps = profile.phases.flatMap((phase) => phase.steps.filter((st) => st.partners.includes(id)).map((st) => ({ phase, st })));
  return <Sheet title={partner.name} onClose={onClose}>
    <div className="biz-sheet">
      <p className="biz-sheet-meta"><span className={`biz-kind biz-kind-${partner.kind}`}>{KIND_LABEL[partner.kind]}</span>{partner.local ? ` ${partner.local}` : ""}</p>
      <p>{partner.role}</p>
      {partner.options && <>
        <h3>What people in your job chose</h3>
        <ul className="biz-options">{partner.options.map((o) => <li key={o.label}>
          <div className="biz-branch-row"><strong>{o.label}</strong><b>{pct(o.share)}</b></div>
          <span className="biz-bar" aria-hidden="true"><i style={{ width: pct(o.share) }} /></span>
          <small>{o.note}</small>
        </li>)}</ul>
      </>}
      <h3>On your road</h3>
      <ul className="biz-todo">{steps.map(({ phase, st }) => <li key={st.id}>{st.title} <small>· {phase.title}, {st.when.toLowerCase()}</small></li>)}</ul>
      {partner.kind === "kbc"
        ? <button type="button" className="biz-primary" onClick={onTalk}>Talk to {adviser}</button>
        : <p className="biz-sub">KBC does not choose for you. {adviser} can introduce you to partners others on this road worked with.</p>}
    </div>
  </Sheet>;
}
