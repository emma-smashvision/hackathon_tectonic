"use client";

import { useEffect, useRef } from "react";
import { Icon } from "../../kbc/ui/icons";
import { JourneyPage } from "./JourneyPage";
import { PRIVATE_NUDGE } from "./model";
import { useNudge } from "./NudgeProvider";
import "./nudge.css";

export function NudgeSurface({ onPlan, onCity, onPresent }: { onPlan: () => void; onCity: (focus?: string) => void; onPresent: () => void }) {
  const n = useNudge();
  const panel = useRef<HTMLDivElement>(null);
  const shown = !!n.active;
  const present = useRef(onPresent);
  present.current = onPresent;
  useEffect(() => { if (shown) present.current(); }, [shown]);
  useEffect(() => {
    if (!shown || !panel.current) return;
    const prior = document.activeElement as HTMLElement | null;
    const root = panel.current;
    const siblings = [...(root.parentElement?.children ?? []), ...(root.closest(".phone-frame")?.querySelectorAll(".road-layer") ?? [])].filter((el) => el !== root) as HTMLElement[];
    const before = siblings.map((el) => el.inert);
    siblings.forEach((el) => { el.inert = true; });
    const frame = requestAnimationFrame(() => root.querySelector<HTMLButtonElement>("button")?.focus());
    return () => { cancelAnimationFrame(frame); siblings.forEach((el, i) => { el.inert = before[i]; }); prior?.focus(); };
  }, [shown, n.locked]);
  if (!n.active) return null;
  return <div ref={panel} className={`journey-overlay ${n.locked ? "journey-locked" : ""}`} role="dialog" aria-modal="true" aria-label={n.locked ? "KBC notification" : "Your journey"} onKeyDown={(e) => {
    if (e.key === "Escape") n.close();
    if (e.key === "Tab") {
      const buttons = [...(panel.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
      const first = buttons[0]; const last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  }}>
    {n.locked ? <>
      <div className="journey-lock-symbol" aria-hidden="true"><Icon name="lock" size={26} /></div>
      <div className="journey-lock-brand" aria-hidden="true">KBC<span>.</span></div>
      <p className="journey-lock-caption">A little preparation. More peace of mind.</p>
      <button type="button" className="journey-notification" onClick={n.unlock}>
        <span className="journey-notification-top"><b>KBC</b><span>now</span></span>
        <strong>{PRIVATE_NUDGE.title}</strong><span>{PRIVATE_NUDGE.body}</span>
        <span className="journey-unlock">Tap to open securely <span aria-hidden="true">›</span></span>
      </button>
      <button type="button" className="journey-lock-dismiss" onClick={n.close}>Not now</button>
    </> : <JourneyPage journey={n.active} onClose={n.close} onPlan={() => { n.close(); onPlan(); }} onCity={(focus) => { n.close(); onCity(focus); }} />}
  </div>;
}
