"use client";

// KBC One · the driving world on the phone.
// Looking ahead (or a detection card) turns the phone to landscape: it rotates, grows until it fills
// most of the screen, the screen turns on, and Hindsight City plays on it. Back to the app turns it back.
//
// Technical rule: R3F and the label layer measure with getBoundingClientRect(), which includes CSS
// transforms. So the phone only rotates/scales DURING the turn; the City mounts after it has settled,
// on a screen with its real width and height, and unmounts before the phone turns back.

import dynamic from "next/dynamic";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../hindsight/components/store";
import { MONTH_LONG } from "../hindsight/engine/everyday";

const City = dynamic(() => import("../hindsight/game/City").then((m) => m.City), {
  ssr: false,
  loading: () => <div className="city-loading mono">Building the city…</div>,
});

/** Preload the 3D chunk when a way into the driving world is on screen, so the screen lights up without a wait. */
export function preloadCity() {
  void import("../hindsight/game/City");
}

type Phase = "off" | "turning" | "on" | "playing" | "closing" | "returning";
type Box = { left: number; top: number; width: number; height: number };

/** A real phone is 19.5:9 ≈ 2.17; a little taller uses more of a laptop screen. */
const RATIO = 2.05;
const TURN_MS = 700;
const POWER_MS = 450;

function reduced() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function targetBox(): Box {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.round(Math.min(vw * 0.95, RATIO * (vh - 120)));
  const height = Math.round(width / RATIO);
  return { width, height, left: Math.round((vw - width) / 2), top: Math.round(Math.max(16, (vh - height) / 2 - 24)) };
}

/** The transform that makes the landscape phone sit exactly on top of the portrait one. */
function fromTransform(target: Box, portrait: DOMRect | null) {
  if (!portrait) return "scale(0.6)";
  const cx = target.left + target.width / 2;
  const cy = target.top + target.height / 2;
  const px = portrait.left + portrait.width / 2;
  const py = portrait.top + portrait.height / 2;
  const s = portrait.height / target.width;
  return `translate(${px - cx}px, ${py - cy}px) rotate(-90deg) scale(${s})`;
}

export function LandscapeCity({
  frameRef,
  onBack,
}: {
  frameRef: RefObject<HTMLDivElement | null>;
  /** told when the customer is back in the app, and whether they kept a plan */
  onBack?: (kept: boolean) => void;
}) {
  const s = useStore();
  const want = s.view === "city";
  const [phase, setPhase] = useState<Phase>("off");
  const [box, setBox] = useState<Box | null>(null);
  const [from, setFrom] = useState("none");
  const [settled, setSettled] = useState(false);
  // the real month when the drive started (driving ahead moves the preview's month, not yours)
  const [startMonth, setStartMonth] = useState("");
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const open = useCallback(() => {
    const t = targetBox();
    const r = frameRef.current?.getBoundingClientRect() ?? null;
    setBox(t);
    setFrom(reduced() ? "none" : fromTransform(t, r));
    setSettled(false);
    setStartMonth(MONTH_LONG[s.life.today.cal.month]);
    setPhase("turning");
    document.body.classList.add("one-landscape");
    // two frames: paint the start pose, then let it turn
    requestAnimationFrame(() => requestAnimationFrame(() => setSettled(true)));
    later(() => setPhase("on"), reduced() ? 120 : TURN_MS + 40);
    later(() => setPhase("playing"), (reduced() ? 120 : TURN_MS + 40) + POWER_MS);
  }, [frameRef, s.life.today.cal.month]);

  const close = useCallback(() => {
    setPhase("closing");
    later(() => {
      const t = targetBox();
      const r = frameRef.current?.getBoundingClientRect() ?? null;
      setBox(t);
      setFrom(reduced() ? "none" : fromTransform(t, r));
      setPhase("returning");
      setSettled(false);
    }, 320);
    later(
      () => {
        setPhase("off");
        document.body.classList.remove("one-landscape");
      },
      320 + (reduced() ? 120 : TURN_MS + 60),
    );
  }, [frameRef]);

  useEffect(() => {
    if (want && phase === "off") open();
    if (!want && (phase === "turning" || phase === "on" || phase === "playing")) close();
  }, [want, phase, open, close]);

  // keep the landscape phone sized to the window while you play
  useEffect(() => {
    if (phase !== "playing") return;
    const onResize = () => setBox(targetBox());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase]);

  if (phase === "off" || !box) return null;
  const mounted = phase === "on" || phase === "playing";
  const transform = phase === "returning" ? from : settled ? "none" : from;
  const month = startMonth || MONTH_LONG[s.life.today.cal.month];

  return (
    <div className={`ls-wrap phase-${phase}`} aria-live="polite">
      <div
        className="ls-phone"
        style={{ ...box, transform, transition: `transform ${reduced() ? 120 : TURN_MS}ms cubic-bezier(.3,.8,.25,1), opacity 200ms` }}
        role="dialog"
        aria-label="The driving world: look ahead on your road"
      >
        <div className="phone-halo ls-halo" aria-hidden="true" />
        <div className="ls-bezel">
          <span className="ls-island" aria-hidden="true" />
          <div className="ls-screen hs">
            {mounted && <City />}
            <div className={`ls-power ${phase === "on" ? "power-on" : phase === "closing" ? "power-off" : phase === "playing" ? "" : "dark"}`} aria-hidden="true" />
            {s.exitAsk && (
              <div className="ls-ask" role="alertdialog" aria-label="Keep your plan?">
                <div className="kicker mint">BEFORE YOU GO BACK</div>
                <div className="ls-ask-title">Make what you prepared your plan?</div>
                <div className="small muted lh">
                  The pots, goal paces and choices you made on this drive are kept. Time doesn't move: you stay in {month}. Only salary day moves your month.
                </div>
                <div className="row gap wrap">
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => {
                      s.exitCity(true);
                      onBack?.(true);
                    }}
                  >
                    Make this my plan
                  </button>
                  <button type="button" className="btn ghost" onClick={() => s.exitCity(false)}>
                    Leave it, go back
                  </button>
                  <button type="button" className="btn ghost" onClick={s.cancelExit}>
                    Keep driving
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {(phase === "playing" || phase === "on") && (
        <div className="ls-under" style={{ top: box.top + box.height + 18 }}>
          <button type="button" className="ls-back" onClick={s.requestExit}>
            ← Back to the app <kbd>Esc</kbd>
          </button>
          <span className="ls-hint">Drive with WASD or the arrows · E to pull over · M bird's eye</span>
        </div>
      )}
    </div>
  );
}
