"use client";

// KBC One · the Road tab: your future. Hindsight's phone screens (Today's car, Route, the road,
// Pass it on) inside the KBC phone, wearing the customer's theme. "Look ahead" opens the driving
// world. Large & simple gets plain words instead; care roads stay calm (no game).

import type { CSSProperties } from "react";
import { ForkView } from "../hindsight/components/phone/ForkView";
import { NotesView } from "../hindsight/components/phone/NotesView";
import { PassportView } from "../hindsight/components/phone/PassportView";
import { Recap, Toast } from "../hindsight/components/phone/Phone";
import { RoadView } from "../hindsight/components/phone/RoadView";
import { RouteView } from "../hindsight/components/phone/RouteView";
import { StopView } from "../hindsight/components/phone/StopView";
import { TodayView } from "../hindsight/components/phone/TodayView";
import { type Screen, useStore } from "../hindsight/components/store";
import { Icon } from "../hindsight/components/ui";
import { dayLabel, MONTH_LONG } from "../hindsight/engine/everyday";
import { euro, signedEuro } from "../hindsight/engine/format";
import { EVERYDAY_ONLY_ID, getRoad } from "../hindsight/engine/roads";
import { PEOPLE } from "./people";

type Seg = "today" | "route" | "road" | "notes";
const SEGS: [Seg, string][] = [
  ["today", "Today"],
  ["route", "Route"],
  ["road", "Road"],
  ["notes", "Pass it on"],
];

function segOf(screen: Screen): Seg {
  if (screen.name === "notes") return "notes";
  if (screen.name === "route") return "route";
  if (screen.name === "road" || screen.name === "fork") return "road";
  if (screen.name === "stop") return screen.from === "route" ? "route" : screen.from === "today" ? "today" : "road";
  return "today";
}

export function RoadTab({ themeStyle, light, large }: { themeStyle: CSSProperties; light: boolean; large: boolean }) {
  const s = useStore();
  const { road, journey, life, screen, go, person } = s;
  const care = road.care;
  const canDrive = !care && !person?.noGame && !large;
  const lifeRoad = road.id !== EVERYDAY_ONLY_ID;
  const preview = person ? PEOPLE[person.key]?.preview : undefined;
  const previewRoad = preview ? getRoad(preview.roadId) : undefined;

  return (
    <div className={`hs road-layer ${light ? "light" : ""} ${care ? "care" : ""}`} style={themeStyle}>
      <div className="phone road-phone">
        <div className="phone-body">
          <header className="one-road-head">
            <div className="kicker">YOUR ROAD</div>
            <div className="one-road-lines small">
              {lifeRoad && (
                <span>
                  <span className="road-dot" style={{ background: care ? "var(--lilac)" : road.hue }} /> {road.name} · month {journey.month} of {road.months}
                </span>
              )}
              <span>
                <span className="road-dot everyday-dot" /> Everyday Road · {MONTH_LONG[life.today.cal.month]}
              </span>
            </div>
            {canDrive && (
              <button type="button" className="btn primary one-look" onClick={() => s.testDrive(road.id, journey.month)}>
                <Icon name="road" size={17} /> Look ahead
                <span className="one-look-sub">your phone turns sideways and you drive what's ahead</span>
              </button>
            )}
            {canDrive && previewRoad && (
              <button type="button" className="btn ghost one-preview" onClick={() => s.testDrive(previewRoad.id, 0)}>
                <Icon name="road" size={15} /> Test-drive {previewRoad.name} before you're on it
              </button>
            )}
            {!large && (
              <nav className="one-seg" aria-label="Road views">
                {SEGS.map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={segOf(screen) === id} onClick={() => go({ name: id })}>
                    {label}
                  </button>
                ))}
              </nav>
            )}
          </header>
          {large ? <PlainRoad /> : <Body screen={screen} />}
        </div>
        <Toast />
        <Recap />
      </div>
    </div>
  );
}

function Body({ screen }: { screen: Screen }) {
  if (screen.name === "route") return <RouteView />;
  if (screen.name === "road") return <RoadView />;
  if (screen.name === "stop") return <StopView stopId={screen.stopId} from={screen.from} />;
  if (screen.name === "fork") return <ForkView />;
  if (screen.name === "notes") return <NotesView />;
  if (screen.name === "passport") return <PassportView />;
  return <TodayView embedded />;
}

/** Large & simple: the road as plain words. The next things coming, one sentence each, and your goals. */
function PlainRoad() {
  const { life } = useStore();
  const next = life.upcoming.filter((u) => u.kind !== "fork" && u.kind !== "milestone").slice(0, 3);
  return (
    <div className="plain-road">
      <h2>What's coming</h2>
      {next.length === 0 && <p>Nothing big is coming up.</p>}
      {next.map((u) => (
        <div key={u.ref.key} className="plain-item">
          <div className="plain-when">{dayLabel(u.cal, u.day)}</div>
          <div className="plain-what">{u.title}</div>
          {u.amount != null && (
            <div className="plain-amt">
              {signedEuro(u.amount)} <span>{u.amountSource === "last-year" ? "like last year" : "typical"}</span>
            </div>
          )}
        </div>
      ))}
      {life.goals.length > 0 && (
        <>
          <h2>Your goals</h2>
          {life.goals.map((g) => (
            <div key={g.id} className="plain-item">
              <div className="plain-what">{g.label}</div>
              <div className="plain-amt">
                {euro(g.saved)} of {euro(g.target)}
              </div>
            </div>
          ))}
        </>
      )}
      <p className="plain-note">Your savings cover about {Math.max(0, Math.round(life.fuel))} months of your usual costs.</p>
    </div>
  );
}
