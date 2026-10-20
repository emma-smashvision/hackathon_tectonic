"use client";

// KBC One · presenter pieces that need the person's road: the road line under the story,
// and the Director and "Behind the glass" tabs in v1's drawer.

import { ResetDemoNotesButton } from "./notes8/ResetDemoNotesButton"; // v8-notes
// v8-atlas: live scale proof in the stage drawer.
import { Atlas } from "../hindsight/components/stage/Atlas";
import { Inspector } from "../hindsight/components/stage/Inspector";
import { useStore } from "../hindsight/components/store";
import { MONTH_LONG } from "../hindsight/engine/everyday";
import { Icon } from "../kbc/ui/icons";
import { PEOPLE } from "./people";
import type { PersonPointers } from "./crowd";
import { channelCardFor } from "./nudge/channels"; // v8-channels
import { useNudge } from "./nudge/NudgeProvider";

/** One line under the story: which road this person is on. */
export function StoryRoadLine({ pointers }: { pointers?: PersonPointers }) {
  const s = useStore();
  const p = s.person ? PEOPLE[s.person.key] : undefined;
  if (!p) return null;
  const card = channelCardFor(p, { pointers });
  if (!card) return null;
  return <div className="story-road"><Icon name="road" size={16} /><span>
    {card.title}<small>{card.care ? "A person first. Support when Nadia is ready." : "One shared road · the same stop in Home, Kate, push and adviser."}</small>
  </span></div>;
}

export function DirectorPanel({
  onCompose,
  onReset,
  onRoadTab,
  composing,
  onNudgeSent,
  pointers,
}: {
  onCompose: () => void;
  onReset: () => void;
  onRoadTab: () => void;
  composing: boolean;
  onNudgeSent?: () => void;
  pointers?: PersonPointers;
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
        {/* v8-notes: reset shared synthetic notes independently of customer state. */}
        <ResetDemoNotesButton />
      </div>
      <p className="eng-intro">
        Shared road pointer: <code>{JSON.stringify(p ? channelCardFor(p, { pointers }) && { roadId: channelCardFor(p, { pointers })!.roadId, stopId: channelCardFor(p, { pointers })!.stopId } : null)}</code>
      </p>
    </div>
  );
}

/** Hindsight's "Behind the glass": the pointer, every crowd-gate decision on screen, the road's policy. */
export function GlassPanel() {
  return (
    <div className="hs glass-panel">
      <Atlas />
      <Inspector />
    </div>
  );
}
