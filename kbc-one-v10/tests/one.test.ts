// KBC One: the bridge between a Kate customer and their road.
// One person = one Kate persona + one household + one road. These tests keep the two halves agreeing,
// and check when the driving world is (and is not) offered.

import assert from "node:assert/strict";
import { test } from "node:test";
import { validateProposal } from "../src/kbc/kate";
import { unknownNumbers } from "../src/kbc/grounding";
import { PERSONAS, seedPersona } from "../src/kbc/personas";
import type { Customer } from "../src/kbc/types";
import { EVERYDAY_ONLY_ID, getRoad } from "../src/hindsight/engine/roads";
import { PEOPLE } from "../src/one/people";
import { lifeOf, lookAhead, roadFactsFor } from "../src/one/road";

const customer = (id: string): Customer => {
  const persona = seedPersona(id);
  if (!persona) throw new Error(id);
  return { persona, trackers: [], muted: [], rules: [], requests: [], log: [] } as Customer;
};

const offer = (id: string, large = false) => {
  const p = PEOPLE[id];
  const { road, journey, life } = lifeOf(p);
  return lookAhead(p, road, journey, life, { large });
};

test("every Kate customer is one person with a road, and the other way round", () => {
  assert.deepEqual(Object.keys(PEOPLE).sort(), PERSONAS.map((p) => p.id).sort());
  for (const p of Object.values(PEOPLE)) {
    assert.ok(p.roadId === EVERYDAY_ONLY_ID || getRoad(p.roadId), `${p.key}: road ${p.roadId} exists`);
    assert.equal(p.household.roadId, p.roadId, `${p.key}: household belongs to the same road`);
  }
});

test("Home and Road agree: the same balance and the same salary day", () => {
  for (const p of Object.values(PEOPLE)) {
    const kate = seedPersona(p.key);
    assert.ok(kate, p.key);
    assert.equal(Math.round(p.household.balance), Math.round(kate.accounts.current), `${p.key}: current account`);
    const sal = p.household.incomes.find((i) => i.salary);
    if (kate.salary && sal) {
      assert.equal(sal.amount, kate.salary.amount, `${p.key}: salary amount`);
      assert.equal(sal.day, kate.salary.day, `${p.key}: salary day`);
    }
  }
});

test("the Home offers the driving world only when there is a reason", () => {
  assert.equal(offer("tom")?.kind, "told", "Tom told us he's moving");
  assert.equal(offer("karim")?.kind, "crossroads", "Karim's crossroads is within six months");
  assert.equal(offer("sofie")?.kind, "preview", "Sofie can test-drive First home before she buys");
  assert.equal(offer("sofie")?.drive.month, 0);
  assert.equal(offer("lina"), null, "Lina: Everyday Road only, nothing to push");
  assert.equal(offer("margaret"), null, "Large & simple: never the game");
  assert.equal(offer("nadia"), null, "A care road: no game, a person first");
  assert.equal(offer("tom", true), null, "Large & simple turns the offer off for anyone");
});

test("a look-ahead always starts on a road that exists, on the person's own month", () => {
  for (const id of Object.keys(PEOPLE)) {
    const la = offer(id);
    if (!la) continue;
    assert.ok(getRoad(la.drive.roadId), `${id}: drive road exists`);
    if (la.kind !== "preview") assert.equal(la.drive.month, lifeOf(PEOPLE[id]).journey.month, `${id}: starts where they are`);
  }
});

test("Kate's road facts: gated, and the care road hides what's coming", () => {
  const tom = roadFactsFor("tom");
  assert.ok(tom);
  assert.equal(tom.canDrive, true);
  assert.match(tom.rule, /not a prediction/);
  const nadia = roadFactsFor("nadia");
  assert.ok(nadia);
  assert.equal(nadia.care, true);
  assert.equal(nadia.canDrive, false);
  assert.equal(nadia.buffer, undefined);
  assert.match(String(nadia.comingUp), /hidden/);
  assert.equal(roadFactsFor("margaret")?.canDrive, false);
  assert.equal(roadFactsFor("nobody"), null);
});

// v8-channels: the optional road drive is separate; Kate always opens the 2D road.
test("Kate rejects removed city entry proposals and validates stable road stops", () => {
  const notes: string[] = [];
  for (const id of ["tom", "karim", "sofie", "lina", "margaret", "nadia"]) {
    assert.equal(validateProposal(customer(id), { type: "drive", road: "own" }, notes), null);
  }
  const valid = validateProposal(customer("tom"), { type: "road", roadId: "moving-house", stopId: "energy-new-address" }, notes);
  assert.equal(valid?.type, "road");
  assert.equal(validateProposal(customer("tom"), { type: "road", roadId: "moving-house", stopId: "unknown" }, notes), null);
});

test("grounding: Kate may only write amounts she was given", () => {
  const facts = { balance: "€ 1.987", rent: 950 };
  assert.deepEqual(unknownNumbers("You have €1,987 and rent is 950 on the 1st.", facts), []);
  assert.deepEqual(unknownNumbers("People at your point kept €2.400 aside.", facts), ["2.400"]);
  assert.deepEqual(unknownNumbers("In 30 days, 2 bills.", facts), []);
});
