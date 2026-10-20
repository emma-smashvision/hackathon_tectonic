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
import { Adviser } from "../../hindsight/components/stage/Adviser"; // v8-channels
import { channelCardFor, type RoadFocus } from "../../one/nudge/channels";
// v7-nudge: shared journey state for Home, Director and the phone overlay.
import { NudgeProvider } from "../../one/nudge/NudgeProvider";
import { NudgeSurface } from "../../one/nudge/NudgeSurface";
import { PEOPLE } from "../../one/people";
import { RoadTab } from "../../one/RoadTab";
import { lessonsFor } from "../../one/learning";
import { useVillageProgress } from "../../one/village";
import { VillageCard } from "../../one/villagecard/VillageCard";
import { PlainPath, CareEntry } from "../../one/villagecard/PlainPath";
import { entryMode, entryReceipt } from "../../one/villagecard/entry";
import { DirectorPanel, GlassPanel, StoryRoadLine } from "../../one/StagePanels";
import "../../hindsight/hs-base.css";
import "../../hindsight/hindsight.css";
import "../../one/one.css";
import { eur } from "../format";
import { DEMO_BEATS, DEMO_BEAT_MS } from "../demo";
import { kateRoadAnswer, type Proposal } from "../kate"; // v8-channels
import { AllRoads } from "../../one/atlas8";
import { BusinessRoads } from "../../one/business";
import { catalogueRoad, confirmRoad, previewRoad } from "../../one/crowd";
import { useRoadPointers } from "../../one/nudge/useRoadPointers";
import type {
  ActionSheet,
  HomeModel,
  Placed,
  Snapshot,
  Theme,
} from "../types";
import { api } from "./api";
import { Icon } from "./icons";
import {
  BlockSheet,
  type ChatMsg,
  ConfirmSheet,
  HomeMix,
  KateSheet,
  LedgerScreen,
} from "./Screens";
import { STAGE } from "./stage";
// v7-kate: atomic preview apply, Undo and theme transition.
import { useKateCustomization, KatePreviewStyles, KateLooksCard, YourLooks } from "./KatePreview";
import "./kbc.css";

type View = "home" | "ledger" | "road" | "more" | "look";
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

/** v8-channels: lets the app shell share road focus and care consent with the road store. */
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
  const { pointers, updatePointers, resetPointers } = useRoadPointers(persona); // v8-channels
  const [allRoads, setAllRoads] = useState(false);
  const [business, setBusiness] = useState(false);
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
  const [log, setLog] = useState<LogItem[]>([]);
  const [engineOpen, setEngineOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"kate" | "glass" | "director" | "adviser">("kate");
  const [roadFocus, setRoadFocus] = useState<RoadFocus>(); // v8-channels
  const [villageEntry, setVillageEntry] = useState<{ mode: "plain" | "care"; focusLessonId?: string }>();
  const [villageReceipt, setVillageReceipt] = useState<string>();
  const villageProgress = useVillageProgress(persona);
  const entrySaved = useRef<string[]>([]);
  const entryTrigger = useRef<HTMLElement | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const road = useRef<RoadApi | null>(null);
  const [touring, setTouring] = useState(false);
  const [tourStep, setTourStep] = useState(0);
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

  // v7-kate: use the immediately rebuilt home; do not wait for an AI composition.
  const kateCustomization = useKateCustomization(persona, (nextHome, nextSnapshot) => {
    composeSeq.current += 1; setComposing(false); setHome(nextHome); setSnap(nextSnapshot);
  }, (message) => flash(message, true));

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

  // v10-shell: consume once, after the URL persona has loaded. Reset this person's
  // mission stamps, block upgrades and saved mission reminders through the store.
  useEffect(() => {
    if (!booted) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("reset") !== "1") return;
    villageProgress.reset();
    setVillageReceipt(undefined);
    url.searchParams.delete("reset");
    window.history.replaceState(null, "", url);
  }, [booted, persona, villageProgress.reset]);


  // On every page load and persona switch: show the last home at once, then let Claude arrange it again.
  useEffect(() => {
    if (!booted) return;
    let alive = true;
    kateAbort.current?.abort();
    setView("home");
    setKateOpen(false);
    setKateContext(null);
    setAllRoads(false);
    setBusiness(false);
    setVillageEntry(undefined);
    setVillageReceipt(undefined);
    setRoadFocus(undefined); // v8-channels: never carry a stop across people.
    setBlockSheet(null);
    setConfirm(null);
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

  // Wait for each customer's composition, then point at the content being explained.
  useEffect(() => {
    if (!touring) return;
    const pause = (event: MouseEvent) => {
      // The toggle handles its own click; capture must not turn Pause into Play.
      if (event.target instanceof Element && event.target.closest("[data-demo-toggle]")) return;
      setTouring(false);
    };
    document.addEventListener("click", pause, true);
    return () => document.removeEventListener("click", pause, true);
  }, [touring]);

  useEffect(() => {
    const beat = DEMO_BEATS[tourStep];
    if (!touring || composing || snap?.persona.id !== beat.persona) return;
    const scroll = frameRef.current?.querySelector<HTMLElement>(".ph > .scroll");
    const target = scroll?.querySelector<HTMLElement>(beat.target);
    if (scroll && target) {
      const top = target.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop - 8;
      scroll.scrollTo({ top: beat.target === ".mix-hero" ? 0 : top, behavior: "instant" });
      target.dataset.tourFocus = "true";
    }
    const timer = window.setTimeout(() => {
      const next = tourStep + 1;
      if (next === DEMO_BEATS.length) setTouring(false);
      else {
        setTourStep(next);
        setPersona(DEMO_BEATS[next].persona);
      }
    }, DEMO_BEAT_MS);
    return () => {
      window.clearTimeout(timer);
      if (target) delete target.dataset.tourFocus;
    };
  }, [touring, tourStep, composing, snap?.persona.id]);

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
    // v8-channels: live confirmed/preview pointers also drive Kate, without a network roundtrip.
    const localRoad = snap ? kateRoadAnswer({ persona: snap.persona }, text, pointers) : null;
    if (localRoad) { patch({ text: localRoad.reply, proposal: localRoad.proposal, streaming: false, source: "rules" }); return; }
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
    // v8-channels: every channel opens the same 2D road and stop.
    if (p.type === "road") {
      openRoad({ roadId: p.roadId, stopId: p.stopId });
      patchMsg(msgId, { applied: true });
      return;
    }
    if (p.type === "drive") return;
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
    // v7-kate: one checked command applies the complete preview.
    const ok = await kateCustomization.apply(p);
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
  const st = snap.theme?.base ?? home.style; // v7-kate: theme also controls density/text size
  const story = STAGE[persona];
  const urgent = [...home.blocks, ...home.forYou].find((b) => b.protection);
  const outcome = home.intent
    ? home.intent.title
    : urgent
      ? `${urgent.sentence || urgent.title} → ${urgent.action?.label ?? "shown first"}`
      : home.actions[0]
        ? `${home.actions[0].title} → ${home.actions[0].button}`
        : home.headline;

  const person = PEOPLE[persona] ?? null;
  // v8-channels: WS-B consumes this exact identity; previews never alter the person's pointer.
  const openRoad = (focus: RoadFocus) => {
    setRoadFocus({ ...focus });
    setAllRoads(false);
    setBusiness(false);
    setKateOpen(false);
    setEngineOpen(false);
    setView("road");
  };
  const openVillage = (focusLessonId?: string) => {
    entrySaved.current = [...villageProgress.saved];
    entryTrigger.current = document.activeElement as HTMLElement;
    setVillageReceipt(undefined);
    setKateOpen(false);
    setEngineOpen(false);
    setVillageEntry({ mode: entryMode(persona), focusLessonId });
  };
  const exitVillage = () => {
    const lessons = lessonsFor(persona);
    const built = lessons.filter(l => villageProgress.done.includes(l.id)).length;
    const savedNow = villageProgress.saved.filter(id => !entrySaved.current.includes(id));
    const reminder = lessons.some(l => l.save && savedNow.includes(l.save.id) && /remind/i.test(l.save.label));
    // r2-road: Calm visits and care profiles never receive a game score.
    const receipt = entryReceipt(built, lessons.length, savedNow.length > 0, true, reminder ? "Reminder" : "Step");
    if (villageEntry?.mode !== "care") setVillageReceipt(receipt);
    setVillageEntry(undefined);
    setView("home");
    setAllRoads(false);
    setBusiness(false);
    setRoadFocus(undefined);
    requestAnimationFrame(() => {
      const trigger = entryTrigger.current?.isConnected && entryTrigger.current.closest(".home-mix") ? entryTrigger.current : frameRef.current?.querySelector<HTMLElement>("[data-village-entry]");
      trigger?.focus({ preventScroll: true });
      trigger?.scrollIntoView({ block: "nearest", behavior: "instant" });
    });
  };
  return (
    <StoreProvider key={persona} person={person}>
    {/* v7-nudge: state resets with the selected person */}
    <NudgeProvider large={st === "large"} pointers={pointers}>
    <StoreBridge bridge={road} />
    <MotionConfig reducedMotion="user">
      <div className="stage-bg" aria-hidden="true" />
      <main className="stage kbc-root">
        <header className="stage-brand">
          <span className="kbc-logo">
            KBC<span>.</span>
          </span>
          <span className="stage-kicker">
            KBC One · Hindsight from people who have been there
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
                <StoryRoadLine pointers={pointers} />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </section>

        <div className="stage-phone">
          {touring && (
            <aside className="demo-caption" role="status" aria-live="polite">
              <small>Guided demo · {tourStep + 1} / {DEMO_BEATS.length}</small>
              <strong>{DEMO_BEATS[tourStep].title}</strong>
              <p>{DEMO_BEATS[tourStep].caption}</p>
              <span>{composing || snap.persona.id !== DEMO_BEATS[tourStep].persona ? "Getting this home ready…" : "Click anywhere to pause"}</span>
            </aside>
          )}
          <div className="phone-halo" aria-hidden="true" />
          <div className="phone-frame" ref={frameRef}>
            {/* v7-kate: Undo stays above Home and Your road. */}
            <KatePreviewStyles />
            {kateCustomization.undoBar}
            <div
              inert={Boolean(villageEntry)}
              className={`ph mix-phone st-${st} ${theme.light ? "light" : ""}`}
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
                <HomeMix key={persona} home={home} snapshot={snap} card={null}
                  villageCard={<VillageCard personaId={persona} large={st === "large"} receipt={villageReceipt} onOpen={() => openVillage()} />}
                  looks={<KateLooksCard compact snapshot={snap} onCommand={kateCustomization.command} />}
                  onSave={async (layout) => {
                    const ok = await run({ type: "layout", ...layout }, false);
                    if (ok) await compose(persona);
                    return ok;
                  }}
                  onProfile={() => setView("ledger")} onAsk={openKate}
                  onPrompt={(text) => { openKate(null); void sendKate(text); }}
                  onAction={openAction} onFlash={flash} onRoad={(focus) => { if (catalogueRoad(focus.roadId)?.care) road.current?.optInCareFor(focus.roadId); openRoad(focus); }} />
              </div>

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
                  st === "large" ? [
                    ["home", "Home"], ["road", "Your road"], ["kate", "Ask Kate"],
                  ] as const : [
                    ["home", "Home"],
                    ["card", "Accounts"],
                    ["kate", "Kate"],
                    ["road", "Your road"],
                    ["list", "More"],
                  ] as const
                ).map(([icon, label]) => (
                  <button
                    type="button"
                    key={label}
                    aria-current={
                      (label === "Home" && view === "home" && !kateOpen) ||
                      (label === "Your road" && view === "road" && !kateOpen) ||
                      (icon === "kate" && kateOpen)
                        ? "page"
                        : undefined
                    }
                    onClick={() => {
                      if (icon === "kate") openKate(null);
                      else if (label === "Home") {
                        setKateOpen(false);
                        setView("home");
                      } else if (label === "Your road") {
                        setKateOpen(false);
                        setBlockSheet(null);
                        setView("road");
                      } else if (label === "More") {
                        setKateOpen(false);
                        setView("more");
                      } else flash(`${label} opens the normal KBC screen`);
                    }}
                  >
                    <Icon name={icon} size={20} />
                    {label}
                  </button>
                ))}
              </nav>


              {(view === "more" || view === "look") && (
                <section className="screen" aria-label={view === "look" ? "Look" : "More"}>
                  <header className="bar">
                    <button type="button" className="iconbtn" aria-label="Back" onClick={() => setView(view === "look" ? "more" : "home")}>‹</button>
                    <h2>{view === "look" ? "Look" : "More"}</h2>
                  </header>
                  <div className="body">
                    {view === "look" ? <KateLooksCard snapshot={snap} onCommand={kateCustomization.command} /> : <button type="button" className="btn sec wide" onClick={() => setView("look")}>Look</button>}
                  </div>
                </section>
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
                  looks={<YourLooks snapshot={snap} onCommand={kateCustomization.command} />}
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
                    resetPointers(); // v8-channels
              setRoadFocus(undefined);
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
              {/* v7-nudge: private notification and plain journey page */}
              <NudgeSurface
                onPresent={() => { setEngineOpen(false); setKateOpen(false); setView("home"); }}
                onRoad={openRoad}
              />
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
            {view === "road" && business ? <div className="hs road-layer yr" style={roadVars(theme, Boolean(snap.theme))}><div className="phone road-phone"><div className="v8-atlas-host">
              <BusinessRoads personKey={persona} advisorName={p.advisor.name} large={st === "large"} onClose={() => setBusiness(false)} onAskKate={(text) => { openKate(null); void sendKate(text); }} />
            </div></div></div> : view === "road" && allRoads && person ? <div className="hs road-layer yr" style={roadVars(theme, Boolean(snap.theme))}><div className="phone road-phone"><div className="v8-atlas-host">
              <AllRoads person={person} pointers={pointers} large={st === "large"} onClose={() => setAllRoads(false)} onBusiness={() => setBusiness(true)} onOpenRoad={(roadId, mode, stage) => {
                updatePointers(mode === "confirmed" && stage ? confirmRoad(pointers, roadId, stage) : previewRoad(pointers, roadId, stage));
                if (catalogueRoad(roadId)?.care) road.current?.optInCareFor(roadId);
                openRoad({ roadId });
              }} />
            </div></div></div> : view === "road" && (
              <RoadTab
                {...{ focus: roadFocus, onFocusChange: setRoadFocus }} // v8-channels
                pointers={pointers} onAllRoads={() => setAllRoads(true)} onBusiness={() => setBusiness(true)}
                themeStyle={roadVars(theme, Boolean(snap.theme))}
                light={theme.light}
                large={st === "large"}
              />
            )}
            {villageEntry?.mode === "plain" && <PlainPath key={persona} personaId={persona} focusLessonId={villageEntry.focusLessonId} adviser={p.advisor.name} onExit={exitVillage} />}
            {villageEntry?.mode === "care" && <CareEntry adviser={p.advisor.name} onExit={exitVillage} onConsent={() => {
              const focus = channelCardFor(persona, { pointers });
              if (!focus) return;
              road.current?.optInCareFor(focus.roadId);
              setVillageEntry(undefined);
              openRoad(focus);
            }} />}
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
                    setVillageEntry(undefined); // v9-entry
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
              data-demo-toggle
              aria-pressed={touring}
              aria-label={touring ? "Pause tour" : "Play tour"}
              title={touring ? "Pause tour" : "Play tour"}
              onClick={() => {
                if (touring) { setTouring(false); return; }
                setTourStep(0);
                setPersona(DEMO_BEATS[0].persona);
                setView("home");
                setKateOpen(false);
                setBlockSheet(null);
                setConfirm(null);
                setEngineOpen(false);
                setTouring(true);
              }}
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
              ["adviser", "Adviser"], // v8-channels
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
        {drawerTab === "adviser" && <div className="hs v8-adviser"><Adviser pointers={pointers} focus={roadFocus ?? channelCardFor(persona, { pointers }) ?? undefined} /></div>}
        {drawerTab === "glass" && <GlassPanel />}
        {drawerTab === "director" && (
          <DirectorPanel pointers={pointers}
            onNudgeSent={() => { setEngineOpen(false); setKateOpen(false); setView("home"); }}
            composing={composing}
            onCompose={() => compose(persona)}
            onRoadTab={() => {
              setKateOpen(false);
              setView("road");
              setEngineOpen(false);
            }}
            onReset={async () => {
              resetPointers(); // v8-channels
              setRoadFocus(undefined);
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
    </NudgeProvider>
    </StoreProvider>
  );
}
