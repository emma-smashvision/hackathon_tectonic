"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  { title: "This is your neighbourhood", text: "The places show what you have: your home, car, savings and pension." },
  { title: "Each road is something coming up", text: "Your roads come from your plans and dates. Each one tells you why it is on your map." },
  { title: "Drive to a gate and get ready", text: "Tap a road to drive there, or use the arrows. Add a plan step at each gate. Aim for 100% ready before the date." },
];

function IntroVisual({ step }: { step: number }) {
  return <svg className="city-intro-visual" viewBox="0 0 300 150" aria-hidden="true">
    <path d="M20 123H280M150 123V20" stroke="#203c57" strokeWidth="22" fill="none" strokeLinecap="round" />
    <path d="M20 123H280M150 123V20" stroke="#6fcff4" strokeWidth="2" strokeDasharray="5 9" fill="none" />
    {step === 0 ? <>
      <path d="M44 67L75 42L106 67V102H44Z" fill="#186a99" stroke="#86dcff" strokeWidth="2" /><rect x="68" y="78" width="15" height="24" rx="2" fill="#a9e7ff" />
      <rect x="193" y="67" width="58" height="36" rx="8" fill="#186a99" /><path d="M202 68L213 53H237L246 68" fill="#60cff2" /><circle cx="207" cy="103" r="7" fill="#b6dff2" /><circle cx="240" cy="103" r="7" fill="#b6dff2" />
      <text x="75" y="31" textAnchor="middle">Home</text><text x="225" y="37" textAnchor="middle">Car</text>
    </> : step === 1 ? <>
      <path d="M150 87Q150 65 89 49M150 71Q150 51 217 34" stroke="#38bdf8" strokeWidth="8" fill="none" />
      <rect x="27" y="20" width="103" height="32" rx="7" fill="#186a99" /><text x="78" y="41" textAnchor="middle">Moving day</text>
      <rect x="173" y="13" width="112" height="32" rx="7" fill="#186a99" /><text x="229" y="34" textAnchor="middle">Insurance</text>
      <text x="150" y="148" textAnchor="middle">Your plans + your dates</text>
    </> : <>
      <path d="M119 82V29H181V82" fill="none" stroke="#6fe0b5" strokeWidth="8" strokeLinecap="round" /><circle cx="150" cy="37" r="23" fill="#0b2630" stroke="#6fe0b5" strokeWidth="4" /><text x="150" y="42" textAnchor="middle" fill="#a8f7d8">100%</text>
      <text x="222" y="88" textAnchor="middle">Ready!</text>
    </>}
    <rect x="140" y="100" width="20" height="32" rx="7" fill="#62d2ff" stroke="#d8f5ff" strokeWidth="2" />
  </svg>;
}

export function CityIntro({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previous?.focus();
  }, []);
  return <div className="city-intro-scrim" data-hud onKeyDown={(event) => {
    if (event.key === "Escape") { event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const buttons = [...(dialog.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
      const next = event.shiftKey ? buttons[buttons.length - 1] : buttons[0];
      const edge = event.shiftKey ? buttons[0] : buttons[buttons.length - 1];
      if (document.activeElement === edge) { event.preventDefault(); next?.focus(); }
    }
  }}>
    <div className="city-intro" role="dialog" aria-modal="true" aria-labelledby="city-intro-title" ref={dialog}>
      <div className="city-intro-progress"><span>Meet your city · {step + 1} of 3</span><button type="button" onClick={onClose}>Skip intro</button></div>
      <IntroVisual step={step} />
      <div aria-live="polite"><h2 id="city-intro-title">{STEPS[step].title}</h2><p>{STEPS[step].text}</p></div>
      <div className="city-intro-footer"><div className="city-intro-dots" aria-hidden="true">{STEPS.map((_, i) => <i key={i} className={i === step ? "on" : ""} />)}</div><button type="button" className="btn primary" onClick={() => step < 2 ? setStep(step + 1) : onClose()}>{step < 2 ? "Next" : "Explore my city"}</button></div>
    </div>
  </div>;
}
