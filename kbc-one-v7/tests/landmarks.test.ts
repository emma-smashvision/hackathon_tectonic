import assert from "node:assert/strict";
import { test } from "node:test";
import { generateCity } from "../src/hindsight/game/cityGen";
import { AVENUE_LANDMARKS, placeLandmarks, RING_LANDMARKS } from "../src/hindsight/game/landmarks";
import { AVENUE_ORDER, buildCity, HALF_W, nearest } from "../src/hindsight/game/network";

const net = buildCity(undefined, { streets: true });
const marks = placeLandmarks(net, { name: "Pieter", office: "KBC Antwerpen Meir" });

test("every road has its own landmark, and the Everyday Road five civic buildings", () => {
  for (const id of AVENUE_ORDER) assert.ok(AVENUE_LANDMARKS[id], `${id} has a landmark`);
  assert.equal(marks.filter((m) => m.roadId).length, AVENUE_ORDER.length);
  assert.equal(marks.filter((m) => !m.roadId).length, RING_LANDMARKS.length);
  assert.equal(new Set(marks.map((m) => m.kind)).size, marks.length, "no two look the same");
  assert.match(marks.find((m) => m.kind === "bank")?.line ?? "", /KBC Antwerpen Meir · Pieter/, "your own branch and advisor");
});

test("landmarks stand beside the road, never on it, and apart from each other", () => {
  for (const m of marks) {
    const n = nearest(net, m.x, m.z);
    assert.ok(n.dist > HALF_W + m.r - 2, `${m.id} clear of the road (${n.dist.toFixed(1)})`);
    if (m.roadId) assert.equal(n.roadId, m.roadId, `${m.id} beside its own avenue`);
    else assert.equal(n.branch, "ring", `${m.id} beside the ring`);
    for (const o of marks) if (o !== m) assert.ok(Math.hypot(o.x - m.x, o.z - m.z) > o.r + m.r, `${m.id} and ${o.id} apart`);
  }
});

test("the city's generic buildings and trees leave the landmarks' footprints free", () => {
  const city = generateCity(net, marks);
  for (const m of marks) {
    for (const b of city.buildings) assert.ok(Math.hypot(b.x - m.x, b.z - m.z) > m.r, `a building inside ${m.id}`);
    for (const t of city.trees) assert.ok(Math.hypot(t.x - m.x, t.z - m.z) > m.r, `a tree inside ${m.id}`);
  }
});
