import assert from "node:assert/strict";
import { test } from "node:test";
import { PEOPLE } from "../people";
import { lifeOf } from "../road";
import { pointersFor, stopEvidenceFor } from "../crowd";
import { planItemFrom, todayWhen, whenIndex } from "../../hindsight/engine/plan";
import { areaProgress, countdown, crowdVisual, mergedTimeline } from "./roadModel";

const timeline = (key: string, consent = false) => {
  const person = PEOPLE[key], { life } = lifeOf(person);
  return mergedTimeline(person, life, pointersFor(person), [], [], consent);
};
test("all six people have a sorted year without invented preview dates", () => {
  for (const key of Object.keys(PEOPLE)) {
    const items = timeline(key);
    assert.ok(items.length > 0, key);
    const dated = items.flatMap(i => i.date ? [whenIndex(i.date)] : []);
    assert.deepEqual(dated, [...dated].sort((a,b) => a-b));
    assert.ok(items.every(i => !/\d{4}-\d{2}-\d{2}/.test(i.timing)));
  }
  assert.ok(timeline("sofie").filter(i => i.roadId === "first-home").every(i => !i.date && i.timing === "When you’re ready"));
});
test("Tom merges the known 2 November car renewal with life and Everyday stops", () => {
  const items = timeline("tom");
  assert.equal(items.find(i => i.area === "car")?.timing, "2 Nov 2026");
  assert.ok(items.some(i => i.roadId === "moving-house" && i.lesson));
  assert.ok(items.some(i => i.roadId === "everyday-only" && i.evidence));
});
test("Margaret does not get salary bonus or pension-saving deadlines she does not have", () => {
  assert.ok(!timeline("margaret").some(i => ["bonus", "holiday-pay", "pension"].includes(i.stopId)));
  assert.ok(timeline("margaret").some(i => i.lesson?.id === "margaret:energy-year"));
});
test("Nadia care is opt-in, undated, and has no lesson or game action", () => {
  assert.ok(!timeline("nadia").some(i => i.care));
  const care = timeline("nadia", true).filter(i => i.care);
  assert.ok(care.length > 0);
  assert.ok(care.every(i => !i.lesson && !i.reminder && !i.date));
});
test("reminding does not claim preparedness; lesson completion does", () => {
  const person = PEOPLE.tom, { life } = lifeOf(person), pointers = pointersFor(person);
  const items = timeline("tom"), car = items.find(i => i.area === "car")!;
  const plan = [planItemFrom(car.reminder!, todayWhen(life), "app")];
  const next = mergedTimeline(person, life, pointers, plan, ["tom:energy-new-address"], false);
  assert.equal(next.find(i => i.area === "car")?.reminded, true);
  assert.equal(next.find(i => i.area === "car")?.prepared, false);
  assert.equal(next.find(i => i.lesson?.id === "tom:energy-new-address")?.prepared, true);
});
test("area rings use own mortgage and goals and leave unknown targets empty", () => {
  const karim = areaProgress(PEOPLE.karim, lifeOf(PEOPLE.karim).life);
  assert.equal(karim.find(a => a.id === "home")?.percent, 49);
  assert.equal(karim.find(a => a.id === "pension")?.percent, 83);
  const margaret = areaProgress(PEOPLE.margaret, lifeOf(PEOPLE.margaret).life);
  assert.equal(margaret.find(a => a.id === "savings")?.percent, null);
  assert.equal(margaret.find(a => a.id === "car")?.open, false);
});
test("crowd miniature never publishes a withheld denominator or rate", () => {
  const evidence = stopEvidenceFor("moving-house", "energy-new-address")!;
  assert.ok(crowdVisual(evidence));
  assert.equal(crowdVisual({ ...evidence, denominator: { ...evidence.denominator, shown: false } }), undefined);
  assert.equal(crowdVisual({ ...evidence, surprised: { ...evidence.surprised, share: { ...evidence.surprised.share, shown: false } } }), undefined);
});
test("countdowns use calendar day units, including cross-year dates", () => {
  assert.equal(countdown({ year:2026,month:10,day:7 }, { year:2026,month:9,day:17 }), "in 3 weeks");
  assert.equal(countdown({ year:2027,month:0,day:2 }, { year:2026,month:11,day:31 }), "in 2 days");
});
test("consent on one care road never opens another", () => {
  const person = PEOPLE.nadia, { life } = lifeOf(person), pointers = pointersFor(person);
  pointers.exploring.push({ roadId:"separation", provenance:"exploring", stage:{month:null,date:null,label:"Exploring"} });
  const items = mergedTimeline(person, life, pointers, [], [], roadId => roadId === "losing-parent");
  assert.ok(items.some(i => i.roadId === "losing-parent"));
  assert.ok(!items.some(i => i.roadId === "separation"));
});
