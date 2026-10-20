"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { type Journey, newJourney, passStops, type Postcard } from "../engine/game";
import { euro } from "../engine/format";
import type { GateDecision } from "../engine/gate";
import { buildRecap, computeLife, type LifeState, type MonthRecap } from "../engine/life";
import {
  type Advisor,
  type PlanItem,
  planItemFrom,
  type Slot,
  specForGoal,
  specForTip,
  type TripEntry,
  type TripPick,
  todayWhen,
} from "../engine/plan";
import { EVERYDAY_ONLY, ROADS } from "../engine/roads";
import type { LifeDef } from "../engine/lives";
import type { Persona, RoadDef } from "../engine/types";
import type { WorldDef } from "../engine/world";

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
  /** From info to action: your plan (confirmed follow-ups), kept per person */
  plan: PlanItem[];
  /** picked up on this drive; nothing happens until the debrief */
  glovebox: TripPick[];
  /** stops and places you looked at on this drive */
  trip: TripEntry[];
  logVisit: (e: TripEntry) => void;
  /** a follow-up from a place in your world (house, garage, a tower on Market Mile) */
  pickUp: (p: TripPick) => void;
  dropPick: (id: string) => void;
  /** the debrief's answer: confirmed picks become plan items, the rest is undone */
  finishTrip: (confirmed: { pick: TripPick; slot?: Slot }[]) => void;
  bookSlot: (itemId: string, slot: Slot) => void;
  removePlanItem: (itemId: string) => void;
  /** add a plan item straight from the app (no drive) */
  addPlanItem: (pick: TripPick, slot?: Slot) => void;
  lifeForRoad: (roadId: string) => LifeState;
  advisor?: Advisor;
  /** KBC One: your own world inside the ring (home, car, vault, pension, Market Mile); null = no streets */
  world: WorldDef | null;
  /** for the stage: every amount in your world shows as "€ •••" */
  hideAmounts: boolean;
  setHideAmounts: (v: boolean) => void;
}

/** KBC One: the person this store belongs to (see src/one/people.ts). */
export interface PersonRoadInput {
  key: string;
  roadId: string;
  persona: Persona;
  household: LifeDef;
  /** Large & simple people get the road as plain words, never the game */
  noGame?: boolean;
  /** the customer's own advisor, for booking a talk */
  advisor?: Advisor;
  /** what the customer owns, rents, insures, saves and invests: their streets in the city */
  world?: WorldDef;
}

const Ctx = createContext<Store | null>(null);
const STORAGE_PREFIX = "kbcone.v5.road.";

function load(key: string): {
  journeys?: Record<string, Journey>;
  approved?: string[];
  explored?: string[];
  stamps?: { roadId: string; at: number }[];
  plan?: PlanItem[];
} {
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
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [glovebox, setGlovebox] = useState<TripPick[]>([]);
  const [trip, setTrip] = useState<TripEntry[]>([]);
  const pendingRef = useRef<Store["pendingDrive"]>(null);
  pendingRef.current = pendingDrive;
  // v7-nudge: persist only after the loaded state reaches a render (also in Strict Mode).
  const [hydrated, setHydrated] = useState(false);
  const [hideAmounts, setHideAmountsState] = useState(false);
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("kbcone.hide") === "1") setHideAmountsState(true);
    } catch {
      /* a convenience only */
    }
  }, []);

  const storageKey = person?.key ?? "demo";
  useEffect(() => {
    const saved = load(storageKey);
    if (saved.journeys) setJourneys(saved.journeys);
    if (saved.approved) setApproved(saved.approved);
    if (saved.explored) setExplored(saved.explored);
    if (saved.stamps) setStamps(saved.stamps);
    if (saved.plan) setPlan(saved.plan);
    setHydrated(true);
    // biome-ignore lint/correctness/useExhaustiveDependencies: load once per person (the provider is keyed by person)
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify({ journeys, approved, explored, stamps, plan }));
    } catch {
      /* storage unavailable: the demo still works in memory */
    }
  }, [journeys, approved, explored, stamps, plan, storageKey, hydrated]);

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
      setGlovebox([]);
      setTrip([]);
    }
    if (v !== "city" && view === "city") {
      // leaving the driving world: the debrief, when you looked at or picked up something
      if (cityDirty || glovebox.length > 0 || trip.length > 0) {
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
    setGlovebox([]);
    setTrip([]);
  };

  /** Keep the plan, undo what wasn't confirmed, and turn confirmed picks into plan items. */
  const finishTrip = (confirmed: { pick: TripPick; slot?: Slot }[]) => {
    const before = snapshot.current;
    const ok = new Set(confirmed.map((c) => c.pick.id));
    const dropped = glovebox.filter((p) => !ok.has(p.id));
    if (before) {
      setJourneys((all) => {
        const out: Record<string, Journey> = {};
        for (const [id, j0] of Object.entries(all)) {
          let j = j0;
          // unconfirmed picks on this road are undone
          for (const p of dropped) {
            if (p.source.roadId !== id) continue;
            if ((p.source.scope === "road" || p.source.scope === "everyday") && p.source.actionId) {
              const cur = j.done[p.source.key] ?? [];
              const doneAt = { ...(j.doneAt ?? {}) };
              delete doneAt[`${p.source.key}|${p.source.actionId}`];
              j = { ...j, done: { ...j.done, [p.source.key]: cur.filter((a) => a !== p.source.actionId) }, doneAt };
            }
            if (p.source.scope === "goal") {
              const prevGoal = before[id]?.goals?.[p.source.key];
              const goals = { ...(j.goals ?? {}) };
              if (prevGoal) goals[p.source.key] = prevGoal;
              else delete goals[p.source.key];
              j = { ...j, goals };
            }
            if (p.source.scope === "cover") j = { ...j, cover: before[id]?.cover ?? [] };
          }
          const prev = before[id];
          if (!prev) {
            out[id] = { ...j, month: j.anchor ?? j.month, postcards: [] };
            continue;
          }
          // keep the plan, not the drive: time only moves on salary day
          const doneAt = { ...(j.doneAt ?? {}) };
          for (const k of Object.keys(doneAt)) if (!(prev.doneAt ?? {})[k]) doneAt[k] = prev.month;
          out[id] = { ...j, month: prev.month, postcards: prev.postcards, doneAt };
        }
        return out;
      });
    }
    const today = todayWhen(life);
    if (confirmed.length)
      setPlan((all) => [
        ...all.filter((x) => !confirmed.some((c) => c.pick.id === x.id)),
        ...confirmed.map((c) => planItemFrom(c.pick, today, "drive", c.slot)),
      ]);
    snapshot.current = null;
    setExitAsk(false);
    setDriving(false);
    setToast(null);
    setRoadId(homeRoadId);
    setView("phone");
    setGlovebox([]);
    setTrip([]);
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
    toggleAction: (stopId, actionId) => {
      const on = !(journey.done[stopId] ?? []).includes(actionId);
      update((j) => {
        const cur = j.done[stopId] ?? [];
        const next = on ? [...new Set([...cur, actionId])] : cur.filter((a) => a !== actionId);
        const doneAt = { ...(j.doneAt ?? {}) };
        if (on) doneAt[`${stopId}|${actionId}`] = j.month;
        else delete doneAt[`${stopId}|${actionId}`];
        return { ...j, done: { ...j.done, [stopId]: next }, doneAt };
      });
      // from info to action: in the driving world it goes into the glovebox; in the app it's on your plan
      const id = `tip:${road.id}:${stopId}:${actionId}`;
      const spec = on ? specForTip({ road, life, advisor: person?.advisor }, stopId, actionId) : null;
      const pick: TripPick | null = spec
        ? { id, source: { scope: stopId.startsWith("ev:") ? "everyday" : "road", roadId: road.id, key: stopId, actionId }, spec }
        : null;
      if (view === "city") setGlovebox((g) => (pick ? [...g.filter((x) => x.id !== id), pick] : g.filter((x) => x.id !== id)));
      else setPlan((all) => (pick ? [...all.filter((x) => x.id !== id), planItemFrom(pick, todayWhen(life), "app")] : all.filter((x) => x.id !== id)));
    },
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
    setGoal: (goalId, patch) => {
      update((j) => ({ ...j, goals: { ...(j.goals ?? {}), [goalId]: { ...(j.goals?.[goalId] ?? {}), ...patch } } }));
      const g = life.goals.find((x) => x.id === goalId);
      if (!g) return;
      const monthly = patch.monthly ?? g.monthly;
      const id = `goal:${road.id}:${goalId}`;
      const unchanged = monthly === g.defaultMonthly && patch.auto === undefined;
      const pick: TripPick = {
        id,
        source: { scope: "goal", roadId: road.id, key: goalId },
        spec:
          patch.auto !== undefined
            ? {
                kind: "setup",
                title: patch.auto ? `Automate ${monthlyLabel(monthly)} to "${g.label}" on the 1st` : `Stop the automatic transfer to "${g.label}"`,
                detail: patch.auto ? "A standing order on the 1st. Drivers who automated it got there more often." : "You'll move money to this goal by hand.",
                product: "Standing order",
                monthly,
              }
            : specForGoal(g.label, monthly, g.defaultMonthly),
      };
      if (view === "city") setGlovebox((all) => (unchanged ? all.filter((x) => x.id !== id) : [...all.filter((x) => x.id !== id), pick]));
      else setPlan((all) => (unchanged ? all.filter((x) => x.id !== id) : [...all.filter((x) => x.id !== id), planItemFrom(pick, todayWhen(life), "app")]));
    },
    checkCover: (id) => {
      const on = !(journey.cover ?? []).includes(id);
      update((j) => {
        const cur = j.cover ?? [];
        return { ...j, cover: cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id] };
      });
      const c = life.def.cover.find((x) => x.id === id);
      const pid = `cover:${road.id}:${id}`;
      const pick: TripPick | null =
        on && c
          ? {
              id: pid,
              source: { scope: "cover", roadId: road.id, key: id },
              spec: { kind: "check", title: `Checked your ${c.label.toLowerCase()} cover`, detail: c.note },
            }
          : null;
      if (view === "city") setGlovebox((g) => (pick ? [...g.filter((x) => x.id !== pid), pick] : g.filter((x) => x.id !== pid)));
      else setPlan((all) => (pick ? [...all.filter((x) => x.id !== pid), planItemFrom(pick, todayWhen(life), "app")] : all.filter((x) => x.id !== pid)));
    },
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
    plan,
    glovebox,
    trip,
    logVisit: (e) => {
      if (view !== "city") return;
      setTrip((t) => (t.some((x) => x.key === e.key && x.roadId === e.roadId) ? t : [...t, e]));
    },
    pickUp: (p) => {
      if (view === "city") setGlovebox((g) => [...g.filter((x) => x.id !== p.id), p]);
      else setPlan((all) => [...all.filter((x) => x.id !== p.id), planItemFrom(p, todayWhen(life), "app")]);
    },
    dropPick: (id) => {
      setGlovebox((g) => g.filter((x) => x.id !== id));
      setPlan((all) => all.filter((x) => x.id !== id || x.from !== "app" || view === "city"));
    },
    finishTrip,
    bookSlot: (itemId, slot) =>
      setPlan((all) => all.map((x) => (x.id === itemId ? { ...x, status: "booked", when: slot.when, with: slot.with } : x))),
    removePlanItem: (itemId) => {
      const item = plan.find((x) => x.id === itemId);
      setPlan((all) => all.filter((x) => x.id !== itemId));
      // undoing a tip on your own road also undoes the pot behind it
      if (item?.source.actionId && item.source.roadId === road.id && (journey.done[item.source.key] ?? []).includes(item.source.actionId)) {
        const { key, actionId } = item.source;
        update((j) => {
          const doneAt = { ...(j.doneAt ?? {}) };
          delete doneAt[`${key}|${actionId}`];
          return { ...j, done: { ...j.done, [key]: (j.done[key] ?? []).filter((a) => a !== actionId) }, doneAt };
        });
      }
    },
    addPlanItem: (pick, slot) => setPlan((all) => [...all.filter((x) => x.id !== pick.id), planItemFrom(pick, todayWhen(life), "app", slot)]),
    lifeForRoad: (id) => {
      const r = (ownRoad && id === ownRoad.id ? ownRoad : roads.find((x) => x.id === id)) ?? road;
      return computeLife(r, journeys[id] ?? newJourney(r), householdFor(r));
    },
    advisor: person?.advisor,
    world: person?.world ?? null,
    hideAmounts,
    setHideAmounts: (v) => {
      setHideAmountsState(v);
      try {
        window.sessionStorage.setItem("kbcone.hide", v ? "1" : "0");
      } catch {
        /* a convenience only */
      }
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const monthlyLabel = (v: number) => euro(v);

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
