"use client";

import { type CSSProperties, Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { useStore } from "../../hindsight/components/store";
import {
  CHAPTERS, chapter, type ChapterId, chapterTitle, type FounderNode, type FounderRoad, formatSaved,
  MAP_EDGES, MAP_NODES, mapStateFor, nowNode, routeNodes, savedMinutes,
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
type Open = { kind: "node"; id: string } | { kind: "guide" } | { kind: "partner"; id: PartnerId } | null;
type Back = (label: string, to: () => void) => ReactNode;

const pct = (share: number) => `${Math.round(share * 100)}%`;
const int = (n: number) => n.toLocaleString("en-GB");
const KIND_LABEL = { public: "Public", professional: "Professional", kbc: "KBC" } as const;
const sideOf = (road: FounderRoad, chosen?: "a" | "b") => chosen ?? road.fork?.pick ?? (road.fork && road.fork.a.share >= road.fork.b.share ? "a" : "b");
const formCount = (n: FounderNode) => n.form ? { filled: n.form.fromKbc.length, total: n.form.fromKbc.length + n.form.needYou.length } : undefined;

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
  const { road, chosen, choose, complete } = useFounderRoad(personKey, profileId);
  const [open, setOpen] = useState<Open>(null);
  const [notice, setNotice] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const adviser = advisorName ?? s.advisor?.name ?? "your KBC adviser";
  const profile = profileById(profileId) ?? PROFILES[0];
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [screen, profileId]);
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
  const node = open?.kind === "node" ? road.nodes.find((n) => n.id === open.id) : undefined;
  const back: Back = (label, to) => <button type="button" className="fr-back" onClick={to}><FIcon name="back" size={18} />{label}</button>;
  const ask = (q: string) => onAskKate && (() => onAskKate(`I am a ${profile.job.toLowerCase()}. ${q}`));

  return <div className={`fr ${large ? "fr-large" : ""}`} data-testid="business-roads">
    <div className={`fr-scroll ${screen === "road" ? "fr-scroll-bar" : ""}`} ref={scrollRef}>
      {screen === "start" && <StartScreen customerProfile={customer?.profile} customerLine={customer?.noticed} back={back} onBack={onClose} onRoad={goRoad} onMap={goMap} />}
      {screen === "road" && <RoadScreen road={road} chosen={chosen} back={back} backLabel={start === "road" ? "Your road" : "Where to start"} onBack={() => (start === "road" ? onClose() : setScreen("start"))}
        onMap={goMap} onOpen={setOpen} onCrossroads={() => setScreen("crossroads")} />}
      {screen === "map" && <MapScreen road={road} back={back} onBack={() => setScreen(mapFrom === "map" ? "start" : mapFrom)} onRoad={goRoad} detected={customer?.profile} />}
      {screen === "crossroads" && road.fork && <CrossroadsScreen road={road} chosen={chosen} crowd={profile.crowd} job={profile.job} back={back} onBack={() => setScreen("road")}
        onTake={(side) => { choose(side); setNotice(`You took road ${side.toUpperCase()}: ${road.fork![side].label}.`); setScreen("road"); }}
        onAskKate={ask(`${road.fork.title} What did people in my job choose?`)} />}
      {notice && screen === "road" && <p role="status" aria-live="polite" className="fr-notice">{notice}</p>}
      <p className="fr-footnote">{SYNTHETIC}. Rules and amounts change; your partners confirm what applies to you.</p>
    </div>

    {screen === "road" && <NextBar road={road} chosen={chosen} onOpen={(id) => setOpen({ kind: "node", id })} />}

    {node && <StepSheet node={node} road={road} crowd={profile.crowd} onClose={() => setOpen(null)} onPartner={(id) => setOpen({ kind: "partner", id })}
      onRemind={() => remind(node)} onAskKate={ask(`What did people in my job do about this step: ${node.title.toLowerCase()}?`)}
      onFinish={() => {
        if (road.fork?.after === node.id && !chosen) { setOpen(null); setScreen("crossroads"); return; }
        complete(); setOpen(null); setNotice(`Done: ${node.title}. Your road moved on.`);
      }} />}
    {open?.kind === "guide" && <GuideSheet road={road} chosen={chosen} adviser={adviser} onClose={() => setOpen(null)} onPartner={(id) => setOpen({ kind: "partner", id })} onTalk={talk} />}
    {open?.kind === "partner" && <PartnerSheet road={road} id={open.id} adviser={adviser} onClose={() => setOpen(null)} onTalk={talk} />}
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
      <div className="fr-kate-head"><span className="fr-kate-dot"><FIcon name="spark2" size={14} /></span><b>{mine ? "Kate noticed something" : "You are not alone"}</b><FIcon name="info" size={18} className="fr-muted" /></div>
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
    const h = row.kind === "chapter" ? 46 : row.kind === "fork" ? 214 : row.kind === "summary" ? 76 + Math.ceil(row.nodes.length / 2) * 24 : now ? 178 : 112;
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
          <button type="button" className="fr-fork-chip" style={{ top: p.cy + 92 }} onClick={onCrossroads}><FIcon name="fork" size={16} />{chosen ? "Your choice" : "Pick your road"}</button>
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

function NextBar({ road, chosen, onOpen }: { road: FounderRoad; chosen?: "a" | "b"; onOpen: (id: string) => void }) {
  const n = nowNode(road) ?? routeNodes(road, chosen).find((x) => x.status === "next");
  if (!n) return null;
  const c = formCount(n);
  return <div className="fr-nextbar">
    <span className="fr-kate-dot fr-kate-dot-big"><FIcon name="spark2" size={16} /></span>
    <div><strong>{n.title}</strong><small>{c ? `Kate filled in ${c.filled} of ${c.total}` : n.status === "now" ? "Your next step" : "Start here"}{n.minutes ? ` · ${n.minutes} min` : ""}</small></div>
    <button type="button" onClick={() => onOpen(n.id)}>Continue</button>
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
  return <section className="fr-screen" aria-labelledby="fr-x-title">
    <div className="fr-x-top">{back("Your road", onBack)}<span className="fr-x-badge"><FIcon name="fork" size={14} />Crossroads</span></div>
    <h1 id="fr-x-title">Pick your road</h1>
    <p className="fr-lead">{fork.title} {fork.question}</p>
    <div className="fr-x-graphic" aria-hidden="true">
      <svg viewBox="0 0 340 130" width="100%" height="130">
        <rect x="0" y="22" width="340" height="30" className="fr-x-lane" /><rect x="0" y="78" width="340" height="30" className="fr-x-lane" />
        <path d="M0 65 H50" className="fr-x-line fr-x-on" />
        <path d="M50 65 C100 65 110 37 170 37 H186" className={`fr-x-line ${sel === "a" ? "fr-x-on fr-x-dash" : "fr-x-off"}`} />
        <path d="M50 65 C100 65 110 93 170 93 H186" className={`fr-x-line ${sel === "b" ? "fr-x-on fr-x-dash" : "fr-x-off"}`} />
        <circle cx="50" cy="65" r="13" className="fr-x-you" /><circle cx="50" cy="65" r="6" fill="#fff" />
        <text x="310" y="41" className={sel === "a" ? "fr-x-t-on" : "fr-x-t"} textAnchor="end">A · {branchTab(fork.a.label)}</text>
        <text x="310" y="97" className={sel === "b" ? "fr-x-t-on" : "fr-x-t"} textAnchor="end">B · {branchTab(fork.b.label)}</text>
      </svg>
    </div>
    <div className="fr-seg-control" role="tablist" aria-label="Roads">
      {(["a", "b"] as const).map((sd) => <button key={sd} type="button" role="tab" aria-selected={sel === sd} onClick={() => setSel(sd)}>{sd.toUpperCase()} · {branchTab(fork[sd].label)}</button>)}
    </div>
    <div className="fr-kate-card fr-kate-compact">
      <div className="fr-kate-head"><span className="fr-kate-dot"><FIcon name="spark2" size={14} /></span><b>{fork.pick ? `Kate’s pick for you: road ${fork.pick.toUpperCase()}` : `Most people in this job took road ${most.toUpperCase()}`}</b></div>
      <p>{fork.pick ? fork.pickWhy : `${pct(fork[most].share)} of ${int(crowd)} people chose it. Kate can compare both for your own numbers once this is your road.`}</p>
    </div>
    <h2 className="fr-caps">Road {sel.toUpperCase()} at a glance</h2>
    <ul className="fr-glance">
      <li className="fr-glance-good">{br.good}</li>
      {br.pros.filter((t) => t !== br.good).map((t) => <li key={t}><i className="fr-plus">+</i>{t}</li>)}
      {br.cons.map((t) => <li key={t}><i className="fr-minus">−</i>{t}</li>)}
      <li><i className="fr-crowd-i"><FIcon name="people" size={14} /></i>{pct(br.share)} of {int(crowd)} {job.toLowerCase()}s took this road</li>
      {br.next && <li className="fr-glance-next"><FIcon name="flag" size={16} /><span>Next stops</span><b>{br.next}</b></li>}
    </ul>
    {br.quote && <blockquote className="fr-quote">“{br.quote}”</blockquote>}
    <button type="button" className="fr-light-button" onClick={() => onTake(sel)} disabled={chosen === sel}>{chosen === sel ? `You are on road ${sel.toUpperCase()}` : `Take road ${sel.toUpperCase()}`} <FIcon name="arrow" size={20} /></button>
    {onAskKate && <button type="button" className="fr-link fr-center" onClick={onAskKate}>Talk it through with Kate</button>}
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

function KateBox({ text, onAskKate }: { text: string; onAskKate?: () => void }) {
  return <div className="fr-kate-card fr-kate-compact">
    <div className="fr-kate-head"><span className="fr-kate-dot"><FIcon name="spark2" size={14} /></span><b>Kate · from people before you</b></div>
    <p>{text}</p>{onAskKate && <button type="button" className="fr-link" onClick={onAskKate}>Ask Kate more <FIcon name="chevron" size={14} /></button>}
  </div>;
}

function StepList({ nodes }: { nodes: FounderNode[] }) {
  return <ol className="fr-guide-steps">{nodes.map((n) => <li key={n.id} className={`fr-gs-${n.status}`}><FIcon name={n.status === "done" ? "check" : n.icon} size={16} /><span><strong>{n.title}</strong><small>{n.sub}</small></span></li>)}</ol>;
}

function StepSheet({ node, road, crowd, onClose, onPartner, onRemind, onAskKate, onFinish }: {
  node: FounderNode; road: FounderRoad; crowd: number; onClose: () => void; onPartner: (id: PartnerId) => void;
  onRemind: () => void; onAskKate?: () => void; onFinish: () => void;
}) {
  const s = useStore();
  const [why, setWhy] = useState(!node.form || node.status === "done");
  const [kbcOpen, setKbcOpen] = useState(false);
  const [filled, setFilled] = useState<string[]>([]);
  const saved = s.plan.some((p) => p.id === `biz:${road.id}:${node.id}`);
  const form = node.status !== "done" ? node.form : undefined;
  const need = form ? form.needYou.filter((f) => !filled.includes(f.label)).length : 0;
  const total = form ? form.fromKbc.length + form.needYou.length : 0;
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
      {form && <>
        <div className="fr-fill-head"><span>Kate filled in {total - need} of {total}</span>{need > 0 && <b>{need} need you</b>}</div>
        <span className="fr-fill-bar" aria-hidden="true"><i style={{ width: `${((total - need) / total) * 100}%` }} /></span>
        <ul className="fr-fields">
          <li><button type="button" className="fr-field-kbc" aria-expanded={kbcOpen} onClick={() => setKbcOpen(!kbcOpen)}><FIcon name="check" size={18} className="fr-ok" /><span>From your KBC profile</span><small>{form.fromKbc.length} fields</small><FIcon name="chevron" size={16} /></button>
            {kbcOpen && <dl className="fr-kbc-list">{form.fromKbc.map((f) => <Fragment key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></Fragment>)}</dl>}</li>
          {form.needYou.map((f) => {
            const done = filled.includes(f.label);
            return <li key={f.label} className="fr-field">
              {done ? <FIcon name="check" size={18} className="fr-ok" /> : <span className="fr-pending" aria-hidden="true" />}
              <span className="fr-field-copy"><span>{f.label}</span><small>{done ? f.suggestion : f.hint}</small></span>
              {!done && <button type="button" className="fr-chip" onClick={() => setFilled((all) => [...all, f.label])} aria-label={`${f.label}: use ${f.suggestion}`}>{f.suggestion}?</button>}
            </li>;
          })}
        </ul>
        <p className="fr-small">Kate sends it to {form.to} and shares only these fields. Every status shows up on your road.</p>
      </>}
      {!form && node.todo && <><h3>What to do</h3><ul className="fr-todo">{node.todo.map((t) => <li key={t}>{t}</li>)}</ul></>}
      <h3>Who helps</h3>
      <div className="fr-partner-chips">{node.partners.map((id) => <button type="button" key={id} className={`fr-chip fr-chip-${PARTNERS[id].kind}`} onClick={() => onPartner(id)}>{PARTNERS[id].name} ›</button>)}</div>
      {node.crowd && <div className="fr-evidence"><b>{pct(node.crowd.share)}</b><span>{int(Math.round(crowd * node.crowd.share))} of {int(crowd)} people on this road {node.crowd.label}.</span></div>}
      {node.kate && <KateBox text={node.kate} onAskKate={onAskKate} />}
      {form && node.status === "now" ? <>
        <button type="button" className="fr-light-button" onClick={() => (need ? setFilled(form.needYou.map((f) => f.label)) : onFinish())}>{need ? `Finish the last ${need}` : `Send to ${form.to}`} <FIcon name="arrow" size={20} /></button>
        <button type="button" className="fr-link fr-center" onClick={() => { onRemind(); onClose(); }}>I’ll do it myself</button>
      </> : node.status === "now" ? <button type="button" className="fr-light-button" onClick={onFinish}>Mark as done <FIcon name="arrow" size={20} /></button>
        : node.status !== "done" ? <button type="button" className="fr-outline fr-wide" disabled={saved} onClick={onRemind}>{saved ? "In your plan" : "Remind me in my plan"}</button> : null}
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

function PartnerSheet({ road, id, adviser, onClose, onTalk }: { road: FounderRoad; id: PartnerId; adviser: string; onClose: () => void; onTalk: () => void }) {
  const partner = PARTNERS[id];
  return <SheetFrame title={partner.name} onClose={onClose}>
    <div className="fr-sheet-body">
      <p className="fr-sheet-meta"><span className={`fr-kind fr-kind-${partner.kind}`}>{KIND_LABEL[partner.kind]}</span> {partner.local}</p>
      <p className="fr-why">{partner.role}</p>
      {partner.options && <><h3>What people in your job chose</h3>
        <ul className="fr-options">{partner.options.map((o) => <li key={o.label}><div><strong>{o.label}</strong><b>{pct(o.share)}</b></div><span className="fr-fill-bar"><i style={{ width: pct(o.share) }} /></span><small>{o.note}</small></li>)}</ul></>}
      <h3>On your road</h3>
      <StepList nodes={road.nodes.filter((n) => n.partners.includes(id))} />
      {partner.kind === "kbc" ? <button type="button" className="fr-light-button" onClick={onTalk}>Talk to {adviser} <FIcon name="arrow" size={20} /></button>
        : <p className="fr-small">KBC does not choose for you. {adviser} can introduce you to partners others on this road worked with.</p>}
    </div>
  </SheetFrame>;
}
