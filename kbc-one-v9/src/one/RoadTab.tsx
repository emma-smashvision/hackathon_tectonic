"use client";

import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { useStore } from "../hindsight/components/store";
import { MONTH_LONG } from "../hindsight/engine/everyday";
import { int } from "../hindsight/engine/format";
import {
  EVERYDAY_ONLY_ID,
  catalogueRoad,
  pointersFor,
  roadViewFor,
  type PersonPointers,
} from "./crowd";
import { PEOPLE } from "./people";
import { Sheet } from "./yourroad/Sheet";
import { RoadTimeline } from "./road8/RoadTimeline";
import { RoadStopSheet, type PassItOnContext } from "./road8/RoadStopSheet";
import { RoadForkSheet } from "./road8/RoadForkSheet";
import "./road8/road8.css";

export interface RoadFocus {
  roadId: string;
  stopId?: string;
}
export interface RoadTabProps {
  themeStyle: CSSProperties;
  light: boolean;
  large: boolean;
  onAllRoads?: () => void;
  onDrive?: (roadId: string, stopId?: string) => void;
  focus?: RoadFocus;
  pointers?: PersonPointers;
  onFocusChange?: (focus: RoadFocus) => void;
  renderPassItOn?: (context: PassItOnContext) => ReactNode;
}

export function RoadTab(props: RoadTabProps) {
  const s = useStore();
  const person = s.person ? PEOPLE[s.person.key] : undefined;
  const pointers = props.pointers ?? pointersFor(person ?? "tom");
  const initial =
    pointers.confirmed?.roadId ??
    pointers.exploring[0]?.roadId ??
    EVERYDAY_ONLY_ID;
  const [chosen, setChosen] = useState(props.focus?.roadId ?? initial);
  const [selected, setSelected] = useState<string | undefined>(
    props.focus?.stopId,
  );
  const [advisor, setAdvisor] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setChosen(props.focus?.roadId ?? initial);
    setSelected(props.focus?.stopId);
  }, [s.person?.key, initial, props.focus?.roadId, props.focus?.stopId]);
  const view = roadViewFor(person ?? "tom", chosen, {
    pointers,
    careOptIn: s.journeyFor(chosen).careOptIn,
    largeSimple: props.large || !!person?.noGame || !!s.road.care,
  });
  if (!view) return null;
  const everyday = view.roadId === EVERYDAY_ONLY_ID;
  const road = view.road;
  const care = view.care;
  const simple = view.largeSimple || care;
  const exploring = view.position.preview;
  const lifeRoad =
    initial === EVERYDAY_ONLY_ID ? undefined : catalogueRoad(initial);
  const visible = view.available;
  const count = road.driverCount;
  const active = view.stops.find((stop) => stop.stopId === selected);
  const advisorName = s.advisor?.name ?? "KBC Live";
  const switchRoad = (roadId: string) => {
    setChosen(roadId);
    setSelected(undefined);
    props.onFocusChange?.({ roadId });
  };
  const openStop = (stopId: string) => {
    setSelected(stopId);
    props.onFocusChange?.({ roadId: road.id, stopId });
  };
  const allRoads = () =>
    props.onAllRoads ? props.onAllRoads() : s.setView("atlas");
  const provenance = everyday
    ? "Your everyday money year"
    : exploring
      ? view.position.provenance === "suggested"
        ? "Suggested from activity"
        : "You chose to explore"
      : person?.key === "tom" &&
          road.id === "moving-house" &&
          view.position.date === "2026-11-01"
        ? "You told us: moving to Gent on 1 November"
        : person?.key === "karim" &&
            road.id === "freelance" &&
            view.position.month === 20
          ? "You told us: freelance since early 2025"
          : care
            ? "You told us · at your pace"
            : `You told us: ${view.position.label}${view.position.date ? ` · ${view.position.date}` : ""}`;
  return (
    <div
      className={`hs road-layer yr road8 ${props.light ? "light" : ""} ${simple ? "road8-simple" : ""} ${care ? "care" : ""}`}
      style={props.themeStyle}
    >
      <div className="phone road-phone">
        <div className="phone-body yr-body road8-body">
          <header className="road8-header">
            <nav className="road8-switches" aria-label="Your roads">
              {lifeRoad && (
                <button
                  aria-pressed={road.id === lifeRoad.id}
                  onClick={() => switchRoad(lifeRoad.id)}
                >
                  {lifeRoad.name}
                </button>
              )}
              <button
                aria-pressed={everyday}
                onClick={() => switchRoad(EVERYDAY_ONLY_ID)}
              >
                Everyday · {MONTH_LONG[s.life.today.cal.month]}
              </button>
              <button className="road8-all" onClick={allRoads}>
                All roads
              </button>
            </nav>
            <h1>{road.name === "Everyday Road" ? "Everyday" : road.name}</h1>
            <p className="road8-provenance">
              {provenance}
              {view.position.provenance === "suggested" && (
                <>
                  {" "}
                  · <button onClick={allRoads}>does this fit?</button>
                </>
              )}
              {!everyday && !exploring && !care && (
                <>
                  {" "}
                  · <button onClick={allRoads}>not right?</button>
                </>
              )}
            </p>
            {visible && (
              <p className="road8-crowd">
                {count.shown ? (
                  <>
                    <b>{int(count.value!)}</b> KBC customers drove this road
                  </>
                ) : (
                  "Too few people to show a crowd yet"
                )}
              </p>
            )}
            {exploring && (
              <p className="road8-exploring">{view.position.label}</p>
            )}
          </header>
          {simple && !care && (
            <button
              className="road8-secondary"
              onClick={() => setAdvisor(true)}
            >
              Talk to {advisorName}
            </button>
          )}
          {care && (
            <section className="road8-person">
              <span aria-hidden="true">♡</span>
              <h2>
                One thing at a time,{" "}
                {s.person?.persona.name.split(" ")[0] ?? "there"}.
              </h2>
              <p>
                You can start with a person. {advisorName} can help with the
                next steps, at your pace.
              </p>
              <button
                className="road8-primary"
                onClick={() => setAdvisor(true)}
              >
                Talk to {advisorName}
              </button>
            </section>
          )}
          {!visible && road.status === "review" ? (
            <p className="road8-withheld">
              Under review · no published insights yet.
            </p>
          ) : !visible ? (
            <button
              className="road8-secondary road8-care-consent"
              onClick={() => s.optInCareFor(view.roadId)}
            >
              Show what helped others when I'm ready
            </button>
          ) : (
            <RoadTimeline view={view} onOpen={openStop} />
          )}
          <div className="road8-actions">
            {props.onDrive && view.canDrive && (
              <button
                className="road8-secondary"
                onClick={() => props.onDrive?.(road.id, selected)}
              >
                Drive this road
              </button>
            )}
            {!care && !simple && (
              <button
                className="road8-secondary"
                onClick={() => setAdvisor(true)}
              >
                Talk to {advisorName}
              </button>
            )}
          </div>
        </div>
        <footer className="yr-footer road8-footer">
          Anonymous groups of at least 500 · history, not a prediction ·
          synthetic demo data
        </footer>
        {visible && active && (
          <RoadStopSheet
            roadId={view.roadId}
            stopId={active.stopId}
            passed={active.passed}
            large={simple}
            onClose={() => setSelected(undefined)}
            renderPassItOn={props.renderPassItOn}
          />
        )}
        {visible && selected && selected === view.fork?.stopId && (
          <RoadForkSheet
            roadId={view.roadId}
            onClose={() => setSelected(undefined)}
          />
        )}
        {advisor && (
          <Sheet
            title={`Talk to ${advisorName}`}
            onClose={() => setAdvisor(false)}
          >
            <p>
              A conversation about {road.name.toLowerCase()}, when you want it.
              Save a question for your adviser.
            </p>
            <button
              className="road8-primary"
              onClick={() => {
                s.addPlanItem({
                  id: `road8:adviser:${road.id}`,
                  source: {
                    scope: "road",
                    roadId: road.id,
                    key: selected ?? "adviser",
                  },
                  spec: {
                    kind: "talk",
                    title: `Ask ${advisorName} about ${road.name}`,
                    detail: "Talk through the next steps at my pace.",
                  },
                });
                setNotice("Saved · adviser question");
                setAdvisor(false);
              }}
            >
              Save an adviser question
            </button>
          </Sheet>
        )}
        {notice && (
          <div className="road8-notice" role="status">
            {notice}
            <button
              onClick={() => setNotice("")}
              aria-label="Dismiss confirmation"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
