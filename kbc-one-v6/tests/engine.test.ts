import assert from "node:assert/strict";
import { test } from "node:test";
import { gateRate, K_MIN } from "../src/hindsight/engine/gate";
import { checkNote, notePasses } from "../src/hindsight/engine/moderation";
import { placeChunk, pointerSpace } from "../src/hindsight/engine/placement";
import { getRoad, ROADS } from "../src/hindsight/engine/roads";
import { forkStats, statsFor } from "../src/hindsight/engine/simulate";

test("crowd gate never shows a number backed by fewer than K_MIN people", () => {
  const small = gateRate("t:small", 120, K_MIN - 1);
  assert.equal(small.shown, false);
  assert.equal(small.value, null);
  const big = gateRate("t:big", 300, 1000);
  assert.equal(big.shown, true);
  assert.ok(big.value !== null && Math.abs(big.value - 0.3) <= 0.02, "noise stays small on large crowds");
});

test("every road is well formed", () => {
  const ids = new Set<string>();
  for (const r of ROADS) {
    assert.ok(!ids.has(r.id), `duplicate road ${r.id}`);
    ids.add(r.id);
    assert.ok(r.alumni >= K_MIN, `${r.id} has a crowd`);
    for (const s of r.stops) {
      assert.ok(s.month >= 0 && s.month <= r.months, `${r.id}/${s.id} month inside road`);
      if (s.kind === "bump") assert.ok(s.amount?.threshold && s.behaviours?.length, `${r.id}/${s.id} bump has threshold + behaviours`);
    }
    if (r.care) assert.ok(r.blocked.some((b) => /commercial/i.test(b)), `${r.id} care road blocks offers`);
  }
});

test("preparing makes a calm outcome more likely (emergent, not hardcoded)", () => {
  const road = getRoad("first-home");
  assert.ok(road);
  const stop = road.stops.find((s) => s.id === "energy-settlement");
  assert.ok(stop);
  const s = statsFor(road, stop);
  assert.equal(s.kind, "bump");
  if (s.kind !== "bump") return;
  const overall = 1 - (s.hitRate.value ?? 1);
  const prepared = s.calmIf(["pot"]).value ?? 0;
  assert.ok(prepared > overall, `prepared ${prepared} > overall ${overall}`);
  for (const b of s.behaviours) assert.ok((b.calm.value ?? 0) > (b.hit.value ?? 1), `${b.id} more common among calm drivers`);
});

test("'people like you' on a small road is held back by the gate", () => {
  const road = getRoad("moving-abroad");
  assert.ok(road?.fork);
  const like = forkStats(road, road.fork, 1, { bufferBand: road.persona.bufferBand, incomeBand: road.persona.incomeBand });
  assert.ok(like.branches.some((b) => b.metrics.some((m) => !m.value.shown)));
  const all = forkStats(road, road.fork, 1, null);
  assert.ok(all.branches.every((b) => b.metrics.every((m) => m.value.shown)));
});

test("moderation blocks names, amounts, places and contacts", () => {
  assert.equal(notePasses("Photograph the meter on the day you get the keys."), true);
  assert.equal(notePasses("My wife Sarah says save more"), false);
  assert.equal(notePasses("Put €40 aside every month please"), false);
  assert.equal(notePasses("The notary in Leuven was slow, ask early"), false);
  assert.equal(notePasses("Mail me at someone@example.com for tips"), false);
  assert.equal(checkNote("short").find((c) => c.id === "length")?.pass, false);
});

test("placement gives each customer at most one road and uses few shared views", () => {
  const perRoad = new Uint32Array(ROADS.length);
  const seen = new Uint8Array(pointerSpace());
  const n = 200_000;
  const placed = placeChunk(0, n, perRoad, seen);
  assert.equal(
    perRoad.reduce((a, b) => a + b, 0),
    placed,
  );
  assert.ok(placed > 0 && placed < n);
  assert.ok(seen.reduce((a, b) => a + b, 0) <= pointerSpace());
});
