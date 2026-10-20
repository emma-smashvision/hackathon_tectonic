"use client";

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useStore } from "../../hindsight/components/store";
import { PEOPLE } from "../people";
import type { PersonPointers } from "../crowd";
import { channelCardFor, type ChannelCard } from "./channels";

interface NudgeState {
  upcoming: ChannelCard | null;
  active: ChannelCard | null;
  locked: boolean;
  auto: boolean;

  setAuto: (value: boolean) => void;
  send: () => void;
  open: () => void;
  unlock: () => void;
  close: () => void;
}
const Context = createContext<NudgeState | null>(null);

export function NudgeProvider({ children, pointers }: { children: ReactNode; large?: boolean; pointers?: PersonPointers }) {
  const s = useStore();
  const p = s.person ? PEOPLE[s.person.key] : undefined;
  const card = p ? channelCardFor(p, { pointers }) : null;
  const upcoming = card?.care ? null : card;
  const [active, setActive] = useState<ChannelCard | null>(null);
  const [locked, setLocked] = useState(false);
  const [auto, setAutoState] = useState(false);
  const latest = useRef({ upcoming, view: s.view });
  latest.current = { upcoming, view: s.view };
  const send = () => {
    const next = latest.current;
    if (!next.upcoming || next.view === "city") return;
    setActive(next.upcoming);
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
    upcoming, active, locked, auto,
    setAuto: (value) => { setAutoState(value); try { sessionStorage.setItem("kbcone.journey-auto", value ? "1" : "0"); } catch { /* in memory is enough */ } },
    send, open: () => { if (upcoming) { setActive(upcoming); setLocked(false); } },
    unlock: () => setLocked(false), close: () => { setActive(null); setLocked(false); },
  }}>{children}</Context.Provider>;
}

export function useNudge() {
  const context = useContext(Context);
  if (!context) throw new Error("Journey nudges need NudgeProvider");
  return context;
}
