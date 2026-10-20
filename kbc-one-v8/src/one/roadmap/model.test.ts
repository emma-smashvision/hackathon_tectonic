import assert from "node:assert/strict";
import { test } from "node:test";
import { planItemFrom } from "../../hindsight/engine/plan";
import { PEOPLE } from "../people";
import { lifeOf } from "../road";
import { selectJourney } from "../nudge/model";
import { majorStops, monthBundles, roadmapFor, trackReady } from "./model";

const input = (id: string) => ({ ...lifeOf(PEOPLE[id]), plan: [] });
for (const id of ["tom", "karim", "sofie", "lina", "margaret", "nadia"]) {
  test(`${id}: map is connected, has origins and shares the nudge's next stop`, () => {
    const s = input(id);
    const map = roadmapFor(PEOPLE[id], s);
    assert.equal(map.personKey, id);
    assert.equal(map.tracks[0].id, "everyday");
    assert.equal(map.allowCity, !["margaret", "nadia"].includes(id));
    assert.equal(map.nextUp?.stopId, selectJourney(PEOPLE[id], s.road, s.journey, s.life, s.plan)?.id);
    assert.equal(new Set(map.tracks.map((t) => t.id)).size, map.tracks.length);
    for (const track of map.tracks) {
      assert.ok(track.origin.text);
      if (track.parentId) {
        const parent = map.tracks.find((t) => t.id === track.parentId)!;
        assert.ok(parent.stops.some((stop) => stop.id === track.fromStopId));
      }
      for (const crossing of track.crossings) for (const branch of crossing.branches) assert.ok(map.tracks.some((t) => t.id === branch.trackId));
      for (const stop of track.stops) { assert.equal(stop.trackId, track.id); assert.ok(stop.ready >= 0 && stop.ready <= 100); }
    }
  });
}
test("Tom: renewal stays on Everyday; move branches at the real lease date; renting fork is not a purchase", () => {
  const map = roadmapFor(PEOPLE.tom, input("tom"));
  assert.deepEqual(map.nextUp, { trackId: "everyday", stopId: "car-renewal" });
  const root = map.tracks[0];
  assert.equal(root.stops.filter((s) => /insurance/i.test(s.title) && s.when.month === 10 && s.when.day === 2).length, 1);
  assert.deepEqual(root.stops.find((s) => s.id === "start:moving-house")!.when, { year: 2026, month: 10, day: 1 });
  const track = map.tracks.find((t) => t.id === "moving-house")!;
  assert.equal(track.crossings[0].id, "rent-or-fund");
  assert.match(track.crossings[0].branches[1].label, /home fund/);
  assert.ok(!map.tracks.some((t) => t.id === "first-home"));
});
test("Karim: real company crossing, branch choices and locked alternatives", () => {
  const s = input("karim");
  const map = roadmapFor(PEOPLE.karim, s);
  const fork = map.tracks.find((t) => t.id === "freelance")!.crossings[0];
  assert.deepEqual(fork.branches.map((b) => b.id), ["sole", "bv"]);
  const chosen = roadmapFor(PEOPLE.karim, { ...s, journey: { ...s.journey, forkChoice: { company: "bv" } } });
  assert.equal(chosen.tracks.find((t) => t.id === "freelance")!.crossings[0].branches[1].chosen, true);
  assert.equal(chosen.nextUp, undefined);
});
test("Sofie and Pieter have a confirmed appointment, not an invented home purchase timeline", () => {
  const map = roadmapFor(PEOPLE.sofie, input("sofie"));
  const track = map.tracks.find((t) => t.id === "first-home")!;
  assert.equal(track.stops.length, 1);
  assert.match(track.origin.text, /No purchase date/);
  assert.match(track.stops[0].detail, /Pieter/);
});
test("plan additions/removals update nudge preparation and engine action readiness without mutating input", () => {
  const s = input("tom");
  const initial = roadmapFor(PEOPLE.tom, s);
  const renewal = initial.tracks[0].stops.find((x) => x.id === "car-renewal")!;
  const plan = renewal.actions.map((a) => planItemFrom(a.pick, initial.today, "app"));
  const prepared = roadmapFor(PEOPLE.tom, { ...s, plan });
  assert.equal(prepared.tracks[0].stops.find((x) => x.id === renewal.id)!.state, "ready");
  assert.equal(prepared.nextUp, undefined);
  assert.equal(roadmapFor(PEOPLE.tom, s).nextUp?.stopId, renewal.id);
  const setup = initial.tracks.find((t) => t.id === "moving-house")!.stops.find((x) => x.actions.length > 1)!;
  const steps = setup.actions.map((a) => planItemFrom(a.pick, initial.today, "app"));
  assert.equal(roadmapFor(PEOPLE.tom, { ...s, plan: steps }).tracks.find((t) => t.id === "moving-house")!.stops.find((x) => x.id === setup.id)!.ready, 100);
  assert.deepEqual(s.plan, []);
});
test("care opt-in does not enable city, and a chosen Large & simple look disables it for Tom", () => {
  const s = input("nadia");
  const quiet = roadmapFor(PEOPLE.nadia, s);
  assert.equal(quiet.nextUp, undefined);
  assert.ok(quiet.tracks.every((t) => t.crossings.length === 0 && t.stops.every((stop) => stop.actions.length === 0)));
  assert.equal(roadmapFor(PEOPLE.nadia, { ...s, journey: { ...s.journey, careOptIn: true } }).allowCity, false);
  assert.equal(roadmapFor(PEOPLE.tom, { ...input("tom"), large: true }).allowCity, false);
});

test("Karim road readiness counts preparation ahead, not historical or locked stops", () => {
  const s = input("karim");
  const initial = roadmapFor(PEOPLE.karim, s);
  const track = initial.tracks.find((t) => t.id === "freelance")!;
  assert.ok(track.stops.some((stop) => stop.state === "done" && stop.ready === 0));
  assert.equal(trackReady(track), 0);
  const company = track.stops.find((stop) => stop.id === "company")!;
  const plan = company.actions.map((a) => planItemFrom(a.pick, initial.today, "app"));
  const prepared = roadmapFor(PEOPLE.karim, { ...s, plan }).tracks.find((t) => t.id === track.id)!;
  assert.equal(trackReady(prepared), 100);
  assert.equal(trackReady({ ...track, stops: track.stops.filter((stop) => stop.state === "done") }), null);
  assert.equal(trackReady({ ...track, stops: [{ ...company, state: "locked" }] }), null);
  assert.equal(trackReady({ ...track, stops: [{ ...company, actions: [] }] }), null);
});

test("v7.2: Tom's small reminder-only bills are minor; renewal, amounts and junctions are major", () => {
  const map = roadmapFor(PEOPLE.tom, input("tom"));
  const root = map.tracks[0];
  for (const title of ["Engie", "Proximus", "Netflix", "Spotify"]) {
    assert.equal(root.stops.find((stop) => stop.title === title)!.weight, "minor");
  }
  for (const id of ["car-renewal", "start:moving-house", "ev:energy-year:2027"]) {
    assert.equal(root.stops.find((stop) => stop.id === id)!.weight, "major");
  }
  assert.ok(majorStops(root).some((stop) => stop.title === "Rent, Gent"));
  const s = input("tom");
  for (const [amount, weight] of [[149.99, "minor"], [150, "major"]] as const) {
    const life = { ...s.life, next30: s.life.next30.map((bill) => bill.label === "Engie" ? { ...bill, amount: -amount } : bill) };
    const bill = roadmapFor(PEOPLE.tom, { ...s, life }).tracks[0].stops.find((stop) => stop.title === "Engie")!;
    assert.equal(bill.weight, weight);
    assert.equal(bill.amount, amount);
  }
});

test("v7.2: Karim crossing and reminder-only nextUp remain major", () => {
  const karim = roadmapFor(PEOPLE.karim, input("karim"));
  assert.equal(karim.tracks.find((track) => track.id === "freelance")!.stops.find((stop) => stop.id === "company")!.weight, "major");
  const sofie = roadmapFor(PEOPLE.sofie, input("sofie"));
  const next = sofie.tracks.flatMap((track) => track.stops).find((stop) => stop.id === sofie.nextUp!.stopId)!;
  assert.ok(next.actions.every((action) => action.pick.spec.kind === "remind"));
  assert.equal(next.weight, "major");
});

test("v7.2: month bundles preserve small bills and totals, keep years separate and exclude the anchor", () => {
  const root = roadmapFor(PEOPLE.tom, input("tom")).tracks[0];
  const before = JSON.stringify(root);
  const october = monthBundles(root).find((bundle) => bundle.month === "2026-10")!;
  assert.equal(october.id, "bundle:everyday:2026-10");
  assert.equal(october.count, 4);
  assert.equal(october.total, 240);
  assert.deepEqual(october.stops.map((stop) => stop.title), ["Engie", "Proximus", "Netflix", "Spotify"]);
  assert.ok(!majorStops(root).some((stop) => stop.id === "today"));
  assert.ok(!monthBundles(root).some((bundle) => bundle.stops.some((stop) => stop.id === "today")));
  const bill = october.stops[0];
  const acrossYears = monthBundles({ ...root, stops: [
    { ...bill, id: "next-year", when: { ...bill.when, year: 2027 }, amount: 1.23 },
    { ...bill, amount: 0.1 }, { ...bill, id: "other", amount: 0.2 },
  ] });
  assert.deepEqual(acrossYears.map((bundle) => [bundle.month, bundle.count, bundle.total]), [["2026-10", 2, 0.3], ["2027-10", 1, 1.23]]);
  assert.equal(JSON.stringify(root), before);
});

test("v7.2: possible tracks stay possible and never get a readiness percentage", () => {
  const map = roadmapFor(PEOPLE.tom, input("tom"));
  const possible = map.tracks.find((track) => track.id === "moving-house:rent-or-fund:rent")!;
  assert.equal(possible.status, "possible");
  assert.equal(trackReady(possible), null);
  assert.equal(trackReady({ ...possible, stops: possible.stops.map((stop) => ({ ...stop, state: "ready", ready: 100 })) }), null);
  assert.equal(trackReady({ ...possible, stops: [] }), null);
});

test("a stop keeps its weight after one of its steps is added (Sofie's appointment)", () => {
  const s = input("sofie");
  const initial = roadmapFor(PEOPLE.sofie, s);
  const stop = initial.tracks.flatMap((t) => t.stops).find((x) => x.id === initial.nextUp!.stopId)!;
  assert.equal(stop.weight, "major");
  const plan = [planItemFrom(stop.actions[0].pick, initial.today, "app")];
  const after = roadmapFor(PEOPLE.sofie, { ...s, plan }).tracks.flatMap((t) => t.stops).find((x) => x.id === stop.id)!;
  assert.equal(after.weight, "major");
});
