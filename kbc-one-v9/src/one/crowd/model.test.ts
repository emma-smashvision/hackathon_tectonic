import assert from "node:assert/strict";
import { test } from "node:test";
import { gateCount, gateMoney, gateRate } from "../../hindsight/engine/gate";
import { LIVE_ROADS, ROADS } from "../../hindsight/engine/roads";
import { statsFor } from "../../hindsight/engine/simulate";
import { PEOPLE } from "../people";
import { lifeOf } from "../road";
import {
  catalogue, catalogueFor, catalogueRoad, confirmRoad, EVERYDAY_ONLY_ID, findRoad,
  forkEvidenceFor, homeCardFor, pointersFor, previewRoad, questionsFor, roadViewFor,
  stopEvidenceFor, stopKey, type CrowdNumber,
} from ".";
import { publish } from "./gate";

function checkGate(value: unknown): void {
  if (!value || typeof value !== "object") return;
  if ("shown" in value) {
    const number = value as CrowdNumber;
    assert.equal(number.shown, number.value !== null);
    assert.ok(number.reason.length > 0);
    assert.deepEqual(Object.keys(number).sort(), ["reason", "shown", "value"]);
    if (number.value !== null) assert.ok(Number.isFinite(number.value));
  }
  assert.ok(!("n" in value), "Public API must not leak an ungated sample size");
  assert.ok(!("readiness" in value), "No readiness in the crowd contract");
  for (const item of Object.values(value)) checkGate(item);
}

test("catalogue contains the 12 live roads, Everyday and a review-only heat pump", () => {
  assert.equal(LIVE_ROADS.length, 12);
  assert.equal(catalogue.length, 14);
  assert.equal(new Set(catalogue.map((r) => r.id)).size, 14);
  for (const road of LIVE_ROADS) assert.equal(catalogueRoad(road.id)?.status, "live");
  assert.equal(catalogueRoad("heat-pump")?.status, "review");
  assert.equal(catalogueRoad("heat-pump")?.driverCount.value, null);
  assert.equal(catalogueRoad("caring-parent")?.care, true);
  assert.equal(catalogueRoad("caring-parent")?.group, "Support");
  assert.deepEqual(new Set(catalogue.map((r) => r.group)), new Set(["Home", "Work", "Family", "Abroad", "Later life", "Support"]));
  checkGate(catalogue);
});

test("all six personas have Everyday and at most their known confirmed life road", () => {
  const expected: Record<string, string | null> = { tom: "moving-house", karim: "freelance", sofie: null, lina: null, margaret: null, nadia: "losing-parent" };
  for (const [id, roadId] of Object.entries(expected)) {
    const pointers = pointersFor(id);
    assert.equal(pointers.everyday.roadId, EVERYDAY_ONLY_ID);
    assert.equal(pointers.confirmed?.roadId ?? null, roadId);
    assert.equal(pointers.confirmed?.provenance ?? "told", "told");
    assert.deepEqual(pointers.past.map(({ roadId, year }) => ({ roadId, year })), PEOPLE[id].persona.driven);
  }
  assert.equal(pointersFor("tom").confirmed?.stage.date, "2026-11-01");
  assert.equal(pointersFor("tom").confirmed?.stage.month, 0);
  assert.equal(pointersFor("karim").confirmed?.stage.month, 20);
  assert.ok(pointersFor("karim").past.some((p) => p.roadId === "first-home" && p.status === "completed"));
  assert.ok(pointersFor("margaret").past.some((p) => p.roadId === "retirement"));
  assert.equal(pointersFor("margaret").largeSimple, true);
  assert.deepEqual(pointersFor("sofie").exploring[0], { roadId: "first-home", provenance: "suggested", stage: { month: null, label: "Exploring · no purchase date", date: null } });
});

test("preview is pure, unlimited and never replaces a confirmed pointer or a plan", () => {
  const personBefore = JSON.stringify(PEOPLE);
  for (const person of Object.values(PEOPLE)) {
    const pointers = pointersFor(person);
    const before = JSON.stringify(pointers);
    const preview = catalogue.reduce((state, road) => previewRoad(state, road.id), pointers);
    assert.deepEqual(preview.confirmed, pointers.confirmed);
    assert.equal(preview.exploring.length, 14);
    assert.equal(JSON.stringify(pointers), before);
    roadViewFor(person, "first-home", { pointers: preview });
    assert.equal(JSON.stringify(pointers), before);
  }
  assert.equal(JSON.stringify(PEOPLE), personBefore);
});

test("confirmation replaces the one pointer only with an explicit valid stage", () => {
  const sofie = pointersFor("sofie");
  const confirmed = confirmRoad(sofie, "first-home", { month: 0, label: "Before the keys", date: null });
  assert.equal(confirmed.confirmed?.provenance, "told");
  assert.equal(confirmed.exploring.length, 0);
  assert.equal(sofie.confirmed, null);
  assert.throws(() => confirmRoad(sofie, "first-home", { month: null, label: "Unknown", date: null }));
  assert.throws(() => confirmRoad(sofie, "heat-pump", { month: 0, label: "Now", date: null }));
  assert.throws(() => confirmRoad(sofie, "first-home", { month: 0, label: "Now", date: "2026-02-31" }));
  assert.throws(() => pointersFor("unknown"));
  assert.throws(() => previewRoad(sofie, "unknown"));
});

test("catalogue badges distinguish On now, Exploring, Past and Under review", () => {
  assert.equal(catalogueFor("tom").find((r) => r.id === "moving-house")?.badge, "On now");
  assert.equal(catalogueFor("sofie").find((r) => r.id === "first-home")?.badge, "Exploring");
  assert.equal(catalogueFor("karim").find((r) => r.id === "first-home")?.badge, "Past");
  assert.equal(catalogueFor("lina").find((r) => r.id === "heat-pump")?.badge, "Under review");
});

test("all six road views preserve position, static identity, and care/large-text rules", () => {
  for (const person of Object.values(PEOPLE)) {
    const view = roadViewFor(person)!;
    assert.ok(view);
    checkGate(view);
    assert.ok(view.stops.every((stop) => stop.id === stopKey(stop)));
    if (person.key === "nadia" || person.key === "margaret") {
      assert.equal(view.canDrive, false);
      assert.deepEqual(view.ghostGroups, []);
    }
  }
  assert.equal(roadViewFor("sofie")?.position.month, null);
  assert.equal(roadViewFor("margaret", undefined, { largeSimple: false })?.canDrive, false);
  assert.equal(roadViewFor("sofie")?.position.preview, true);
  assert.equal(roadViewFor("tom")?.position.label, "Before 1 Nov");
  assert.deepEqual(roadViewFor("tom")?.nextStops.slice(0, 3).map((s) => s.stopId), ["setting-up", "energy-new-address", "old-deposit"]);
  assert.ok(roadViewFor("lina")?.nextStops.some((s) => s.stopId === "december"));
  assert.ok(roadViewFor("lina")?.nextStops.some((s) => s.stopId === "school" && s.year === 2027));
  assert.equal(roadViewFor("tom", "heat-pump")?.available, false);
  assert.deepEqual(roadViewFor("tom", "heat-pump")?.stops, []);
  assert.throws(() => roadViewFor("lina", undefined, { pointers: pointersFor("tom") }));
});

test("care roads are opt-in and never have ghosts, Drive, nudges or products", () => {
  for (const road of catalogue.filter((r) => r.care)) {
    const view = roadViewFor("nadia", road.id)!;
    assert.equal(view.available, false);
    assert.deepEqual(view.ghostGroups, []);
    const opted = roadViewFor("nadia", road.id, { careOptIn: true })!;
    assert.equal(opted.available, true);
    assert.equal(opted.canDrive, false);
    assert.equal(opted.canNudge, false);
    assert.deepEqual(opted.ghostGroups, []);
    for (const stop of opted.stops) {
      assert.equal(stopEvidenceFor(road.id, stop.stopId)?.available, false);
      const evidence = stopEvidenceFor(road.id, stop.stopId, { careOptIn: true })!;
      assert.ok(evidence.actions.every((a) => !a.kbcProduct));
    }
    assert.deepEqual(questionsFor(road.id), []);
  }
  assert.equal(stopEvidenceFor("heat-pump", "winter-bill"), null);
  assert.equal(forkEvidenceFor("heat-pump"), null);
  assert.deepEqual(questionsFor("heat-pump"), []);
});

test("gate boundary never exposes raw small denominators", () => {
  for (const n of [0, 1, 499, 500, 501]) {
    for (const value of [gateCount("test", n), gateRate("test", n / 2, n), gateMoney("test", 1500, n)]) {
      const result = publish(value);
      assert.equal(result.shown, n >= 500);
      if (n < 500) assert.equal(result.value, null);
      checkGate(result);
      assert.ok(!result.reason.includes("499"));
    }
  }
});

test("every published stop and histogram cell is gated; no invented note totals", () => {
  let withheldBins = 0;
  for (const road of catalogue.filter((r) => r.status === "live")) {
    const view = roadViewFor("tom", road.id, { careOptIn: true })!;
    for (const stop of view.stops) {
      const evidence = stopEvidenceFor(road.id, stop.stopId, { careOptIn: true })!;
      checkGate(evidence);
      assert.equal(evidence.noteCount.value, null);
      assert.ok(evidence.notes.every((n) => n.synthetic));
      for (const bin of evidence.surprised.range) {
        if (bin.count.value === null) {
          withheldBins++;
          assert.equal(bin.share.value, null);
          assert.equal(bin.lower.value, null);
          assert.equal(bin.upper.value, null);
        }
      }
    }
  }
  assert.ok(withheldBins > 0, "Exercise actual suppressed histogram bins");
});

test("helped uses P(calm | action), ranks by published outcome, and includes non-products", () => {
  const road = ROADS.find((r) => r.id === "moving-house")!;
  const stop = road.stops.find((s) => s.id === "energy-new-address")!;
  const stats = statsFor(road, stop);
  assert.equal(stats.kind, "bump");
  if (stats.kind !== "bump") return;
  const evidence = stopEvidenceFor(road.id, stop.id)!;
  assert.ok(evidence.helped.some((h) => !h.kbcProduct));
  assert.ok(evidence.helped.some((h) => h.kbcProduct));
  for (const [i, item] of evidence.helped.entries()) {
    assert.deepEqual(item.outcome, publish(stats.calmIf([item.id])));
    assert.match(item.association, /associated with/);
    if (i) assert.ok((evidence.helped[i - 1].outcome.value ?? -1) >= (item.outcome.value ?? -1));
  }
});

test("actions reuse existing plan pick IDs and real spec when replay is supplied", () => {
  const { life } = lifeOf(PEOPLE.tom);
  const evidence = stopEvidenceFor("moving-house", "energy-new-address", { life, advisor: PEOPLE.tom.advisor })!;
  const meter = evidence.actions.find((a) => a.id === "meter")!;
  assert.equal(meter.pick.id, "tip:moving-house:energy-new-address:meter");
  assert.equal(meter.pick.source.key, "energy-new-address");
  assert.equal(meter.pick.spec.kind, "remind");
  assert.ok(meter.pick.spec.when);
  assert.equal(meter.kbcProduct, false);
  assert.equal(stopEvidenceFor("first-home", "energy-settlement")?.actions.find((a) => a.id === "meter")?.pick.spec.when, undefined);
});

test("Karim gets sole/company outcomes at 1 and 3 years with withheld subgroups", () => {
  const fork = roadViewFor("karim")!.fork!;
  assert.equal(fork.stopId, "company");
  assert.equal(fork.month, 24);
  assert.deepEqual(fork.comparisons.map((c) => c.horizon), [1, 3]);
  assert.deepEqual(fork.comparisons[0].branches.map((b) => b.id), ["sole", "bv"]);
  assert.ok(fork.comparisons.every((c) => c.branches.every((b) => b.metrics.every((m) => m.value.shown))));
  assert.ok(fork.subgroup.some((c) => c.branches.some((b) => b.metrics.some((m) => m.value.value === null))));
  checkGate(fork);
});

test("matcher covers catalogue, stages, ambiguous situations and unknown input without numbers", () => {
  const queries: Record<string, string> = {
    "buying our first home": "first-home", "moving house": "moving-house", "first job": "first-job", "expecting a baby": "first-child",
    "going freelance": "freelance", divorce: "separation", "caring for my father": "caring-parent", "moving abroad": "moving-abroad",
    retirement: "retirement", "my father passed away": "losing-parent", "kid goes to university": "student-kid", "lost my job": "job-loss",
    "heat-pump owners": "heat-pump", "monthly bills": EVERYDAY_ONLY_ID,
  };
  const noNumbers = (value: unknown): void => {
    assert.notEqual(typeof value, "number");
    if (value && typeof value === "object") Object.values(value).forEach(noNumbers);
  };
  for (const [text, id] of Object.entries(queries)) {
    const result = findRoad(text);
    assert.equal(result.kind, "match", text);
    assert.equal(result.choices[0]?.roadId, id);
    noNumbers(result);
  }
  assert.equal(findRoad("planning to buy a home").choices[0]?.suggestedStage, "before");
  assert.equal(findRoad("house").kind, "choices");
  assert.equal(findRoad("moving house and going freelance").kind, "choices");
  assert.equal(findRoad("I want a pet elephant").kind, "none");
  assert.equal(findRoad("").kind, "none");
});

test("one Home card per persona opens a stable stop; no unsolicited care evidence", () => {
  for (const person of Object.values(PEOPLE)) {
    const card = homeCardFor(person)!;
    assert.ok(card, person.key);
    assert.equal(card.id, stopKey(card));
    assert.ok(card.synthetic);
    assert.ok(card.line.length);
    assert.ok(stopEvidenceFor(card.roadId, card.stopId) || forkEvidenceFor(card.roadId));
  }
  assert.equal(homeCardFor("tom")?.stopId, "energy-new-address");
  assert.equal(homeCardFor("tom")?.line, "Earlier movers: photograph the meters at key handover.");
  assert.equal(homeCardFor("karim")?.stopId, "company");
  assert.equal(homeCardFor("sofie")?.stopId, "energy-settlement");
  assert.equal(homeCardFor("nadia")?.source, "care");
});
