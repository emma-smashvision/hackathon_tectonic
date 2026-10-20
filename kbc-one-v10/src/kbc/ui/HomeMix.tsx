"use client";

import { createPortal } from "react-dom";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { homeSuggestions, YOURS_LIMIT } from "../compose";
import { eur, gbp } from "../format";
import { reorderBlocks } from "../home-mix";
import type { HomeModel, Placed, Snapshot, UserLayout } from "../types";
import { channelCardFor, type RoadFocus, type ChannelCard } from "../../one/nudge/channels"; // v8-channels
import { isJourneyBlock } from "../blocks";
import "../../one/nudge/channels.css";
import { MixBubbles, type MixBubble } from "./MixBubbles";
import { Icon } from "./icons";

export function HomeMix({ home, snapshot, onSave, onAction, onFlash, onProfile, onAsk, onPrompt, onRoad, card, looks, villageCard, roadmap, note }: {
  home: HomeModel; snapshot: Snapshot; looks: ReactNode; villageCard?: ReactNode;
  /** a short Kate note shown right above the quick questions */
  note?: ReactNode;
  /** a business road: shown as the largest bubble and opened in one tap */
  roadmap?: { title: string; value: string; onOpen: () => void; headline?: string };
  onSave: (layout: UserLayout) => Promise<boolean>;
  onAction: (id: string, params?: Record<string, number>) => void;
  onFlash: (text: string) => void;
  onProfile: () => void;
  onAsk: (block: Placed) => void;
  onPrompt: (text: string) => void;
  onRoad: (focus: RoadFocus) => void;
  card?: ChannelCard | null;
}) {
  const roadCard = card === undefined ? channelCardFor(snapshot.persona.id) : card;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [height, setHeight] = useState(620);
  const [visibleCount, setVisibleCount] = useState(5);
  const [hidden, setHidden] = useState<string[]>([]);
  const [draft, setDraft] = useState<UserLayout | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<MixBubble | null>(null);
  const p = snapshot.persona;
  const style = snapshot.theme?.base ?? home.style;
  const large = style === "large";
  const layout = snapshot.layout ?? { style: home.style, blocks: home.blocks.map(b => ({ id: b.id, size: b.size })), suggestionsPerDay: 3 };
  const owned: Placed[] = draft ? draft.blocks.flatMap(config => {
    const block = home.blocks.find(b => b.id === config.id) ?? snapshot.catalog.find(b => b.id === config.id)?.view;
    return block ? [{ ...block, ...config, score: home.blocks.find(b => b.id === config.id)?.score ?? "now", reason: "You chose this for your home." } as Placed] : [];
  }) : home.blocks;
  const suggestions = homeSuggestions({ ...home, forYou: home.forYou.filter(b => !isJourneyBlock(b.id)) }, {
    journey: false, // v8-channels: a single crowd card replaces v7 journey suggestions.
    hidden,
    limit: snapshot.layout ? snapshot.layout.suggestionsPerDay + home.forYou.filter(b => b.protection).length : undefined,
  });
  const attention = suggestions.find(s => s.kind === "block" && s.value.protection);
  const moment = attention ?? suggestions.find(s => s.kind === "intent");
  const toBubble = (item: typeof suggestions[number]): MixBubble => {
    let block: Placed;
    if (item.kind === "block") block = item.value;
    else if (item.kind === "journey") throw new Error("Legacy journey suggestions are disabled");
     else if (item.kind === "intent") block = { id: item.id, title: item.value.title, value: item.value.button.replace(/^Ask /, ""), sub: item.value.detail, sentence: item.value.title, action: { id: item.value.actionId, label: item.value.button, params: item.value.params }, icon: "split", tone: "normal", size: "m", score: "urgent", reason: item.value.reason, facts: item.value.facts, suggested: true };
    else block = { id: item.id, title: item.value.title, value: item.value.button, sentence: item.value.title, action: { id: item.value.id, label: item.value.button, params: item.value.params }, icon: item.value.icon, tone: "normal", size: "s", score: "now", reason: item.value.reason, facts: item.value.facts, suggested: true };
    return { key: item.id, block, suggestion: item.id };
  };
  const momentBubble = moment ? toBubble(moment) : null;
  const roadmapBubble: MixBubble | null = roadmap && !draft ? { key: "roadmap", block: {
    id: "roadmap", title: roadmap.title, value: roadmap.value, sentence: roadmap.value, icon: "target", tone: "normal",
    size: "l", score: "urgent", reason: "Your business road.", facts: [],
  } } : null;
  const bubbles: MixBubble[] = [
    ...(roadmapBubble ? [roadmapBubble] : []),
    ...owned.slice(0, YOURS_LIMIT - (roadmapBubble ? 1 : 0)).map(block => ({ key: `owned:${block.id}`, block })),
    ...suggestions.filter(s => s !== moment).map(toBubble).filter(b => !owned.some(o => o.id === b.block.id)),
  ];
  const firstCount = large ? 3 : style === "dense" ? 5 : 4;
  const first = bubbles.slice(0, firstCount), more = bubbles.slice(Math.min(firstCount, visibleCount));
  const close = () => { setDetail(null); setAdding(false); trigger.current?.focus(); };
  const open = (bubble: MixBubble) => {
    if (bubble.key === "roadmap") { roadmap?.onOpen(); return; }
    trigger.current = document.activeElement as HTMLElement; setDetail(bubble);
  };
  const dismiss = (bubble: MixBubble) => {
    if (bubble.suggestion) setHidden(old => [...old, bubble.suggestion!]);
    close();
  };
  const act = (bubble: MixBubble) => {
    close();
    if (bubble.block.action) onAction(bubble.block.action.id, bubble.block.action.params);
  };
  const reorder = (from: string, to: string) => setDraft(old => old && ({ ...old, blocks: reorderBlocks(old.blocks, from, to) }));
  const remove = (id: string) => setDraft(old => old && ({ ...old, blocks: old.blocks.filter(b => b.id !== id) }));
  useEffect(() => {
    const scroll = root.current?.closest(".scroll");
    if (!scroll) return;
    scroll.scrollTop = 0;
    const observer = new ResizeObserver(() => setHeight(scroll.clientHeight - 8));
    observer.observe(scroll);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!detail && !adding) return;
    const sheet = root.current?.closest(".ph")?.querySelector<HTMLElement>(".mix-sheet");
    const controls = () => [...(sheet?.querySelectorAll<HTMLElement>("button:not(:disabled), summary, [tabindex='0']") ?? [])];
    controls()[0]?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setDetail(null); setAdding(false); trigger.current?.focus(); }
      if (event.key === "Tab") {
        const items = controls(), first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [detail, adding]);
  const fieldProps = { large, editing: draft !== null, onOpen: open, onRemove: remove, onReorder: reorder, focus: detail?.key ?? null };
  return <div ref={root} className="home-mix" data-editing={Boolean(draft)} data-compact={height < 550} data-suggestion-count={suggestions.length} style={{ "--mix-height": `${height}px` } as CSSProperties}>
    <div className="mix-first">
      <header className="mix-header">
        <span className="hi">Hi, {p.name}</span>
        <div className="mix-tools">
          {draft ? <><button type="button" disabled={saving} onClick={() => setDraft(null)}>Cancel</button><button type="button" disabled={saving} onClick={async () => { setSaving(true); try { if (await onSave(draft)) setDraft(null); } finally { setSaving(false); } }}>{saving ? "Saving…" : "Done"}</button></> : <button type="button" onClick={() => setDraft(structuredClone(layout))}>Edit</button>}
          <button type="button" className="mix-avatar" aria-label="What KBC knows about me" style={{ background: p.color }} onClick={onProfile}>{p.initial}</button>
        </div>
      </header>
      <section className="mix-hero" aria-label="Balance and payments">
        <div className="mix-balance">{eur(p.accounts.current)}</div>
        <p className="mix-accounts">Current account · savings {eur(p.accounts.savings, { cents: false })}{p.accounts.pocketGBP !== undefined ? ` · ${gbp(p.accounts.pocketGBP)}` : ""}</p>
        <div className="mix-narrative-slot">{draft ? <div className="mix-looks">{looks}</div> : <p className="mix-narrative">{roadmap?.headline ?? home.headline}</p>}</div>
        <div className="mix-actions">{([ ["send", "Transfer"], ["qr", "Pay"], ["scan", "Scan"], ["card", "Cards"] ] as const).map(([icon, label]) => <button type="button" key={label} onClick={() => onFlash(`${label} opens the normal KBC flow`)}><span><Icon name={icon} size={20} /></span>{label}</button>)}</div>
      </section>
      {momentBubble && <article className="mix-moment" data-suggestion={momentBubble.suggestion}>
        <button type="button" className="mix-moment-copy" aria-label={`Details: ${momentBubble.block.title}`} onClick={() => open(momentBubble)}>
          {!large && <small>{moment?.kind === "intent" ? moment.value.kicker : "Kate noticed a payment"}</small>}
          <strong>{moment?.kind === "block" ? moment.value.sentence : momentBubble.block.title}</strong>
        </button>
        <button type="button" className="mix-moment-action" onClick={() => act(momentBubble)}>{momentBubble.block.action?.label.replace(/^Ask /, "")}</button>
      </article>}
      <MixBubbles {...fieldProps} bubbles={first} onVisibleCount={setVisibleCount} onAdd={() => { trigger.current = document.activeElement as HTMLElement; setAdding(true); }} canAdd={owned.length < YOURS_LIMIT} />
      {!draft && note}
      <div className="mix-chips">
        <button type="button" onClick={() => onPrompt(large ? `How can ${p.advisor.name} help me?` : "What's coming up?")}>{large ? `Ask ${p.advisor.name}` : "What's coming up?"}</button>
        {!large && <button type="button" onClick={() => onPrompt("How much can I spend?")}>How much can I spend?</button>}
      </div>
    </div>
    {!draft && villageCard}
    <div className="mix-more">
      {!villageCard && roadCard && !draft && <button type="button" className="v8-home-road" data-road-id={roadCard.roadId} data-stop-id={roadCard.stopId} onClick={() => onRoad(roadCard)}>
        <small>{roadCard.care ? "At your pace" : "Your road · synthetic demo"}</small>
        <strong>{roadCard.title}</strong><span>{roadCard.body}</span><b>{roadCard.cta}</b>
      </button>}
      {more.length > 0 && <><h2>A little more</h2><MixBubbles {...fieldProps} bubbles={more} /></>}
      {snapshot.requests.length > 0 && <p className="note">{snapshot.requests.map(r => `${r.name}: ${eur(r.amount)} · ${r.status}`).join(" · ")}</p>}
      <p className="mix-footnote">{draft ? "Drag bubbles to move them. Use × to remove one." : "Your home, your way. Tap Edit to move or add bubbles."}</p>
    </div>
    {(detail || adding) && root.current && createPortal(<>
      <button type="button" className="veil" aria-label="Close details" onClick={close} />
      <section className="sheet mix-sheet" role="dialog" aria-modal="true" aria-label={adding ? "Add a bubble" : detail!.block.title}>
        <div className="mix-sheet-head"><h2>{adding ? "Add a bubble" : detail!.block.title}</h2><button type="button" aria-label="Close details" onClick={close}>×</button></div>
        {adding ? <>
          <p>{owned.length} of {YOURS_LIMIT} bubbles. Choose what you want close by.</p>
          <div className="mix-library">{snapshot.catalog.filter(c => c.view && !c.view.protection && !owned.some(b => b.id === c.id)).map(c => <button type="button" key={c.id} disabled={owned.length >= YOURS_LIMIT} onClick={() => { setDraft(old => old && old.blocks.length < YOURS_LIMIT ? { ...old, blocks: [...old.blocks, { id: c.id, size: "m" }] } : old); close(); }}><Icon name={c.view!.icon} size={22} /><span>{c.title}</span><span>+</span></button>)}</div>
        </> : detail && <>
          <p className="mix-sheet-value">{detail.block.value}</p>
          <p>{detail.block.sub ?? detail.block.sentence}</p>
          {detail.block.list?.map(row => <div className="mix-detail-row" key={row.left}><span>{row.left}</span><strong>{row.right}</strong></div>)}
          {(detail.block.action || detail.suggestion === "journey") && <button type="button" className="btn wide" onClick={() => act(detail)}>{detail.suggestion === "journey" ? "Prepare this journey" : detail.block.action!.label}</button>}
          <details className="mix-why"><summary>Why?</summary><p>{detail.block.reason}</p>{detail.block.facts.map(fact => <p key={fact}>{fact}</p>)}</details>
          {detail.suggestion && <button type="button" className="btn sec wide" onClick={() => dismiss(detail)}>Not now</button>}
          <button type="button" className="mix-ask" onClick={() => { close(); onAsk(detail.block); }}><Icon name="kate" size={18} /> Ask Kate about this</button>
        </>}
      </section>
    </>, root.current.closest(".ph")!)}
  </div>;
}
