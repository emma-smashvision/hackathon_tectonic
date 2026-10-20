import type { Spot } from "./streets";
import { STREET_Z } from "./streets";

export const TOUR_MS = 9000;
export const SIGN_X = 98;
export const LANDMARK_SCALE = 3;

/** One deterministic 9-second pass. The final beat pulls out to the next journey sign. */
export function streetTourFrame(spots: Spot[], elapsedMs: number) {
  const home = spots.filter((s) => s.street === "home").sort((a, b) => a.x - b.x);
  const progress = Math.max(0, Math.min(1, elapsedMs / TOUR_MS));
  const start = (home[0]?.x ?? -60) - 18;
  const x = start + (SIGN_X - start) * progress;
  const closest = home.reduce<Spot | undefined>((best, s) => !best || Math.abs(s.x - x) < Math.abs(best.x - x) ? s : best, undefined);
  const pullOut = Math.max(0, (progress - 0.76) / 0.24);
  const blend = pullOut * pullOut * (3 - 2 * pullOut);
  return {
    progress, done: progress >= 1,
    placeId: progress < 0.88 ? closest?.id ?? null : null,
    pose: { x, z: STREET_Z, heading: Math.PI / 2 },
    camera: { x: (x - 20) * (1 - blend), y: 38 + 67 * blend, z: -2 - 60 * blend },
    look: { x: (x + 8) * (1 - blend), y: 12 - 2 * blend, z: STREET_Z + 25 },
  };
}
