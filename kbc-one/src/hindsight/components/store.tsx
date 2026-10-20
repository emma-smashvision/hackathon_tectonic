"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { type Journey, newJourney, passStops, type Postcard } from "../engine/game";
import type { GateDecision } from "../engine/gate";
import { buildRecap, computeLife, type LifeState, type MonthRecap } from "../engine/life";
import { EVERYDAY_ONLY, ROADS } from "../engine/roads";
import type { LifeDef } from "../engine/lives";
import type { Persona, RoadDef } from "../engine/types";

export type View = "city" | "phone" | "atlas" | "adviser";
export type Tab = "today" | "route" | "road" | "notes";
export type Screen =
  | { name: "today" }
  | { name: "route" }
  | { name: "road" }
  | { name: "stop"; stopId: string; from?: Tab }
  | { name: "fork" }
  | { name: "notes" }
  | { name: "passport" }
  | { name: "lock" };

export interface AccessEntry {
  at: string;
  who: string;
  reason: string;
  roadId: string;
}

export interface PostedNote {
  id: string;
  roadId: string;
  stopId: string | null;
  text: string;
  status: "review" | "live" | "rejected";
  createdAt: number;
}

interface Store {
  roads: RoadDef[];
  liveRoads: RoadDef[];
  road: RoadDef;
  journey: Journey;
  view: View;
  screen: Screen;
  showGate: boolean;
  decisions: GateDecision[];
  access: AccessEntry[];
  myNotes: PostedNote[];
  toast: Postcard | null;
  driving: boolean;
  setView: (v: View) => void;
  go: (s: Screen) => void;
  pickRoad: (id: string) => void;
  setMonth: (m: number) => void;
  drive: (on: boolean) => void;
  toggleAction: (stopId: string, actionId: string) => void;
  chooseFork: (forkId: string, branchId: string) => void;
  optInCare: () => void;
  resetJourney: (asNewDriver?: boolean) => void;
  setShowGate: (v: boolean) => void;
  report: (d: GateDecision[]) => void;
  logAccess: (e: Omit<AccessEntry, "at">) => void;
  addMyNote: (n: PostedNote) => void;
  updateMyNote: (id: string, patch: Partial<PostedNote>) => void;
  approveRoad: (id: string) => void;
  dismissToast: () => void;
  newDriver: boolean;
  /** your money, replayed from the journey: the car, the boot, the tyres, the trip computer */
  life: LifeState;
  /** salary day: close this month, drive one month forward, get a recap */
  advanceMonth: () => MonthRecap | null;
  recap: MonthRecap | null;
  dismissRecap: () => void;
  setGoal: (goalId: string, patch: { monthly?: number; auto?: boolean }) => void;
  checkCover: (coverId: string) => void;
  /** hand-off to the city: drive this road from this month */
  pendingDrive: { roadId: string; month: number; mine: boolean } | null;
  testDrive: (roadId: string, month?: number) => void;
  takePendingDrive: () => { roadId: string; month: number; mine: boolean } | null;
  journeyFor: (roadId: string) => Journey;
  optInCareFor: (roadId: string) => void;
  explored: string[];
  markExplored: (roadId: string) => void;
  stamps: { roadId: string; at: number }[];
  addStamp: (roadId: string) => void;
  /** KBC One: whose road this is */
  person: PersonRoadInput | null;
  /** KBC One: the driving world is a preview. Leaving asks whether to keep what you prepared. */
  cityDirty: boolean;
  exitAsk: boolean;
  requestExit: () => void;
  /** keep = "Make this my plan": keep tips, goal paces and crossroad choices (time does not move) */
  exitCity: (keep: boolean) => void;
  cancelExit: () => void;
}

/** KBC One: the person this store belongs to (see src/one/people.ts). */
export interface PersonRoadInput {
  key: string;
  roadId: string;
  persona: Persona;
  household: LifeDef;
  /** Large & simple people get the road as plain words, never the game */
  noGame?: boolean;
}

const Ctx = createContext<Store | null>(null);
const STORAGE_PREFIX = "kbcone.v5.road.";

function load(key: string): { journeys?: Record<string, Journey>; approved?: string[]; explored?: string[]; stamps?: { roadId: string; at: number }[] } {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function StoreProvider({ children, person = null }: { children: ReactNode; person?: PersonRoadInput | null }) {
  const [approved, setApproved] = useState<string[]>([]);
  const homeRoadId = person?.roadId ?? "first-home";
  // KBC One: the person's own road carries the person (name, month, passport); the household comes from the person.
  const roads = useMemo(
    () =>
      ROADS.map((r) => {
        const live = approved.includes(r.id) ? { ...r, status: "live" as const } : r;
        return person && r.id === person.roadId ? { ...live, persona: person.persona } : live;
      }),
    [approved, person],
  );
  const ownRoad = useMemo<RoadDef | null>(
    () => (person && person.roadId === EVERYDAY_ONLY.id ? { ...EVERYDAY_ONLY, persona: person.persona } : null),
    [person],
  );
  const liveRoads = useMemo(() => roads.filter((r) => r.status === "live"), [roads]);
  const [roadId, setRoadId] = useState(homeRoadId);
  const [journeys, setJourneys] = useState<Record<string, Journey>>({});
  const [view, setView] = useState<View>("phone");
  const [explored, setExplored] = useState<string[]>([]);
  const [stamps, setStamps] = useState<{ roadId: string; at: number }[]>([]);
  const [screen, setScreen] = useState<Screen>({ name: "today" });
  const [showGate, setShowGate] = useState(false);
  const [decisions, setDecisions] = useState<GateDecision[]>([]);
  const [access, setAccess] = useState<AccessEntry[]>([]);
  const [myNotes, setMyNotes] = useState<PostedNote[]>([]);
  const [toast, setToast] = useState<Postcard | null>(null);
  const [driving, setDriving] = useState(false);
  const [newDriver, setNewDriver] = useState(false);
  const [recap, setRecap] = useState<MonthRecap | null>(null);
  const [pendingDrive, setPendingDrive] = useState<Store["pendingDrive"]>(null);
  const pendingRef = useRef<Store["pendingDrive"]>(null);
  pendingRef.current = pendingDrive;
  const hydrated = useRef(false);

  const storageKey = person?.key ?? "demo";
  useEffect(() => {
    const saved = load(storageKey);
    if (saved.journeys) setJourneys(saved.journeys);
    if (saved.approved) setApproved(saved.approved);
    if (saved.explored) setExplored(saved.explored);
    if (saved.stamps) setStamps(saved.stamps);
    hydrated.current = true;
    // biome-ignore lint/correctness/useExhaustiveDependencies: load once per person (the provider is keyed by person)
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify({ journeys, approved, explored, stamps }));
    } catch {
      /* storage unavailable: the demo still works in memory */
    }
  }, [journeys, approved, explored, stamps, storageKey]);

  const road = (ownRoad && roadId === ownRoad.id ? ownRoad : roads.find((r) => r.id === roadId)) ?? ownRoad ?? roads[0];
  const journey = useMemo(() => journeys[road.id] ?? newJourney(road), [journeys, road]);
  const householdFor = useCallback((r: RoadDef) => (person && r.id === person.roadId ? person.household : undefined), [person]);
  const life = useMemo(() => computeLife(road, journey, householdFor(road)), [road, journey, householdFor]);

  // ---------- KBC One: the driving world is a preview ----------
  const snapshot = useRef<Record<string, Journey> | null>(null);
  const [exitAsk, setExitAsk] = useState(false);
  const cityDirty = view === "city" && snapshot.current !== null && JSON.stringify(snapshot.current) !== JSON.stringify(journeys);
  const enterView = (v: View) => {
    if (v === "city" && view !== "city") {
      snapshot.current = journeys;
      setExitAsk(false);
    }
    if (v !== "city" && view === "city") {
      // leaving the driving world: ask first when something changed
      if (cityDirty) {
        setExitAsk(true);
        return;
      }
      snapshot.current = null;
      setRoadId(homeRoadId);
    }
    setView(v);
  };
  const exitCity = (keep: boolean) => {
    const before = snapshot.current;
    if (before) {
      if (keep) {
        // keep the plan, not the drive: time only moves on salary day
        setJourneys((all) => {
          const out: Record<string, Journey> = {};
          for (const [id, j] of Object.entries(all)) {
            const prev = before[id];
            if (!prev) {
              out[id] = { ...j, month: j.anchor ?? j.month, postcards: [] };
              continue;
            }
            const doneAt = { ...(j.doneAt ?? {}) };
            for (const k of Object.keys(doneAt)) if (!(prev.doneAt ?? {})[k]) doneAt[k] = prev.month;
            out[id] = { ...j, month: prev.month, postcards: prev.postcards, doneAt };
          }
          return out;
        });
      } else setJourneys(before);
    }
    snapshot.current = null;
    setExitAsk(false);
    setDriving(false);
    setToast(null);
    setRoadId(homeRoadId);
    setView("phone");
  };

  const update = useCallback(
    (fn: (j: Journey) => Journey) => {
      setJourneys((all) => {
        const current = all[road.id] ?? newJourney(road);
        return { ...all, [road.id]: fn(current) };
      });
    },
    [road],
  );

  const setMonth = useCallback(
    (m: number) => {
      const target = Math.max(0, Math.min(road.months, m));
      update((j) => {
        if (target <= j.month) return { ...j, month: target };
        const cards = road.care && !j.careOptIn ? [] : passStops(road, j, target);
        if (cards.length && !road.care) setToast(cards[cards.length - 1]);
        return { ...j, month: target, postcards: [...j.postcards, ...cards] };
      });
    },
    [road, update],
  );

  const monthRef = useRef(journey.month);
  monthRef.current = journey.month;
  useEffect(() => {
    if (!driving) return;
    const t = window.setInterval(() => {
      if (monthRef.current >= road.months) {
        setDriving(false);
        return;
      }
      setMonth(monthRef.current + 1);
    }, 900);
    return () => window.clearInterval(t);
  }, [driving, road.months, setMonth]);

  const value: Store = {
    roads,
    liveRoads,
    road,
    journey,
    view,
    screen,
    showGate,
    decisions,
    access,
    myNotes,
    toast,
    driving,
    newDriver,
    setView: enterView,
    go: setScreen,
    pickRoad: (id) => {
      // KBC One: a person's road is part of the person; other roads are test drives only
      if (person && id !== person.roadId) return;
      setRoadId(id);
      setRecap(null);
      setScreen({ name: "today" });
      setDriving(false);
      setToast(null);
      setNewDriver(false);
    },
    setMonth,
    drive: setDriving,
    toggleAction: (stopId, actionId) =>
      update((j) => {
        const cur = j.done[stopId] ?? [];
        const on = !cur.includes(actionId);
        const next = on ? [...cur, actionId] : cur.filter((a) => a !== actionId);
        const doneAt = { ...(j.doneAt ?? {}) };
        if (on) doneAt[`${stopId}|${actionId}`] = j.month;
        else delete doneAt[`${stopId}|${actionId}`];
        return { ...j, done: { ...j.done, [stopId]: next }, doneAt };
      }),
    chooseFork: (forkId, branchId) => update((j) => ({ ...j, forkChoice: { ...j.forkChoice, [forkId]: branchId } })),
    optInCare: () => update((j) => ({ ...j, careOptIn: true })),
    resetJourney: (asNew) => {
      setDriving(false);
      setToast(null);
      setRecap(null);
      setNewDriver(!!asNew);
      setScreen({ name: "today" });
      setJourneys((all) => ({ ...all, [road.id]: { ...newJourney(road), month: asNew ? 0 : road.persona.month, anchor: asNew ? 0 : road.persona.month } }));
    },
    life,
    advanceMonth: () => {
      if (journey.month >= road.months) return null;
      const next = journey.month + 1;
      const cards = road.care && !journey.careOptIn ? [] : passStops(road, journey, next);
      const after: Journey = { ...journey, month: next, postcards: [...journey.postcards, ...cards] };
      const r = buildRecap(road, life, computeLife(road, after, householdFor(road)), next >= road.months);
      // salary day is real time: it is kept even when you leave the driving world without a plan
      if (snapshot.current) snapshot.current = { ...snapshot.current, [road.id]: after };
      setDriving(false);
      setToast(null);
      setJourneys((all) => ({ ...all, [road.id]: after }));
      setRecap(r);
      return r;
    },
    recap,
    dismissRecap: () => setRecap(null),
    setGoal: (goalId, patch) =>
      update((j) => ({ ...j, goals: { ...(j.goals ?? {}), [goalId]: { ...(j.goals?.[goalId] ?? {}), ...patch } } })),
    checkCover: (id) =>
      update((j) => {
        const cur = j.cover ?? [];
        return { ...j, cover: cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id] };
      }),
    pendingDrive,
    testDrive: (id, month = 0) => {
      setPendingDrive({ roadId: id, month, mine: id === road.id });
      enterView("city");
    },
    takePendingDrive: () => {
      const p = pendingRef.current;
      if (p) setPendingDrive(null);
      return p;
    },
    setShowGate,
    report: setDecisions,
    logAccess: (e) =>
      setAccess((a) => [
        { ...e, at: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) },
        ...a,
      ]),
    addMyNote: (n) => setMyNotes((all) => [n, ...all]),
    updateMyNote: (id, patch) => setMyNotes((all) => all.map((n) => (n.id === id ? { ...n, ...patch } : n))),
    approveRoad: (id) => setApproved((a) => (a.includes(id) ? a : [...a, id])),
    dismissToast: () => setToast(null),
    journeyFor: (id) => {
      const r = (ownRoad && id === ownRoad.id ? ownRoad : roads.find((x) => x.id === id)) ?? road;
      return journeys[id] ?? newJourney(r);
    },
    optInCareFor: (id) =>
      setJourneys((all) => {
        const r = roads.find((x) => x.id === id);
        if (!r) return all;
        const cur = all[id] ?? newJourney(r);
        return { ...all, [id]: { ...cur, careOptIn: true } };
      }),
    explored,
    markExplored: (id) => setExplored((e) => (e.includes(id) ? e : [...e, id])),
    stamps,
    addStamp: (id) => setStamps((s) => (s.some((x) => x.roadId === id) ? s : [...s, { roadId: id, at: Date.now() }])),
    person,
    cityDirty,
    exitAsk,
    requestExit: () => enterView("phone"),
    exitCity,
    cancelExit: () => setExitAsk(false),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

/** Screens call this so the inspector can show every crowd-gate decision behind what's on screen. */
export function useReport(decisions: GateDecision[]) {
  const { report } = useStore();
  const key = decisions.map((d) => `${d.label}:${d.shown}`).join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: key captures the content
  useEffect(() => {
    report(decisions);
  }, [key]);
}
