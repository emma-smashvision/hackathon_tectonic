import assert from "node:assert/strict";
import { test } from "node:test";
import { planItemFrom, todayWhen } from "../../hindsight/engine/plan";
import { PEOPLE } from "../people";
import { lifeOf } from "../road";
import { isAboutToStart, journeysFor, PRIVATE_NUDGE, selectJourney } from "./model";

const select = (key: string) => {
  const p = PEOPLE[key];
  const { road, journey, life } = lifeOf(p);
  return selectJourney(p, road, journey, life);
};

test("journey selection follows each person's own data and care preference", () => {
  assert.equal(select("tom")?.id, "car-renewal");
  assert.equal(select("tom")?.when.month, 10);
  assert.equal(select("tom")?.when.day, 2);
  assert.equal(select("karim")?.id, "company");
  assert.ok(select("karim")!.inDays > 42);
  assert.equal(select("karim")?.decision, true);
  assert.equal(select("sofie")?.id, "first-home");
  assert.equal(select("margaret")?.id, "duplicate-payment");
  assert.equal(select("margaret")?.cityFocus, undefined);
  assert.equal(select("nadia"), null);
  assert.equal(select("lina"), null);
});

test("ordinary journeys use six weeks and decisions use six months, both below 50% prepared", () => {
  assert.equal(isAboutToStart({ inDays: 42, ready: 49 }), true);
  assert.equal(isAboutToStart({ inDays: 43, ready: 0 }), false);
  assert.equal(isAboutToStart({ inDays: 0, ready: 50 }), false);
  assert.equal(isAboutToStart({ inDays: -1, ready: 0 }), false);
  assert.equal(isAboutToStart({ inDays: 183, ready: 0, decision: true }), true);
  assert.equal(isAboutToStart({ inDays: 184, ready: 0, decision: true }), false);
});

test("Tom's action reuses the world pot identity and correct product, without implying this year's premium is paid", () => {
  const j = select("tom")!;
  const savings = j.actions.find((a) => a.pick.id === "place:garage:pot")!;
  assert.ok(savings);
  assert.equal(savings.pick.spec.monthly, 35);
  assert.equal(savings.pick.spec.kind, "setup");
  assert.match(j.product, /another insurer/);
  assert.match(j.summary, /this year's payment is still due/);
  assert.match(savings.pick.spec.title, /next year's/);
});

test("existing plan actions count as preparation and remove an already prepared nudge", () => {
  const p = PEOPLE.tom;
  const { road, journey, life } = lifeOf(p);
  const j = selectJourney(p, road, journey, life)!;
  const plan = j.actions.slice(0, 2).map((a) => planItemFrom(a.pick, todayWhen(life), "app"));
  assert.equal(journeysFor(p, road, journey, life, plan)[0].prepared, 2);
  assert.equal(selectJourney(p, road, journey, life, plan), null);
  assert.equal(journeysFor(p, road, journey, life, plan.slice(0, 1))[0].ready, 33);
});

test("dates follow the demo clock, renewal beyond six weeks is not eligible", () => {
  const p = PEOPLE.tom;
  const { road, journey, life } = lifeOf(p);
  const later = { ...life, today: { ...life.today, cal: { year: 2026, month: 11 }, day: 1 } };
  assert.equal(selectJourney(p, road, journey, later), null);
});

test("private notification is identical for all customers and contains no sensitive details", () => {
  assert.deepEqual(Object.keys(PRIVATE_NUDGE), ["title", "body"]);
  assert.doesNotMatch(Object.values(PRIVATE_NUDGE).join(" "), /€|\d|Tom|Margaret|Karim|insurance|payment|company|mortgage/i);
});

test("crowd statistics include gate decisions and no legacy driving words", () => {
  for (const key of ["tom", "karim", "sofie"]) {
    const j = select(key)!;
    assert.ok(j.crowd.decisions.length > 0);
    assert.doesNotMatch(j.crowd.text, /drivers|drove|paved|glovebox|fuel|tyres/i);
    if (key === "karim") {
      assert.ok(j.crowd.decisions.every((d) => !d.shown));
      assert.match(j.crowd.text, /too few people/);
      assert.doesNotMatch(j.crowd.text, /\d+%/);
    } else assert.ok(j.crowd.decisions.some((d) => d.shown));
  }
});

test("care remains quiet after the customer opts in to looking ahead", () => {
  const p = PEOPLE.nadia;
  const { road, journey, life } = lifeOf(p);
  assert.deepEqual(journeysFor(p, road, { ...journey, careOptIn: true }, life), []);
});
