import { beforeAll, expect, test } from "bun:test";
import { stormsFor, worldFor, worldAhead } from "./model";
import { stopEvidenceFor } from "../crowd";

// Population generation is intentionally outside individual interaction checks.
beforeAll(() => { for (const id of ["tom", "karim", "sofie", "lina", "margaret"]) worldFor(id); }, 60000);

test("Tom uses real source quests, percentages and gated storm evidence", () => {
  const world = worldFor("tom");
  expect(world.mode).toBe("game");
  expect(world.areas).toHaveLength(11);
  expect(world.areas.find(a => a.id === "home")?.quests).toHaveLength(3);
  const energy = stormsFor("tom").find(s => s.stopId === "energy-new-address")!;
  expect(energy.dueDate).toBe("2027-02-01");
  expect(energy.share).toEqual(stopEvidenceFor("moving-house", "energy-new-address")!.surprised.share);
  expect(energy.prepared).toBe(false);
  const progress = { personaId: "tom", done: [energy.lessonId], saved: [energy.saveId!] };
  expect(stormsFor("tom", progress).find(s => s.id === energy.id)?.prepared).toBe(true);
  expect(worldFor("tom", progress).areas.find(a => a.id === "home")!.stage).toBeGreaterThan(0);
  expect(worldAhead("tom", "home").denominator.shown).toBe(true);
});

test("care, plain, unknown and preview paths stay separate", () => {
  expect(worldFor("nadia").mode).toBe("game");
  expect(stormsFor("nadia")).toEqual([]);
  expect(worldFor("nadia", undefined, { careOptIn: true }).areas.filter(a => a.care).every(a => a.stage === 0 && !a.quests.length)).toBe(true);
  expect(worldFor("margaret").mode).toBe("calm");
  expect(worldFor("__proto__").areas).toEqual([]);
  expect(worldFor("sofie").kids?.childName).toBeNull();
  expect(stormsFor("sofie").find(s => s.stopId === "energy-settlement")?.dueDate).toBeNull();
});

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { PEOPLE } from "../people";
import { restoreProgress, emptyProgress, advanceProgress } from "../village/progress";
import { kidsWorldFor, signpostsFor, WORLD_TODAY } from "./model";
import { worldLessonsFor, worldLessonById } from "./quests";
import { useWorldProgress } from "./useWorldProgress";
import type { AreaId } from "./types";
import type { Note8 } from "../notes8/types";

test("all active areas have two transferable lessons; IDs and saved steps persist", () => {
  for (const personaId of ["tom", "karim", "sofie", "lina", "margaret"]) {
    let progress = emptyProgress(personaId);
    const ids = new Set<string>();
    for (const area of worldFor(personaId).areas.filter(a => a.active)) {
      expect(area.quests.length).toBeGreaterThanOrEqual(2);
      for (const q of area.quests) {
        expect(q.personaId).toBe(personaId);
        expect(ids.has(q.id)).toBe(false); ids.add(q.id);
        expect(q.apply.choices.filter(c => c.correct)).toHaveLength(1);
        expect(q.apply.choices.every(c => !!c.why)).toBe(true);
        expect(worldLessonById(q.id)).toEqual(q);
        const before = progress.done.length;
        progress = advanceProgress(progress, { type: "save", id: q.save!.id });
        expect(progress.done.length).toBe(before);
        progress = advanceProgress(progress, { type: "complete", id: q.id });
        progress = advanceProgress(progress, { type: "complete", id: q.id });
        expect(progress.done.length).toBe(before + 1);
      }
    }
    expect(restoreProgress(personaId, JSON.parse(JSON.stringify(progress)))).toEqual(progress);
    expect(worldFor(personaId, progress).areas.filter(a => a.active).every(a => a.stage === 4)).toBe(true);
    expect(advanceProgress(progress, { type: "reset" })).toEqual(emptyProgress(personaId));
  }
});

test("authored reveals use actual gated stops or explicitly disclose education without crowd measurements", () => {
  for (const personaId of ["tom", "karim", "sofie", "lina", "margaret"]) for (const q of worldLessonsFor(personaId)) {
    if (!q.id.includes(":world-")) continue;
    const evidence = stopEvidenceFor(q.roadId, q.stopId.slice(q.roadId.length + 1));
    if (q.roadId === "education-investments") {
      expect(evidence).toBeNull(); expect(q.reveal.withheld).toContain("No published crowd measurement");
      expect(q.helped.every(h => h.share === undefined)).toBe(true);
    } else {
      expect(evidence?.available).toBe(true); expect(evidence?.denominator.shown).toBe(true);
      if (q.note) expect(evidence?.notes.some(n => n.text === q.note!.text && n.by === q.note!.by)).toBe(true);
      for (const h of q.helped) if (h.share !== undefined) expect(evidence?.helped.some(e => e.label === h.label && e.outcome.shown && Math.round(e.outcome.value! * 100) === h.share)).toBe(true);
    }
  }
});

test("shields need done AND save; fixed occurrences become repair quests without losing a building", () => {
  const storm = stormsFor("tom").find(s => s.areaId === "home")!;
  expect(storm.dueDate).toBe("2027-02-01"); expect(storm.daysAway).toBe(107); expect(storm.dateBasis).toBe("confirmed-event");
  for (const state of [{ personaId: "tom", done: [storm.lessonId], saved: [] }, { personaId: "tom", done: [], saved: [storm.saveId!] }]) expect(stormsFor("tom", state).find(s => s.id === storm.id)?.prepared).toBe(false);
  const after = stormsFor("tom", undefined, { today: "2027-02-02" }).find(s => s.id === storm.id)!;
  expect(after.dueDate).toBe(storm.dueDate); expect(after.status).toBe("repair"); expect(after.repairQuestId).toBe(storm.lessonId);
  const learned = { personaId: "tom", done: [storm.lessonId], saved: [] };
  expect(worldFor("tom", learned, { today: "2027-02-02" }).areas.find(a => a.id === "home")?.stage).toBe(worldFor("tom", learned).areas.find(a => a.id === "home")?.stage);
  expect(worldFor("tom", undefined, { today: "2026-02-31" }).today).toBe(WORLD_TODAY);
});

test("exploration and gated worlds ahead leave source and progress unchanged", () => {
  const before = JSON.stringify(PEOPLE); const state = emptyProgress("sofie");
  for (const personaId of ["tom", "karim", "sofie", "lina", "margaret", "nadia", "unknown", "__proto__"]) for (const area of worldFor(personaId, state).areas) {
    const ahead = worldAhead(personaId, area.id);
    if (ahead.available) {
      expect(ahead.denominator.value!).toBeGreaterThanOrEqual(500);
      expect(ahead.basis).toContain("not observed customer behavior");
      expect(ahead.buildOrder.length).toBeGreaterThan(0);
      expect(ahead.buildOrder.every(item => item.share.shown)).toBe(true);
      expect(ahead.stormHits.every(hit => hit.denominator.shown)).toBe(true);
    } else { expect(ahead.denominator.value).toBeNull(); expect(ahead.buildOrder).toEqual([]); expect(ahead.stormHits).toEqual([]); }
    if (area.locked) expect(area.stage).toBe(0);
  }
  expect(worldAhead("tom", "nope" as AreaId).available).toBe(false);
  expect(worldAhead("lina", "kids").available).toBe(false);
  expect(JSON.stringify(PEOPLE)).toBe(before); expect(state).toEqual(emptyProgress("sofie"));
});

test("stages use own-goal percentages and lessons, never holdings or balances", () => {
  expect(worldFor("sofie").areas.find(a => a.id === "home")?.goals[0].percent).toBe(69);
  expect(worldFor("lina").areas.find(a => a.id === "savings")?.goals[0].percent).toBe(45);
  expect(worldFor("karim").areas.find(a => a.id === "investments")?.stage).toBe(0);
  expect(worldFor("margaret").areas.find(a => a.id === "savings")?.stage).toBe(0);
  expect(JSON.stringify(worldFor("karim"))).not.toContain('"balance"');
  expect(worldFor("tom", { personaId: "karim", done: ["tom:energy-new-address"], saved: [] })).toEqual(worldFor("tom"));
});

test("Sofie preview and Lina mini-world persist parent-local learning and never expose public child data", () => {
  for (const personaId of ["sofie", "lina"]) {
    const kids = kidsWorldFor(personaId)!;
    expect(kids.quests).toHaveLength(2); expect(kids.sharedWith).toBe("parent-only"); expect(kids.publicSharing).toBe(false);
    let state = emptyProgress(personaId);
    for (const quest of kids.quests) state = advanceProgress(state, { type: "complete", id: quest.id });
    expect(kidsWorldFor(personaId, state)?.stage).toBe(4);
    expect(kidsWorldFor(personaId, advanceProgress(state, { type: "reset" }))?.stage).toBe(0);
  }
  expect(kidsWorldFor("sofie")?.preview).toBe(true); expect(kidsWorldFor("sofie")?.childName).toBeNull();
  expect(kidsWorldFor("lina")?.childName).toBe("Noor"); expect(kidsWorldFor("tom")).toBeNull();
});

test("reviewed notes alone produce signposts and actual useful feedback alone produces lanterns", () => {
  const note: Note8 = { id: "note-1", roadId: "moving-house", stopId: "energy-new-address", text: "Keep a dated meter photo.", createdAt: 1, reviewAt: 2, own: true, status: "review", usefulCount: 1 };
  expect(signpostsFor("tom", "home", [note])).toEqual([]); note.status = "approved";
  const world = worldFor("tom", undefined, { notes: [note] });
  expect(worldFor("tom", undefined, { notes: [note, note] }).lanterns).toBe(1);
  expect(world.lanterns).toBe(1); expect(world.areas.find(a => a.id === "home")?.guide).toBe(true);
  expect(worldFor("tom").lanterns).toBe(0); expect(signpostsFor("tom", "car", [note])).toEqual([]);
  expect(signpostsFor("nadia", undefined, [note])).toEqual([]);
  expect(signpostsFor("lina", "kids", [{ ...note, roadId: "everyday-only", stopId: "school" }])).toEqual([]);
  expect(worldFor("tom", undefined, { notes: [{ ...note, own: false }] }).lanterns).toBe(0);
});

test("world progress supports SSR without browser storage", () => {
  function Probe() { const p = useWorldProgress("tom"); return createElement("span", null, `${p.personaId}:${p.done.length}:${p.saved.length}`); }
  expect(renderToString(createElement(Probe))).toBe("<span>tom:0:0</span>");
});
