"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { StoreProvider, useStore } from "../../hindsight/components/store";
import { LandscapeCity, preloadCity } from "../../one/LandscapeCity";
import { LookAheadCard } from "../../one/LookAheadCard";
import { PEOPLE } from "../../one/people";
import { RoadTab } from "../../one/RoadTab";
import { DirectorPanel, GlassPanel, StoryRoadLine } from "../../one/StagePanels";
import "../../hindsight/hs-base.css";
import "../../hindsight/hindsight.css";
import "../../one/one.css";
import { eur, gbp } from "../format";
import type { Proposal } from "../kate";
import type {
  ActionSheet,
  HomeModel,
  Placed,
  Snapshot,
  Theme,
  UserLayout,
} from "../types";
import { api } from "./api";
import { BlockList } from "./Blocks";
import { Icon } from "./icons";
import {
  BlockSheet,
  type ChatMsg,
  ConfirmSheet,
  EditScreen,
  KateSheet,
  LedgerScreen,
  LibraryScreen,
} from "./Screens";
import { STAGE } from "./stage";
import "./kbc.css";

type View = "home" | "edit" | "library" | "ledger" | "road";
type LogItem = {
  at: string;
  title: string;
  detail: string[];
  source?: string;
  ms?: number;
};

const FONT: Record<Theme["font"], string> = {
  inter: "var(--font-inter), Inter, system-ui, sans-serif",
  quicksand: "Quicksand, system-ui, sans-serif",
  nunito: "Nunito, system-ui, sans-serif",
  space: "'Space Grotesk', system-ui, sans-serif",
  serif: "'DM Serif Display', Georgia, serif",
};

const MOTIF: Record<Exclude<Theme["motif"], "none">, string> = {
  hearts:
    "<path d='M20 30s-9-5.6-9-11.2A5 5 0 0 1 20 16a5 5 0 0 1 9 2.8C29 24.4 20 30 20 30z' fill='C'/>",
  stars:
    "<path d='M20 10l2.6 6.6 7 .4-5.4 4.4 1.8 6.8L20 24.4l-6 3.8 1.8-6.8-5.4-4.4 7-.4z' fill='C'/>",
  sparkles:
    "<path d='M20 12l1.6 6.4L28 20l-6.4 1.6L20 28l-1.6-6.4L12 20l6.4-1.6z' fill='C'/>",
  dots: "<circle cx='20' cy='20' r='3' fill='C'/>",
  waves:
    "<path d='M0 22c7-6 13-6 20 0s13 6 20 0' stroke='C' stroke-width='2' fill='none'/>",
};

function lum(hex: string) {
  const v = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

function themeVars(
  t: Theme | null,
  style: HomeModel["style"],
): { style: CSSProperties; light: boolean; motif?: string } {
  if (!t) {
    if (style === "large")
      return {
        light: true,
        style: {
          "--bg": "#f3f6fa",
          "--surface": "#ffffff",
          "--text": "#0a2540",
          "--muted": "#3d5573",
          "--accent": "#003665",
          "--accent-text": "#ffffff",
          "--radius": "18px",
        } as CSSProperties,
      };
    if (style === "dense")
      return {
        light: false,
        style: { "--bg": "#080b10", "--surface": "#0f1520" } as CSSProperties,
      };
    return { light: false, style: {} };
  }
  const c = t.colors;
  const motif =
    t.motif !== "none"
      ? `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'>${MOTIF[t.motif].replaceAll("C", c.accent)}</svg>`)}")`
      : undefined;
  return {
    light: lum(c.bg) > 0.4,
    motif,
    style: {
      "--bg": c.bg,
      "--surface": c.surface,
      "--text": c.text,
      "--muted": c.muted,
      "--accent": c.accent,
      "--accent-text": c.accentText,
      "--radius": `${t.radius}px`,
      "--font": FONT[t.font],
    } as CSSProperties,
  };
}

/** KBC One: lets the app shell (outside the road store) start a drive, e.g. from Kate's proposal. */
type RoadApi = ReturnType<typeof useStore>;
function StoreBridge({ bridge }: { bridge: { current: RoadApi | null } }) {
  const s = useStore();
  useEffect(() => {
    bridge.current = s;
  });
  return null;
}

/** KBC One: the Road tab wears the customer's look. Map Kate's theme tokens onto Hindsight's. */
function roadVars(t: { style: CSSProperties; light: boolean }, custom: boolean): CSSProperties {
  const v = t.style as Record<string, string>;
  if (!custom && !t.light) return {};
  const bg = v["--bg"];
  const surface = v["--surface"];
  const text = v["--text"];
  const muted = v["--muted"];
  const accent = v["--accent"];
  return {
    "--bg": bg,
    "--ink": bg,
    "--ink2": `color-mix(in srgb, ${bg} 60%, ${surface})`,
    "--panel": surface,
    "--panel2": `color-mix(in srgb, ${surface} 80%, ${text})`,
    "--line": `color-mix(in srgb, ${text} 16%, transparent)`,
    "--line2": `color-mix(in srgb, ${text} 26%, transparent)`,
    "--cream": text,
    "--soft": text,
    "--muted": muted,
    "--fine": muted,
    "--cyan": accent,
    ...(t.light
      ? { "--amber": "#9a5b00", "--mint": "#137a45", "--lilac": "#5b4fa0", "--sand": "#8a6d2b", "--paper": surface }
      : {}),
    ...(v["--font"] ? { "--sans": v["--font"], "--display": v["--font"] } : {}),
    background: bg,
    color: text,
  } as CSSProperties;
}

const now = () =>
  new Date().toLocaleTimeString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const CHAT_KEY = "kbc-kate-chats-v1";
const TOUR_MS = 18_000;

function loadChats(): Record<string, ChatMsg[]> {
  try {
    const raw = window.localStorage.getItem(CHAT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ChatMsg[]>;
    // A reload mid-answer leaves a half message; mark it finished.
    for (const k of Object.keys(parsed))
      parsed[k] = parsed[k].map((m) => ({ ...m, streaming: false }));
    return parsed;
  } catch {
    return {};
  }
}

function saveChats(c: Record<string, ChatMsg[]>) {
  try {
    window.localStorage.setItem(CHAT_KEY, JSON.stringify(c));
  } catch {
    /* storage is a convenience only */
  }
}

/** Kate's suggested prompts, from what is on screen right now. */
function kateChips(
  home: HomeModel,
  snap: Snapshot,
  ctx: Placed | null,
  forHome = false,
): string[] {
  if (ctx) {
    const out = ["Why am I seeing this?"];
    if (ctx.id === "split_bill") out.push("Only Lien and Arne, not Sam");
    else if (ctx.action) out.push(ctx.action.label);
    if (ctx.id !== "split_bill") out.push("Explain the numbers");
    if (!ctx.protection && ctx.id !== "split_bill")
      out.push("Make this block bigger");
    return out;
  }
  const out: string[] = [];
  if (home.intent?.id === "split_bill" && !forHome)
    out.push("Split it, but not with Sam");
  out.push("What did I spend most on this month?");
  if (snap.persona.abroad) out.push("How much did I spend on this trip?");
  else out.push("How much can I still spend until payday?");
  out.push(
    forHome
      ? "Change how my home looks"
      : snap.theme
        ? "Go back to the normal look"
        : "Make it pink and playful",
  );
  if (!forHome) out.push("Make me a coffee tracker");
  return out.slice(0, forHome ? 3 : 5);
}

function clock(iso: string) {
  return iso.slice(11, 16);
}

export function KbcApp() {
  const [persona, setPersona] = useState<string>("tom");
  const [home, setHome] = useState<HomeModel | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [composing, setComposing] = useState(false);
  const [view, setView] = useState<View>("home");
  const [kateOpen, setKateOpen] = useState(false);
  const [blockSheet, setBlockSheet] = useState<Placed | null>(null);
  const [confirm, setConfirm] = useState<ActionSheet | null>(null);
  const [confirmFrom, setConfirmFrom] = useState<number | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(
    null,
  );
  const [chat, setChat] = useState<Record<string, ChatMsg[]>>({});
  const [kateBusy, setKateBusy] = useState(false);
  const [kateContext, setKateContext] = useState<Placed | null>(null);
  const [editDraft, setEditDraft] = useState<UserLayout | null>(null);
  const [log, setLog] = useState<LogItem[]>([]);
  const [engineOpen, setEngineOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"kate" | "glass" | "director">("kate");
  const frameRef = useRef<HTMLDivElement>(null);
  const road = useRef<RoadApi | null>(null);
  const [touring, setTouring] = useState(false);
  const composeSeq = useRef(0);
  const msgSeq = useRef(Date.now());
  const kateAbort = useRef<AbortController | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const engine = useRef<HTMLDialogElement>(null);

  const addLog = useCallback(
    (item: Omit<LogItem, "at">) =>
      setLog((l) => [{ at: now(), ...item }, ...l].slice(0, 40)),
    [],
  );

  const flash = useCallback((text: string, err = false) => {
    setToast({ text, err });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3400);
  }, []);

  const compose = useCallback(
    async (id: string) => {
      const seq = ++composeSeq.current;
      setComposing(true);
      try {
        const res = await api.home(id, "compose");
        if (seq !== composeSeq.current) return;
        setHome(res.home);
        setSnap(res.snapshot);
        const h = res.home;
        addLog({
          title: `Home composed for ${res.snapshot.persona.name}`,
          source:
            h.source === "claude" ? `claude -p · ${h.model}` : "rules fallback",
          ms: h.ms,
          detail: [
            `style: ${h.style}${h.customized ? " (customer’s own)" : ""}`,
            ...(h.headline ? [`headline: ${h.headline}`] : []),
            ...(h.intent
              ? [`intent: ${h.intent.id} — ${h.intent.reason}`]
              : []),
            ...h.actions.map((a) => `action: ${a.id} — ${a.reason}`),
            ...[...h.blocks, ...h.forYou].map(
              (b) =>
                `${b.suggested ? "suggest" : "block"}: ${b.id} [${b.size}/${b.score}] — ${b.reason}`,
            ),
            ...h.notes.map((n) => `validator: ${n}`),
          ],
        });
      } catch (e) {
        if (seq === composeSeq.current)
          flash(e instanceof Error ? e.message : "Could not compose", true);
      } finally {
        if (seq === composeSeq.current) setComposing(false);
      }
    },
    [addLog, flash],
  );

  // Boot: persona from ?p=, saved chats from this browser.
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("p");
    if (fromUrl) setPersona(fromUrl);
    setChat(loadChats());
    setBooted(true);
  }, []);
  useEffect(() => {
    if (booted) saveChats(chat);
  }, [chat, booted]);

  // On every page load and persona switch: show the last home at once, then let Claude arrange it again.
  useEffect(() => {
    if (!booted) return;
    let alive = true;
    kateAbort.current?.abort();
    setView("home");
    setKateOpen(false);
    setKateContext(null);
    setBlockSheet(null);
    setConfirm(null);
    setEditDraft(null);
    api
      .home(persona, "cached")
      .then((r) => {
        if (!alive) return;
        setHome(r.home);
        setSnap(r.snapshot);
        compose(persona);
      })
      .catch((e) => flash(e.message, true));
    const url = new URL(window.location.href);
    url.searchParams.set("p", persona);
    window.history.replaceState(null, "", url);
    return () => {
      alive = false;
    };
  }, [booted, persona, compose, flash]);

  // Presenter tour: step through every customer.
  useEffect(() => {
    if (!touring || !snap) return;
    const ids = snap.personas.map((x) => x.id);
    const t = window.setTimeout(() => {
      setPersona(ids[(ids.indexOf(persona) + 1) % ids.length]);
    }, TOUR_MS);
    return () => window.clearTimeout(t);
  }, [touring, persona, snap]);

  useEffect(() => {
    const d = engine.current;
    if (!d) return;
    if (engineOpen && !d.open) d.showModal();
    if (!engineOpen && d.open) d.close();
  }, [engineOpen]);

  const run = useCallback(
    async (body: Record<string, unknown>, recompose = true) => {
      try {
        const r = await api.command(persona, body);
        setSnap(r.snapshot);
        flash(r.message);
        addLog({ title: `Command: ${String(body.type)}`, detail: [r.message] });
        if (recompose) compose(persona);
        return true;
      } catch (e) {
        flash(e instanceof Error ? e.message : "Failed", true);
        return false;
      }
    },
    [persona, flash, addLog, compose],
  );

  const patchMsg = (id: number, patch: Partial<ChatMsg>) =>
    setChat((c) => ({
      ...c,
      [persona]: (c[persona] ?? []).map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      ),
    }));

  const openAction = async (
    id: string,
    params: Record<string, number> = {},
    to?: string,
  ) => {
    try {
      const r = await api.preview(persona, id, params, to);
      setBlockSheet(null);
      setConfirmFrom(null);
      setConfirm(r.sheet);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Not possible", true);
    }
  };

  const doConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    const ok = await run({
      type: "action",
      id: confirm.id,
      params: confirm.params,
      to: confirm.to,
    });
    setConfirmBusy(false);
    setConfirm(null);
    // Optimistic: the card that offered this is handled, before Kate re-arranges.
    if (ok)
      setHome((h) =>
        h
          ? {
              ...h,
              intent: h.intent?.actionId === confirm.id ? null : h.intent,
              actions: h.actions.filter((a) => a.id !== confirm.id),
            }
          : h,
      );
    if (ok && confirmFrom !== null) {
      patchMsg(confirmFrom, { applied: true });
      setKateOpen(false);
    }
    setConfirmFrom(null);
  };

  const sendKate = async (text: string) => {
    const history = (chat[persona] ?? [])
      .filter((m) => m.text && !m.failed)
      .slice(-10)
      .map(({ role, text: t }) => ({ role, text: t }));
    const userId = ++msgSeq.current;
    const kateId = ++msgSeq.current;
    const who = persona;
    setChat((c) => ({
      ...c,
      [who]: [
        ...(c[who] ?? []).slice(-40),
        { id: userId, role: "user", text },
        { id: kateId, role: "kate", text: "", streaming: true },
      ],
    }));
    const patch = (p: Partial<ChatMsg> | ((m: ChatMsg) => Partial<ChatMsg>)) =>
      setChat((c) => ({
        ...c,
        [who]: (c[who] ?? []).map((m) =>
          m.id === kateId
            ? { ...m, ...(typeof p === "function" ? p(m) : p) }
            : m,
        ),
      }));
    setKateBusy(true);
    const ctrl = new AbortController();
    kateAbort.current = ctrl;
    const t0 = performance.now();
    let first = 0;
    try {
      const r = await api.kate(
        who,
        text,
        history,
        kateContext?.id,
        (d) => {
          if (!first) first = performance.now() - t0;
          patch((m) => ({ text: m.text + d }));
        },
        ctrl.signal,
      );
      patch({
        text: r.reply,
        proposal: r.proposal,
        streaming: false,
        source: r.source,
      });
      addLog({
        title: `Kate: “${text.slice(0, 50)}”`,
        source: r.source === "claude" ? "claude -p (stream)" : "fallback",
        ms: r.ms,
        detail: [
          ...(first
            ? [`first words after ${(first / 1000).toFixed(1)} s`]
            : []),
          r.proposal
            ? `proposal: ${r.proposal.type}${r.proposal.type === "action" ? ` ${r.proposal.id}` : ""}`
            : "no proposal",
          ...r.notes.map((n) => `validator: ${n}`),
        ],
      });
    } catch (e) {
      const aborted = ctrl.signal.aborted;
      patch((m) => ({
        streaming: false,
        failed: !aborted || !m.text,
        text: aborted
          ? m.text
            ? `${m.text} …`
            : "Stopped."
          : e instanceof Error
            ? e.message
            : "Something went wrong.",
      }));
    } finally {
      if (kateAbort.current === ctrl) {
        kateAbort.current = null;
        setKateBusy(false);
      }
    }
  };

  const applyProposal = async (p: Proposal, msgId: number) => {
    if (p.type === "drive") {
      patchMsg(msgId, { applied: true });
      setKateOpen(false);
      road.current?.testDrive(p.roadId, p.month);
      return;
    }
    if (p.type === "action") {
      setConfirmFrom(msgId);
      setConfirm({
        id: p.id,
        params: p.params,
        to: p.to,
        title: p.title,
        rows: p.rows,
        level: p.level,
      });
      return;
    }
    let ok = false;
    if (p.type === "layout")
      ok = await run({
        type: "layout",
        style: p.layout.style,
        blocks: p.layout.blocks,
        suggestionsPerDay: p.layout.suggestionsPerDay,
      });
    if (p.type === "tracker")
      ok = await run({ type: "tracker", spec: p.spec, size: p.size });
    if (p.type === "theme") ok = await run({ type: "theme", theme: p.theme });
    if (ok) {
      patchMsg(msgId, { applied: true });
      setKateOpen(false);
    }
  };

  const openKate = (ctx: Placed | null) => {
    setKateContext(ctx);
    setBlockSheet(null);
    setView("home");
    setKateOpen(true);
  };

  const askFromHome = (text: string) => {
    openKate(null);
    sendKate(text);
  };

  if (!home || !snap) {
    return (
      <>
        <div className="stage-bg" aria-hidden="true" />
        <main className="stage">
          <p style={{ color: "#9db0c6" }}>Loading demo…</p>
        </main>
      </>
    );
  }

  const theme = themeVars(snap.theme, home.style);
  const p = snap.persona;
  const st = home.style;
  const story = STAGE[persona];
  const currentLayout: UserLayout = snap.layout ?? {
    style: home.style,
    blocks: home.blocks
      .filter((b) => !b.protection)
      .map((b) => ({ id: b.id, size: b.size })),
    suggestionsPerDay: 1,
  };
  const urgent = [...home.blocks, ...home.forYou].find((b) => b.protection);
  const outcome = home.intent
    ? home.intent.title
    : urgent
      ? `${urgent.sentence || urgent.title} → ${urgent.action?.label ?? "shown first"}`
      : home.actions[0]
        ? `${home.actions[0].title} → ${home.actions[0].button}`
        : home.headline;

  const person = PEOPLE[persona] ?? null;
  return (
    <StoreProvider key={persona} person={person}>
    <StoreBridge bridge={road} />
    <MotionConfig reducedMotion="user">
      <div className="stage-bg" aria-hidden="true" />
      <main className="stage kbc-root">
        <header className="stage-brand">
          <span className="kbc-logo">
            KBC<span>.</span>
          </span>
          <span className="stage-kicker">
            KBC One · 1 person, 1 app · 1 click away · 1 perfect road to your
            future
          </span>
        </header>

        <section className="stage-story" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={persona}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
            >
              {story && (
                // biome-ignore lint/performance/noImgElement: local SVG character
                <img src={story.avatar} alt="" className="story-avatar" />
              )}
              <p className="stage-kicker">Meet</p>
              <h1 className="story-name">{story?.nameAge ?? p.name}</h1>
              <p className="story-role">{story?.role ?? p.short}</p>
              <p className="stage-kicker" style={{ marginTop: 28 }}>
                KBC noticed
              </p>
              <ul className="kbc-signals">
                {(story?.noticed ?? []).map((s, i) => (
                  <motion.li
                    key={s}
                    className="signal-pill"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.35 }}
                  >
                    <span className="signal-dot" />
                    {s}
                  </motion.li>
                ))}
              </ul>
              <motion.div
                className="story-outcome kbc-outcome"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 + (story?.noticed.length ?? 0) * 0.35 }}
              >
                <Icon name="spark" size={20} />
                <span>
                  {composing ? (
                    <span className="kbc-thinking">
                      Kate is arranging {p.name}’s home…
                    </span>
                  ) : (
                    outcome
                  )}
                  <small>
                    {composing
                      ? `claude -p · ${snap.ai.composeModel}`
                      : home.source === "claude"
                        ? `Decided by claude -p · ${home.model} · ${(home.ms / 1000).toFixed(1)} s`
                        : "Rules fallback (Claude unavailable)"}
                  </small>
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 + (story?.noticed.length ?? 0) * 0.35 }}
              >
                <StoryRoadLine />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </section>

        <div className="stage-phone">
          <div className="phone-halo" aria-hidden="true" />
          <div className="phone-frame" ref={frameRef}>
            <div
              className={`ph st-${st} ${theme.light ? "light" : ""}`}
              style={theme.style}
            >
              {theme.motif && (
                <div
                  className="motif"
                  style={{ backgroundImage: theme.motif }}
                />
              )}
              <div className="status" aria-hidden="true">
                <span>{clock(p.now)}</span>
                <span className="island" />
                <span>{p.abroad ? "EE 5G" : "5G"} ▮▮▮</span>
              </div>
              <div className="scroll">
                <div className="top">
                  <span className="hi">Hi, {p.name}</span>
                  <span style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="iconbtn"
                      aria-label="Edit home"
                      onClick={() => setView("edit")}
                    >
                      <Icon name="edit" size={17} />
                    </button>
                    <button
                      type="button"
                      className="av"
                      style={{ background: p.color }}
                      aria-label="What KBC knows about me"
                      onClick={() => setView("ledger")}
                    >
                      {p.initial}
                    </button>
                  </span>
                </div>

                <div
                  style={{
                    textAlign: st === "calm" ? "center" : "left",
                    marginTop: 8,
                  }}
                >
                  <span className={`pill ${composing ? "busy" : ""}`}>
                    <Icon name="spark" size={13} />
                    {composing
                      ? "Kate is arranging your home…"
                      : home.customized
                        ? "Your layout · suggestions by Kate"
                        : `Arranged by Kate${home.source === "rules" ? " (rules)" : ""}`}
                  </span>
                </div>

                <section className="core" aria-label="Balance and main actions">
                  <div className="bal">
                    <div>
                      {st !== "calm" && (
                        <div className="sub">Current account</div>
                      )}
                      <div className="amount">{eur(p.accounts.current)}</div>
                    </div>
                    <div className="sub">
                      {st === "calm" ? "Current account · " : ""}savings{" "}
                      {eur(p.accounts.savings, { cents: false })}
                      {p.accounts.pocketGBP !== undefined
                        ? ` · ${gbp(p.accounts.pocketGBP)}`
                        : ""}
                    </div>
                  </div>
                  <div className="acts">
                    {(
                      [
                        ["send", "Transfer"],
                        ["qr", "Pay"],
                        ["scan", "Scan"],
                        ["card", "Cards"],
                      ] as const
                    ).map(([icon, label]) => (
                      <button
                        type="button"
                        className="act"
                        key={label}
                        onClick={() =>
                          flash(`${label} opens the normal KBC flow`)
                        }
                      >
                        <span>
                          <Icon name={icon} size={st === "large" ? 22 : 19} />
                        </span>
                        {label}
                      </button>
                    ))}
                  </div>
                </section>

                {home.headline && <p className="headline">{home.headline}</p>}

                {home.intent && (
                  <section
                    className="intent"
                    aria-label="Kate’s guess for right now"
                  >
                    <div className="k">
                      <span>{home.intent.kicker}</span>
                    </div>
                    <h3>{home.intent.title}</h3>
                    {home.intent.people && (
                      <div className="people">
                        <span style={{ display: "flex" }}>
                          {home.intent.people.map((x) => (
                            <span
                              key={x.id}
                              className="av"
                              style={{ background: x.color }}
                            >
                              {x.name[0]}
                            </span>
                          ))}
                        </span>
                        <span>{home.intent.detail}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        type="button"
                        className="btn"
                        style={{ flex: 1 }}
                        onClick={() =>
                          home.intent &&
                          openAction(home.intent.actionId, home.intent.params)
                        }
                      >
                        {home.intent.button}
                      </button>
                      <button
                        type="button"
                        className="btn sec"
                        onClick={() =>
                          home.intent &&
                          openKate({
                            id: home.intent.id,
                            title: home.intent.title,
                            value: home.intent.title,
                            sub: home.intent.kicker,
                            icon: "split",
                            tone: "normal",
                            sentence: home.intent.title,
                            facts: home.intent.facts,
                            size: "m",
                            score: "now",
                            reason: home.intent.reason,
                          })
                        }
                      >
                        <Icon name="kate" size={15} /> Change
                      </button>
                    </div>
                  </section>
                )}

                {home.actions.length > 0 && (
                  <>
                    <div className="label">
                      <span className="lbl-ic">
                        <Icon name="spark" size={12} /> Ready for you
                      </span>
                      <span style={{ textTransform: "none", letterSpacing: 0 }}>
                        one tap each
                      </span>
                    </div>
                    {home.actions.map((a) => (
                      <button
                        type="button"
                        key={a.id}
                        className="qa"
                        onClick={() => openAction(a.id, a.params)}
                        title={a.reason}
                      >
                        <span className="ic">
                          <Icon name={a.icon} size={18} />
                        </span>
                        <span className="w">
                          <b>{a.title}</b>
                          {a.reason || a.why}
                        </span>
                        <span className="go">{a.button}</span>
                      </button>
                    ))}
                  </>
                )}

                <LookAheadCard large={st === "large"} onFlash={flash} />

                {home.customized && <div className="label">My blocks</div>}
                {!home.customized && <div style={{ height: 8 }} />}
                <BlockList
                  blocks={home.blocks}
                  style={st}
                  onOpen={setBlockSheet}
                />

                {home.forYou.length > 0 && (
                  <>
                    <div className="label">
                      <span className="lbl-ic">
                        <Icon name="spark" size={12} /> For you today
                      </span>
                    </div>
                    <BlockList
                      blocks={home.forYou}
                      style={st}
                      onOpen={setBlockSheet}
                    />
                  </>
                )}

                {snap.requests.length > 0 && (
                  <>
                    <div className="label">Money requests</div>
                    <div className="note" style={{ marginTop: 0 }}>
                      {snap.requests
                        .map((r) => `${r.name}: ${eur(r.amount)} · ${r.status}`)
                        .join(" · ")}
                    </div>
                  </>
                )}
              </div>

              {st !== "large" && (
                <div className="home-chips chips scrollx">
                  {kateChips(home, snap, null, true).map((c) => (
                    <button
                      type="button"
                      className="chip"
                      key={c}
                      onClick={() => askFromHome(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              <div className="dock">
                <span className={`orb ${kateBusy ? "live" : ""}`} />
                <button
                  type="button"
                  className="ask"
                  onClick={() => openKate(null)}
                >
                  {(chat[persona] ?? []).length
                    ? "Continue with Kate…"
                    : "Ask Kate anything…"}
                </button>
              </div>
              <nav className="nav" aria-label="Main">
                {(
                  [
                    ["home", "Home"],
                    ["card", "Accounts"],
                    ["kate", "Kate"],
                    ["road", "Road"],
                    ["list", "More"],
                  ] as const
                ).map(([icon, label]) => (
                  <button
                    type="button"
                    key={label}
                    aria-current={
                      (label === "Home" && view === "home" && !kateOpen) ||
                      (label === "Road" && view === "road")
                        ? "page"
                        : undefined
                    }
                    onPointerEnter={label === "Road" ? preloadCity : undefined}
                    onClick={() => {
                      if (label === "Kate") openKate(null);
                      else if (label === "Home") {
                        setKateOpen(false);
                        setView("home");
                      } else if (label === "Road") {
                        setKateOpen(false);
                        setBlockSheet(null);
                        setView("road");
                        preloadCity();
                      } else flash(`${label} opens the normal KBC screen`);
                    }}
                  >
                    <Icon name={icon} size={20} />
                    {label}
                  </button>
                ))}
              </nav>

              {view === "edit" && (
                <EditScreen
                  initial={editDraft ?? currentLayout}
                  snapshot={snap}
                  onClose={() => {
                    setEditDraft(null);
                    setView("home");
                  }}
                  onSave={async (l) => {
                    if (
                      await run({
                        type: "layout",
                        style: l.style,
                        blocks: l.blocks,
                        suggestionsPerDay: l.suggestionsPerDay,
                      })
                    ) {
                      setEditDraft(null);
                      setView("home");
                    }
                  }}
                  onLibrary={(d) => {
                    setEditDraft(d);
                    setView("library");
                  }}
                  onKate={() => openKate(null)}
                  onReset={async () => {
                    if (await run({ type: "layout_reset" })) {
                      setEditDraft(null);
                      setView("home");
                    }
                  }}
                  onThemeReset={() => run({ type: "theme_reset" }, false)}
                />
              )}
              {view === "library" && (
                <LibraryScreen
                  snapshot={snap}
                  inLayout={(editDraft ?? currentLayout).blocks.map(
                    (b) => b.id,
                  )}
                  onAdd={(id) => {
                    const base = editDraft ?? currentLayout;
                    setEditDraft({
                      ...base,
                      blocks: [...base.blocks, { id, size: "s" }],
                    });
                    setView("edit");
                  }}
                  onClose={() => setView("edit")}
                  onKate={() => openKate(null)}
                />
              )}
              {view === "ledger" && (
                <LedgerScreen
                  snapshot={snap}
                  onClose={() => setView("home")}
                  onBelief={(id, status) => run({ type: "belief", id, status })}
                  onUnmute={(id) => run({ type: "unmute", id })}
                  onStopRule={(id) => run({ type: "stop_rule", id }, false)}
                />
              )}

              {kateOpen && (
                <KateSheet
                  messages={chat[persona] ?? []}
                  busy={kateBusy}
                  context={kateContext}
                  suggestions={kateChips(home, snap, kateContext)}
                  onSend={sendKate}
                  onApply={applyProposal}
                  onClose={() => setKateOpen(false)}
                  onStop={() => kateAbort.current?.abort()}
                  onClear={() => {
                    setKateContext(null);
                    setChat((c) => ({ ...c, [persona]: [] }));
                  }}
                  onDropContext={() => setKateContext(null)}
                />
              )}

              {blockSheet && (
                <BlockSheet
                  block={blockSheet}
                  onClose={() => setBlockSheet(null)}
                  onAction={(id, params) => openAction(id, params)}
                  onAsk={(b) => openKate(b)}
                  onMute={async (b) => {
                    setBlockSheet(null);
                    await run({ type: "mute", id: b.id });
                  }}
                  onLedger={() => {
                    setBlockSheet(null);
                    setView("ledger");
                  }}
                />
              )}
              {confirm && (
                <ConfirmSheet
                  sheet={confirm}
                  busy={confirmBusy}
                  onConfirm={doConfirm}
                  onClose={() => {
                    setConfirm(null);
                    setConfirmFrom(null);
                  }}
                />
              )}
              {toast && (
                <div
                  className={`toast ${toast.err ? "err" : ""}`}
                  role="status"
                >
                  <Icon name={toast.err ? "alert" : "check"} size={18} />
                  <span>{toast.text}</span>
                </div>
              )}
            </div>
            {view === "road" && (
              <RoadTab
                themeStyle={roadVars(theme, Boolean(snap.theme))}
                light={theme.light}
                large={st === "large"}
              />
            )}
          </div>
        </div>

        <nav className="stage-cast" aria-label="Customers">
          <ul className="cast-list">
            {snap.personas.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  aria-pressed={x.id === persona}
                  aria-label={`${x.name}: ${x.short}`}
                  title={`${x.name} · ${x.short}`}
                  className="cast-avatar"
                  onClick={() => {
                    setTouring(false);
                    setPersona(x.id);
                  }}
                >
                  {STAGE[x.id] ? (
                    // biome-ignore lint/performance/noImgElement: local SVG character
                    <img src={STAGE[x.id].avatar} alt="" />
                  ) : (
                    x.initial
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="cast-tools">
            <button
              type="button"
              className="cast-tool"
              aria-pressed={touring}
              aria-label={touring ? "Stop tour" : "Play tour"}
              title={touring ? "Stop tour" : "Play tour"}
              onClick={() => setTouring((t) => !t)}
            >
              <Icon name={touring ? "stop" : "play"} size={16} />
            </button>
            <button
              type="button"
              className="cast-tool"
              aria-label="Inside: Kate, the crowd gate and presenter controls"
              title="Inside: Kate, the crowd gate and presenter controls"
              onClick={() => setEngineOpen(true)}
            >
              <Icon name="activity" size={16} />
              {log.length > 0 && (
                <span className="cast-count">{log.length}</span>
              )}
            </button>
          </div>
        </nav>
      </main>
      <LandscapeCity
        frameRef={frameRef}
        onBack={(kept) =>
          kept &&
          flash("Your plan is saved. You'll see it on your road and home.")
        }
      />

      <dialog
        ref={engine}
        className="engine-drawer kbc-engine"
        aria-label="Inside Kate"
        onClose={() => setEngineOpen(false)}
      >
        <div className="eng-head">
          <h2>Inside</h2>
          <span
            className="kbc-badge"
            style={{ color: home.source === "claude" ? "#4ade80" : "#fbbf24" }}
          >
            {home.source === "claude" ? `claude · ${home.model}` : "rules"}
          </span>
          <button
            type="button"
            className="cast-tool"
            aria-label="Close"
            onClick={() => setEngineOpen(false)}
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="eng-tabs" role="tablist">
          {(
            [
              ["kate", "Inside Kate"],
              ["glass", "Behind the glass"],
              ["director", "Director"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={drawerTab === id}
              onClick={() => setDrawerTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {drawerTab === "glass" && <GlassPanel />}
        {drawerTab === "director" && (
          <DirectorPanel
            composing={composing}
            onCompose={() => compose(persona)}
            onRoadTab={() => {
              setKateOpen(false);
              setView("road");
              setEngineOpen(false);
            }}
            onReset={async () => {
              setChat((c) => ({ ...c, [persona]: [] }));
              await run({ type: "reset" });
            }}
          />
        )}
        {drawerTab === "kate" && (
        <>
        <p className="eng-intro">
          Code computes every amount and the candidate blocks and actions.
          Claude picks and explains; code validates. Full prompts and replies
          are printed in the terminal running <code>bun dev</code>.
        </p>
        <p className="eng-intro">
          AI:{" "}
          {snap.ai.enabled
            ? `on · compose ${snap.ai.composeModel} · Kate ${snap.ai.kateModel}`
            : "off (rules only)"}
        </p>
        {log.length === 0 && <p className="eng-intro">Nothing yet.</p>}
        {log.map((l, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: append-only log
          <div className="pick" key={i}>
            <div className="pick-h">
              <b>{l.title}</b>
              <code>{l.at}</code>
            </div>
            {(l.source || l.ms !== undefined) && (
              <div className="pick-src">
                {l.source}
                {l.ms !== undefined ? ` · ${(l.ms / 1000).toFixed(1)} s` : ""}
              </div>
            )}
            {l.detail.map((d) => (
              <div
                key={d}
                className={`pick-d ${d.startsWith("validator") ? "warn" : ""}`}
              >
                {d}
              </div>
            ))}
          </div>
        ))}
        </>
        )}
      </dialog>
    </MotionConfig>
    </StoreProvider>
  );
}
