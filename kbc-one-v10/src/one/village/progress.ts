// v11-wa: accept world blueprints in the same persisted store as LessonCard.
import { worldLessonsFor as lessonsFor } from "../world/quests";
import { restoreUnlocks, unlockArea } from "../world/unlocks";
import type { AreaId, UnlockKey, UnlockGoal } from "../world/types";
import type { VillageProgress } from "./types";

export const progressKey = (personaId: string) => `kbcone.v9.village:${personaId}`;
export const emptyProgress = (personaId: string): VillageProgress => ({ personaId, done: [], saved: [] });

/** Local storage is untrusted. Ignore unknown, duplicate and cross-persona identities. */
export function restoreProgress(personaId: string, raw: unknown): VillageProgress {
  const empty = emptyProgress(personaId);
  if (!raw || typeof raw !== "object" || (raw as VillageProgress).personaId !== personaId) return empty;
  const value = raw as VillageProgress;
  const lessons = lessonsFor(personaId);
  const validDone = new Set(lessons.map(l => l.id));
  const validSaved = new Set(lessons.flatMap(l => l.save ? [l.save.id] : []));
  const unlocks = restoreUnlocks(personaId, value.unlocks);
  return { personaId, ...(unlocks.length ? { unlocks } : {}),
    done: [...new Set(Array.isArray(value.done) ? value.done.filter(id => validDone.has(id)) : [])],
    saved: [...new Set(Array.isArray(value.saved) ? value.saved.filter(id => validSaved.has(id)) : [])],
  };
}

export function advanceProgress(state: VillageProgress, action: { type: "complete" | "save"; id: string } | { type: "reset" } | { type: "unlock"; areaId: AreaId; key: UnlockKey; goal?: UnlockGoal }): VillageProgress {
  if (action.type === "reset") return emptyProgress(state.personaId);
  if (action.type === "unlock") return restoreProgress(state.personaId, unlockArea(state, action.areaId, action.key, action.goal));
  const field = action.type === "complete" ? "done" : "saved";
  return restoreProgress(state.personaId, { ...state, [field]: [...state[field], action.id] });
}
