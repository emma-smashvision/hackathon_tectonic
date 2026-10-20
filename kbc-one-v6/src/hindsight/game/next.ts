import { gateRate } from "../engine/gate";
import { getRoad } from "../engine/roads";
import { AVENUE_ORDER } from "./network";

// "Where people went next": the share of drivers who, after finishing a road,
// turned onto another road within three years. Illustrative, synthetic.
// Every share goes through the crowd gate like any other number.

const NEXT: Record<string, { roadId: string; share: number }[]> = {
  "moving-house": [
    { roadId: "first-home", share: 0.18 },
    { roadId: "first-child", share: 0.12 },
    { roadId: "freelance", share: 0.04 },
  ],
  "first-job": [
    { roadId: "moving-house", share: 0.29 },
    { roadId: "first-home", share: 0.34 },
    { roadId: "moving-abroad", share: 0.07 },
    { roadId: "freelance", share: 0.05 },
  ],
  "first-home": [
    { roadId: "first-child", share: 0.41 },
    { roadId: "freelance", share: 0.06 },
    { roadId: "separation", share: 0.04 },
  ],
  "first-child": [
    { roadId: "student-kid", share: 0.22 },
    { roadId: "caring-parent", share: 0.08 },
    { roadId: "separation", share: 0.07 },
  ],
  freelance: [
    { roadId: "first-home", share: 0.21 },
    { roadId: "first-child", share: 0.18 },
  ],
  "moving-abroad": [
    { roadId: "first-home", share: 0.19 },
    { roadId: "first-job", share: 0.11 },
  ],
  "student-kid": [
    { roadId: "caring-parent", share: 0.24 },
    { roadId: "retirement", share: 0.12 },
  ],
  "caring-parent": [
    { roadId: "losing-parent", share: 0.46 },
    { roadId: "retirement", share: 0.17 },
  ],
  retirement: [{ roadId: "caring-parent", share: 0.09 }],
  separation: [
    { roadId: "first-home", share: 0.28 },
    { roadId: "student-kid", share: 0.11 },
  ],
  "losing-parent": [{ roadId: "retirement", share: 0.14 }],
  "job-loss": [
    { roadId: "freelance", share: 0.12 },
    { roadId: "first-job", share: 0.06 },
  ],
};

export function nextRoads(roadId: string) {
  const road = getRoad(roadId);
  if (!road) return [];
  return (NEXT[roadId] ?? [])
    .map((n) => {
      const g = gateRate(`next:${roadId}:${n.roadId}`, Math.round(road.alumni * n.share), road.alumni);
      const hits = Math.round(road.alumni * n.share);
      return { road: getRoad(n.roadId), share: g.value, shown: g.shown && hits >= 500, n: hits };
    })
    // KBC One: only roads you can drive in the city (one avenue per month boundary on the ring)
    .filter((n) => n.road && n.road.status === "live" && AVENUE_ORDER.includes(n.road.id));
}
