"use client";

import { useSyncExternalStore } from "react";
import { chooseBranch, completeNode, completeNow, type FounderRoad, founderRoadFor } from "./founder";

// Demo progress on a founder road, shared by the road tab card and the business view.
// It lives in memory: a reload starts the demo again.
interface Entry { road: FounderRoad; chosen?: "a" | "b" }
let state: Record<string, Entry> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

const keyOf = (personKey: string | undefined, profileId: string) => `${personKey ?? "guest"}:${profileId}`;
function entry(personKey: string | undefined, profileId: string): Entry | undefined {
  const key = keyOf(personKey, profileId);
  if (!state[key]) {
    const road = founderRoadFor(profileId, personKey);
    if (!road) return undefined;
    state = { ...state, [key]: { road } };
  }
  return state[key];
}
function update(personKey: string | undefined, profileId: string, fn: (e: Entry) => Entry) {
  const current = entry(personKey, profileId);
  if (!current) return;
  state = { ...state, [keyOf(personKey, profileId)]: fn(current) };
  emit();
}

export function useFounderRoad(personKey: string | undefined, profileId: string | undefined) {
  const snapshot = useSyncExternalStore(subscribe, () => (profileId ? entry(personKey, profileId) : undefined), () => (profileId ? entry(personKey, profileId) : undefined));
  return {
    road: snapshot?.road,
    chosen: snapshot?.chosen,
    choose: (side: "a" | "b") => profileId && update(personKey, profileId, (e) => ({ road: chooseBranch(e.road, side), chosen: side })),
    complete: () => profileId && update(personKey, profileId, (e) => ({ ...e, road: completeNow(e.road, e.chosen) })),
    completeStep: (id: string) => profileId && update(personKey, profileId, (e) => ({ ...e, road: completeNode(e.road, id, e.chosen) })),
  };
}
