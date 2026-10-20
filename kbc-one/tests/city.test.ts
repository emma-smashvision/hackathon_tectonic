import assert from "node:assert/strict";
import { test } from "node:test";
import { getRoad, ROADS } from "../src/hindsight/engine/roads";
import { type Car, NO_INPUT, step } from "../src/hindsight/game/driving";
import { AVENUE_ORDER, buildCity, HALF_W, MONTH_LEN, nearest, sAtMonth, spawnOn } from "../src/hindsight/game/network";
import { nextRoads } from "../src/hindsight/game/next";

const net = buildCity();

test("every road in the city order becomes an avenue, forks become two branches", () => {
  // KBC One: Moving house takes the slot of Kid goes to university (twelve avenues, one per month boundary)
  assert.equal(net.avenues.length, AVENUE_ORDER.length);
  assert.ok(AVENUE_ORDER.every((id) => ROADS.some((r) => r.id === id)), "every avenue is a real road");
  assert.ok(net.avenues.some((a) => a.road.id === "moving-house"), "Tom's road is in the city");
  for (const av of net.avenues) {
    if (av.road.fork && av.road.fork.month < av.road.months) assert.ok(av.branches, `${av.road.id} has branches`);
    const end = av.branches ? av.branches[0] : av.trunk;
    assert.ok(Math.abs(end.months[end.months.length - 1] - av.road.months) < 0.01, `${av.road.id} runs to its last month`);
  }
});

test("each stop sits on its avenue at its month", () => {
  for (const s of net.stops) {
    const n = nearest(net, s.pos.x, s.pos.z);
    assert.ok(n.dist < 0.5, `${s.key} on the network`);
    assert.equal(n.roadId === s.roadId || Number.isNaN(n.month), true, `${s.key} on its own road`);
    assert.ok(Math.abs(n.month - s.stop.month) < 0.6, `${s.key} month ${n.month} vs ${s.stop.month}`);
  }
});

test("avenues do not overlap each other", () => {
  for (const av of net.avenues) {
    for (const p of av.trunk.pts.slice(6)) {
      const n = nearest(net, p.x, p.z, (path) => path.roadId !== av.road.id && path.branch !== "ring");
      assert.ok(n.dist > HALF_W * 2 + 4, `${av.road.id} too close to ${n.roadId}`);
    }
  }
});

test("driving forward along an avenue advances the month and stays on the road", () => {
  const spawn = spawnOn(net, "first-home", 3);
  let car: Car = { ...spawn, speed: 0 };
  let month = 3;
  for (let i = 0; i < 300; i++) {
    const r = step(car, { ...NO_INPUT, up: true }, 1 / 60, net, { maxSpeed: 30, throttle: 1 });
    car = r.car;
    assert.ok(r.near.dist <= HALF_W, "stays on the road");
    if (r.near.roadId === "first-home") month = r.near.month;
  }
  assert.ok(month > 3 + (5 * 25) / MONTH_LEN / 2, `month advanced to ${month}`);
});

test("steering into a wall keeps the car on the road", () => {
  const spawn = spawnOn(net, "first-job", 2);
  let car: Car = { ...spawn, speed: 20 };
  for (let i = 0; i < 240; i++) {
    car = step(car, { ...NO_INPUT, up: true, left: true }, 1 / 60, net, { maxSpeed: 30, throttle: 1 }).car;
    assert.ok(nearest(net, car.x, car.z).dist <= HALF_W);
  }
});

test("sAtMonth is monotonic", () => {
  const av = net.avenues.find((a) => a.road.id === "freelance");
  assert.ok(av);
  let prev = -1;
  for (let m = 0; m <= (av.forkMonth ?? av.road.months); m += 1) {
    const s = sAtMonth(av.trunk, m);
    assert.ok(s > prev);
    prev = s;
  }
});

test("next roads are gated and live", () => {
  const next = nextRoads("first-home");
  assert.ok(next.length > 0);
  for (const n of next) assert.ok(n.road?.status === "live");
  assert.ok(getRoad("first-home"));
});

test("the ring road can be driven all the way round with lane assist", () => {
  // start on the ring, heading along it
  let car: Car = { x: 120, z: 0, heading: Math.PI, speed: 20 }; // forward = (0,-1): tangent of the ring at angle 0
  let minDist = 0;
  for (let i = 0; i < 60 * 25; i++) {
    const r = step(car, { ...NO_INPUT, up: true }, 1 / 60, net, { maxSpeed: 25, throttle: 1 });
    car = r.car;
    minDist = Math.max(minDist, r.near.dist);
  }
  assert.ok(minDist <= HALF_W, "stays on the road");
});

test("you can turn from an avenue onto the ring", () => {
  const spawn = spawnOn(net, "first-home", 0.5);
  // face inward, toward the square
  let car: Car = { ...spawn, heading: spawn.heading + Math.PI, speed: 0 };
  let onRing = false;
  for (let i = 0; i < 60 * 8; i++) {
    const near = nearest(net, car.x, car.z);
    const steer = near.branch === "ring" || Math.hypot(car.x, car.z) < 128;
    const r = step(car, { ...NO_INPUT, up: true, left: steer }, 1 / 60, net, { maxSpeed: 18, throttle: 1 });
    car = r.car;
    if (r.near.branch === "ring" && Math.hypot(car.x, car.z) < 126) onRing = true;
  }
  assert.ok(onRing, "reached the ring");
});

test("the ring is the Everyday Road: twelve month segments between the twelve avenues", async () => {
  const { dayAngle, monthAngle, monthAtAngle, ringDist, everydayAnchor } = await import("../src/hindsight/game/everydayRing");
  const { JUNCTION_R } = await import("../src/hindsight/game/network");
  assert.equal(net.avenues.length, 12, "one avenue per month boundary");
  for (let m = 0; m < 12; m++) {
    assert.equal(monthAtAngle(monthAngle(m)), m);
    for (const day of [1, 15, 31]) {
      const a = dayAngle(m, day);
      assert.equal(monthAtAngle(a), m, `day ${day} of month ${m} stays in its segment`);
      // everyday stops never sit inside a junction, where an avenue meets the ring
      for (const av of net.avenues) assert.ok(ringDist(a, av.angle) > JUNCTION_R, `month ${m} day ${day} clear of ${av.road.id}`);
      const b = everydayAnchor(m, day);
      const n = nearest(net, b.x, b.z);
      assert.equal(n.branch, "ring", "everyday beacons stand beside the ring");
    }
  }
});
