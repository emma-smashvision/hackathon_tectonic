"use client";

// KBC One · presenter pieces that need the person's road: the road line under the story,
// and the Director and "Behind the glass" tabs in v1's drawer.

import { Inspector } from "../hindsight/components/stage/Inspector";
import { useStore } from "../hindsight/components/store";
import { MONTH_LONG } from "../hindsight/engine/everyday";
import { EVERYDAY_ONLY_ID, getRoad } from "../hindsight/engine/roads";
import { Icon } from "../kbc/ui/icons";
import { PEOPLE } from "./people";
import { inWords, journeyPeople, plainJourneyText } from "./road";
import { useNudge } from "./nudge/NudgeProvider";

/** One line under the story: which road this person is on. */
export function StoryRoadLine() {
  const s = useStore();
  const p = s.person ? PEOPLE[s.person.key] : undefined;
  if (!p) return null;
  const { road, life } = s;
  const month = MONTH_LONG[life.today.cal.month];
  const next = life.upcoming.find((item) => item.scope === "road" && item.inDays >= 0);
  const preview = p.preview ? getRoad(p.preview.roadId) : undefined;
  const topic = road.id === "moving-house" && p.world?.home
    ? `Moving to ${p.world.home.city}`
    : road.id === EVERYDAY_ONLY_ID ? preview?.name ?? "Everyday life" : road.name;
  const cohort = road.care || p.noGame || (road.id === EVERYDAY_ONLY_ID && !preview) ? null : journeyPeople(preview ?? road);
  const detail = road.care ? "Calm support, a person first."
    : p.noGame ? "Plain words and a little help."
    : next ? `Next: ${plainJourneyText(next.title).replace(/[?.!]+$/, "").toLowerCase()}, ${inWords(next.inDays)}`
    : preview ? "Next: prepare for your first home"
    : `What you need for ${month}`;
  return (
    <div className="story-road">
      <Icon name="road" size={16} />
      <span>
        Your road: {plainJourneyText(topic)}
        <small>{detail}{cohort && ` · ${cohort}`}</small>
      </span>
    </div>
  );
}

export function DirectorPanel({
  onCompose,
  onReset,
  onRoadTab,
  composing,
  onNudgeSent,
}: {
  onCompose: () => void;
  onReset: () => void;
  onRoadTab: () => void;
  composing: boolean;
  onNudgeSent?: () => void;
}) {
  const s = useStore();
  const p = s.person ? PEOPLE[s.person.key] : undefined;
  const nudge = useNudge();
  const finished = s.journey.month >= s.road.months;
  return (
    <div className="director-panel">
      <p className="eng-intro">Presenter controls for {p ? p.persona.name : "this customer"}.</p>
      <div className="dir-row">
        <button type="button" className="dir-btn" disabled={finished} onClick={() => {
          onRoadTab();
          s.advanceMonth();
        }}>
          <Icon name="calendar" size={16} /> It's salary day: close {MONTH_LONG[s.life.today.cal.month]}
        </button>
        <button type="button" className="dir-btn" disabled={!nudge.upcoming || s.view === "city"} onClick={() => { nudge.send(); onNudgeSent?.(); }} title={nudge.upcoming?.title ?? "No journey needs a nudge right now"}>
          <Icon name="calendar" size={16} /> Send a journey nudge
        </button>
        <label className="dir-btn" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={nudge.auto} onChange={(e) => nudge.setAuto(e.target.checked)} />
          Auto nudge after selecting a person
        </label>
        {!nudge.upcoming && <p className="eng-intro">{s.road.care ? "Care first: no journey nudges for this person." : "No journey needs a nudge right now."}</p>}
        <button type="button" className="dir-btn" disabled={composing} onClick={onCompose}>
          <Icon name="repeat" size={16} /> Re-arrange the home with Claude
        </button>
        <button
          type="button"
          className="dir-btn"
          onClick={() => {
            s.resetJourney(false);
            onReset();
          }}
        >
          <Icon name="undo" size={16} /> Reset this customer (home, theme, chat, road)
        </button>
      </div>
      <p className="eng-intro">
        Road pointer: <code>{`{ road: "${s.road.id}", month: ${s.journey.month} }`}</code>
      </p>
    </div>
  );
}

/** Hindsight's "Behind the glass": the pointer, every crowd-gate decision on screen, the road's policy. */
export function GlassPanel() {
  return (
    <div className="hs glass-panel">
      <Inspector />
    </div>
  );
}
