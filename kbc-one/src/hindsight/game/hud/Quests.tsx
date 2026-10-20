"use client";

import { useState } from "react";
import { readiness } from "../../engine/game";
import { useStore } from "../../components/store";
import { Icon } from "../../components/ui";
import { useGame } from "../runtime";

/** Life goals, not points: a short list of things worth doing on your road. */
export function Quests() {
  const { road, journey, explored, myNotes, stamps, journeyFor } = useStore();
  const { rt } = useGame();
  const [open, setOpen] = useState(true);
  if (road.care) return null;
  const nextBump = road.stops.find((s) => s.kind === "bump" && s.month > journey.month);
  const anyPaved = road.stops.some((s) => s.kind === "bump" && readiness(s, journeyFor(road.id).done[s.id]) >= 50);
  const quests = [
    { id: "pave", label: nextBump ? `Pave “${nextBump.short}” before you reach it` : "Pave a bump before you reach it", done: anyPaved },
    { id: "smooth", label: "Drive over a bump smoothly", done: rt.current.smooth > 0 },
    { id: "salary", label: "Live a month forward on salary day", done: journey.month > (journey.anchor ?? road.persona.month) },
    { id: "explore", label: "Test-drive someone else's road", done: explored.some((id) => id !== road.id) },
    { id: "note", label: "Leave a note for the drivers behind you", done: myNotes.some((n) => n.roadId === road.id) },
    { id: "finish", label: `Finish ${road.name}`, done: stamps.some((s) => s.roadId === road.id) },
  ].filter((q) => road.id !== "everyday-only" || (q.id !== "finish" && q.id !== "smooth"));
  // KBC One: on the Everyday Road only, the bumps are this year's everyday stops on the ring
  if (road.id === "everyday-only") quests[0] = { id: "pave", label: "Prepare for an Everyday stop on the ring", done: anyPaved };
  const left = quests.filter((q) => !q.done).length;
  return (
    <div className="quests" data-hud>
      <button type="button" className="quests-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="mono xs">ON THIS ROAD</span>
        <span className="mono xs muted">
          {quests.length - left}/{quests.length}
        </span>
      </button>
      {open && (
        <ul>
          {quests.map((q) => (
            <li key={q.id} className={q.done ? "done" : ""}>
              <span className="q-box">{q.done && <Icon name="check" size={12} />}</span>
              {q.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Intro({ onStart }: { onStart: () => void }) {
  const { road, journey, newDriver } = useStore();
  const [touch] = useState(() => {
    try {
      return window.matchMedia("(pointer: coarse)").matches;
    } catch {
      return false;
    }
  });
  const who = newDriver ? "You" : road.persona.name;
  return (
    <div className="intro" role="dialog" aria-label="Welcome to Hindsight City" data-hud>
      <div className="kicker">HINDSIGHT CITY</div>
      <h1 className="intro-title">Look ahead on your road.</h1>
      {road.id === "everyday-only" ? (
        <p className="intro-body">
          {who} {newDriver ? "are" : "is"} on the <b>Everyday Road</b>: the ring around the square. One lap is one year of renewals, holiday pay, tax letters and December, with what the people before you paid.
        </p>
      ) : (
        <p className="intro-body">
          {who} {newDriver ? "are" : "is"} at month {journey.month} of <b>{road.name}</b>. Ahead are the bumps the {road.alumni.toLocaleString("en-GB")} people before you hit: prepare and they're paved. The ghost cars are the {road.current.toLocaleString("en-GB")} people on this road right now.
        </p>
      )}
      <p className="intro-body">
        Driving ahead is a preview: nothing changes until you choose <b>Make this my plan</b> when you go back to the app. Only <b>Salary day</b> moves your month.
      </p>
      <ul className="intro-keys">
        <li>
          <span className="kbd-lg">{touch ? "▲ ◀ ▶" : "W A S D"}</span> {touch ? "the pads" : "or arrows"} to drive ahead and see what's coming.
        </li>
        <li>
          <span className="kbd-lg">{touch ? "Pull over" : "E"}</span> at a stop to see what the crowd did, and prepare.
        </li>
        <li>
          <span className="kbd-lg">{touch ? "Map" : "M"}</span> {touch ? "the round map" : "bird's eye view"}. Any other avenue is a test drive.
        </li>
      </ul>
      <button type="button" className="btn primary" onClick={onStart} autoFocus>
        Start driving
      </button>
    </div>
  );
}
