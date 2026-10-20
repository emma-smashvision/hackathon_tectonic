import { EVERYDAY } from "../../hindsight/engine/everyday";
import { EVERYDAY_ONLY, EVERYDAY_ONLY_ID, ROADS } from "../../hindsight/engine/roads";
import type { RoadDef } from "../../hindsight/engine/types";
import { countFor, SYNTHETIC_LABEL, withheld, type CrowdNumber } from "./gate";

export { EVERYDAY_ONLY_ID };
export type RoadGroup = "Home" | "Work" | "Family" | "Abroad" | "Later life" | "Support";
export interface CatalogueRoad {
  id: string;
  name: string;
  tagline: string;
  group: RoadGroup;
  status: "live" | "review";
  months: number;
  care: boolean;
  hue: string;
  driverCount: CrowdNumber;
  currentCount: CrowdNumber;
  synthetic: true;
  disclosure: string;
}
const groups: Record<RoadDef["family"], RoadGroup> = {
  home: "Home", work: "Work", family: "Family", abroad: "Abroad", later: "Later life", care: "Support",
};
/** Internal adapter: Everyday uses its calendar evidence; never a fabricated life road. */
export function engineRoad(id: string): RoadDef | undefined {
  if (id === EVERYDAY_ONLY_ID) return EVERYDAY;
  const road = ROADS.find((r) => r.id === id);
  return road?.id === "caring-parent" ? { ...road, care: true } : road;
}
export const catalogue: readonly CatalogueRoad[] = Object.freeze([EVERYDAY_ONLY, ...ROADS].map((road) => {
  const care = road.care || road.id === "caring-parent";
  const review = road.status === "pending";
  return Object.freeze({
    id: road.id, name: road.id === EVERYDAY_ONLY_ID ? "Everyday" : road.name,
    tagline: road.tagline, group: care ? "Support" : groups[road.family],
    status: review ? "review" as const : "live" as const,
    months: road.id === EVERYDAY_ONLY_ID ? 12 : road.months, care, hue: road.hue,
    driverCount: review ? withheld("Under review: no published insights.") : countFor(`${road.id}:alumni`, road.alumni),
    currentCount: review ? withheld("Under review: no published insights.") : countFor(`${road.id}:current`, road.current),
    synthetic: true as const, disclosure: SYNTHETIC_LABEL,
  });
}));
export const catalogueRoad = (id: string) => catalogue.find((road) => road.id === id);
