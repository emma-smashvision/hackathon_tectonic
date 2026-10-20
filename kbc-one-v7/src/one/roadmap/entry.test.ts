import assert from "node:assert/strict";
import { test } from "node:test";
import { PEOPLE } from "../people";
import { lifeOf } from "../road";
import { cityEntryFor } from "./entry";
import { roadmapFor } from "./model";
import { kateFallback, kateFacts, validateProposal } from "../../kbc/kate";
import { seedPersona } from "../../kbc/personas";
import { ROSE_THEME } from "../../kbc/theme";
import type { Customer } from "../../kbc/types";

test("nudge, map stop and track entry share the same city destination", () => {
  for (const id of ["tom", "karim", "sofie"]) {
    const map = roadmapFor(PEOPLE[id], { ...lifeOf(PEOPLE[id]), plan: [] });
    const next = map.tracks.flatMap((t) => t.stops).find((s) => s.id === map.nextUp!.stopId)!;
    assert.equal(cityEntryFor(map), next.cityFocus);
    assert.equal(cityEntryFor(map, { focusId: next.id }), next.cityFocus);
    assert.equal(cityEntryFor(map, { focusId: next.cityFocus }), next.cityFocus);
    assert.equal(cityEntryFor(map, { roadId: next.trackId }), next.cityFocus);
  }
});
test("Lina can enter at a real Everyday stop without a nudge", () => {
  const map = roadmapFor(PEOPLE.lina, { ...lifeOf(PEOPLE.lina), plan: [] });
  assert.equal(map.nextUp, undefined);
  const focus = cityEntryFor(map)!;
  assert.ok(map.tracks[0].stops.some((s) => s.cityFocus === focus || s.id === focus));
});
test("Sofie's branch junction and appointment have distinct entry targets", () => {
  const map = roadmapFor(PEOPLE.sofie, { ...lifeOf(PEOPLE.sofie), plan: [] });
  assert.equal(cityEntryFor(map, { focusId: "start:first-home" }), "start:first-home");
  assert.equal(cityEntryFor(map, { focusId: "first-home" }), "first-home");
  const all = map.tracks.flatMap((t) => t.stops);
  assert.equal(all.filter((s) => s.cityFocus === "first-home").length, 1);
});
test("unknown targets fall back safely; large and care cannot enter through any callback", () => {
  const tom = roadmapFor(PEOPLE.tom, { ...lifeOf(PEOPLE.tom), plan: [] });
  assert.equal(cityEntryFor(tom, { focusId: "unknown" }), cityEntryFor(tom));
  for (const id of ["tom", "margaret", "nadia"]) {
    const map = roadmapFor(PEOPLE[id], { ...lifeOf(PEOPLE[id]), plan: [], large: id === "tom" });
    assert.equal(cityEntryFor(map), null);
    assert.equal(cityEntryFor(map, { focusId: "company", roadId: "freelance" }), null);
  }
});

test("Kate facts, offline answers and proposal validation use the map's Large and care guard", () => {
  const customer = (id: string): Customer => ({ persona: seedPersona(id)!, trackers: [], muted: [], rules: [], requests: [], log: [] });
  const normal = customer("tom");
  assert.equal(validateProposal(normal, { type: "drive", road: "own" }, [])?.type, "drive");
  for (const c of [
    { ...normal, layout: { style: "large" as const, blocks: [], suggestionsPerDay: 1 } },
    { ...normal, theme: { ...ROSE_THEME, base: "large" as const } },
    customer("margaret"), customer("nadia"),
  ]) {
    assert.equal(kateFacts(c).road?.canDrive, false);
    assert.equal(kateFallback(c, "What is ahead?").proposal, null);
    assert.equal(validateProposal(c, { type: "drive", road: "own" }, []), null);
  }
  assert.equal(validateProposal(normal, { type: "drive", road: "own" }, [], { style: "large", blocks: [] }), null);
});
