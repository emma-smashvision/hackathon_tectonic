"use client";
import { useCallback } from "react";
import { useVillageProgress } from "../village/useVillageProgress";
import { stormsFor } from "./model";
import type { WorldProgress } from "./types";
export type WorldProgressStore = WorldProgress & {
  complete: (lessonId: string) => void; save: (actionId: string) => void; reset: () => void;
  unlockArea: (areaId: import("./types").AreaId, key: import("./types").UnlockKey, goal?: import("./types").UnlockGoal) => void;
  prepareStorm: (stormId: string) => void;
};
/** The existing shared store remains the sole authority for lessons and saved steps. */
export function useWorldProgress(personaId: string): WorldProgressStore {
  const store = useVillageProgress(personaId);
  const prepareStorm = useCallback((id: string) => {
    const storm = stormsFor(personaId, store).find(s => s.id === id);
    if (storm?.saveId && store.done.includes(storm.lessonId)) store.save(storm.saveId);
  }, [personaId, store]);
  return { ...store, prepareStorm };
}
