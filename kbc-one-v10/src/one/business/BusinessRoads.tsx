"use client";

import { type CSSProperties, Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { useStore } from "../../hindsight/components/store";
import {
  CHAPTERS, chapter, type ChapterId, chapterTitle, type FounderNode, type FounderRoad, formatSaved,
  MAP_EDGES, MAP_NODES, mapStateFor, nowNode, routeNodes, savedMinutes, type TeamItem,
} from "./founder";
import { FIcon } from "./FounderIcon";
import { useFounderRoad } from "./founderState";
import { CROWD_TOTAL, customerRoad, PARTNERS, type PartnerId, PROFILES, profileById, SYNTHETIC } from "./model";
import "./founder.css";

export interface BusinessRoadsProps {
  /** demo customer: decides which road KBC already recognises */
  personKey?: string;
  advisorName?: string;
  large?: boolean;
  /** "road" opens the customer's own road straight away */
  start?: "start" | "road";
  onClose: () => void;
  /** opens the Kate chat with a question; the road also answers inline */
  onAskKate?: (question: string) => void;
}

type Screen = "start" | "road" | "map" | "crossroads";
type Open = { kind: "node"; id: string } | { kind: "guide" } | { kind: "partner"; id: PartnerId; back?: "team" } | { kind: "team"; side: "a" | "b" } | null;
type Back = (label: string, to: () => void) => ReactNode;

const pct = (share: number) => `${Math.round(share * 100)}%`;
const int = (n: number) => n.toLocaleString("en-GB");
const KIND_LABEL = { public: "Public", professional: "Professional", kbc: "KBC" } as const;
const sideOf = (road: FounderRoad, chosen?: "a" | "b") => chosen ?? road.fork?.pick ?? (road.fork && road.fork.a.share >= road.fork.b.share ? "a" : "b");

export function BusinessRoads(props: BusinessRoadsProps) {
  // A persona switch starts from that person's own road.
  return <BusinessRoadsContent key={props.personKey ?? "none"} {...props} />;
}

function BusinessRoadsContent({ personKey, advisorName, large, start, onClose, onAskKate }: BusinessRoadsProps) {
  const s = useStore();
  const customer = customerRoad(personKey);
  const [screen, setScreen] = useState<Screen>(start === "road" && customer ? "road" : "start");
  const [mapFrom, setMapFrom] = useState<Screen>("start");
  const [profileId, setProfileId] = useState(customer?.profile ?? "physio");
  const { road, chosen, choose, complete, completeStep } = useFounderRoad(personKey, profileId);
  const [open, setOpen] = useState<Open>(null);
  const [notice, setNotice] = useState("");
  // Team members the customer lined up, by road, side and partner: the organisation they chose.
  const [lined, setLinedState] = useState<Record<string, TeamState>>(() => ({ ...linedMemory }));
  // Kept outside the component too, so leaving the road and coming back keeps what was done.
  const setLined = (fn: (l: Record<string, TeamState>) => Record<string, TeamState>) => setLinedState((l) => { const next = fn(l); Object.assign(linedMemory, next); return next; });
  const scrollRef = useRef<HTMLDivElement>(null);
  const adviser = advisorName ?? s.advisor?.name ?? "your KBC adviser";
  const profile = profileById(profileId) ?? PROFILES[0];
  const nowId = road ? nowNode(road)?.id : undefined;
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    // The road opens on the current step, with the next one below it.
    const target = screen === "road" ? box.querySelector<HTMLElement>(".fr-callout") : null;
    box.scrollTo({ top: target ? Math.max(0, target.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 44) : 0 });
  }, [screen, profileId, nowId]);
  if (!road) return null;

  const goRoad = (id: string) => { setProfileId(id); setOpen(null); setNotice(""); setScreen("road"); };
  const goMap = () => { setMapFrom(screen); setScreen("map"); };
  const remind = (node: FounderNode) => {
    s.addPlanItem({ id: `biz:${road.id}:${node.id}`, source: { scope: "road", roadId: `business:${profile.id}`, key: node.id }, spec: { kind: "remind", title: node.title, detail: `${profile.headline} · ${node.sub}` } });
    setNotice(`Saved to your plan: ${node.title}.`);
  };
  const talk = () => {
    s.addPlanItem({ id: `biz:${road.id}:adviser`, source: { scope: "road", roadId: `business:${profile.id}`, key: "adviser" }, spec: { kind: "talk", title: `Talk to ${adviser} about your business`, detail: `${profile.headline}. Bring your questions from the road.`, topic: "Starting a business" } });
    setNotice(`Saved to your plan: a talk with ${adviser}.`);
  };
  const lineUp = (side: "a" | "b", t: TeamItem, name: string, by: "you" | "kate" = "you") => {
    setLined((l) => ({ ...l, [teamKey(road, side, t)]: { name, by } }));
    s.addPlanItem({ id: `biz:${road.id}:team:${t.partner}`, source: { scope: "road", roadId: `business:${profile.id}`, key: `team:${t.partner}` }, spec: { kind: "remind", title: `${name}: ${PARTNERS[t.partner].name.toLowerCase()}`, detail: fill(t.then ?? t.why, name) } });
    setNotice(`${fill("{name}", name)}: done. Kate follows up in your plan.`);
    // The road step this partner helps with is done, also when it is not the current one.
    const step = routeNodes(road, side).find((n) => n.status !== "done" && n.partners.includes(t.partner));
    if (step) completeStep(step.id);
  };
  const handToKate = (side: "a" | "b", t: TeamItem, name: string) => {
    onAskKate?.(`About ${PARTNERS[t.partner].name.toLowerCase()} with ${fill("{name}", name)}: ${t.why.toLowerCase()}. What do you still need from me?`);
  };
  const node = open?.kind === "node" ? road.nodes.find((n) => n.id === open.id) : undefined;
  const back: Back = (label, to) => <button type="button" className="fr-back" onClick={to}><FIcon name="back" size={18} />{label}</button>;
  const ask = (q: string) => onAskKate && (() => onAskKate(`I am a ${profile.job.toLowerCase()}. ${q}`));

  return <div className={`fr ${large ? "fr-large" : ""}`} data-testid="business-roads">
    <div className="fr-scroll" ref={scrollRef}>
      {screen === "start" && <StartScreen customerProfile={customer?.profile} customerLine={customer?.noticed} back={back} onBack={onClose} onRoad={goRoad} onMap={goMap} />}
      {screen === "road" && <RoadScreen road={road} chosen={chosen} back={back} backLabel={start === "road" ? "Your road" : "Where to start"} onBack={() => (start === "road" ? onClose() : setScreen("start"))}
        onMap={goMap} onCrossroads={() => setScreen("crossroads")}
        onOpen={(o) => {
          // The current step that leads to a crossroads opens the choice straight away.
          const n = o?.kind === "node" ? road.nodes.find((x) => x.id === o.id) : undefined;
          if (n && n.status === "now" && road.fork?.after === n.id && !chosen) setScreen("crossroads");
          else setOpen(o);
        }} />}
      {screen === "map" && <MapScreen road={road} back={back} onBack={() => setScreen(mapFrom === "map" ? "start" : mapFrom)} onRoad={goRoad} detected={customer?.profile} />}
      {screen === "crossroads" && road.fork && <CrossroadsScreen road={road} chosen={chosen} crowd={profile.crowd} job={profile.job} back={back} onBack={() => setScreen("road")}
        onTake={(side) => { choose(side); setNotice(`You took road ${side.toUpperCase()}: ${road.fork![side].label}.`); setScreen("road"); }}
        onAskKate={ask(`${road.fork.title} What did people in my job choose?`)} />}
      {notice && screen === "road" && <p role="status" aria-live="polite" className="fr-notice">{notice}</p>}
      {screen === "road" && chosen && road.team?.[chosen] && <button type="button" className="fr-deck-entry" onClick={() => setOpen({ kind: "team", side: chosen })}>
        <span className="fr-logos">{[...new Set(road.team[chosen]!.map((t) => t.pick ?? t.names[0]))].slice(0, 3).map((n) => <Logo key={n} name={n} size={28} />)}</span>
        <span><strong>What helps you now</strong><small>{teamDone(road, chosen, lined)} of {road.team[chosen]!.length} done · what people on this road used</small></span>
        <FIcon name="arrow" size={18} />
      </button>}
      <p className="fr-footnote">{SYNTHETIC}. Rules and amounts change; your partners confirm what applies to you.</p>
    </div>


    {node && <StepSheet node={node} road={road} crowd={profile.crowd} onClose={() => setOpen(null)} onPartner={(id) => setOpen({ kind: "partner", id })}
      onRemind={() => remind(node)} onAskKate={ask(`What did people in my job do about this step: ${node.title.toLowerCase()}?`)}
      onFinish={() => {
        if (road.fork?.after === node.id && !chosen) { setOpen(null); setScreen("crossroads"); return; }
        complete(); setOpen(null); setNotice(`Done: ${node.title}. Your road moved on.`);
      }} />}
    {open?.kind === "guide" && <GuideSheet road={road} chosen={chosen} adviser={adviser} onClose={() => setOpen(null)} onPartner={(id) => setOpen({ kind: "partner", id })} onTalk={talk} />}
    {open?.kind === "partner" && <PartnerSheet road={road} id={open.id} adviser={adviser} onClose={() => setOpen(open.back === "team" && chosen ? { kind: "team", side: chosen } : null)} onTalk={talk} />}
    {open?.kind === "team" && road.team?.[open.side] && <TeamSheet road={road} side={open.side} lined={lined} onLine={(t, name, by) => lineUp(open.side, t, name, by)}
      onKate={onAskKate && ((t, name) => handToKate(open.side, t, name))} onClose={() => setOpen(null)} />}
  </div>;
}

// ---------- Where does your road start? ----------
const STARTS = [
  { id: "idea", icon: "spark", color: "#f5a524", title: "I have an idea", sub: "Starts in Spark", profile: "student" },
  { id: "side", icon: "badge", color: "#59dcff", title: "I already work on the side", sub: "Starts in Launch", profile: "physio" },
  { id: "freelance", icon: "laptop", color: "#59dcff", title: "I’m going freelance", sub: "Starts in Launch", profile: "freelancer" },
  { id: "run", icon: "store", color: "#7ee2a8", title: "I already run a business", sub: "Kate finds your spot", profile: "" },
  { id: "hire", icon: "people", color: "#b9a6ff", title: "I’m hiring my first employee", sub: "Starts in Grow", profile: "employer" },
  { id: "exit", icon: "door", color: "#c9d3e0", title: "I’m thinking of stepping back", sub: "Starts in Exit", profile: "" },
] as const;

function StartScreen({ customerProfile, customerLine, back, onBack, onRoad, onMap }: {
  customerProfile?: string; customerLine?: string; back: Back; onBack: () => void; onRoad: (id: string) => void; onMap: () => void;
}) {
  const mine = customerProfile ? profileById(customerProfile) : undefined;
  return <section className="fr-screen" aria-labelledby="fr-start-title">
    {back("Your road", onBack)}
    <h1 id="fr-start-title">Where does your road start?</h1>
    <p className="fr-lead">Pick what fits. You can change it anytime.</p>
    <div className="fr-kate-card">
      <div className="fr-kate-head"><img className="fr-kate-dot" src="/kate-logo.png" alt="" /><b>{mine ? "Kate noticed something" : "You are not alone"}</b><FIcon name="info" size={18} className="fr-muted" /></div>
      <p>{mine ? customerLine : `${int(CROWD_TOTAL)} KBC customers walked these roads before you. Pick a start and Kate shows what they did, step by step.`}</p>
      {mine && <button type="button" className="fr-light-button" onClick={() => onRoad(mine.id)}>Open your {mine.job.toLowerCase()} road <FIcon name="arrow" size={20} /></button>}
    </div>
    <h2 className="fr-caps">Or pick your own start</h2>
    <ul className="fr-list">
      {STARTS.map((st) => {
        const target = st.profile || customerProfile || (st.id === "exit" ? "physio" : "freelancer");
        return <li key={st.id}><button type="button" onClick={() => onRoad(target)}>
          <span className="fr-tile" style={{ "--tile": st.color } as CSSProperties}><FIcon name={st.icon} size={20} /></span>
          <span className="fr-list-copy"><strong>{st.title}</strong><small>{st.sub}</small></span>
          {st.id === "run" && mine && <span className="fr-pill">Suggested</span>}
          <FIcon name="chevron" size={18} className="fr-muted" />
        </button></li>;
      })}
    </ul>
    <h2 className="fr-caps">Roads by job</h2>
    <ul className="fr-list">
      {PROFILES.map((p) => <li key={p.id}><button type="button" onClick={() => onRoad(p.id)}>
        <span className="fr-line" style={{ background: p.hue }} aria-hidden="true" />
        <span className="fr-list-copy"><strong>{p.job}</strong><small>{p.headline} · {int(p.crowd)} before you</small></span>
        {p.id === customerProfile && <span className="fr-pill">Your job</span>}
        <FIcon name="chevron" size={18} className="fr-muted" />
      </button></li>)}
    </ul>
    <button type="button" className="fr-link" onClick={onMap}>See all roads on one map <FIcon name="chevron" size={16} /></button>
  </section>;
}

// ---------- The vertical road ----------
type NodeRow = { kind: "node"; node: FounderNode; optional?: FounderNode };
type Row =
  | { kind: "chapter"; ch: ChapterId; done: boolean; collapsible: boolean }
  | { kind: "summary"; ch: ChapterId; nodes: FounderNode[] }
  | NodeRow
  | { kind: "fork" };
const ZIG = [50, 70, 50, 30];

function buildRows(road: FounderRoad, chosen: "a" | "b" | undefined, expanded: Set<ChapterId>): Row[] {
  const route = routeNodes(road, chosen);
  const rows: Row[] = [];
  const fork = road.fork;
  for (const ch of CHAPTERS) {
    const nodes = route.filter((n) => n.chapter === ch.id);
    const forkHere = fork?.chapter === ch.id;
    if (!nodes.length && !forkHere) continue;
    const main = nodes.filter((n) => n.status !== "optional");
    const done = main.length > 0 && main.every((n) => n.status === "done") && !forkHere;
    rows.push({ kind: "chapter", ch: ch.id, done, collapsible: done && main.length > 1 });
    if (done && main.length > 1 && !expanded.has(ch.id)) { rows.push({ kind: "summary", ch: ch.id, nodes: main }); continue; }
    if (forkHere && !nodes.some((n) => n.id === fork.after)) rows.push({ kind: "fork" });
    let last: NodeRow | undefined;
    for (const n of nodes) {
      if (n.status === "optional") { if (last) last.optional = n; continue; }
      last = { kind: "node", node: n };
      rows.push(last);
      if (fork?.after === n.id && fork.chapter === n.chapter) rows.push({ kind: "fork" });
    }
  }
  return rows;
}

function RoadScreen({ road, chosen, back, onBack, backLabel, onMap, onOpen, onCrossroads }: {
  road: FounderRoad; chosen?: "a" | "b"; back: Back; onBack: () => void; backLabel: string;
  onMap: () => void; onOpen: (o: Open) => void; onCrossroads: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<ChapterId>>(new Set());
  const current = nowNode(road);
  const route = routeNodes(road, chosen).filter((n) => n.status !== "optional");
  const currentCh = current?.chapter ?? route.find((n) => n.status === "next")?.chapter ?? "launch";
  const curN = chapter(currentCh).n;
  const inChapter = route.filter((n) => n.chapter === currentCh);
  const doneInChapter = inChapter.filter((n) => n.status === "done").length;
  const saved = savedMinutes(road);
  const toggle = (ch: ChapterId) => setExpanded((all) => { const next = new Set(all); if (next.has(ch)) next.delete(ch); else next.add(ch); return next; });

  return <section className="fr-screen fr-road-screen" aria-label={road.owner.name}>
    {back(backLabel, onBack)}
    <header className="fr-owner">
      <span className="fr-initial" aria-hidden="true">{road.owner.initial}</span>
      <div><h1>{road.owner.name}</h1><p>{road.owner.line}{saved ? ` · ${formatSaved(saved)} saved` : ""}</p></div>
      <button type="button" className="fr-outline" onClick={onMap}>All roads</button>
    </header>
    <button type="button" className="fr-progress" onClick={onMap} aria-label={`Your road, 7 chapters. ${chapter(currentCh).name}: ${doneInChapter} of ${inChapter.length} done. Open the map.`}>
      <span className="fr-progress-row"><span>Your road · 7 chapters</span><b>{chapter(currentCh).name} · {doneInChapter} of {inChapter.length} done ›</b></span>
      <span className="fr-segments" aria-hidden="true">{CHAPTERS.map((ch) => {
        const has = route.some((n) => n.chapter === ch.id) || road.fork?.chapter === ch.id;
        const state = ch.n < curN ? (has ? "done" : "skip") : ch.n === curN ? "now" : "future";
        return <i key={ch.id} className={`fr-seg fr-seg-${state}`} style={ch.n === curN ? { "--fill": `${Math.max(18, (doneInChapter / Math.max(1, inChapter.length)) * 100)}%` } as CSSProperties : undefined} />;
      })}</span>
    </button>
    <div className="fr-now-card">
      <div><small>{road.mine ? "Now" : "Explore"} · Chapter {curN} · {chapter(currentCh).name}</small><h2>{chapterTitle(road, currentCh)}</h2></div>
      <button type="button" className="fr-outline fr-guide" onClick={() => onOpen({ kind: "guide" })}><FIcon name="book" size={18} />Guide</button>
    </div>
    <RoadPath road={road} chosen={chosen} rows={buildRows(road, chosen, expanded)} expanded={expanded} onNode={(id) => onOpen({ kind: "node", id })} onToggle={toggle} onCrossroads={onCrossroads} />
  </section>;
}

const labelPos = (x: number, top: number): CSSProperties => (x > 50 ? { right: `calc(${100 - x}% + 44px)`, top } : { left: `calc(${x}% + 44px)`, top });

function RoadPath({ road, chosen, rows, expanded, onNode, onToggle, onCrossroads }: {
  road: FounderRoad; chosen?: "a" | "b"; rows: Row[]; expanded: Set<ChapterId>;
  onNode: (id: string) => void; onToggle: (ch: ChapterId) => void; onCrossroads: () => void;
}) {
  const fork = road.fork;
  const side = sideOf(road, chosen);
  const forkX = { a: 26, b: 74 };
  // Lay the rows out top to bottom; the road winds between fixed columns.
  let y = 0;
  let k = 0;
  const placed = rows.map((row) => {
    const now = row.kind === "node" && row.node.status === "now";
    const h = row.kind === "chapter" ? 46 : row.kind === "fork" ? 150 : row.kind === "summary" ? 76 + Math.ceil(row.nodes.length / 2) * 24 : now ? 178 : 112;
    const x = row.kind === "node" || row.kind === "summary" ? ZIG[k++ % ZIG.length] : 50;
    const cy = row.kind === "node" ? y + (now ? 110 : 50) : row.kind === "summary" ? y + 52 : row.kind === "fork" ? y + 66 : y;
    const p = { row, y, x, cy };
    y += h;
    return p;
  });
  const H = y + 24;
  // Path points in order; a fork splits in two and the road continues from the chosen side.
  type Pt = { x: number; y: number; state: "done" | "next" | "route"; split?: boolean };
  const pts: Pt[] = [];
  let passedNow = false;
  for (const p of placed) {
    if (p.row.kind === "node") {
      const st = p.row.node.status;
      pts.push({ x: p.x, y: p.cy, state: st === "done" || st === "now" ? "done" : passedNow && road.mine ? "route" : "next" });
      if (st === "now") passedNow = true;
    } else if (p.row.kind === "summary") pts.push({ x: p.x, y: p.cy, state: "done" });
    else if (p.row.kind === "fork") {
      pts.push({ x: forkX[side], y: p.cy, state: chosen ? "done" : road.mine ? "route" : "next", split: true });
      if (chosen) passedNow = false;
    }
  }
  const seg = (a: { x: number; y: number }, b: { x: number; y: number }) => `M${a.x} ${a.y} C${a.x} ${(a.y + b.y) / 2} ${b.x} ${(a.y + b.y) / 2} ${b.x} ${b.y}`;
  const segs: { d: string; state: Pt["state"]; faint?: boolean }[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    segs.push({ d: seg(a, b), state: b.state });
    if (b.split) segs.push({ d: seg(a, { x: side === "a" ? forkX.b : forkX.a, y: b.y }), state: "next", faint: true });
  }
  return <div className="fr-path" style={{ height: H }}>
    <svg className="fr-path-svg" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" width="100%" height={H} aria-hidden="true">
      {segs.map((sg, i) => <path key={`u${i}`} d={sg.d} className={`fr-track-bed ${sg.faint ? "fr-track-faint" : ""}`} vectorEffect="non-scaling-stroke" />)}
      {segs.map((sg, i) => <path key={`t${i}`} d={sg.d} className={`fr-track fr-track-${sg.state} ${sg.faint ? "fr-track-faint" : ""}`} vectorEffect="non-scaling-stroke" />)}
      {segs.map((sg, i) => sg.state === "route" && !sg.faint && <path key={`r${i}`} d={sg.d} className="fr-track-kate" vectorEffect="non-scaling-stroke" />)}
      {placed.map((p, i) => p.row.kind === "node" && p.row.optional && <path key={`o${i}`} d={`M${p.x} ${p.cy} L${p.x >= 50 ? 14 : 86} ${p.cy - 6}`} className="fr-track-opt" vectorEffect="non-scaling-stroke" />)}
    </svg>
    {placed.map((p) => {
      const r = p.row;
      if (r.kind === "chapter") {
        const ch = chapter(r.ch);
        return <div key={`c${r.ch}`} className="fr-ch" style={{ top: p.y, "--ch": ch.color } as CSSProperties}>
          <span>Chapter {ch.n} · {ch.name}</span>{r.done && <em><FIcon name="check" size={13} />Done</em>}
          {r.collapsible && <button type="button" className="fr-ch-toggle" onClick={() => onToggle(r.ch)} aria-expanded={expanded.has(r.ch)}>{expanded.has(r.ch) ? "Fold" : "Show steps"}</button>}
        </div>;
      }
      if (r.kind === "summary") {
        const ch = chapter(r.ch);
        return <Fragment key={`s${r.ch}`}>
          <button type="button" className="fr-node fr-node-done" style={{ left: `${p.x}%`, top: p.cy }} onClick={() => onToggle(r.ch)} aria-label={`${ch.name}: ${r.nodes.length} steps done. Show steps.`}><FIcon name="check" size={26} /></button>
          <button type="button" className={`fr-label fr-summary ${p.x > 50 ? "fr-label-left" : ""}`} style={labelPos(p.x, p.cy - 30)} onClick={() => onToggle(r.ch)}>
            <strong>{chapterTitle(road, r.ch)}</strong>
            <span className="fr-chips">{r.nodes.map((n) => <span key={n.id}><FIcon name="check" size={11} />{n.short}</span>)}</span>
          </button>
        </Fragment>;
      }
      if (r.kind === "fork" && fork) {
        return <Fragment key="fork">
          {(["a", "b"] as const).map((sd) => {
            const br = fork[sd];
            const taken = chosen === sd;
            const dim = !!chosen && chosen !== sd;
            const picked = fork.pick === sd && !chosen;
            return <Fragment key={sd}>
              {picked && <span className="fr-kate-pick" style={{ left: `${forkX[sd]}%`, top: p.cy - 58 }}>Kate’s pick</span>}
              <button type="button" className={`fr-node ${taken ? "fr-node-done" : "fr-node-fork"} ${dim ? "fr-node-dim" : ""} ${picked ? "fr-node-pick" : ""}`} style={{ left: `${forkX[sd]}%`, top: p.cy }} onClick={onCrossroads} aria-label={`Road ${sd.toUpperCase()}: ${br.label}${taken ? ", your road" : ""}`}>
                {taken ? <FIcon name="check" size={24} /> : <b>{sd.toUpperCase()}</b>}
              </button>
              <span className={`fr-fork-label ${dim ? "fr-node-dim" : ""}`} style={{ left: `${forkX[sd]}%`, top: p.cy + 40 }}><strong>{br.label}</strong><small>{taken ? "Your road" : `${pct(br.share)} took this road`}</small></span>
            </Fragment>;
          })}
        </Fragment>;
      }
      if (r.kind === "node") {
        const n = r.node;
        const now = n.status === "now";
        const opt = r.optional;
        const ox = p.x >= 50 ? 14 : 86;
        return <Fragment key={n.id}>
          {now && <button type="button" className="fr-callout" style={{ left: `${Math.min(74, Math.max(26, p.x))}%`, top: p.cy - 100 }} onClick={() => onNode(n.id)}>
            <strong>{n.title}</strong><span>Start{n.minutes ? ` · about ${n.minutes} min` : ""}</span>
          </button>}
          <button type="button" className={`fr-node fr-node-${n.status} ${now ? "fr-node-big" : ""}`} style={{ left: `${p.x}%`, top: p.cy }} onClick={() => onNode(n.id)} aria-label={`${n.title}. ${n.sub}`}>
            {n.status === "done" ? <FIcon name="check" size={26} /> : <FIcon name={n.icon} size={now ? 30 : 24} />}
          </button>
          {!now && <span className={`fr-label ${p.x > 50 ? "fr-label-left" : ""}`} style={labelPos(p.x, p.cy - 22)}><strong>{n.title}</strong><small>{n.sub}</small></span>}
          {opt && <>
            <button type="button" className="fr-node fr-node-optional" style={{ left: `${ox}%`, top: p.cy - 6 }} onClick={() => onNode(opt.id)} aria-label={`${opt.title}. ${opt.sub}`}><FIcon name={opt.icon} size={20} /></button>
            <span className="fr-opt-label" style={{ left: `${ox}%`, top: p.cy + 26 }}><strong>{opt.title}</strong><small>{opt.sub}</small></span>
          </>}
        </Fragment>;
      }
      return null;
    })}
  </div>;
}

// ---------- All roads map ----------
function MapScreen({ road, back, onBack, onRoad, detected }: { road: FounderRoad; back: Back; onBack: () => void; onRoad: (id: string) => void; detected?: string }) {
  const [view, setView] = useState<"map" | "list">("map");
  const state = mapStateFor(road);
  const rowH = 76;
  const cols = [40, 64, 88];
  const pos = (id: string) => { const m = MAP_NODES.find((x) => x.id === id)!; return { x: cols[m.col], y: (chapter(m.chapter).n - 1) * rowH + 30 }; };
  const H = CHAPTERS.length * rowH + 10;
  const WAY: Record<string, string> = { idea: "student", side: "physio", freelance: "freelancer", partners: "lawyer", clients: detected ?? "freelancer", invest: "employer", hire: "employer", pass: detected ?? "physio" };
  const onRouteEdge = (a: string, b: string) => (state.you === a || state.route.includes(a)) && state.route.includes(b);
  return <section className="fr-screen" aria-labelledby="fr-map-title">
    {back("Back", onBack)}
    <h1 id="fr-map-title">All roads</h1>
    <p className="fr-lead">7 chapters. Start anywhere, switch anytime.</p>
    <div className="fr-seg-control" role="tablist" aria-label="Road view">
      <button type="button" role="tab" aria-selected={view === "map"} onClick={() => setView("map")}>Map</button>
      <button type="button" role="tab" aria-selected={view === "list"} onClick={() => setView("list")}>List</button>
    </div>
    {view === "map" ? <>
      <div className="fr-legend" aria-hidden="true"><span><i className="fr-lg-done" />Done</span><span><i className="fr-lg-you" />You</span><span><i className="fr-lg-flag"><FIcon name="flag" size={10} /></i>A way in</span><span><i className="fr-lg-route" />Kate’s route</span></div>
      <div className="fr-map" style={{ height: H }}>
        {CHAPTERS.map((ch) => <div key={ch.id} className="fr-map-ch" style={{ top: (ch.n - 1) * rowH + 14, "--ch": ch.color } as CSSProperties}><b>{ch.name}</b><small>Chapter {ch.n}</small></div>)}
        <svg className="fr-map-svg" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" width="100%" height={H} aria-hidden="true">
          {MAP_EDGES.map(([a, b]) => {
            const p = pos(a);
            const q = pos(b);
            const d = `M${p.x} ${p.y} C${p.x} ${(p.y + q.y) / 2} ${q.x} ${(p.y + q.y) / 2} ${q.x} ${q.y}`;
            const done = state.done.includes(a) && state.done.includes(b);
            return <g key={`${a}-${b}`}><path d={d} className={`fr-map-edge ${done ? "fr-map-edge-done" : ""}`} vectorEffect="non-scaling-stroke" />{onRouteEdge(a, b) && <path d={d} className="fr-map-route" vectorEffect="non-scaling-stroke" />}</g>;
          })}
        </svg>
        {MAP_NODES.map((m) => {
          const p = pos(m.id);
          const ch = chapter(m.chapter);
          const done = state.done.includes(m.id);
          const you = state.you === m.id;
          return <button type="button" key={m.id} className={`fr-map-node ${done ? "fr-map-done" : ""} ${you ? "fr-map-you" : ""}`} style={{ left: `${p.x}%`, top: p.y, "--ch": ch.color } as CSSProperties}
            onClick={() => onRoad(WAY[m.id] ?? road.profileId)} aria-label={`${m.label}, ${ch.name}${done ? ", done" : ""}${you ? ", you are here" : ""}${m.wayIn ? ", a way in" : ""}`}>
            <span className="fr-map-dot">{done && !you && <FIcon name="check" size={14} />}</span>
            {m.wayIn && <span className="fr-map-flag"><FIcon name="flag" size={10} /></span>}
            <span className="fr-map-label">{m.label}</span>
          </button>;
        })}
      </div>
    </> : <ul className="fr-list">
      {CHAPTERS.map((ch) => <li key={ch.id} className="fr-list-static"><span className="fr-line" style={{ background: ch.color }} aria-hidden="true" /><span className="fr-list-copy"><strong>{ch.n}. {ch.name}</strong><small>{MAP_NODES.filter((m) => m.chapter === ch.id).map((m) => m.label).join(" · ")}</small></span></li>)}
      {PROFILES.map((p) => <li key={p.id}><button type="button" onClick={() => onRoad(p.id)}><span className="fr-line" style={{ background: p.hue }} aria-hidden="true" /><span className="fr-list-copy"><strong>{p.job} road</strong><small>{p.headline}</small></span><FIcon name="chevron" size={18} className="fr-muted" /></button></li>)}
    </ul>}
  </section>;
}

// ---------- Crossroads ----------
const branchTab = (label: string) => label.replace(/^(Stay a |Stay |Become a |Started a |Start a )/, "").replace(/^./, (c) => c.toUpperCase());

function CrossroadsScreen({ road, chosen, crowd, job, back, onBack, onTake, onAskKate }: {
  road: FounderRoad; chosen?: "a" | "b"; crowd: number; job: string; back: Back;
  onBack: () => void; onTake: (side: "a" | "b") => void; onAskKate?: () => void;
}) {
  const fork = road.fork!;
  const [sel, setSel] = useState<"a" | "b">(chosen ?? sideOf(road));
  const br = fork[sel];
  const most = fork.a.share >= fork.b.share ? "a" : "b";
  return <section className="fr-screen fr-x" aria-labelledby="fr-x-title">
    <div className="fr-x-top">{back("Your road", onBack)}<span className="fr-x-badge"><FIcon name="fork" size={14} />Crossroads</span></div>
    <h1 id="fr-x-title">Pick your road</h1>
    <p className="fr-lead">{fork.title} <span className="fr-x-crowd">What {int(crowd)} people before you chose:</span></p>
    <div className="fr-x-graphic">
      <svg viewBox="0 0 340 130" width="100%" height="104" aria-hidden="true">
        <rect x="0" y="22" width="340" height="30" className="fr-x-lane" /><rect x="0" y="78" width="340" height="30" className="fr-x-lane" />
        <path d="M0 65 H50" className="fr-x-line fr-x-on" />
        <path d="M50 65 C80 65 90 37 120 37 H136" className={`fr-x-line ${sel === "a" ? "fr-x-on fr-x-dash" : "fr-x-off"}`} />
        <path d="M50 65 C80 65 90 93 120 93 H136" className={`fr-x-line ${sel === "b" ? "fr-x-on fr-x-dash" : "fr-x-off"}`} />
        <circle cx="50" cy="65" r="13" className="fr-x-you" /><circle cx="50" cy="65" r="6" fill="#fff" />
        <text x="146" y="42" className={sel === "a" ? "fr-x-t-on" : "fr-x-t"}>A · {branchTab(fork.a.label)}</text>
        <text x="146" y="98" className={sel === "b" ? "fr-x-t-on" : "fr-x-t"}>B · {branchTab(fork.b.label)}</text>
        <text x="330" y="43" className={sel === "a" ? "fr-x-pct-on" : "fr-x-pct"} textAnchor="end">{pct(fork.a.share)}</text>
        <text x="330" y="99" className={sel === "b" ? "fr-x-pct-on" : "fr-x-pct"} textAnchor="end">{pct(fork.b.share)}</text>
      </svg>
      <div className="fr-x-lanes" role="radiogroup" aria-label="Roads">
        {(["a", "b"] as const).map((sd) => <button key={sd} type="button" role="radio" aria-checked={sel === sd} onClick={() => setSel(sd)} aria-label={`Road ${sd.toUpperCase()}: ${fork[sd].label}`} />)}
      </div>
    </div>
    <div className="fr-x-options" role="radiogroup" aria-label="Choose a road">
      {(["a", "b"] as const).map((sd) => <button key={sd} type="button" role="radio" aria-checked={sel === sd} className={`fr-x-option ${sel === sd ? "fr-x-option-on" : ""}`} onClick={() => setSel(sd)}>
        <span className="fr-x-option-head"><b>{sd.toUpperCase()} · {fork[sd].label}</b><em>{pct(fork[sd].share)}</em></span>
        <small>{fork[sd].good}</small>
        {fork.pick === sd && <span className="fr-x-pick">Kate's pick</span>}
      </button>)}
    </div>
    <div className="fr-kate-card fr-kate-compact">
      <div className="fr-kate-head"><img className="fr-kate-dot" src="/kate-logo.png" alt="" /><b>{fork.pick && sel === fork.pick ? `Kate’s pick for you: road ${fork.pick.toUpperCase()}` : `Road ${sel.toUpperCase()}: ${br.label}`}</b></div>
      <p>{fork.pick && sel === fork.pick ? fork.pickWhy : `${br.good} ${pct(br.share)} of ${int(crowd)} people before you took this road. You can switch later.`}</p>
    </div>
    <div className="fr-x-actions">
      <button type="button" className="fr-light-button" onClick={(e) => { if (e.detail <= 1) onTake(sel); }} disabled={chosen === sel}>{chosen === sel ? `You are on road ${sel.toUpperCase()}` : `Take road ${sel.toUpperCase()}`} <FIcon name="arrow" size={20} /></button>
      {onAskKate && <button type="button" className="fr-link fr-center" onClick={onAskKate}>Talk it through with Kate</button>}
    </div>
    <ul className="fr-glance">
      {br.pros.filter((t) => t !== br.good).slice(0, 1).map((t) => <li key={t}><i className="fr-plus">+</i>{t}</li>)}
      {br.cons.slice(0, 1).map((t) => <li key={t}><i className="fr-minus">−</i>{t}</li>)}
    </ul>
  </section>;
}

// ---------- Sheets ----------
function SheetFrame({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); previous?.focus(); };
  }, []);
  return <div className="fr-overlay" onClick={onClose}>
    <div className="fr-sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref} onClick={(e) => e.stopPropagation()}>
      <span className="fr-grab" aria-hidden="true" />
      <header className="fr-sheet-top"><button type="button" className="fr-text-btn" onClick={onClose}>Close</button><b>{title}</b><span /></header>
      {children}
    </div>
  </div>;
}

function StepList({ nodes }: { nodes: FounderNode[] }) {
  return <ol className="fr-guide-steps">{nodes.map((n) => <li key={n.id} className={`fr-gs-${n.status}`}><FIcon name={n.status === "done" ? "check" : n.icon} size={16} /><span><strong>{n.title}</strong><small>{n.sub}</small></span></li>)}</ol>;
}

function StepSheet({ node, road, crowd, onClose, onPartner, onRemind, onFinish }: {
  node: FounderNode; road: FounderRoad; crowd: number; onClose: () => void; onPartner: (id: PartnerId) => void;
  onRemind: () => void; onAskKate?: () => void; onFinish: () => void;
}) {
  const s = useStore();
  const [why, setWhy] = useState(false);
  const saved = s.plan.some((p) => p.id === `biz:${road.id}:${node.id}`);
  const form = node.status !== "done" ? node.form : undefined;
  const total = form ? form.fromKbc.length + form.needYou.length : 0;
  const leadsToFork = road.fork?.after === node.id;
  const meta = [node.minutes && `About ${node.minutes} min`, node.fee, node.online && "All online"].filter(Boolean).join(" · ");
  return <SheetFrame title={node.short} onClose={onClose}>
    <div className="fr-sheet-body">
      <span className={`fr-sheet-icon ${node.status === "done" ? "fr-sheet-icon-done" : ""}`}><FIcon name={node.status === "done" ? "check" : node.icon} size={30} /></span>
      <h2>{node.title}</h2>
      <p className="fr-sheet-meta">{node.status === "done" ? node.sub : meta || node.sub}</p>
      <button type="button" className="fr-explain" aria-expanded={why} onClick={() => setWhy(!why)}>
        <span className="fr-play"><FIcon name={why ? "check" : "play"} size={16} /></span>
        <span><strong>What it is, and why now</strong><small>Kate explains · 0:30</small></span>
        <span className={`fr-wave ${why ? "fr-wave-on" : ""}`} aria-hidden="true"><i /><i /><i /><i /><i /></span>
      </button>
      {why && <p className="fr-why">{node.why}</p>}
      {form && <div className="fr-filled">
        <div className="fr-fill-head"><span>Kate filled in {form.fromKbc.length} of {total}</span><b>From your KBC data</b></div>
        <span className="fr-fill-bar" aria-hidden="true"><i style={{ width: `${(form.fromKbc.length / total) * 100}%` }} /></span>
      </div>}
      {!form && node.status !== "done" && <div className="fr-partner-chips">{node.partners.map((id) => <button type="button" key={id} className={`fr-chip fr-chip-${PARTNERS[id].kind}`} onClick={() => onPartner(id)}>{PARTNERS[id].name}{PARTNERS[id].offer ? " · offer" : ""} ›</button>)}</div>}
      {node.crowd && <p className="fr-crowd-line"><b>{pct(node.crowd.share)}</b> of {int(crowd)} people on this road {node.crowd.label}.</p>}
      {node.status === "now" ? <button type="button" className="fr-light-button" onClick={onFinish}>{leadsToFork ? "Compare the two roads" : form ? `Send to ${form.to}` : "Mark as done"} <FIcon name="arrow" size={20} /></button>
        : node.status === "next" ? <button type="button" className="fr-outline fr-wide" disabled={saved} onClick={onRemind}>{saved ? "In your plan" : "Remind me in my plan"}</button> : null}
    </div>
  </SheetFrame>;
}

function GuideSheet({ road, chosen, adviser, onClose, onPartner, onTalk }: { road: FounderRoad; chosen?: "a" | "b"; adviser: string; onClose: () => void; onPartner: (id: PartnerId) => void; onTalk: () => void }) {
  const route = routeNodes(road, chosen);
  const current = nowNode(road)?.chapter ?? route.find((n) => n.status === "next")?.chapter ?? "launch";
  const ids = [...new Set(route.flatMap((n) => n.partners))];
  return <SheetFrame title="Guide" onClose={onClose}>
    <div className="fr-sheet-body fr-guide-body">
      <h2>{chapterTitle(road, current)}</h2>
      <p className="fr-sheet-meta">Chapter {chapter(current).n} · {chapter(current).name}</p>
      <StepList nodes={route.filter((n) => n.chapter === current)} />
      <h3>Your team on this road</h3>
      <ul className="fr-team">{ids.map((id) => { const p = PARTNERS[id]; return <li key={id}><button type="button" onClick={() => onPartner(id)}><span className={`fr-kind fr-kind-${p.kind}`}>{KIND_LABEL[p.kind]}</span><strong>{p.name}</strong>{p.local && <small>{p.local}</small>}</button></li>; })}</ul>
      <button type="button" className="fr-light-button" onClick={onTalk}>Talk to {adviser} <FIcon name="arrow" size={20} /></button>
    </div>
  </SheetFrame>;
}

function PartnerSheet({ id, adviser, onClose, onTalk }: { road: FounderRoad; id: PartnerId; adviser: string; onClose: () => void; onTalk: () => void }) {
  const partner = PARTNERS[id];
  return <SheetFrame title={partner.name} onClose={onClose}>
    <div className="fr-sheet-body">
      <p className="fr-sheet-meta"><span className={`fr-kind fr-kind-${partner.kind}`}>{KIND_LABEL[partner.kind]}</span> {partner.local}</p>
      <p className="fr-why">{partner.role}</p>
      {partner.offer && <div className="fr-offer"><span className="fr-offer-tag">KBC partner offer</span><strong>{partner.offer}</strong></div>}
      <button type="button" className="fr-light-button" onClick={onTalk}>{partner.offer ? "Use this offer" : `Talk to ${adviser}`} <FIcon name="arrow" size={20} /></button>
      {partner.options && <><h3>What people in your job chose</h3>
        <ul className="fr-options">{partner.options.map((o) => <li key={o.label}><div><strong>{o.label}</strong><b>{pct(o.share)}</b></div><span className="fr-fill-bar"><i style={{ width: pct(o.share) }} /></span></li>)}</ul></>}
    </div>
  </SheetFrame>;
}

const teamKey = (road: FounderRoad, side: "a" | "b", t: TeamItem) => `${road.id}:${side}:${t.partner}`;
const teamDone = (road: FounderRoad, side: "a" | "b", lined: Record<string, unknown>) => (road.team?.[side] ?? []).filter((t) => lined[teamKey(road, side, t)]).length;
/** "{name}" in copy: the organisation, without the generic "business counter" suffix */
const fill = (text: string, name: string) => text.replaceAll("{name}", name.replace(/ business counter$/i, "").replace(/^Choose a notary on notaris\.be$/, "your notary"));

// Partner logos live in /public/partners; logos.json maps the names on the road to files.
let logoMap: Record<string, string> | null = null;
let logoLoad: Promise<void> | null = null;
function useLogos() {
  const [map, setMap] = useState(logoMap);
  useEffect(() => {
    if (logoMap) return;
    logoLoad ??= fetch("/partners/logos.json").then((r) => (r.ok ? r.json() : {})).then((m: Record<string, string>) => { logoMap = m; }).catch(() => { logoMap = {}; });
    logoLoad.then(() => setMap(logoMap));
  }, []);
  return map ?? {};
}

/** A partner's logo on a white tile, or its initials when we have no logo. */
function Logo({ name, size = 32 }: { name: string; size?: number }) {
  const logos = useLogos();
  const src = logos[name];
  // Logos are mostly wide wordmarks: a white plate, wider than it is tall.
  if (src) return <span className="fr-logo fr-logo-img" style={{ width: Math.round(size * 1.8), height: size }} aria-hidden="true"><img src={src} alt="" onLoad={(e) => {
    // Square marks (like KBC's) get a square plate.
    const img = e.currentTarget;
    if (img.naturalWidth / Math.max(1, img.naturalHeight) < 1.3 && img.parentElement) img.parentElement.style.width = `${size}px`;
  }} /></span>;
  return <span className="fr-logo fr-logo-none" style={{ width: size, height: size }} aria-hidden="true"><FIcon name="people" size={Math.round(size * 0.5)} /></span>;
}

type TeamState = { name: string; by: "you" | "kate" };
/** What the customer lined up, for this browser session */
const linedMemory: Record<string, TeamState> = {};
/** What Kate fills in from the customer's own KBC data (demo). */
const KBC_WIN: Partial<Record<PartnerId, string>> = {
  counter: "a business customer from day one", "social-fund": "a tax reserve at KBC", accountant: "a consented data link",
  kbc: "a business account", vlaio: "a funded starter", notary: "the capital account", insurer: "a protected client",
};
const ACTIVITY: Record<string, string> = { founder: "software development (NACE 62.01)", physio: "physiotherapy practice" };
const firstName = (road: FounderRoad) => road.owner.name.split("'")[0];
const kateFilled = (road: FounderRoad, hasAccount: boolean) => [
  { label: "Name and address", value: `${firstName(road)}, from your KBC profile`, ok: true },
  { label: "National number", value: "From itsme, shared only when you approve", ok: true },
  { label: "Activity", value: ACTIVITY[road.profileId] ?? "From your road", ok: true },
  { label: "Business account", value: hasAccount ? "Your new KBC business account" : "Not opened yet: you can add it later", ok: hasAccount },
];

const NEED_LABEL = { required: "Required", recommended: "Recommended", optional: "Optional" } as const;
/** Short names for the card tabs */
const TAB: Partial<Record<PartnerId, string>> = { counter: "KBO", "social-fund": "Social fund", accountant: "Accountant", kbc: "Account", vlaio: "Grants", notary: "Notary", insurer: "Insurance" };

function TeamSheet({ road, side, lined, onLine, onKate, onClose }: {
  road: FounderRoad; side: "a" | "b"; lined: Record<string, TeamState>;
  onLine: (t: TeamItem, name: string, by: "you" | "kate") => void; onKate?: (t: TeamItem, name: string) => void; onClose: () => void;
}) {
  const team = road.team![side]!;
  const label = road.fork?.[side].label ?? "your road";
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<PartnerId | null>(null);
  const [start, setStart] = useState<Record<string, string>>({});
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [more, setMore] = useState<PartnerId | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    page.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key !== "Tab" || !page.current) return;
      const items = [...page.current.querySelectorAll<HTMLElement>("button, input, [href]")].filter((el) => !el.closest("[inert]") && !(el as HTMLButtonElement).disabled);
      if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); previous?.focus(); };
  }, []);
  const go = (i: number) => {
    const next = Math.max(0, Math.min(team.length - 1, i));
    setIndex(next);
    setMore(null);
    setDraft(null);
    const card = track.current?.children[next] as HTMLElement | undefined;
    const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.current?.scrollTo({ left: card ? card.offsetLeft - 16 : 0, behavior: still ? "auto" : "smooth" });
  };
  const onScroll = () => {
    const box = track.current;
    if (!box) return;
    const i = Math.round(box.scrollLeft / Math.max(1, box.clientWidth - 24));
    if (i !== index) setIndex(Math.max(0, Math.min(team.length - 1, i)));
  };
  const done = teamDone(road, side, lined);
  const cur = team[index];
  const curState = lined[teamKey(road, side, cur)];
  const curName = choice[cur.partner] ?? cur.pick ?? cur.names[0];
  const kbcItem = team.find((t) => t.partner === "kbc");
  const hasAccount = !!kbcItem && !!lined[teamKey(road, side, kbcItem)];
  return <section className="fr-page" role="dialog" aria-modal="true" aria-labelledby="fr-page-title" ref={page}>
    <header className="fr-page-top">
      <button type="button" className="fr-back" onClick={onClose} aria-label="Back to your road"><FIcon name="back" size={18} /></button>
      <h2 id="fr-page-title">What you need now<small>{label} · {done} of {team.length} sorted</small></h2>
      <span />
    </header>
    <nav className="fr-deck-nav" aria-label="Cards">
      <button type="button" className="fr-text-btn" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous">‹</button>
      <span className="fr-deck-dots">{team.map((t, i) => <button key={t.partner} type="button" aria-label={`${i + 1}: ${PARTNERS[t.partner].name}`} aria-current={i === index} className={`${i === index ? "on" : ""} ${lined[teamKey(road, side, t)] ? "done" : ""}`} onClick={() => go(i)}>{TAB[t.partner] ?? PARTNERS[t.partner].name}</button>)}</span>
      <button type="button" className="fr-text-btn" onClick={() => go(index + 1)} disabled={index === team.length - 1} aria-label="Next">›</button>
    </nav>
    <div className="fr-deck" ref={track} onScroll={onScroll} role="region" aria-roledescription="carousel" aria-label="What you need now">
      {team.map((t, i) => {
        const p = PARTNERS[t.partner];
        const state = lined[teamKey(road, side, t)];
        const name = state?.name ?? choice[t.partner] ?? t.pick ?? t.names[0];
        const facts = [t.minutes && { icon: "calendar" as const, text: `Takes about ${t.minutes} min` }, t.when && { icon: "calendar" as const, text: t.when }, t.cost && { icon: "euro" as const, text: t.cost }].filter(Boolean) as { icon: "calendar" | "euro"; text: string }[];
        return <article key={t.partner} ref={(el) => { if (el) el.inert = i !== index; }} className={`fr-deck-card ${state ? "fr-deck-done" : ""}`} aria-roledescription="slide" aria-label={`${i + 1} of ${team.length}: ${p.name}`}>
          <div className="fr-deck-scroll">
            <header className="fr-deck-head">
              <Logo name={name} size={52} />
              <span><strong>{p.name}</strong><small>{t.why}</small>{t.need && <span className={`fr-need fr-need-${t.need}`}>{NEED_LABEL[t.need]}</span>}</span>
            </header>
            {state ? <>
              <p className="fr-team-then" role="status"><FIcon name="check" size={16} />{state.by === "kate" ? `Approved. Kate sent it to ${fill("{name}", state.name)}. ${fill(t.then ?? "", state.name)}` : fill(t.then ?? "Done.", state.name)}</p>
              <ul className="fr-win" aria-label="Who gains">
                <li><b>You</b>{t.minutes ? `${t.minutes * 3} min saved` : "one less worry"}</li>
                <li><b>{fill("{name}", state.name).replace(/^Choose a notary on /, "")}</b>a ready client</li>
                <li><b>KBC</b>{KBC_WIN[t.partner] ?? "a closer customer"}</li>
              </ul>
            </> : <>
              {t.because && <section className="fr-deck-sec"><h3>Why you need it</h3><p className="fr-deck-because">{t.because}</p></section>}
              {facts.length > 0 && <ul className="fr-facts">{facts.map((f) => <li key={f.text}><FIcon name={f.icon} size={14} />{f.text}</li>)}</ul>}
              <section className="fr-deck-sec">
                <h3>Who can do it</h3>
                <div className="fr-who" role="radiogroup" aria-label={`Who to use for ${p.name.toLowerCase()}`}>
                  {t.names.map((n) => <button key={n} type="button" role="radio" aria-checked={n === name} onClick={() => setChoice({ ...choice, [t.partner]: n })}>
                    <Logo name={n} size={40} /><span>{n.replace(/ business counter$/i, "")}</span>{n === t.pick && <em>Kate's pick</em>}
                  </button>)}
                </div>
                {t.pickWhy && <p className="fr-deck-pickwhy"><FIcon name="spark2" size={13} />{t.pickWhy}</p>}
              </section>
              {t.kbcDoes && <p className="fr-kbc-does"><span className="fr-offer-mini">KBC</span>{t.kbcDoes}</p>}
              <button type="button" className="fr-text-btn fr-deck-more" aria-expanded={more === t.partner} onClick={() => setMore(more === t.partner ? null : t.partner)}>{more === t.partner ? "Less" : "What people chose"}</button>
              {more === t.partner && <div className="fr-deck-info">
                <p>{p.role}</p>
                {p.options && <ul className="fr-options">{p.options.map((o) => <li key={o.label}><div><strong>{o.label}</strong><b>{pct(o.share)}</b></div><span className="fr-fill-bar"><i style={{ width: pct(o.share) }} /></span></li>)}</ul>}
              </div>}
            </>}
          </div>
        </article>;
      })}
    </div>
    {!curState && <footer className="fr-deck-actions fr-page-actions">
            {draft === cur.partner ? <div className="fr-kate-draft" role="group" aria-label="Kate prepared this">
              <b><FIcon name="spark2" size={14} /> Kate prepared this for {fill("{name}", curName)}</b>
              <span className="fr-fill-bar" aria-hidden="true"><i className="fr-fill-grow" /></span>
              <ul>{kateFilled(road, hasAccount).map((f, k) => <li key={f.label} className={f.ok ? "" : "fr-needs"} style={{ animationDelay: `${0.25 + k * 0.4}s` }}><FIcon name={f.ok ? "check" : "info"} size={14} /><span><b>{f.label}</b>{f.value}</span></li>)}</ul>
              <label className="fr-start"><span>Start date <em>needed from you</em></span><input type="date" value={start[cur.partner] ?? ""} onChange={(e) => setStart({ ...start, [cur.partner]: e.target.value })} /></label>
              <small>Nothing is sent until you approve. Only these fields go to {fill("{name}", curName)}, no transactions.</small>
              <button type="button" className="fr-light-button" disabled={!start[cur.partner]} onClick={() => { onLine(cur, curName, "kate"); setDraft(null); }}>{start[cur.partner] ? "Approve with itsme (demo)" : "Enter your start date to continue"} <FIcon name="arrow" size={20} /></button>
              <div className="fr-team-links"><button type="button" className="fr-text-btn" onClick={() => setDraft(null)}>Back</button>{onKate && <button type="button" className="fr-text-btn" onClick={(e) => { if (e.detail <= 1) onKate(cur, curName); }}>Ask Kate a question ›</button>}</div>
            </div> : <>
              <button type="button" className="fr-light-button" onClick={() => onLine(cur, curName, "you")}>{fill(cur.cta ?? "Start with {name}", curName)} <FIcon name="arrow" size={20} /></button>
              <button type="button" className="fr-outline fr-wide fr-kate-do" onClick={(e) => { if (e.detail <= 1) setDraft(cur.partner); }}><FIcon name="spark2" size={16} /> Let Kate do it</button>
            </>}
    </footer>}
    <p className="fr-sr" aria-live="polite">{index + 1} of {team.length}: {PARTNERS[team[index].partner].name}</p>
  </section>;
}
