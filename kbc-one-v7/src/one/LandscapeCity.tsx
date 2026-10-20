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
import type { CityFocus } from "../hindsight/game/neighbourhood";
export type { CityFocus } from "../hindsight/game/neighbourhood";
import { CitySession, type RoadProgress } from "../hindsight/game/hud/CitySession";
import { TripDebrief } from "./TripDebrief";

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
  focus,
}: {
  /** Entry target, applied once when the city opens (set before entering the city).
   * Places: home, garage/car, savings/investments, pension.
   * Journeys: car-insurance, home, savings, pension; also any city road ID or stop key/id.
   * Invalid IDs fall back to the neighbourhood. Without focus, same-road entries start at home.
   */
  focus?: CityFocus;
  frameRef: RefObject<HTMLDivElement | null>;
  /** told when the customer is back in the app, whether they kept a plan, and how many follow-ups */
  onBack?: (kept: boolean, count: number) => void;
}) {
  const s = useStore();
  const want = s.view === "city";
  const [phase, setPhase] = useState<Phase>("off");
  const [box, setBox] = useState<Box | null>(null);
  const [from, setFrom] = useState("none");
  const [settled, setSettled] = useState(false);
  // the real month when the drive started (driving ahead moves the preview's month, not yours)
  const [startMonth, setStartMonth] = useState("");
  const [exitRequested, setExitRequested] = useState(false);
  const [startPlanIds, setStartPlanIds] = useState<string[]>([]);
  const [roadProgress, setRoadProgress] = useState<RoadProgress[]>([]);
  const firstProgress = useRef<RoadProgress[]>([]);
  const updateRoads = useCallback((roads: RoadProgress[]) => {
    if (!firstProgress.current.length && roads.length) firstProgress.current = roads;
    setRoadProgress(roads);
  }, []);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const open = useCallback(() => {
    const t = targetBox();
    const r = frameRef.current?.getBoundingClientRect() ?? null;
    setBox(t);
    setFrom(reduced() ? "none" : fromTransform(t, r));
    setSettled(false);
    setExitRequested(false);
    setStartPlanIds(s.plan.map((item) => item.id));
    firstProgress.current = [];
    setRoadProgress([]);
    setStartMonth(MONTH_LONG[s.life.today.cal.month]);
    setPhase("turning");
    document.body.classList.add("one-landscape");
    // two frames: paint the start pose, then let it turn
    requestAnimationFrame(() => requestAnimationFrame(() => setSettled(true)));
    later(() => setPhase("on"), reduced() ? 120 : TURN_MS + 40);
    later(() => setPhase("playing"), (reduced() ? 120 : TURN_MS + 40) + POWER_MS);
  }, [frameRef, s.life.today.cal.month, s.plan]);

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

  // R3F measures the canvas with getBoundingClientRect (transforms included), and a ResizeObserver never
  // fires for a transform. If the turn finishes late (a slow machine), the canvas would keep the rotated
  // size: once the phone has settled, ask it to measure again.
  useEffect(() => {
    if (phase !== "playing") return;
    const fire = () => window.dispatchEvent(new Event("resize"));
    const ts = [150, 800, 2000, 4000].map((ms) => window.setTimeout(fire, ms));
    return () => ts.forEach((t) => window.clearTimeout(t));
  }, [phase]);

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
        aria-label="Your city: explore what you have and what comes next"
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && e.propertyName === "transform") window.dispatchEvent(new Event("resize"));
        }}
      >
        <div className="phone-halo ls-halo" aria-hidden="true" />
        <div className="ls-bezel">
          <span className="ls-island" aria-hidden="true" />
          <div className="ls-screen hs">
            <CitySession.Provider value={{ updateRoads, requestExit: () => setExitRequested(true), exiting: exitRequested || s.exitAsk }}>
            {mounted && <City focus={focus} />}
            <div className={`ls-power ${phase === "on" ? "power-on" : phase === "closing" ? "power-off" : phase === "playing" ? "" : "dark"}`} aria-hidden="true" />
            {(exitRequested || s.exitAsk) && <TripDebrief month={month} startPlanIds={startPlanIds} startRoads={firstProgress.current} roads={roadProgress} onDone={(kept, count) => { setExitRequested(false); onBack?.(kept, count); }} />}
            </CitySession.Provider>
          </div>
        </div>
      </div>
    </div>
  );
}
