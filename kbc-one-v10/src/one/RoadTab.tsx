"use client";

import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { euro, int } from "../hindsight/engine/format";
import { useStore } from "../hindsight/components/store";
import { EVERYDAY_ONLY_ID, pointersFor, roadViewFor, type PersonPointers } from "./crowd";
import { LessonCard } from "./learning/LessonCard";
import { FounderCard } from "./business/FounderCard";
import { PEOPLE } from "./people";
import { useVillageProgress } from "./village";
import { Sheet } from "./yourroad/Sheet";
import { RoadStopSheet, type PassItOnContext } from "./road8/RoadStopSheet";
import { AREA, areaFor, areaProgress, countdown, crowdVisual, mergedTimeline, type RoadItem } from "./yourroad/roadModel";
import "./road8/road8.css";
import "./yourroad/road.css";

export interface RoadFocus { roadId: string; stopId?: string }
export interface RoadTabProps {
  themeStyle: CSSProperties; light: boolean; large: boolean;
  onAllRoads?: () => void;
  /** opens the business roadmaps; shown on business roads */
  onBusiness?: () => void;
  focus?: RoadFocus; pointers?: PersonPointers;
  onFocusChange?: (focus: RoadFocus) => void;
  renderPassItOn?: (context: PassItOnContext) => ReactNode;
}
function MiniCrowd({ item }: { item: RoadItem }) {
  const crowd = crowdVisual(item.evidence);
  if (!crowd && item.evidence?.available && item.evidence.denominator.shown && item.evidence.surprised.median.shown) return <span className="r2-mini" aria-label={`Typical amount: ${euro(item.evidence.surprised.median.value!)}`}><span aria-hidden="true">◉</span><small>{euro(item.evidence.surprised.median.value!)}</small></span>;
  if (!crowd) return <span className="r2-private">{item.evidence ? "Crowd detail withheld" : "Your plan"}</span>;
  return <span className="r2-mini" role="img" aria-label={crowd.label} title={crowd.label}>
    <span aria-hidden="true">{Array.from({ length: crowd.dots }, (_, i) => <i className={i < crowd.red ? "r2-hit" : ""} key={i} />)}</span>
    <small aria-hidden="true">{crowd.red === 1 ? `≈ 1 in ${crowd.dots}` : `${Math.round(crowd.share * 100)}%`}</small>
  </span>;
}
export function RoadTab(props: RoadTabProps) {
  const s = useStore();
  const person = PEOPLE[s.person?.key ?? "tom"];
  const pointers = props.pointers ?? pointersFor(person);
  const activeRoad = props.focus?.roadId ?? pointers.confirmed?.roadId ?? pointers.exploring[0]?.roadId ?? EVERYDAY_ONLY_ID;
  const progress = useVillageProgress(person.key);
  const [selected, setSelected] = useState<RoadItem>();
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState("");
  const [advisor, setAdvisor] = useState(false);
  const calm = props.large || !!person.noGame;
  const careOptIn = s.journeyFor(activeRoad).careOptIn;
  const view = roadViewFor(person, activeRoad, { pointers, careOptIn });
  const items = mergedTimeline(person, s.life, pointers, s.plan, progress.done, roadId => s.journeyFor(roadId).careOptIn);
  const areas = areaProgress(person, s.life);
  const care = !!view?.care;
  const today = { ...s.life.today.cal, day: s.life.today.day };
  const next = (props.focus?.stopId ? items.find(i => i.roadId === activeRoad && i.stopId === props.focus!.stopId) : undefined) ?? items.find(i => i.roadId === activeRoad && i.lesson) ?? items.find(i => i.roadId === activeRoad);
  const accent = AREA[areaFor(activeRoad)].color;
  const crowd = crowdVisual(next?.evidence);
  const pageSize = calm ? 3 : 6;
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => { setPage(0); setSelected(undefined); }, [person.key]);
  const allRoads = () => props.onAllRoads ? props.onAllRoads() : s.setView("atlas");
  const open = (item: RoadItem) => setSelected(item);
  const remind = (item: RoadItem) => { if (item.reminder) { s.addPlanItem(item.reminder); setNotice(`Reminder saved for ${item.title}.`); } };
  return <div className={`hs road-layer yr road8 r2-road ${calm ? "r2-calm" : ""}`} style={{ ...props.themeStyle, color: "#f1f7fc", "--bg": "#091522", "--cream": "#f1f7fc", "--panel": "#102638", "--soft": "#a3b9ca", "--muted": "#a3b9ca", "--cyan": "#59dcff", "--line": "#294254", "--r2-accent": accent } as CSSProperties}>
    <div className="phone road-phone">
      <div className="phone-body yr-body r2-body">
        <header className="r2-heading"><h1>Your road</h1><button onClick={allRoads}>All roads</button></header>
        <section className={`r2-now ${care ? "r2-care" : ""}`} aria-labelledby="r2-now-title">
          <div className="r2-section-label"><span>Now</span><span>{calm ? "Calm mode" : "Your next chapter"}</span></div>
          <h2 id="r2-now-title">{care ? "One thing at a time" : view?.road.name.replace(" Road", "") ?? "Everyday"}</h2>
          {care ? <div className="r2-care-copy"><p>You choose the pace, {person.persona.name.split(" ")[0]}. Your care road stays private until you’re ready.</p><button onClick={() => setAdvisor(true)}>Talk to {s.advisor?.name ?? "your adviser"}</button>{!careOptIn && <button onClick={() => { s.optInCareFor(activeRoad); setPage(Math.floor(items.filter(i => !i.care).length / pageSize)); setNotice("Your care steps are shown below, at your pace."); }}>Show what helped others when I’m ready</button>}</div> : <>
            <div className="r2-track" role="img" aria-label={`You are here. ${next ? `Next: ${next.title}.` : "Your next steps are below."} Dots illustrate groups ahead, not individual people.`}>
              <svg viewBox="0 0 340 104" aria-hidden="true"><path className="r2-track-bed" d="M-20 80 H70 Q100 80 120 55 T170 30 H365"/><path className="r2-track-line" d="M-20 80 H70 Q100 80 120 55 T170 30 H365"/>
                {view?.road.driverCount.shown && [180, 204, 230, 258, 286, 312].map((x, i) => <g key={x} opacity={1 - i * .09}><circle cx={x} cy={25 + (i % 2) * 10} r="3"/><circle cx={x + 8} cy={35 - (i % 2) * 10} r="2"/></g>)}
                <circle className="r2-you-halo" cx="57" cy="80" r="17"/><circle className="r2-you" cx="57" cy="80" r="7"/><text x="57" y="48" textAnchor="middle">You</text><path className="r2-stop-pin" d="M286 12 V48"/>
              </svg>
            </div>
            <div className="r2-next"><span>Next stop <b>{next?.date ? countdown(next.date, today) : next?.timing ?? "At your pace"}</b></span><h3>{next?.title ?? "Make room for what matters"}</h3>
              {crowd && <p>{crowd.red === 1 ? `About 1 in ${crowd.dots}` : `${Math.round(crowd.share * 100)}% of`} {activeRoad === "moving-house" ? "movers" : "people"} {next?.evidence?.kind === "bump" ? "had a cost that strained their buffer" : "reported this experience"}.</p>}
              {!crowd && view?.road.driverCount.shown && <p>{int(view.road.driverCount.value!)} people have walked this road.</p>}
            </div>
          </>}
        </section>
        {props.onBusiness && <FounderCard personKey={person.key} onOpen={props.onBusiness} />}
        <section className="r2-timeline" aria-labelledby="r2-timeline-title">
          <div className="r2-section-head"><h2 id="r2-timeline-title">Next 12 months</h2><span>All your areas</span></div>
          <ol>{items.slice(Math.min(page, pages - 1) * pageSize, (Math.min(page, pages - 1) + 1) * pageSize).map(item => <li key={item.id} style={{ "--area": AREA[item.area].color } as CSSProperties} data-area={item.area} data-care={item.care || undefined}>
            <div className="r2-event-date"><i aria-hidden="true"/>{item.timing}<span>{AREA[item.area].title}</span></div>
            <h3>{item.title}</h3>
            <div className="r2-event-info"><MiniCrowd item={item}/><span className={item.prepared ? "r2-prepared" : "r2-not-yet"}>{item.prepared ? "Prepared ✓" : "Not yet"}</span></div>
            {item.lesson ? <button onClick={() => open(item)}>Learn <small>1 min</small><span aria-hidden="true">↗</span></button> : item.reminder ? <button disabled={item.reminded} onClick={() => remind(item)}>{item.reminded ? "Reminder saved ✓" : "Remind me"}<span aria-hidden="true">＋</span></button> : <button onClick={() => open(item)}>{item.care ? "Read when ready" : "See the next step"}<span aria-hidden="true">↗</span></button>}
          </li>)}</ol>
          {!items.length && <p>Your next steps will appear here when you choose a road.</p>}
          {pages > 1 && <nav className="r2-pagination" aria-label="Timeline pages"><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Earlier</button><span>{page + 1} of {pages}</span><button disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Later</button></nav>}
        </section>
        <section className="r2-areas" aria-labelledby="r2-areas-title"><div className="r2-section-head"><h2 id="r2-areas-title">Your areas</h2><span>Your demo numbers</span></div><div className="r2-area-grid">{areas.map(area => <article key={area.id} className={area.open ? "" : "r2-locked"} style={{ "--area": AREA[area.id].color } as CSSProperties}>
          <div className="r2-ring" role="img" aria-label={`${AREA[area.id].title}: ${area.open ? area.percent === null ? area.label : `${area.percent}% ${area.label}` : `Locked. ${AREA[area.id].hint}`}`}><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27"/><circle className="r2-ring-value" cx="32" cy="32" r="27" strokeDasharray={`${(area.percent ?? 0) * 1.696} 170`}/></svg><b>{!area.open ? "⌑" : area.percent === null ? AREA[area.id].icon : `${area.percent}%`}</b></div><div><h3>{AREA[area.id].title}</h3><p>{area.open ? area.label : AREA[area.id].hint}</p>{!area.open && <button onClick={allRoads}>Explore area</button>}</div>
        </article>)}</div></section>
        <footer className="r2-footer">Synthetic demo crowd · not a forecast<br/>Anonymous groups of at least 500</footer>
      </div>
      {selected?.lesson ? <Sheet title={selected.title} onClose={() => setSelected(undefined)}><LessonCard lesson={selected.lesson} variant="plain"/></Sheet> : selected?.evidence ? <RoadStopSheet roadId={selected.roadId} stopId={selected.stopId} large={calm || selected.care} onClose={() => setSelected(undefined)} renderPassItOn={props.renderPassItOn}/> : selected && <Sheet title={selected.title} onClose={() => setSelected(undefined)}><p>Choose a road to see its next steps.</p><button onClick={allRoads}>All roads</button></Sheet>}
      {advisor && <Sheet title={`Talk to ${s.advisor?.name ?? "your adviser"}`} onClose={() => setAdvisor(false)}><p>Start with a conversation, at your pace.</p><button className="r2-sheet-drive" onClick={() => { s.addPlanItem({ id: `r2:adviser:${activeRoad}`, source: { scope: "road", roadId: activeRoad, key: "adviser" }, spec: { kind: "talk", title: "Talk through my next steps", detail: "A conversation at my pace." } }); setNotice("Adviser question saved in your plan."); setAdvisor(false); }}>Save an adviser question</button></Sheet>}
      {notice && <div className="road8-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss confirmation">×</button></div>}
    </div>
  </div>;
}
