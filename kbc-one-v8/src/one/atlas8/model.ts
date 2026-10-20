/** UI adapter over the shared v8 catalogue, matcher, pointers and publication gate. */
import { catalogue, catalogueFor, EVERYDAY_ONLY_ID, findRoad, pointersFor } from "../crowd";
import type { PersonPointers, RoadStage as CrowdRoadStage } from "../crowd";
import { engineRoad } from "../crowd/catalogue";
import { MONTH_LONG } from "../../hindsight/engine/everyday";
import type { PersonRoad } from "../people";

export const GROUPS = ["Home", "Work", "Family", "Abroad", "Later life", "Support", "Everyday"] as const;
export type RoadGroup = typeof GROUPS[number];
export type OpenRoadMode = "exploring" | "confirmed";
/** date is the event date chosen by the person, never an inferred consent date. */
export interface RoadStage extends CrowdRoadStage { id: string; month: number; confirmedAt?: string }
export const atlasCatalogue = catalogue.map(road => ({
  id: road.id, name: road.name,
  group: road.id === EVERYDAY_ONLY_ID ? "Everyday" as RoadGroup : road.group,
  hue: road.hue, care: road.care, published: road.status === "live",
  count: road.driverCount,
  // Stage labels/offsets are catalogue configuration, not generated crowd evidence.
  stages: (road.id === EVERYDAY_ONLY_ID
    ? MONTH_LONG.map((label, i) => ({ id: `calendar-${i + 1}`, month: i + 1, label, date: null }))
    : [
      { id: "before", month: 0, label: "Before this starts", date: null },
      { id: "start", month: 0, label: road.id === "first-home" ? "At the start · after the keys" : "At the start", date: null },
      ...(engineRoad(road.id)?.stops ?? []).map(s => ({ id: s.id, month: s.month, label: s.title, date: null })),
    ]) as RoadStage[],
}));
export type AtlasRoad = typeof atlasCatalogue[number];
export function roadBadge(road: AtlasRoad, person: PersonRoad, pointers?: PersonPointers) {
  return catalogueFor(pointers ?? pointersFor(person)).find(r => r.id === road.id)?.badge ?? null;
}
export function matchRoads(text: string) {
  const result = findRoad(text);
  const ranked = result.choices.map(choice => atlasCatalogue.find(road => road.id === choice.roadId)).filter((road): road is AtlasRoad => Boolean(road));
  return { matches: ranked.filter(r => r.published), nearby: ranked.length ? ranked : atlasCatalogue.filter(r => ["moving-house", "first-home", EVERYDAY_ONLY_ID].includes(r.id)) };
}
