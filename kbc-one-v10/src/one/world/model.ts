import { EVERYDAY_STOPS } from "../../hindsight/engine/everyday";
import { pointersFor } from "../crowd";
import { worldEvidence as stopEvidenceFor } from "./evidence";
import { PEOPLE } from "../people";
import type { Note8 } from "../notes8/types";
import { AREA_CATALOGUE, ACTIVE_AREAS } from "./catalogue";
import { questsFor } from "./quests";
import type { AreaId, KidsMiniWorld, World, WorldOptions, WorldProgress, WorldSignpost, WorldStage, WorldStorm } from "./types";

import { formatWorldDate, worldDate as validDate, WORLD_TODAY } from "./dates";
import { financeFor } from "./finance";
import { unlockRulesFor } from "./unlocks";
export { WORLD_TODAY } from "./dates";
export const WORLD_DISCLOSURE = "Synthetic demo crowd · not a forecast";
const known = (id: string) => Object.hasOwn(PEOPLE, id);
const empty = (personaId: string): WorldProgress => ({ personaId, done: [], saved: [] });
const stateFor = (id: string, state?: WorldProgress) => state?.personaId === id ? state : empty(id);
const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Dates are source dates or the fixed Everyday demo calendar, never inferred consent. */
export function stormsFor(personaId: string, progress?: WorldProgress, options: WorldOptions = {}): WorldStorm[] {
  if (!known(personaId) || personaId === "nadia" || personaId === "margaret") return []; // r2-wu: calm/care profiles have no storm urgency.
  const state = stateFor(personaId, progress);
  const today = validDate(options.today);
  const pointer = pointersFor(personaId).confirmed;
  const storms: WorldStorm[] = [];
  for (const areaId of ACTIVE_AREAS[personaId] ?? []) for (const lesson of questsFor(personaId, areaId)) {
    const bare = lesson.stopId.slice(lesson.roadId.length + 1);
    const evidence = stopEvidenceFor(lesson.roadId, bare);
    if (!evidence?.available || evidence.kind !== "bump" || storms.some(s => s.roadId === lesson.roadId && s.stopId === bare)) continue;
    let dueDate: string | null = null;
    let dateBasis: WorldStorm["dateBasis"] = "undated-preview";
    const calendar = lesson.roadId === "everyday-only" ? EVERYDAY_STOPS.find(s => s.id === bare) : undefined;
    const renewal = areaId === "car" && bare === "renewals" ? PEOPLE[personaId].world?.car?.insurance?.renews : undefined;
    if (renewal) {
      const now = new Date(`${WORLD_TODAY}T00:00:00Z`);
      let date = new Date(Date.UTC(now.getUTCFullYear(), renewal.month, renewal.day));
      if (iso(date) < WORLD_TODAY) date = new Date(Date.UTC(now.getUTCFullYear() + 1, renewal.month, renewal.day));
      dueDate = iso(date); dateBasis = "personal-renewal";
    } else if (calendar) {
      const now = new Date(`${WORLD_TODAY}T00:00:00Z`);
      let date = new Date(Date.UTC(now.getUTCFullYear(), calendar.calMonth, calendar.day));
      if (iso(date) < WORLD_TODAY) date = new Date(Date.UTC(now.getUTCFullYear() + 1, calendar.calMonth, calendar.day));
      dueDate = iso(date); dateBasis = "everyday-calendar";
    } else if (pointer?.roadId === lesson.roadId && pointer.stage.date) {
      const date = new Date(`${pointer.stage.date}T00:00:00Z`);
      date.setUTCMonth(date.getUTCMonth() + evidence.month);
      dueDate = iso(date); dateBasis = "confirmed-event";
    }
    const prepared = state.done.includes(lesson.id) && !!lesson.save && state.saved.includes(lesson.save.id);
    const daysAway = dueDate ? Math.ceil((Date.parse(dueDate) - Date.parse(today)) / 86400000) : null;
    storms.push({ id: `${personaId}:storm:${evidence.id}`, areaId, roadId: lesson.roadId, stopId: bare,
      title: areaId === "car" ? "Your car insurance renewal" : bare.includes("energy") ? "Your home energy bill" : `${evidence.short}`, dueDate, daysAway, dateBasis,
      dateLabel: dueDate ? `${dateBasis === "personal-renewal" ? "Your recorded demo renewal" : dateBasis === "everyday-calendar" ? "Demo calendar" : "Demo estimate from your move date"} · ${formatWorldDate(dueDate)}` : "Explore this event · no personal date",
      denominator: evidence.denominator, share: evidence.surprised.share, shareLabel: bare.includes("energy") ? "couldn’t cover the energy bill" : "couldn’t cover this cost",
      lessonId: lesson.id, saveId: lesson.save?.id ?? null, prepared,
      status: prepared ? "prepared" : daysAway === null ? "preview" : daysAway < 0 ? "repair" : "approaching",
      repairQuestId: lesson.id, synthetic: true });
  }
  // One stable demo story, even after preparation or when the clock moves forward.
  const preferred: Record<string, string> = { tom: "energy-new-address", sofie: "energy-settlement", karim: "late-client", lina: "energy-year", margaret: "energy-year" };
  const selected = storms.find(s => s.stopId === preferred[personaId]) ?? storms[0];
  return selected ? [selected] : [];
}

/** Only approved API records become signposts. Seed excerpts never become fabricated contributions. */
export function signpostsFor(personaId: string, areaId?: AreaId, notes: Note8[] = []): WorldSignpost[] {
  if (!known(personaId) || personaId === "nadia") return [];
  const areas = AREA_CATALOGUE.filter(a => !a.care && a.id !== "kids" && (areaId ? a.id === areaId : true));
  const unique = [...new Map(notes.filter(n => n.status === "approved").map(note => [note.id, note])).values()];
  return unique.flatMap(note => {
    const area = areas.find(a => questsFor(personaId, a.id).some(q => q.roadId === note.roadId && (!note.stopId || q.stopId === `${note.roadId}:${note.stopId}`)));
    if (!area) return [];
    const extra = note as Note8 & { usefulCount?: number; usefulByMe?: boolean };
    return [{ id: note.id, areaId: area.id, roadId: note.roadId, stopId: note.stopId, text: note.text, own: note.own,
      usefulCount: Number.isSafeInteger(extra.usefulCount) && extra.usefulCount! >= 0 ? extra.usefulCount! : 0,
      usefulByMe: extra.usefulByMe === true, source: "reviewed-note" as const }];
  });
}

export { worldAhead } from "./ahead";

export function kidsWorldFor(personaId: string, progress?: WorldProgress): KidsMiniWorld | null {
  if (personaId !== "sofie" && personaId !== "lina") return null;
  const quests = questsFor(personaId, "kids");
  const state = stateFor(personaId, progress);
  const completed = quests.filter(q => state.done.includes(q.id)).length;
  return { id: `${personaId}:kids`, parentId: personaId, title: "Our little learning world", mode: "parent-co-build",
    preview: personaId === "sofie", childName: PEOPLE[personaId].world?.child?.name ?? null,
    sharedWith: "parent-only", stage: (quests.length ? Math.min(4, Math.floor(completed / quests.length * 4)) : 0) as WorldStage, quests, goals: financeFor(personaId, "kids", state).goals.map(({ id, label, percent, source }) => ({ id, label, percent, source })), publicSharing: false };
}

export function worldFor(personaId: string, progress?: WorldProgress, options: WorldOptions = {}): World {
  const person = known(personaId) ? PEOPLE[personaId] : undefined;
  const state = stateFor(personaId, progress);
  // r2-wu: every known person can enter; care restrictions belong to the care district.
  const mode = !person ? "plain" : person.noGame ? "calm" : "game";
  const storms = stormsFor(personaId, state, options);
  const signposts = signpostsFor(personaId, undefined, options.notes);
  const areas = person ? AREA_CATALOGUE.map(def => {
    const unlock = unlockRulesFor(personaId, def.id, state);
    const active = def.care ? personaId === "nadia" : unlock.unlockedBy !== null;
    const finance = financeFor(personaId, def.id, state, validDate(options.today));
    const quests = def.care || !active ? [] : questsFor(personaId, def.id);
    const completed = quests.filter(q => state.done.includes(q.id)).length;
    const goals = finance.goals.map(({ id, label, percent, source }) => ({ id, label, percent, source }));
    const goalPercent = goals.length ? Math.round(goals.reduce((sum, g) => sum + g.percent, 0) / goals.length) : null;
    const areaStorms = storms.filter(s => s.areaId === def.id);
    const areaSignposts = signposts.filter(s => s.areaId === def.id);
    const lanterns = areaSignposts.filter(s => s.own).reduce((sum, s) => sum + s.usefulCount, 0);
    const learned = quests.length ? completed / quests.length : 0;
    const prepared = areaStorms.some(s => s.prepared) ? 1 : 0;
    const explicitUnlock = state.unlocks?.some(u => u.areaId === def.id) && unlock.unlockedBy !== null ? 1 : 0;
    const stage = !active || def.care ? 0 : Math.min(4, Math.floor(Math.max((finance.percent ?? 0) / 100 * 4, learned * 4, prepared, explicitUnlock))) as WorldStage;
    return { ...def, roadIds: [...def.roadIds], active, locked: !active || !!def.care && !options.careOptIn, explore: !active && unlock.explore.available,
      stage: stage as WorldStage, unlock, finance, attachments: finance.attachments, goals, goalPercent, quests, completed, storms: areaStorms, signposts: areaSignposts, lanterns, guide: lanterns > 0 };
  }) : [];
  return { personaId, name: personaId === "sofie" ? "Sofie & Pieter’s world" : person ? `${person.persona.name}’s world` : "Your world",
    mode, playable: !!person, areas, storms, signposts, lanterns: signposts.filter(s => s.own).reduce((sum, s) => sum + s.usefulCount, 0),
    kids: mode === "game" ? kidsWorldFor(personaId, state) : null, today: validDate(options.today), synthetic: true, disclosure: WORLD_DISCLOSURE };
}

/** Read-only preview. Crowd evidence is whole-road, gated and never a personal placement. */
export function exploreArea(personaId: string, areaId: AreaId): { areaId: AreaId; title: string; quests: import("../learning/types").Lesson[]; crowd: import("./types").WorldAhead["stormHits"]; disclosure: string } | null {
  const def = AREA_CATALOGUE.find(area => area.id === areaId);
  if (!def || !unlockRulesFor(personaId, areaId).explore.available) return null;
  const quests = questsFor(personaId, areaId);
  const seen = new Set<string>();
  const crowd = areaId === "kids" ? [] : quests.flatMap(quest => {
    if (seen.has(quest.stopId)) return [];
    seen.add(quest.stopId);
    const evidence = stopEvidenceFor(quest.roadId, quest.stopId.slice(quest.roadId.length + 1));
    return evidence?.available && evidence.denominator.shown ? [{ roadId: evidence.roadId, stopId: evidence.stopId, title: evidence.title, share: evidence.surprised.share, denominator: evidence.denominator }] : [];
  });
  return { areaId, title: def.title, quests, crowd, disclosure: WORLD_DISCLOSURE };
}
