"use client";

import { useEffect, useRef } from "react";
import { nextStop } from "../../engine/game";
import { useStore } from "../store";
import { Icon } from "../ui";
import { ForkView } from "./ForkView";
import { NotesView } from "./NotesView";
import { PassportView } from "./PassportView";
import { MonthRecapCard } from "./RecapView";
import { RoadView } from "./RoadView";
import { RouteView } from "./RouteView";
import { StopView } from "./StopView";
import { TodayView } from "./TodayView";

function LockView() {
  const { road, journey, go } = useStore();
  const next = nextStop(road, journey.month);
  const weeks = next ? Math.max(1, Math.round((next.month - journey.month) * 4.3)) : 0;
  return (
    <div className="screen lock">
      <div className="lock-time">
        <div className="lock-date">Saturday 17 October</div>
        <div className="lock-clock">8:14</div>
      </div>
      <div className="lock-stack">
        <button type="button" className="notif" onClick={() => go({ name: "today" })}>
          <span className="notif-icon">
            <Icon name="road" size={18} />
          </span>
          <span className="notif-body">
            <span className="row between">
              <b>KBC</b>
              <span className="muted">now</span>
            </span>
            <span>
              {road.care
                ? "When you're ready, there's a calm overview of what's ahead. No rush."
                : `Something is coming up on your road in about ${weeks} weeks. People ahead of you left tips.`}
            </span>
          </span>
        </button>
        <div className="lock-note">No amounts, names or bill types on the lock screen. Unlock to see.</div>
      </div>
    </div>
  );
}

export function Toast() {
  const { toast, dismissToast, go } = useStore();
  if (!toast) return null;
  return (
    <div className="toast" role="status">
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
      <div className="row gap">
        <button type="button" className="btn small primary grow" onClick={() => { dismissToast(); go({ name: "notes" }); }}>
          Leave a tip for those behind
        </button>
        <button type="button" className="btn small ghost" onClick={dismissToast}>
          Close
        </button>
      </div>
    </div>
  );
}

export function Recap() {
  const { recap, dismissRecap, road, life } = useStore();
  if (!recap) return null;
  return (
    <div className="recap-overlay" role="dialog" aria-label="Month recap">
      <MonthRecapCard recap={recap} road={road} anchor={life.anchor} onDone={dismissRecap} />
    </div>
  );
}

export function Phone({ framed = true }: { framed?: boolean }) {
  const { screen, go, road } = useStore();
  const bodyRef = useRef<HTMLDivElement>(null);
  const where = `${road.id}:${screen.name}:${screen.name === "stop" ? screen.stopId : ""}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to the top when the screen or road changes
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [where]);
  const tab =
    screen.name === "notes"
      ? "notes"
      : screen.name === "today" || screen.name === "passport"
        ? "today"
        : screen.name === "route"
          ? "route"
          : screen.name === "stop"
            ? (screen.from ?? "road")
            : "road";
  const body =
    screen.name === "today" ? (
      <TodayView />
    ) : screen.name === "route" ? (
      <RouteView />
    ) : screen.name === "stop" ? (
      <StopView stopId={screen.stopId} from={screen.from} />
    ) : screen.name === "fork" ? (
      <ForkView />
    ) : screen.name === "notes" ? (
      <NotesView />
    ) : screen.name === "passport" ? (
      <PassportView />
    ) : screen.name === "lock" ? (
      <LockView />
    ) : (
      <RoadView />
    );

  return (
    <div className={framed ? "phone-frame" : "phone-bare"}>
      <div className={`phone ${road.care ? "care" : ""}`}>
        <div className="phone-body" ref={bodyRef}>
          {body}
        </div>
        {screen.name !== "lock" && (
          <nav className="tabbar" aria-label="App">
            <button type="button" className={tab === "today" ? "on" : ""} aria-current={tab === "today" ? "page" : undefined} onClick={() => go({ name: "today" })}>
              <Icon name="gauge" />
              Today
            </button>
            <button type="button" className={tab === "route" ? "on" : ""} aria-current={tab === "route" ? "page" : undefined} onClick={() => go({ name: "route" })}>
              <Icon name="route" />
              Route
            </button>
            <button type="button" className={tab === "road" ? "on" : ""} aria-current={tab === "road" ? "page" : undefined} onClick={() => go({ name: "road" })}>
              <Icon name="road" />
              Road
            </button>
            <button type="button" className={tab === "notes" ? "on" : ""} aria-current={tab === "notes" ? "page" : undefined} onClick={() => go({ name: "notes" })}>
              <Icon name="note" />
              Pass it on
            </button>
          </nav>
        )}
        <Toast />
        <Recap />
      </div>
    </div>
  );
}
