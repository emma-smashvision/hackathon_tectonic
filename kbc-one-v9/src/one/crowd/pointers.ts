import { MONTH_LONG, TODAY } from "../../hindsight/engine/everyday";
import { PEOPLE, type PersonRoad } from "../people";
import { catalogue, catalogueRoad, EVERYDAY_ONLY_ID } from "./catalogue";

export type PersonInput = PersonRoad | string;
export type Provenance = "told" | "suggested" | "exploring";
export interface RoadStage {
  /** Relative life-road month, or calendar month 1..12 on Everyday. Null = unknown. */
  month: number | null;
  label: string;
  /** Event date, not the date on which consent was given. Never guessed. */
  date: string | null;
}
export interface RoadPointer {
  roadId: string;
  provenance: Provenance;
  stage: RoadStage;
}
export interface PersonPointers {
  personId: string;
  everyday: { roadId: typeof EVERYDAY_ONLY_ID; stage: RoadStage };
  confirmed: RoadPointer | null;
  exploring: RoadPointer[];
  past: { roadId: string; year: number; status: "completed" }[];
  largeSimple: boolean;
}
export function resolvePerson(person: PersonInput): PersonRoad {
  const result = typeof person === "string" ? PEOPLE[person] : person;
  if (!result) throw new Error(`Unknown person: ${person}`);
  return result;
}
export function pointersFor(input: PersonInput): PersonPointers {
  const person = resolvePerson(input);
  let confirmed: RoadPointer | null = null;
  if (person.key === "tom") confirmed = { roadId: "moving-house", provenance: "told", stage: { month: 0, label: "Before 1 Nov", date: "2026-11-01" } };
  if (person.key === "karim") confirmed = { roadId: "freelance", provenance: "told", stage: { month: 20, label: "Month 20", date: null } };
  if (person.key === "nadia") confirmed = { roadId: "losing-parent", provenance: "told", stage: { month: 1, label: "At your own pace", date: null } };
  return {
    personId: person.key,
    everyday: { roadId: EVERYDAY_ONLY_ID, stage: { month: TODAY.month + 1, label: MONTH_LONG[TODAY.month], date: null } },
    confirmed,
    exploring: person.key === "sofie" ? [{ roadId: "first-home", provenance: "suggested", stage: { month: null, label: "Exploring · no purchase date", date: null } }] : [],
    past: person.persona.driven.filter((p) => catalogueRoad(p.roadId)?.status === "live").map((p) => ({ ...p, status: "completed" })),
    largeSimple: !!person.noGame,
  };
}
export const unknownStage = (): RoadStage => ({ month: null, label: "Exploring · stage not confirmed", date: null });

/** Pure state transition. Preview never writes confirmed or changes a plan. */
export function previewRoad(pointers: PersonPointers, roadId: string, stage: RoadStage = unknownStage()): PersonPointers {
  if (!catalogueRoad(roadId)) throw new Error(`Unknown road: ${roadId}`);
  return { ...pointers, exploring: [...pointers.exploring.filter((p) => p.roadId !== roadId), { roadId, provenance: "exploring", stage: { ...stage } }] };
}
/** Call only after explicit "This is my situation" + stage confirmation in the UI. */
export function confirmRoad(pointers: PersonPointers, roadId: string, stage: RoadStage): PersonPointers {
  const road = catalogueRoad(roadId);
  if (!road || road.status !== "live" || roadId === EVERYDAY_ONLY_ID) throw new Error("Only a published life road can be confirmed.");
  if (stage.month === null || !Number.isInteger(stage.month) || stage.month < 0 || stage.month > road.months || !stage.label.trim()) throw new Error("Confirm a valid road stage first.");
  if (stage.date !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(stage.date) || !Number.isFinite(Date.parse(stage.date)) || new Date(stage.date).toISOString().slice(0, 10) !== stage.date)) throw new Error("Invalid event date.");
  return { ...pointers, confirmed: { roadId, provenance: "told", stage: { ...stage } }, exploring: pointers.exploring.filter((p) => p.roadId !== roadId) };
}
export function catalogueFor(person: PersonInput | PersonPointers) {
  const pointers = typeof person === "object" && "confirmed" in person ? person : pointersFor(person);
  return catalogue.map((road) => ({ ...road, badge:
    road.status === "review" ? "Under review" as const : road.id === EVERYDAY_ONLY_ID || road.id === pointers.confirmed?.roadId ? "On now" as const :
      pointers.exploring.some((p) => p.roadId === road.id) ? "Exploring" as const : pointers.past.some((p) => p.roadId === road.id) ? "Past" as const : null,
  }));
}
