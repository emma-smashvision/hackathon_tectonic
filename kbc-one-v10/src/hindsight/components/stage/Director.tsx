"use client";

import { useStore } from "../store";
import { Icon } from "../ui";

const FAMILY_LABEL: Record<string, string> = {
  work: "Work",
  home: "Home",
  family: "Family",
  later: "Later in life",
  abroad: "Abroad",
  care: "Care roads",
};
const FAMILY_ORDER = ["work", "home", "family", "abroad", "later", "care"];

export function Director() {
  const { liveRoads, road, journey, pickRoad, setMonth, drive, driving, resetJourney, showGate, setShowGate, go, setView, advanceMonth } =
    useStore();

  return (
    <aside className="director" aria-label="Demo controls">
      <div className="side-title">Drive any life</div>
      <div className="road-list">
        {FAMILY_ORDER.map((fam) => {
          const list = liveRoads.filter((r) => r.family === fam);
          if (!list.length) return null;
          return (
            <div key={fam} className="stack-4">
              <div className="fam-label">{FAMILY_LABEL[fam]}</div>
              {list.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`road-item ${r.id === road.id ? "on" : ""}`}
                  aria-pressed={r.id === road.id}
                  onClick={() => {
                    pickRoad(r.id);
                    setView("phone");
                  }}
                >
                  <span className="road-dot" style={{ background: r.hue }} />
                  <span className="road-item-text">
                    <span className="road-item-name">{r.name}</span>
                    <span className="road-item-who">
                      {r.persona.name}, {r.persona.age} · {r.persona.city}
                    </span>
                  </span>
                  {r.care && <span className="care-tag">care</span>}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div className="drive-box">
        <button
          type="button"
          className="btn small primary"
          disabled={journey.month >= road.months}
          onClick={() => {
            setView("phone");
            go({ name: "today" });
            advanceMonth();
          }}
        >
          <Icon name="calendar" size={14} /> It's salary day: close the month
        </button>
        <div className="row between">
          <div className="side-sub">Drive forward</div>
          <div className="mono xs">
            M{journey.month} / {road.months}
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={road.months}
          value={journey.month}
          onChange={(e) => setMonth(Number(e.target.value))}
          aria-label="Month on the road"
          className="slider"
        />
        <div className="row gap">
          <button type="button" className="btn small primary grow" onClick={() => drive(!driving)}>
            <Icon name={driving ? "pause" : "play"} size={14} /> {driving ? "Pause" : "Drive"}
          </button>
          <button type="button" className="btn small ghost" onClick={() => setMonth(journey.month + 1)} aria-label="One month forward">
            +1
          </button>
          <button type="button" className="btn small ghost" onClick={() => resetJourney(false)} aria-label="Reset this journey">
            <Icon name="reset" size={14} />
          </button>
        </div>
        <button type="button" className="btn small ghost" onClick={() => resetJourney(true)}>
          Start as a new driver at month 0
        </button>
        <button type="button" className="btn small ghost" onClick={() => go({ name: "lock" })}>
          <Icon name="lock" size={14} /> Show the lock screen
        </button>
        <label className="toggle">
          <input type="checkbox" checked={showGate} onChange={(e) => setShowGate(e.target.checked)} />
          <span>Show the crowd gate on every number</span>
        </label>
      </div>
    </aside>
  );
}
