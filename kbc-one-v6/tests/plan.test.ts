import assert from "node:assert/strict";
import { test } from "node:test";
import { evKey } from "../src/hindsight/engine/everyday";
import { newJourney } from "../src/hindsight/engine/game";
import { computeLife } from "../src/hindsight/engine/life";
import {
  buildDebrief,
  classifyTip,
  planItemFrom,
  planProgress,
  slotsFor,
  specForTip,
  todayWhen,
  whenLabel,
} from "../src/hindsight/engine/plan";
import { getRoad } from "../src/hindsight/engine/roads";
import { PEOPLE } from "../src/one/people";
import { lifeOf, ownRoad } from "../src/one/road";

const tom = PEOPLE.tom;

test("every tip is one of five real actions", () => {
  assert.equal(classifyTip("Set aside €40 a month"), "setup");
  assert.equal(classifyTip("Park it when it lands"), "setup");
  assert.equal(classifyTip("Remind me to photograph the meter"), "remind");
  assert.equal(classifyTip("Add it to my calendar"), "remind");
  assert.equal(classifyTip("Check my monthly advance"), "check");
  assert.equal(classifyTip("Book a quiet call"), "book");
  assert.equal(classifyTip("Book a quiet call", true), "talk", "care roads: a person, not a booking funnel");
});

test("a pot tip becomes a concrete standing order, labelled as a KBC product", () => {
  const { road, life } = lifeOf(tom);
  const spec = specForTip({ road, life, advisor: tom.advisor }, "energy-new-address", "pot");
  assert.ok(spec);
  assert.equal(spec.kind, "setup");
  assert.equal(spec.monthly, 40);
  assert.match(spec.title, /pot of €\s?40 a month/);
  assert.equal(spec.product, "KBC savings pot");
});

test("a reminder lands on a real date", () => {
  const { road, life } = lifeOf(tom);
  const spec = specForTip({ road, life }, evKey("tax-return", 2027), "main");
  assert.ok(spec?.when);
  assert.equal(spec.kind, "remind");
  assert.deepEqual([spec.when.year, spec.when.month, spec.when.day], [2027, 4, 1], "Remind me in May → 1 May 2027");
});

test("three ways to talk: your advisor's next slot, KBC Live video on a weekday, phone on Saturday", () => {
  const today = { year: 2026, month: 9, day: 17 }; // Saturday 17 October 2026
  const slots = slotsFor({ name: "Jonas", office: "KBC Gent Kouter", nextSlot: "Tue 14:00" }, today);
  assert.equal(whenLabel(slots[0].when), "Tue 20 Oct · 14:00");
  assert.match(slots[0].with, /Jonas · KBC Gent Kouter/);
  assert.equal(whenLabel(slots[1].when), "Mon 19 Oct · 18:30");
  assert.equal(whenLabel(slots[2].when), "Sat 24 Oct · 10:00");
});

test("a plan item shows what it did: the pot fills, then the bump is paved", () => {
  const road = ownRoad(tom);
  const j0 = newJourney(road);
  const j = { ...j0, done: { "energy-new-address": ["pot"] }, doneAt: { "energy-new-address|pot": 0 } };
  const life = computeLife(road, j, tom.household);
  const spec = specForTip({ road, life }, "energy-new-address", "pot");
  assert.ok(spec);
  const item = planItemFrom({ id: "x", source: { scope: "road", roadId: road.id, key: "energy-new-address", actionId: "pot" }, spec }, todayWhen(life), "drive");
  assert.equal(item.status, "active");
  assert.match(planProgress(item, life).line, /in the pot/);
  const later = computeLife(road, { ...j, month: 3 }, tom.household);
  const p = planProgress(item, later);
  assert.equal(p.done, true);
  assert.match(p.line, /paved/);
});

test("the debrief suggests what you looked at but didn't act on, never on care roads", () => {
  const road = ownRoad(tom);
  const life = lifeOf(tom).life;
  const care = getRoad("losing-parent");
  assert.ok(care);
  const d = buildDebrief({
    glovebox: [],
    trip: [
      { key: "energy-new-address", roadId: road.id, title: "First energy bill", kind: "bump" },
      { key: "funeral", roadId: "losing-parent", title: "The funeral costs", kind: "bump" },
    ],
    roads: [road, care],
    ownRoadId: road.id,
    lifeFor: () => life,
    journeyDone: () => ({}),
    advisor: tom.advisor,
  });
  assert.equal(d.seen.length, 2);
  assert.equal(d.suggested.length, 1);
  assert.equal(d.suggested[0].source.roadId, road.id);
});
