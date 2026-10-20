"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Proposal } from "../kate";
import type {
  ActionSheet,
  Placed,
  Size,
  Snapshot,
  StyleId,
  UserLayout,
} from "../types";
import { Cards } from "./Blocks";
import { YOURS_LIMIT } from "../compose";
import { eur } from "../format";
import { Icon } from "./icons";
// v7-kate: preview UI stays in its own component.
import { KatePreview } from "./KatePreview";
import type { KateThread } from "./kateThreads";

const SCORE_STEP = { later: 2, now: 3, urgent: 4 } as const;

// Home mix lives separately so Kate and its previews can evolve independently.
export { HomeMix } from "./HomeMix";

// ---------- Block detail + "Why am I seeing this?" ----------

export function BlockSheet({
  block,
  onClose,
  onAction,
  onAsk,
  onMute,
  onLedger,
}: {
  block: Placed;
  onClose: () => void;
  onAction: (id: string, params?: Record<string, number>) => void;
  onAsk: (b: Placed) => void;
  onMute: (b: Placed) => void;
  onLedger: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="veil"
        aria-label="Close"
        onClick={onClose}
      />
      <section className="sheet" aria-label={block.title}>
        <span className="grab" />
        <div style={{ pointerEvents: "none" }}>
          <Cards
            blocks={[{ ...block, size: "l" }]}
            style="cards"
            onOpen={() => {}}
          />
        </div>
        {block.action && (
          <button
            type="button"
            className="btn wide"
            style={{ marginTop: 12 }}
            onClick={() =>
              onAction(block.action?.id ?? "", block.action?.params)
            }
          >
            {block.action.label}
          </button>
        )}
        <div className="label">Why you see this</div>
        <div style={{ fontSize: 14, lineHeight: 1.45 }}>{block.reason}</div>
        <div style={{ marginTop: 8 }}>
          {block.facts.map((f) => (
            <div className="ev" key={f}>
              {f}
            </div>
          ))}
        </div>
        <div className="label" style={{ marginBottom: 0 }}>
          How useful Kate rated it
        </div>
        <div className="steps" role="img" aria-label={`Rated ${block.score}`}>
          {[1, 2, 3, 4].map((i) => (
            <i key={i} className={i <= SCORE_STEP[block.score] ? "on" : ""} />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "var(--muted)",
            marginTop: 4,
          }}
        >
          <span>Not now</span>
          <span>Later</span>
          <span>Useful now</span>
          <span>Urgent</span>
        </div>
        <div className="note">
          {block.protection
            ? "Protection: always shown, never limited by your suggestion settings."
            : block.product
              ? "This involves a KBC product."
              : "Not an ad. It only uses your own accounts and payments."}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 14,
          }}
        >
          <button
            type="button"
            className="btn wide"
            onClick={() => onAsk(block)}
          >
            <span
              style={{ display: "inline-flex", gap: 8, alignItems: "center" }}
            >
              <Icon name="kate" size={16} /> Ask Kate about this
            </span>
          </button>
          {!block.protection && (
            <button
              type="button"
              className="btn sec wide"
              onClick={() => onMute(block)}
            >
              Don’t suggest this again
            </button>
          )}
          <button type="button" className="btn sec wide" onClick={onLedger}>
            What KBC knows about me
          </button>
        </div>
      </section>
    </>
  );
}

// ---------- Confirm a quick action ----------

export function ConfirmSheet({
  sheet,
  busy,
  onConfirm,
  onClose,
}: {
  sheet: ActionSheet;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const noFaceId = sheet.id === "request_split";
  return (
    <>
      <button
        type="button"
        className="veil"
        aria-label="Close"
        onClick={onClose}
      />
      <section className="sheet" aria-label={sheet.title}>
        <span className="grab" />
        <div className="label" style={{ marginTop: 0 }}>
          <span
            style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
          >
            <Icon name="spark" size={13} /> Prepared by Kate
          </span>
          <span className="kbc-badge">Level {sheet.level}</span>
        </div>
        <h2>{sheet.title}</h2>
        <div className="rows" style={{ marginTop: 14 }}>
          {sheet.rows.map(([k, v]) => (
            <div className="r" key={k}>
              <span>{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
        {busy ? (
          <div className="faceid">
            <Icon name="eye" size={40} />
            <span>{noFaceId ? "Sending…" : "Face ID…"}</span>
          </div>
        ) : (
          <>
            <div className="note">
              {noFaceId
                ? "A request doesn’t move money, so no Face ID is needed."
                : sheet.level === 1
                  ? "Between your own accounts or reversible: Face ID is enough."
                  : "Money to someone you know or a paid service: review, then Face ID."}
            </div>
            <button
              type="button"
              className="btn wide"
              style={{ marginTop: 14, height: 52 }}
              onClick={onConfirm}
            >
              {noFaceId ? "Send requests" : "Confirm with Face ID"}
            </button>
            <button
              type="button"
              className="btn sec wide"
              style={{ marginTop: 8 }}
              onClick={onClose}
            >
              Not now
            </button>
          </>
        )}
      </section>
    </>
  );
}

// ---------- Kate ----------

export type ChatMsg = {
  id: number;
  role: "user" | "kate";
  text: string;
  proposal?: Proposal | null;
  applied?: boolean;
  streaming?: boolean;
  source?: "claude" | "rules";
  failed?: boolean;
};

/** Tiny, safe markdown: **bold** and "- " bullet lines. React escapes everything else. */
export function Rich({ text }: { text: string }) {
  const inline = (line: string, k: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
        // biome-ignore lint/suspicious/noArrayIndexKey: static split
        <b key={`${k}-${i}`}>{part.slice(2, -2)}</b>
      ) : (
        part
      ),
    );
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = (k: number) => {
    if (!list.length) return;
    out.push(
      <ul key={`ul${k}`}>
        {list.map((l, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <li key={i}>{inline(l, `li${k}-${i}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  lines.forEach((l, i) => {
    const m = /^\s*(?:[-•*]|\d+\.)\s+(.*)$/.exec(l);
    if (m) list.push(m[1]);
    else {
      flush(i);
      // biome-ignore lint/suspicious/noArrayIndexKey: lines of one static message
      if (l.trim()) out.push(<p key={`p${i}`}>{inline(l, `p${i}`)}</p>);
    }
  });
  flush(lines.length);
  return <>{out}</>;
}

export function KateSheet({
  threadId,
  threads,
  onSelectThread,
  onNewChat,
  messages,
  busy,
  context,
  onSend,
  onApply,
  onClose,
  onStop,
  onDropContext,
  suggestions,
}: {
  threadId: string;
  threads: KateThread[];
  onSelectThread: (id: string) => void;
  onNewChat: () => void;
  messages: ChatMsg[];
  busy: boolean;
  context: Placed | null;
  onSend: (text: string) => void;
  onApply: (p: Proposal, id: number) => void | Promise<void>;
  onClose: () => void;
  onStop: () => void;
  onDropContext: () => void;
  suggestions: string[];
}) {
  const [text, setText] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const last = messages.at(-1);
  // biome-ignore lint/correctness/useExhaustiveDependencies: follow the stream
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [threadId, messages.length, last?.text, busy]);
  useEffect(() => {
    setText("");
    document.getElementById(`kate-tab-${threadId}`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [threadId]);
  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);
  const send = (t: string) => {
    if (!t.trim() || busy) return;
    onSend(t.trim());
    setText("");
  };
  return (
    <>
      <button
        type="button"
        className="veil kate-veil"
        aria-label="Close Kate"
        onClick={onClose}
      />
      <section className="kate-sheet" aria-label="Kate">
        <span className="grab" />
        <header className="kate-head">
          <span className={`orb ${busy ? "live" : ""}`} />
          <span style={{ flex: 1 }}>
            <b>Kate</b>
            <small>
              {busy ? "typing…" : "Only uses your own KBC accounts"}
            </small>
          </span>
          <button
            type="button"
            className="iconbtn"
            aria-label="Close"
            onClick={onClose}
          >
            <Icon name="x" size={16} />
          </button>
        </header>
        <div className="kate-thread-strip">
          <div className="kate-thread-tabs" role="tablist" aria-label="Kate chats" aria-orientation="horizontal">
            {threads.map((thread, index) => (
              <button
                key={thread.id}
                id={`kate-tab-${thread.id}`}
                type="button"
                role="tab"
                className="chip kate-thread-tab"
                title={thread.title}
                aria-selected={thread.id === threadId}
                aria-controls="kate-conversation"
                tabIndex={thread.id === threadId ? 0 : -1}
                onClick={() => onSelectThread(thread.id)}
                onKeyDown={(event) => {
                  const next = event.key === "ArrowRight" ? (index + 1) % threads.length
                    : event.key === "ArrowLeft" ? (index - 1 + threads.length) % threads.length
                    : event.key === "Home" ? 0 : event.key === "End" ? threads.length - 1 : -1;
                  if (next < 0) return;
                  event.preventDefault();
                  onSelectThread(threads[next].id);
                  document.getElementById(`kate-tab-${threads[next].id}`)?.focus();
                }}
              >
                {thread.title}
              </button>
            ))}
          </div>
          <button type="button" className="chip kate-new-chat" onClick={() => {
            onNewChat();
            setText("");
            input.current?.focus({ preventScroll: true });
          }}>+ New chat</button>
        </div>
        <div id="kate-conversation" className="kate-conversation" role="tabpanel" aria-labelledby={`kate-tab-${threadId}`}>
        {context && (
          <div className="ctx">
            <Icon name={context.icon} size={18} />
            <span style={{ flex: 1 }}>
              <b>About: {context.title}</b>
              {[context.value, context.sub].filter(Boolean).join(" · ")}
            </span>
            <button
              type="button"
              className="iconbtn sm"
              aria-label="Talk about something else"
              onClick={onDropContext}
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        )}
        <div className="chat" ref={log} role="log" aria-live="polite">
          {messages.length === 0 && (
            <div className="msg kate">
              <Rich
                text={
                  context
                    ? `What would you like to know about **${context.title}**?`
                    : "Hi! Ask me about your money, or tell me what to do: send, split, or save."
                }
              />
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} style={{ display: "contents" }}>
              {m.role === "kate" && m.streaming && !m.text ? (
                <div
                  className="msg kate dots"
                  role="status"
                  aria-label="Kate is typing"
                >
                  <i />
                  <i />
                  <i />
                </div>
              ) : (
                <div
                  className={`msg ${m.role} ${m.streaming ? "streaming" : ""} ${m.failed ? "failed" : ""}`}
                >
                  {m.role === "kate" ? <Rich text={m.text} /> : m.text}
                  {m.role === "kate" && m.source === "rules" && (
                    <small className="src">offline answer</small>
                  )}
                </div>
              )}
              {m.proposal && (m.proposal.type !== "action" && m.proposal.type !== "drive" && m.proposal.type !== "road" /* v8-channels */ ? (
                <KatePreview proposal={m.proposal} applied={Boolean(m.applied)}
                  onApply={() => onApply(m.proposal as Proposal, m.id)}
                  onChange={() => { setText("Change the preview: "); input.current?.focus(); }} />
              ) : (
                <ProposalCard
                  p={m.proposal}
                  applied={Boolean(m.applied)}
                  onApply={() => onApply(m.proposal as Proposal, m.id)}
                />
              ))}
            </div>
          ))}
        </div>
        {!busy && messages.length === 0 && suggestions.length > 0 && (
          <div className="chips scrollx">
            {suggestions.map((s) => (
              <button
                type="button"
                className="chip"
                key={s}
                onClick={() => send(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          className="compose"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <label htmlFor="kate-in" className="sr">
            Message Kate
          </label>
          <input
            id="kate-in"
            ref={input}
            value={text}
            maxLength={600}
            autoComplete="off"
            onChange={(e) => setText(e.target.value)}
            placeholder={busy ? "Kate is answering…" : "Ask or tell Kate…"}
          />
          {busy ? (
            <button
              type="button"
              className="iconbtn send"
              aria-label="Stop"
              onClick={onStop}
            >
              <Icon name="stop" size={14} />
            </button>
          ) : (
            <button
              type="submit"
              className="iconbtn send"
              aria-label="Send"
              disabled={!text.trim()}
            >
              <Icon name="up" />
            </button>
          )}
        </form>
        </div>
      </section>
    </>
  );
}

function ProposalCard({
  p,
  applied,
  onApply,
}: {
  p: Proposal;
  applied: boolean;
  onApply: () => void;
}) {
  const button = applied
    ? "Done"
    : p.type === "action"
      ? p.id === "request_split"
        ? "Review and send"
        : "Review and confirm"
      : p.type === "layout"
        ? "Apply to my home"
        : p.type === "tracker"
          ? "Add to my home"
          : (p.type === "drive" || p.type === "road")
            ? "Open Your road"
            : "Use this look";
  return (
    <div className="prop">
      <div className="k">
        {p.type === "action"
          ? "Prepared action"
          : p.type === "layout"
            ? "New home layout"
            : p.type === "tracker"
              ? "New block"
              : (p.type === "drive" || p.type === "road")
                ? "Your road"
                : "New look"}
      </div>
      {(p.type === "drive" || p.type === "road") && (
        <>
          <div className="v8-road-title" style={{ fontWeight: 600, marginTop: 4 }}>
            {p.title}
          </div>
          <div className="v8-road-line" style={{ color: "var(--muted)", marginTop: 4 }}>
            {p.line}
          </div>
        </>
      )}
      {p.type === "action" && (
        <>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>
            {p.title}
          </div>
          <div className="rows">
            {p.rows.map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "5px 0",
                }}
              >
                <span style={{ color: "var(--muted)" }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {p.type === "layout" && (
        <ul
          style={{
            margin: "6px 0 0",
            paddingLeft: 18,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {p.changes.map((ch) => (
            <li key={ch}>{ch}</li>
          ))}
        </ul>
      )}
      {p.type === "tracker" && (
        <div style={{ marginTop: 8, pointerEvents: "none" }}>
          <Cards
            blocks={[{ ...p.preview, size: "m", score: "later", reason: "" }]}
            style="cards"
            onOpen={() => {}}
          />
        </div>
      )}
      {p.type === "theme" && (
        <div
          style={{
            marginTop: 6,
            borderRadius: p.theme.radius,
            background: p.theme.colors.bg,
            padding: 12,
            border: "1px solid var(--line)",
          }}
        >
          <div style={{ color: p.theme.colors.text, fontWeight: 600 }}>
            {p.theme.name}
          </div>
          <div style={{ color: p.theme.colors.muted, fontSize: 12 }}>
            {p.fontLabel} ·{" "}
            {p.theme.motif === "none" ? "no motif" : p.theme.motif}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 10,
              alignItems: "center",
            }}
          >
            <span
              style={{
                flex: 1,
                background: p.theme.colors.surface,
                color: p.theme.colors.text,
                borderRadius: p.theme.radius,
                padding: "8px 10px",
                fontSize: 12,
              }}
            >
              € 1.987,40
            </span>
            <span
              style={{
                background: p.theme.colors.accent,
                color: p.theme.colors.accentText,
                borderRadius: p.theme.radius,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Pay
            </span>
          </div>
          {p.fixes.length > 0 && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: p.theme.colors.muted,
              }}
            >
              Checked for readability: {p.fixes.join(", ")}
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        className="btn wide"
        style={{ marginTop: 10 }}
        disabled={applied && p.type !== "drive" && p.type !== "road"}
        onClick={onApply}
      >
        {(p.type === "drive" || p.type === "road") ? "Open Your road" : button}
      </button>
    </div>
  );
}

// ---------- Edit your home ----------

const STYLE_NAMES: [StyleId, string][] = [
  ["calm", "Calm"],
  ["cards", "Cards"],
  ["dense", "Dense"],
  ["large", "Large & simple"],
];

export function EditScreen({
  initial,
  snapshot,
  onSave,
  onClose,
  onLibrary,
  onKate,
  onReset,
  looks,
}: {
  initial: UserLayout;
  snapshot: Snapshot;
  onSave: (l: UserLayout) => void;
  onClose: () => void;
  onLibrary: (draft: UserLayout) => void;
  onKate: () => void;
  onReset: () => void;
  looks: ReactNode;
}) {
  const [draft, setDraft] = useState<UserLayout>(initial);
  const title = (id: string) =>
    snapshot.catalog.find((c) => c.id === id)?.title ?? id;
  const move = (i: number, d: -1 | 1) => {
    const b = [...draft.blocks];
    const j = i + d;
    if (j < 0 || j >= b.length) return;
    [b[i], b[j]] = [b[j], b[i]];
    setDraft({ ...draft, blocks: b });
  };
  return (
    <section className="screen" aria-label="Edit your home">
      <div className="bar">
        <button
          type="button"
          className="kbc-ghost"
          style={{ border: 0, color: "var(--muted)" }}
          onClick={onClose}
        >
          Cancel
        </button>
        <h2 style={{ textAlign: "center" }}>Edit your home</h2>
        <button
          type="button"
          className="btn"
          style={{ height: 34 }}
          onClick={() => onSave(draft)}
        >
          Done
        </button>
      </div>
      <div className="body">
        <div className="label">Style</div>
        <div className="chips">
          {STYLE_NAMES.map(([id, name]) => (
            <button
              type="button"
              key={id}
              className={`chip ${draft.style === id ? "on" : ""}`}
              onClick={() => setDraft({ ...draft, style: id })}
            >
              {name}
            </button>
          ))}
        </div>
        {looks}
        <div className="erow" style={{ marginTop: 14, opacity: 0.8 }}>
          <Icon name="lock" size={18} />
          <span className="n">
            Always on top
            <small>Balance, Transfer, Pay, Scan, Cards</small>
          </span>
        </div>
        <div className="label">Yours · {draft.blocks.length} of {YOURS_LIMIT}</div>
        {draft.blocks.map((b, i) => (
          <div className="erow" key={b.id}>
            <span className="n">{title(b.id)}</span>
            <span className="seg">
              {(["s", "m", "l"] as Size[]).map((s) => (
                <button
                  type="button"
                  key={s}
                  aria-pressed={b.size === s}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      blocks: draft.blocks.map((x) =>
                        x.id === b.id ? { ...x, size: s } : x,
                      ),
                    })
                  }
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </span>
            <button
              type="button"
              className="mini"
              aria-label="Move up"
              onClick={() => move(i, -1)}
            >
              <Icon name="up" size={14} />
            </button>
            <button
              type="button"
              className="mini"
              aria-label="Move down"
              onClick={() => move(i, 1)}
            >
              <Icon name="down" size={14} />
            </button>
            <button
              type="button"
              className="mini"
              aria-label={`Remove ${title(b.id)}`}
              onClick={() =>
                setDraft({
                  ...draft,
                  blocks: draft.blocks.filter((x) => x.id !== b.id),
                })
              }
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn sec wide"
          style={{ borderStyle: "dashed", marginTop: 4 }}
          disabled={draft.blocks.length >= YOURS_LIMIT}
          onClick={() => onLibrary(draft)}
        >
          + Add a block
        </button>
        <div className="label">Kate’s suggestions</div>
        <div className="erow">
          <span className="n">
            Suggestions in my style
            <small>Below your blocks, never moving them</small>
          </span>
          <span className="seg">
            {[0, 1, 2].map((n) => (
              <button
                type="button"
                key={n}
                aria-pressed={draft.suggestionsPerDay === n}
                onClick={() => setDraft({ ...draft, suggestionsPerDay: n })}
              >
                {n === 0 ? "Off" : `${n}`}
              </button>
            ))}
          </span>
        </div>
        <button
          type="button"
          className="btn sec wide"
          style={{ marginTop: 10 }}
          onClick={onReset}
        >
          Let Kate arrange my home again
        </button>
      </div>
      <button
        type="button"
        className="compose"
        style={{
          background: "none",
          border: 0,
          borderTop: "1px solid var(--line)",
          textAlign: "left",
        }}
        onClick={onKate}
      >
        <span className="orb" />
        <span style={{ flex: 1, color: "var(--muted)" }}>
          Or tell Kate: “put my savings on top”
        </span>
      </button>
    </section>
  );
}

// ---------- Block library ----------

export function LibraryScreen({
  snapshot,
  inLayout,
  onAdd,
  onClose,
  onKate,
}: {
  snapshot: Snapshot;
  inLayout: string[];
  onAdd: (id: string) => void;
  onClose: () => void;
  onKate: () => void;
}) {
  return (
    <section className="screen" aria-label="Add a block">
      <div className="bar">
        <button
          type="button"
          className="iconbtn"
          aria-label="Back"
          onClick={onClose}
        >
          <Icon name="back" />
        </button>
        <h2>Add a block</h2>
      </div>
      <div className="body">
        <button
          type="button"
          className="ctx"
          style={{ width: "100%", textAlign: "left" }}
          onClick={onKate}
        >
          <span className="orb" />
          <span style={{ flex: 1 }}>
            <b>Create your own with Kate</b>“Show what I spend on coffee each
            month”
          </span>
        </button>
        <div className="lib-grid">
          {snapshot.catalog.map((c) => {
            const has = inLayout.includes(c.id);
            return (
              <div key={c.id} className={`tile ${c.view ? "" : "off"}`}>
                <span className="t" style={{ paddingRight: 30 }}>
                  {c.view?.title ?? c.title}
                </span>
                <span className="v" style={{ fontSize: 18 }}>
                  {c.view?.value ?? "—"}
                </span>
                <span className="s">
                  {c.view ? c.view.sub : "Nothing to show for you yet"}
                </span>
                {c.view && (
                  <button
                    type="button"
                    className="add"
                    aria-label={
                      has ? `${c.title} is on your home` : `Add ${c.title}`
                    }
                    disabled={has || inLayout.length >= YOURS_LIMIT}
                    onClick={() => onAdd(c.id)}
                  >
                    <Icon name={has ? "check" : "plus"} size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------- What KBC knows about me ----------

export function LedgerScreen({
  snapshot,
  onClose,
  onBelief,
  onUnmute,
  onStopRule,
}: {
  snapshot: Snapshot;
  onClose: () => void;
  onBelief: (id: string, status: "said_no" | "told" | "remove") => void;
  onUnmute: (id: string) => void;
  onStopRule: (id: string) => void;
}) {
  const groups: [string, "told" | "inferred" | "said_no"][] = [
    ["You told us", "told"],
    ["Kate thinks", "inferred"],
    ["You said no", "said_no"],
  ];
  return (
    <section className="screen" aria-label="What KBC knows about you">
      <div className="bar">
        <button
          type="button"
          className="iconbtn"
          aria-label="Back"
          onClick={onClose}
        >
          <Icon name="back" />
        </button>
        <h2>What KBC knows about you</h2>
      </div>
      <div className="body">
        <p
          style={{
            fontSize: 13,
            color: "var(--muted)",
            lineHeight: 1.45,
            margin: "0 0 4px",
          }}
        >
          Only used to arrange your app. Never for calls or sales. Shared with
          your advisor: nothing.
        </p>
        {groups.map(([label, status]) => {
          const list = snapshot.persona.beliefs.filter(
            (b) => b.status === status,
          );
          if (!list.length) return null;
          return (
            <div key={status}>
              <div className="label">{label}</div>
              {list.map((b) => (
                <div className="erow" key={b.id}>
                  <span className="n">
                    {b.text}
                    <small>
                      {b.source}
                      {b.forget ? ` · forgets ${b.forget}` : ""}
                    </small>
                  </span>
                  {status === "inferred" ? (
                    <button
                      type="button"
                      className="chip"
                      onClick={() => onBelief(b.id, "said_no")}
                    >
                      Wrong
                    </button>
                  ) : status === "said_no" ? (
                    <button
                      type="button"
                      className="chip"
                      onClick={() => onBelief(b.id, "told")}
                    >
                      Undo
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="chip"
                      onClick={() => onBelief(b.id, "remove")}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
        {snapshot.muted.length > 0 && (
          <>
            <div className="label">Kate won’t suggest</div>
            {snapshot.muted.map((m) => (
              <div className="erow" key={m}>
                <span className="n">
                  {snapshot.catalog.find((c) => c.id === m)?.title ??
                    m.replace(/_/g, " ")}
                </span>
                <button
                  type="button"
                  className="chip"
                  onClick={() => onUnmute(m)}
                >
                  Allow again
                </button>
              </div>
            ))}
          </>
        )}
        {snapshot.rules.length > 0 && (
          <>
            <div className="label">Automatic rules</div>
            {snapshot.rules.map((r) => (
              <div className="erow" key={r.id}>
                <span className="n">{r.text}</span>
                <button
                  type="button"
                  className="chip"
                  onClick={() => onStopRule(r.id)}
                >
                  Stop
                </button>
              </div>
            ))}
          </>
        )}
        <div className="note">
          Never used: health, religion, politics, relationships.
        </div>
      </div>
    </section>
  );
}
