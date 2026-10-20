"use client";

import { useId, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { PersonRoad } from "../people";
import { EVERYDAY_ONLY_ID } from "../crowd";
import type { PersonPointers } from "../crowd";
import { atlasCatalogue, GROUPS, matchRoads, roadBadge } from "./model";
import type { AtlasRoad, OpenRoadMode, RoadStage } from "./model";
import "./atlas8.css";

export interface AllRoadsProps {
  person: PersonRoad;
  /** Optional live pointers so badges also reflect changes made in the host. */
  pointers?: PersonPointers;
  large?: boolean;
  onOpenRoad: (roadId: string, mode: OpenRoadMode, stage?: RoadStage) => void;
  onClose: () => void;
}
export function AllRoads(props: AllRoadsProps) {
  // A persona switch must discard the previous person's search and care consent.
  return <AllRoadsContent key={props.person.key} {...props} />;
}
function AllRoadsContent({ person, pointers, large: largeSetting, onOpenRoad, onClose }: AllRoadsProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState<AtlasRoad | null>(null);
  const [stageId, setStageId] = useState("");
  const [date, setDate] = useState("");
  const [consent, setConsent] = useState(false);
  const [overview, setOverview] = useState(false);
  const selectionRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const large = Boolean(largeSetting || person.noGame || pointers?.largeSimple);
  const quiet = atlasCatalogue.some(r => r.id === (pointers?.confirmed?.roadId ?? person.roadId) && r.care);
  const result = matchRoads(submitted);
  const stage = selected?.stages.find(s => s.id === stageId);
  const choose = (road: AtlasRoad) => {
    setSelected(road); setStageId(""); setDate(""); setConsent(false);
    requestAnimationFrame(() => { selectionRef.current?.focus(); selectionRef.current?.scrollIntoView({ block: "nearest" }); });
  };
  const search = (event: FormEvent) => {
    event.preventDefault(); setSelected(null); setSubmitted(query.trim());
    requestAnimationFrame(() => resultsRef.current?.focus());
  };
  const open = (mode: OpenRoadMode) => {
    if (!selected?.published || !stage || (selected.care && !consent) || (mode === "confirmed" && !date)) return;
    onOpenRoad(selected.id, mode, { ...stage, date: mode === "confirmed" ? date : null, ...(mode === "confirmed" ? { confirmedAt: date } : {}) });
  };
  const row = (road: AtlasRoad) => {
    const badge = roadBadge(road, person, pointers);
    const count = !quiet && !road.care && road.count?.shown ? road.count.value : null;
    return <button type="button" className={`a8-road ${badge === "On now" ? "a8-current" : ""}`} key={road.id} onClick={() => choose(road)} style={{ "--a8-road-color": road.hue } as CSSProperties}>
      <span className="a8-line" aria-hidden="true" />
      <span className="a8-road-copy"><strong>{road.name}</strong><small>{!road.published ? "No insights published yet" : road.care ? "Support at your pace" : count !== null ? `${count.toLocaleString("en-GB")} drove it` : quiet ? "Explore at your pace" : "A shared road to explore"}</small></span>
      {badge ? <span className={`a8-badge a8-${badge.toLowerCase().replaceAll(" ", "-")}`}>{badge}</span> : <span className="a8-arrow" aria-hidden="true">›</span>}
    </button>;
  };
  return <div className={`a8 ${large ? "a8-large" : ""} ${quiet ? "a8-quiet" : ""}`} data-testid="all-roads">
    <header className="a8-header">
      <div className="a8-top"><button className="a8-back" onClick={onClose} type="button">← Your road</button><small>Synthetic demo data</small></div>
      <h1>All roads</h1>
      <p>{quiet ? "Take your time. You choose what to explore, and when." : "Situations others already lived. Explore any road; it never changes your own."}</p>
      <form className="a8-search" onSubmit={search}>
        <label htmlFor={`${id}-find`}>Describe a situation</label>
        <div><input id={`${id}-find`} value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. we just bought our first house" autoComplete="off" /><button type="submit" disabled={!query.trim()}>Find a road</button></div>
      </form>
    </header>
    <div className="a8-body">
      {submitted && <section className="a8-results" ref={resultsRef} tabIndex={-1} aria-label="Find a road results" aria-live="polite">
        <div className="a8-section-title"><h2>{result.matches.length ? "Does one of these fit?" : "No published road yet"}</h2><button type="button" className="a8-text-button" onClick={() => {setSubmitted(""); setQuery(""); setSelected(null);}}>Clear</button></div>
        <p>{result.matches.length ? "Choose a road, then tell us where you want to start." : "We have no published road for that situation. You can explore these nearby roads."}</p>
        {(result.matches.length ? result.matches : result.nearby).map(row)}
      </section>}
      {selected && <section ref={selectionRef} tabIndex={-1} className="a8-selection" aria-labelledby={`${id}-selection`}>
        <div className="a8-section-title"><h2 id={`${id}-selection`}>{selected.name}</h2><button type="button" className="a8-text-button" onClick={() => setSelected(null)}>Close</button></div>
        {!selected.published ? <p>Under review. No insights are published for this road yet. Your own road stays as it is.</p> : <>
          {selected.care && !consent ? <><p>A person first. There is no rush to look ahead. You can ask {person.advisor?.name ?? "your adviser"} for support.</p><button className="a8-primary" type="button" onClick={() => setConsent(true)}>Show what helped others when I’m ready</button></> : <>
            <p className="a8-preview-label">Exploring · your own road stays as it is</p>
            <label htmlFor={`${id}-stage`}>Where would you like to start?</label>
            <select id={`${id}-stage`} value={stageId} onChange={e => setStageId(e.target.value)}><option value="">Choose a stage</option>{selected.stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
            <button className="a8-primary" type="button" disabled={!stage} onClick={() => open("exploring")}>Explore {selected.name}</button>
            {selected.id !== EVERYDAY_ONLY_ID && <details className="a8-confirm"><summary>This is my situation</summary><p>Confirm this road and stage only if they fit. This replaces your confirmed life road. Everyday stays with you.</p><label htmlFor={`${id}-date`}>Date of this stage</label><input id={`${id}-date`} type="date" value={date} onChange={e => setDate(e.target.value)} /><button type="button" className="a8-primary" disabled={!date || !stage} onClick={() => open("confirmed")}>Confirm my situation</button><small>You told us · saved with this date</small></details>}
          </>}
        </>}
      </section>}
      <div className="a8-section-title a8-catalogue-title"><h2>Explore the roads</h2>{!large && !quiet && <div className="a8-view-toggle" aria-label="Road view"><button type="button" aria-pressed={!overview} onClick={() => setOverview(false)}>List</button><button type="button" aria-pressed={overview} onClick={() => setOverview(true)}>Metro overview</button></div>}</div>
      <div className={overview && !large && !quiet ? "a8-groups a8-metro" : "a8-groups"}>
        {GROUPS.map(group => <section className="a8-group" key={group} aria-label={group}><h3>{group}</h3><div>{atlasCatalogue.filter(r => r.group === group).sort((a,b) => Number(roadBadge(b, person, pointers) === "On now") - Number(roadBadge(a, person, pointers) === "On now")).map(row)}</div></section>)}
      </div>
      <p className="a8-footnote">{quiet ? "You decide what belongs on your road." : "Synthetic, anonymous groups. Small crowds stay private. Exploring never confirms a situation."}</p>
    </div>
  </div>;
}
