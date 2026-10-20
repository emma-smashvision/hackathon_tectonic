import { lessonsFor } from "../learning/lessons";
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
  return { personaId,
    done: [...new Set(Array.isArray(value.done) ? value.done.filter(id => validDone.has(id)) : [])],
    saved: [...new Set(Array.isArray(value.saved) ? value.saved.filter(id => validSaved.has(id)) : [])],
  };
}

export function advanceProgress(state: VillageProgress, action: { type: "complete" | "save"; id: string } | { type: "reset" }): VillageProgress {
  if (action.type === "reset") return emptyProgress(state.personaId);
  const field = action.type === "complete" ? "done" : "saved";
  return restoreProgress(state.personaId, { ...state, [field]: [...state[field], action.id] });
}
