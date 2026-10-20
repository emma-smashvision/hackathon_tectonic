import { stopEvidenceFor } from "../crowd";
import type { StopEvidence } from "../crowd";

// All world evidence uses the fixed synthetic population, without personal life or consent options.
// Reuse the gated adapter result: it otherwise recalculates each action's conditional outcome.
const cache = new Map<string, StopEvidence | null>();
export function worldEvidence(roadId: string, stopId: string): StopEvidence | null {
  const key = `${roadId}:${stopId}`;
  if (!cache.has(key)) cache.set(key, stopEvidenceFor(roadId, stopId));
  return cache.get(key)!;
}
