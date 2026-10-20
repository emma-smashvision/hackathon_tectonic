"use client";

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useStore } from "../../hindsight/components/store";
import { PEOPLE } from "../people";
import { journeysFor, type UpcomingJourney } from "./model";
import { roadmapFor } from "../roadmap/model";

interface NudgeState {
  upcoming: UpcomingJourney | null;
  active: UpcomingJourney | null;
  locked: boolean;
  auto: boolean;
  allowCity: boolean;
  setAuto: (value: boolean) => void;
  send: () => void;
  open: () => void;
  unlock: () => void;
  close: () => void;
}
const Context = createContext<NudgeState | null>(null);

export function NudgeProvider({ children, large = false }: { children: ReactNode; large?: boolean }) {
  const s = useStore();
  const p = s.person ? PEOPLE[s.person.key] : undefined;
  const map = p ? roadmapFor(p, { ...s, large }) : null;
  const journeys = p ? journeysFor(p, s.road, s.journey, s.life, s.plan) : [];
  const upcoming = journeys.find((j) => j.id === map?.nextUp?.stopId) ?? null;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [auto, setAutoState] = useState(false);
  const active = journeys.find((j) => j.id === activeId) ?? null;
  const latest = useRef({ upcoming, view: s.view });
  latest.current = { upcoming, view: s.view };
  const send = () => {
    const next = latest.current;
    if (!next.upcoming || next.view === "city") return;
    setActiveId(next.upcoming.id);
    setLocked(true);
    // Browsers without haptics still show the short arrival animation.
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) navigator.vibrate?.([90, 55, 90]);
  };
  useEffect(() => {
    try { setAutoState(sessionStorage.getItem("kbcone.journey-auto") === "1"); } catch { /* optional demo setting */ }
  }, []);
  useEffect(() => {
    if (!auto) return;
    const timer = window.setTimeout(send, 4500);
    return () => window.clearTimeout(timer);
    // Auto runs once after selection, never again when the plan changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, p?.key]);
  return <Context.Provider value={{
    upcoming, active, locked, auto, allowCity: map?.allowCity ?? false,
    setAuto: (value) => { setAutoState(value); try { sessionStorage.setItem("kbcone.journey-auto", value ? "1" : "0"); } catch { /* in memory is enough */ } },
    send, open: () => { if (upcoming) { setActiveId(upcoming.id); setLocked(false); } },
    unlock: () => setLocked(false), close: () => { setActiveId(null); setLocked(false); },
  }}>{children}</Context.Provider>;
}

export function useNudge() {
  const context = useContext(Context);
  if (!context) throw new Error("Journey nudges need NudgeProvider");
  return context;
}
