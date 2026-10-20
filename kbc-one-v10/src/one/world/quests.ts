import { lessonsFor } from "../learning/lessons";
import type { Lesson } from "../learning/types";
import { ACTIVE_AREAS, AREA_CATALOGUE } from "./catalogue";
import { authoredQuests } from "./authored";
import type { AreaId } from "./types";

const cache = new Map<string, Lesson[]>();
export function questsFor(personaId: string, areaId: AreaId): Lesson[] {
  // r2-wu: Nadia can learn in ordinary districts; care never has game quests.
  const allowed = Object.hasOwn(ACTIVE_AREAS, personaId) &&
    AREA_CATALOGUE.some(area => area.id === areaId && !area.care);
  if (!allowed) return [];
  const key = `${personaId}:${areaId}`;
  if (!cache.has(key)) {
    const existing = lessonsFor(personaId).filter(lesson => {
      const area: AreaId = lesson.roadId === "freelance" ? "work" : lesson.stopId.endsWith(":december") ? "savings" : "home";
      return area === areaId;
    });
    const authored = existing.length < 2 ? authoredQuests(personaId, areaId) : [];
    // Tom's past first job supplies two separate transfer exercises, without inventing a new job.
    if (areaId === "work" && personaId === "tom") {
      const pension = authoredQuests(personaId, "pension")[1];
      authored.push({ ...pension, id: `${personaId}:world-work-benefits`, title: "Ask about your work benefits", save: { id: `lesson:${personaId}:world-work-benefits:step`, label: "Save my work-benefits question" } });
    }
    cache.set(key, [...existing, ...authored.slice(0, Math.max(0, 2 - existing.length))].map((lesson, index) => ({ ...lesson, order: index + 1 })));
  }
  return cache.get(key)!;
}
export function worldLessonsFor(personaId: string): Lesson[] { return AREA_CATALOGUE.flatMap(area => questsFor(personaId, area.id)); }
export function worldLessonById(id: string): Lesson | undefined { return worldLessonsFor(id.split(":")[0]).find(lesson => lesson.id === id); }
