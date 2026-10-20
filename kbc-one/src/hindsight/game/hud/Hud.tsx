"use client";

import { useEffect, useRef, useState } from "react";
import { dayLabel, MONTH_LONG } from "../../engine/everyday";
import { int, months1 } from "../../engine/format";
import { readiness, roadReadiness } from "../../engine/game";
import { crowdLine, refFromKey } from "../../engine/life";
import type { StopDef } from "../../engine/types";
import { FuelGauge } from "../../components/phone/cockpit";
import { useStore } from "../../components/store";
import { Icon } from "../../components/ui";
import { EVERYDAY, everydayStop } from "../../engine/everyday";
import type { Input } from "../driving";
import { monthAtAngle } from "../everydayRing";
import { DISTRICTS } from "../network";
import { type Hud as HudState, useGame } from "../runtime";
import { Minimap } from "./Minimap";
import { CarePanel, CompletePanel, EverydayPanel, ForkPanel, MapPanel, PassportPanel, RecapPanel, StopPanel } from "./Panels";
import { Intro, Quests } from "./Quests";

const KEYMAP: Record<string, keyof Input> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "brake",
};

function useKeyboard(onAction: (a: "pull" | "map" | "passport" | "close") => void) {
  const { rt } = useGame();
  const act = useRef(onAction);
  act.current = onAction;
  useEffect(() => {
    const typing = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        act.current("close");
        return;
      }
      if (typing(e)) return;
      const k = KEYMAP[e.code];
      if (k) {
        rt.current.keys[k] = true;
        e.preventDefault();
        return;
      }
      if (e.repeat) return;
      if (e.code === "KeyE" || e.code === "Enter") act.current("pull");
      if (e.code === "KeyM") act.current("map");
      if (e.code === "KeyP") act.current("passport");
    };
    const up = (e: KeyboardEvent) => {
      const k = KEYMAP[e.code];
      if (k) rt.current.keys[k] = false;
    };
    const blur = () => {
      for (const k of Object.keys(rt.current.keys) as (keyof Input)[]) rt.current.keys[k] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [rt]);
}

function TouchPad() {
  const { rt } = useGame();
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    try {
      setCoarse(window.matchMedia("(pointer: coarse)").matches);
    } catch {
      /* ignore */
    }
  }, []);
  if (!coarse) return null;
  const hold = (k: keyof Input) => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      rt.current.touch[k] = true;
    },
    onPointerUp: () => {
      rt.current.touch[k] = false;
    },
    onPointerCancel: () => {
      rt.current.touch[k] = false;
    },
    onPointerLeave: () => {
      rt.current.touch[k] = false;
    },
  });
  return (
    <div className="touchpad" aria-hidden="true">
      <div className="pad-left">
        <button type="button" className="pad" data-hud {...hold("left")}>
          ◀
        </button>
        <button type="button" className="pad" data-hud {...hold("right")}>
          ▶
        </button>
      </div>
      <div className="pad-right">
        <button type="button" className="pad small" data-hud {...hold("down")}>
          ▼
        </button>
        <button type="button" className="pad gas" data-hud {...hold("up")}>
          ▲
        </button>
      </div>
    </div>
  );
}

function Flash({ hud }: { hud: HudState }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);
  if (!hud.flash || now - hud.flash.at > 2600) return null;
  return (
    <div key={hud.flash.at} className={`flash flash-${hud.flash.kind}`} role="status" data-hud>
      {hud.flash.text}
    </div>
  );
}

export function Hud() {
  const game = useGame();
  const { hud, panel, setPanel, net, rt, mapView, setMapView } = game;
  const store = useStore();
  const { road, journey, roads, toast, dismissToast, setView } = store;
  const here = hud.roadId ? roads.find((r) => r.id === hud.roadId) : undefined;
  const own = here?.id === road.id;
  const nearKey = hud.ahead && hud.ahead.months < 1.5 ? hud.ahead.key : (hud.here?.key ?? null);
  const nearStop = nearKey ? net.stops.find((s) => s.key === nearKey) : undefined;
  const aheadStop = hud.ahead ? net.stops.find((s) => s.key === hud.ahead?.key) : undefined;
  const careHidden = here?.care && !store.journeyFor(here.id).careOptIn;
  const [intro, setIntroState] = useState(() => {
    try {
      if (new URLSearchParams(window.location.search).has("debug")) return false;
      // KBC One: the how-to-drive card shows once per browser session
      return window.sessionStorage.getItem("kbcone.intro") !== "seen";
    } catch {
      return true;
    }
  });
  const setIntro = (v: boolean) => {
    setIntroState(v);
    if (!v)
      try {
        window.sessionStorage.setItem("kbcone.intro", "seen");
      } catch {
        /* storage is a convenience only */
      }
  };
  useEffect(() => {
    rt.current.paused = intro;
  }, [intro, rt]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(dismissToast, 9000);
    return () => window.clearTimeout(t);
  }, [toast, dismissToast]);

  const ringStop = !here && hud.ring ? everydayStop(refFromKey(hud.ring.key).id) : undefined;
  const ringUp = ringStop && hud.ring ? store.life.upcoming.find((u) => u.ref.key === hud.ring?.key) : undefined;
  const openNear = () => {
    if (rt.current.autopilot) return;
    if (ringStop && hud.ring) {
      rt.current.car.speed = 0;
      setPanel({ type: "everyday", key: hud.ring.key });
      return;
    }
    if (!nearStop || careHidden) return;
    rt.current.car.speed = 0;
    if (nearStop.stop.kind === "fork") setPanel({ type: "fork", roadId: nearStop.roadId });
    else setPanel({ type: "stop", key: nearStop.key });
  };

  // salary day: close the month, and the car drives itself one month along your road
  const finished = journey.month >= road.months;
  const salaryDay = () => {
    if (finished || rt.current.autopilot) return;
    const from = journey.month;
    if (!store.advanceMonth()) return;
    setPanel(null);
    setMapView(false);
    const fork = road.fork;
    let to = Math.min(from + 1.35, road.months - 0.2);
    if (fork && !journey.forkChoice[fork.id] && fork.month > from && fork.month < to) to = fork.month - 0.2;
    rt.current.autopilot = { roadId: road.id, month: Math.max(from - 0.3, -1), to };
  };

  useKeyboard((a) => {
    if (intro) {
      setIntro(false);
      return;
    }
    if (a === "close") {
      if (panel) setPanel(null);
      else if (mapView) setMapView(false);
      // KBC One: Esc with nothing open goes back to the app (the phone turns back to portrait)
      else setView("phone");
    }
    if (a === "pull") openNear();
    if (a === "map") setMapView(!mapView);
    if (a === "passport") setPanel(panel?.type === "passport" ? null : { type: "passport" });
  });

  const mode = !here ? "ring" : here.status === "pending" ? "closed" : own ? "own" : "test";
  const modeLabel = hud.autopilot ? "SALARY DAY · AUTOPILOT" : { ring: "EVERYDAY ROAD", closed: "CLOSED ROAD", own: "YOUR ROAD", test: "TEST DRIVE" }[mode];
  const ringMonth = monthAtAngle(Math.atan2(rt.current.car.z, rt.current.car.x));
  const life = store.life;
  const monthNow = Number.isNaN(hud.month) ? null : Math.max(0, hud.month);
  const ready = roadReadiness(road, journey);

  // compass to your own avenue when you're elsewhere
  const ownAv = net.avenues.find((a) => a.road.id === road.id);
  let compass: number | null = null;
  if (ownAv && !own) {
    const c = rt.current.car;
    const target = ownAv.trunk.pts[Math.min(6, ownAv.trunk.pts.length - 1)];
    const ang = Math.atan2(target.x - c.x, target.z - c.z) - c.heading;
    compass = (-ang * 180) / Math.PI;
  }

  const aheadDone = aheadStop && aheadStop.stop.kind !== "fork" ? readiness(aheadStop.stop as StopDef, store.journeyFor(aheadStop.roadId).done[aheadStop.stop.id]) : 0;

  const postcard =
    !panel && toast ? (
      <div className="postcard" data-hud>
        <div className="kicker mint">POSTCARD FROM THE ROAD · M{toast.month}</div>
        <div className="toast-title">{toast.title}</div>
        <div className="small lh">{toast.line}</div>
        {toast.you != null && toast.road != null && (
          <div className="toast-bars">
            <div className="row between xs">
              <span>prepared like you</span>
              <span className="mono">{Math.round(toast.you * 100)}%</span>
            </div>
            <div className="bar-track">
              <div className="bar calm" style={{ width: `${toast.you * 100}%` }} />
            </div>
            <div className="row between xs muted">
              <span>everyone on the road</span>
              <span className="mono">{Math.round(toast.road * 100)}%</span>
            </div>
            <div className="bar-track">
              <div className="bar dim" style={{ width: `${toast.road * 100}%` }} />
            </div>
          </div>
        )}
        <button type="button" className="btn small ghost" onClick={dismissToast}>
          Keep driving
        </button>
      </div>
    ) : null;

  return (
    <div className={`hud ${panel ? "has-sheet" : ""} ${intro ? "has-intro" : ""}`}>
      {/* left column: status, then the postcard or the goals. One column, so they can never overlap. */}
      <div className="hud-col-left">
        <div className={`status mode-${mode} ${here?.care ? "care" : ""}`} data-hud>
          <div className="row between gap">
            <span className="mode-badge mono">{modeLabel}</span>
            {monthNow !== null && <span className="mono month-now">M{monthNow.toFixed(1)}</span>}
          </div>
          <div className="status-road">{here ? here.name : "Everyday Road"}</div>
          <div className="status-sub">
            {here
              ? `${DISTRICTS[here.family].name} · ${int(here.alumni)} drove it${here.care ? " · quiet road" : ""}`
              : `${MONTH_LONG[ringMonth]} · the money year every household drives`}
          </div>
          <div className="status-fuel">
            <FuelGauge fuel={life.fuel} care={road.care} size={70} ends={false} />
            <div className="grow stack-4">
              <span className="fuel-main">
                <b className="mono">{months1(life.fuel)}</b> months of fuel
              </span>
              <span className="xs muted fuel-sub">
                {finished
                  ? "Road finished"
                  : life.salary
                    ? life.salary.inDays
                      ? `${life.salary.label} in ${life.salary.inDays} days`
                      : `${life.salary.label} today`
                    : "End of the month"}
              </span>
            </div>
            {!finished && (
              <button type="button" className="btn small primary" onClick={salaryDay} disabled={hud.autopilot}>
                {hud.autopilot ? "Driving…" : road.care ? "Close month" : "Salary day"}
              </button>
            )}
          </div>
          <div className="status-life">
            <span>
              {store.newDriver ? "You" : road.persona.name} · {road.id === "everyday-only" ? `Everyday Road · ${MONTH_LONG[life.today.cal.month]}` : `${road.name} · month ${journey.month}/${road.months}`}
            </span>
            {!road.care && <span className="mono ready-chip">ready {ready}%</span>}
          </div>
          {compass !== null && (
            <div className="compass">
              <span className="compass-arrow" style={{ transform: `rotate(${compass}deg)` }}>
                ▲
              </span>
              <span className="xs">your road: {road.name}</span>
            </div>
          )}
        </div>
        {postcard ?? <Quests />}
      </div>

      <div className="hud-col-right">
        <Minimap />
        <div className="hud-buttons" data-hud>
          <button type="button" className="btn small ghost" onClick={() => setMapView(!mapView)}>
            <Icon name="atlas" size={14} /> {mapView ? "Back to the car" : "Bird's eye"}
          </button>
          <button type="button" className="btn small ghost" onClick={() => setPanel({ type: "passport" })}>
            <Icon name="passport" size={14} /> Passport
          </button>
          <button type="button" className="btn small ghost" onClick={() => setView("phone")}>
            <Icon name="phone" size={14} /> Back to the app
          </button>
        </div>
      </div>

      <Flash hud={hud} />

      {!panel && !aheadStop && ringStop && hud.ring && !hud.autopilot && (
        <div className={`prompt kind-${ringStop.kind} prompt-everyday`} data-hud>
          <div className="prompt-kicker mono">
            EVERYDAY ROAD · {ringUp ? `${dayLabel(ringUp.cal, ringUp.day).toUpperCase()} ${ringUp.cal.year}` : ""}
          </div>
          <div className="prompt-title">{ringStop.title}</div>
          <div className="small muted">{crowdLine(EVERYDAY, ringStop).text}</div>
          <button type="button" className="btn small primary" onClick={openNear}>
            Pull over <span className="kbd">E</span>
          </button>
        </div>
      )}

      {!panel && aheadStop && !careHidden && !hud.autopilot && (
        <div className={`prompt kind-${aheadStop.stop.kind}`} data-hud>
          <div className="prompt-kicker mono">
            {aheadStop.stop.kind === "fork" ? "CROSSROADS" : aheadStop.stop.kind === "bump" ? (here?.care ? "AHEAD" : aheadDone >= 50 ? "PAVED" : "BUMP AHEAD") : aheadStop.stop.kind === "boost" ? "MONEY IN" : "MILESTONE"} · in{" "}
            {hud.ahead?.months.toFixed(1)} months
          </div>
          <div className="prompt-title">{aheadStop.stop.kind === "fork" ? aheadStop.stop.title : (aheadStop.stop as StopDef).title}</div>
          {aheadStop.stop.kind === "fork" ? (
            <div className="small muted">
              ◀ {aheadStop.stop.branches[0].label} · {aheadStop.stop.branches[1].label} ▶
            </div>
          ) : (
            aheadStop.stop.kind === "bump" && !here?.care && (
              <div className="small muted">
                {!own ? "Test drive · see how the crowd did" : aheadDone >= 50 ? `Paved · readiness ${aheadDone}% · you'll drive over it smoothly` : `Your readiness ${aheadDone}% · prepare to 50% to pave it`}
              </div>
            )
          )}
          {nearStop && (
            <button type="button" className="btn small primary" onClick={openNear}>
              {nearStop.stop.kind === "fork" ? "Compare the roads" : "Pull over"} <span className="kbd">E</span>
            </button>
          )}
        </div>
      )}

      <div className="speedo" data-hud>
        <div className="speed-num mono">{Math.round(Math.abs(hud.speed) * 3)}</div>
        <div className="xs muted">km/h</div>
      </div>
      <div className="keys-help mono" data-hud>
        WASD / arrows drive · E pull over · M bird's eye · P passport
      </div>

      <TouchPad />

      {panel?.type === "stop" && <StopPanel stopKey={panel.key} />}
      {panel?.type === "fork" && <ForkPanel roadId={panel.roadId} />}
      {panel?.type === "care" && <CarePanel roadId={panel.roadId} />}
      {panel?.type === "complete" && <CompletePanel roadId={panel.roadId} />}
      {panel?.type === "passport" && <PassportPanel />}
      {panel?.type === "map" && <MapPanel />}
      {panel?.type === "everyday" && <EverydayPanel stopKey={panel.key} />}
      {panel?.type === "recap" && <RecapPanel />}
      {intro && <Intro onStart={() => setIntro(false)} />}
    </div>
  );
}
