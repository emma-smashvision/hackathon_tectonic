"use client";

import { useCallback, useSyncExternalStore } from "react";
import { advanceProgress, emptyProgress, progressKey, restoreProgress } from "./progress";
import type { VillageProgress } from "./types";

const snapshots = new Map<string, VillageProgress>();
const servers = new Map<string, VillageProgress>();
const listeners = new Map<string, Set<() => void>>();
const serverSnapshot = (id: string) => {
  if (!servers.has(id)) servers.set(id, emptyProgress(id));
  return servers.get(id)!;
};
function snapshot(id: string): VillageProgress {
  if (typeof window === "undefined") return serverSnapshot(id);
  if (!snapshots.has(id)) {
    let state = emptyProgress(id);
    try { state = restoreProgress(id, JSON.parse(window.localStorage.getItem(progressKey(id)) ?? "null")); } catch { /* Storage is optional. */ }
    snapshots.set(id, state);
  }
  return snapshots.get(id)!;
}
function publish(id: string, next: VillageProgress) {
  snapshots.set(id, next);
  listeners.get(id)?.forEach(notify => notify());
}
function subscribe(id: string, notify: () => void) {
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id)!.add(notify);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== progressKey(id)) return;
    try { publish(id, restoreProgress(id, JSON.parse(event.newValue ?? "null"))); } catch { publish(id, emptyProgress(id)); }
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.get(id)?.delete(notify); window.removeEventListener("storage", onStorage); };
}

export type VillageProgressStore = VillageProgress & {
  complete: (lessonId: string) => void;
  save: (id: string) => void;
  reset: () => void;
  unlockArea: (areaId: import("../world/types").AreaId, key: import("../world/types").UnlockKey, goal?: import("../world/types").UnlockGoal) => void;
};

export function useVillageProgress(personaId: string): VillageProgressStore {
  const state = useSyncExternalStore(
    useCallback(notify => subscribe(personaId, notify), [personaId]),
    useCallback(() => snapshot(personaId), [personaId]),
    useCallback(() => serverSnapshot(personaId), [personaId]),
  );
  const update = useCallback((action: Parameters<typeof advanceProgress>[1]) => {
    const next = advanceProgress(snapshot(personaId), action);
    try { window.localStorage.setItem(progressKey(personaId), JSON.stringify(next)); } catch { /* Keep the session usable. */ }
    publish(personaId, next);
  }, [personaId]);
  return { ...state,
    complete: useCallback((id: string) => update({ type: "complete", id }), [update]),
    save: useCallback((id: string) => update({ type: "save", id }), [update]),
    unlockArea: useCallback((areaId, key, goal) => update({ type: "unlock", areaId, key, goal }), [update]),
    reset: useCallback(() => update({ type: "reset" }), [update]),
  };
}
