import assert from "node:assert/strict";
import { test } from "node:test";
import { PEOPLE } from "../people";
import { lifeOf } from "../road";
import {
  planItemFrom,
  todayWhen,
  whenIndex,
} from "../../hindsight/engine/plan";
import { assetsFor, comingUp, progress, plainPlanText } from "./model";

test("Tom gets only his three assets; savings include goals once, with no fictional pension", () => {
  const { life } = lifeOf(PEOPLE.tom);
  const assets = assetsFor(PEOPLE.tom, life);
  assert.deepEqual(
    assets.map((a) => a.id),
    ["home", "car", "savings"],
  );
  assert.match(assets[0].value, /950/);
  assert.match(assets[2].value, /8.360/);
  assert.match(assets[1].products[1].name, /current insurer/);
  assert.ok(!assets[1].products.some((p) => p.name.startsWith("KBC")));
});
test("Karim's investments and pension remain separate; his home value is a loan balance", () => {
  const { life } = lifeOf(PEOPLE.karim);
  const assets = assetsFor(PEOPLE.karim, life);
  assert.deepEqual(
    assets.map((a) => a.id),
    ["home", "savings", "pension"],
  );
  assert.equal(assets[0].label, "loan remaining");
  assert.equal(
    assets[1].products.filter((p) => /Bolero|KBC fund/.test(p.name)).length,
    3,
  );
  assert.equal(assets[2].value, "€ 14.920");
});
test("Margaret has truthful household assets without a city model", () => {
  const { life } = lifeOf(PEOPLE.margaret);
  const assets = assetsFor(PEOPLE.margaret, life);
  assert.deepEqual(
    assets.map((a) => a.id),
    ["home", "savings", "pension"],
  );
  assert.match(assets[2].sentence, /1.890/);
  assert.match(assets[2].sentence, /23/);
  assert.ok(!assets[0].sentence.includes("paid off"));
});
test("Coming up combines dates and journeys; reminder readiness reflects the saved plan", () => {
  const { life, road } = lifeOf(PEOPLE.tom);
  const items = comingUp(life, road, []);
  assert.equal(items.length, 5);
  assert.ok(items.some((i) => i.kind === "journey" && i.action));
  assert.ok(
    items.every(
      (i, index) =>
        !index || whenIndex(i.when) >= whenIndex(items[index - 1].when),
    ),
  );
  const bill = items.find((i) => i.reminder)!;
  assert.equal(bill.ready, 0);
  const plan = [planItemFrom(bill.reminder!, todayWhen(life), "app")];
  assert.equal(
    comingUp(life, road, plan).find((i) => i.id === bill.id)?.ready,
    100,
  );
  assert.ok(whenIndex(bill.reminder!.spec.when!) >= whenIndex(todayWhen(life)));
});
test("Preparing a journey picks the next available action and never toggles a completed action off", () => {
  const { life, road } = lifeOf(PEOPLE.tom);
  const item = comingUp(life, road, []).find((i) => i.action)!;
  const nextLife = {
    ...life,
    upcoming: life.upcoming.map((u) =>
      u.ref.key === item.id ? { ...u, done: [...u.done, item.action!.id] } : u,
    ),
  };
  assert.notEqual(
    comingUp(nextLife, road, []).find((i) => i.id === item.id)?.action?.id,
    item.action!.id,
  );
});
test("Progress stays within the progress bar bounds", () => {
  assert.equal(progress(2160, 3000), 72);
  assert.equal(progress(5000, 3000), 100);
  assert.equal(progress(-4, 3000), 0);
  assert.equal(progress(100, 0), 0);
});

test("Karim can prepare the pension deadline with the existing monthly saving action", () => {
  const { life, road } = lifeOf(PEOPLE.karim);
  const item = comingUp(life, road, []).find((i) =>
    i.title.includes("Pension saving"),
  );
  assert.equal(item?.action?.id, "main");
  assert.equal(item?.action?.label, "Spread it monthly");
});

test("Plan items from the city use plain bank words in the app", () => {
  assert.equal(
    plainPlanText(
      "Drivers kept fuel in the boot for a bump; paved, in your glovebox.",
    ),
    "people kept buffer in the savings for a cost; prepared, in your saved plan.",
  );
});
