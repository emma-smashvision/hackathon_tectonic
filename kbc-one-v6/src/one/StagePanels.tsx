"use client";

// KBC One · presenter pieces that need the person's road: the road line under the story,
// and the Director and "Behind the glass" tabs in v1's drawer.

import { Inspector } from "../hindsight/components/stage/Inspector";
import { useStore } from "../hindsight/components/store";
import { MONTH_LONG } from "../hindsight/engine/everyday";
import { int } from "../hindsight/engine/format";
import { EVERYDAY_ONLY_ID, getRoad } from "../hindsight/engine/roads";
import { Icon } from "../kbc/ui/icons";
import { PEOPLE } from "./people";
import { lookAhead } from "./road";

/** One line under the story: which road this person is on. */
export function StoryRoadLine() {
  const s = useStore();
  const p = s.person ? PEOPLE[s.person.key] : undefined;
  if (!p) return null;
  const { road, journey, life } = s;
  const month = MONTH_LONG[life.today.cal.month];
  let line: string;
  if (road.care) line = `On a care road: ${road.name}. Calm, no game, a person first.`;
  else if (road.id === EVERYDAY_ONLY_ID) {
    const pre = p.preview ? getRoad(p.preview.roadId) : undefined;
    line = pre ? `On the Everyday Road · next road: ${pre.name} (test-drive it)` : `On the Everyday Road · ${month}`;
  } else line = `On the road: ${road.name} · month ${journey.month} of ${road.months} · ${int(road.alumni)} drove it`;
  const la = lookAhead(p, road, journey, life);
  return (
    <div className="story-road">
      <Icon name="road" size={16} />
      <span>
        {line}
        {la && <small>Looks ahead: {la.title}</small>}
        {!la && road.care && <small>No driving game, no suggestions: a person first</small>}
        {!la && !road.care && p.noGame && <small>The road shows as plain words, no driving game</small>}
      </span>
    </div>
  );
}

export function DirectorPanel({
  onCompose,
  onReset,
  onRoadTab,
  composing,
}: {
  onCompose: () => void;
  onReset: () => void;
  onRoadTab: () => void;
  composing: boolean;
}) {
  const s = useStore();
  const p = s.person ? PEOPLE[s.person.key] : undefined;
  const la = p ? lookAhead(p, s.road, s.journey, s.life) : null;
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
        <button
          type="button"
          className="dir-btn"
          disabled={!la}
          onClick={() => la && s.testDrive(la.drive.roadId, la.drive.month)}
          title={la ? la.title : "Nothing to look ahead at for this customer"}
        >
          <Icon name="road" size={16} /> Look ahead now
        </button>
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
