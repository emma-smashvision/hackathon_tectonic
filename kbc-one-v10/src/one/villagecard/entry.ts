import type { Lesson } from "../learning/types";

export function focusedLesson(lessons: Lesson[], roadId: string, stopId?: string) {
  return lessons.find(lesson => lesson.roadId === roadId && (!stopId || lesson.stopId === stopId || lesson.stopId === `${roadId}:${stopId}`));
}

export function entryMode(personaId: string): "care" | "plain" {
  if (personaId === "nadia") return "care";
  return "plain";
}

export function entryReceipt(built: number, total: number, savedNow: boolean, plain: boolean, savedKind = "Reminder") {
  return `${savedNow ? `${savedKind} saved · ` : ""}${built}/${total} ${plain ? "lessons complete" : "built"}`;
}
