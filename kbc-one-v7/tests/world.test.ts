import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildPlaces, holdingSeries, maskMoney, mortgageAt, towerState } from "../src/hindsight/engine/world";
import { type Car, NO_INPUT, step } from "../src/hindsight/game/driving";
import { buildCity, HALF_W, nearest, RING_R } from "../src/hindsight/game/network";
import { layoutPlaces, placeAt, STREET_Z, streetStart } from "../src/hindsight/game/streets";
import { PEOPLE } from "../src/one/people";
import { lifeOf } from "../src/one/road";

const net = buildCity(undefined, { streets: true });

test("Karim's home loan: € 1.150 a month, about half paid back, last payment in January 2037", () => {
  const m = PEOPLE.karim.world?.home?.mortgage;
  assert.ok(m);
  const s = mortgageAt(m, { year: 2026, month: 9 });
  assert.ok(Math.abs(s.payment - 1150) < 5, `payment ${s.payment}`);
  assert.ok(s.left > 100000 && s.left < 140000, `left ${s.left}`);
  assert.deepEqual(s.last, { year: 2037, month: 0 });
  const later = mortgageAt(m, { year: 2030, month: 0 });
  assert.ok(later.left < s.left, "what's left only goes down");
  assert.equal(mortgageAt(m, { year: 2040, month: 0 }).left, 0);
});

test("a holding's monthly closes end exactly at the value the app shows, and only depend on the month", () => {
  for (const h of PEOPLE.karim.world?.holdings ?? []) {
    const a = holdingSeries(h, { year: 2026, month: 8 });
    const b = holdingSeries(h, { year: 2026, month: 8 });
    const n = a.value.length - 1;
    assert.ok(Math.abs(a.value[n] - h.value) < 1, `${h.id} ends at ${a.value[n]}`);
    assert.deepEqual(a.value, b.value, "deterministic: no live prices");
    assert.equal(a.invested[n], h.initial + (h.monthly ?? 0) * n);
  }
});

test("towers: stone is what you put in, lit floors are growth, scaffolding (never rubble) below what you put in", () => {
  const up = towerState(17500, 24100);
  assert.deepEqual([up.stone, up.lit, up.scaffold, up.under], [9, 3, 0, false]);
  const down = towerState(7000, 6410);
  assert.deepEqual([down.stone, down.lit, down.scaffold, down.under], [3, 0, 1, true]);
});

test("every person with a world gets their own places, with only next steps of what they already do", () => {
  for (const id of ["tom", "karim", "lina", "sofie"]) {
    const p = PEOPLE[id];
    assert.ok(p.world, `${id} has a world`);
    const { life } = lifeOf(p);
    const { places } = buildPlaces(p.world, life, p.advisor);
    assert.ok(places.some((x) => x.id === "home"), `${id} has a home`);
    for (const pl of places) {
      for (const a of pl.actions) {
        if (a.type !== "pick") continue;
        assert.ok(["setup", "check", "remind", "book"].includes(a.spec.kind), `${id}/${pl.id}/${a.id}`);
        assert.ok(!/loan|credit|borrow/i.test(a.spec.title) || a.spec.kind === "book", `${id}/${pl.id}: never offers credit`);
      }
    }
  }
  assert.equal(PEOPLE.margaret.world, undefined, "Large & simple: no game, no streets");
  assert.equal(PEOPLE.nadia.world, undefined, "care road: no streets");
});

test("Tom: the car insurance renews on 2 November, 8% more, and is flagged", () => {
  const p = PEOPLE.tom;
  assert.ok(p.world);
  const { places } = buildPlaces(p.world, lifeOf(p).life, p.advisor);
  const g = places.find((x) => x.id === "garage");
  assert.ok(g?.alert, "renewal within a month");
  assert.match(g.line, /2 Nov/);
  assert.match(g.line, /\+8%/);
  const flat = places.find((x) => x.id === "home");
  assert.equal(flat?.kind, "flat");
  const remind = flat?.actions.find((a) => a.id === "index");
  assert.ok(remind && remind.type === "pick" && remind.spec.when);
  assert.deepEqual([remind.spec.when.year, remind.spec.when.month, remind.spec.when.day], [2027, 9, 18], "two weeks before the lease's first anniversary");
});

test("Market Mile: no trade button, no leaderboard, no live prices, no price push", () => {
  const p = PEOPLE.karim;
  assert.ok(p.world);
  const { places, market } = buildPlaces(p.world, lifeOf(p).life, p.advisor);
  const towers = places.filter((x) => x.kind === "tower");
  assert.equal(towers.length, 3);
  assert.ok(market.weather && ["clear", "cloudy", "rain"].includes(market.weather.kind), "weather, never lightning");
  for (const t of towers) {
    for (const a of t.actions) {
      const label = a.type === "pick" ? a.spec.title : a.label;
      assert.ok(!/\b(buy|sell|trade|order now)\b/i.test(label), `no trading from the street: ${label}`);
    }
    assert.ok(t.news?.length && t.news.length <= 2, "two lines of demo news at most");
  }
  for (const f of ["src/hindsight/engine/world.ts", "src/hindsight/game/scene/Places.tsx", "src/hindsight/game/hud/PlacePanel.tsx"]) {
    const src = readFileSync(f, "utf8");
    assert.ok(!/Date\.now\(|setInterval\(|new Date\(\)/.test(src), `${f}: nothing depends on the clock (no live prices)`);
    assert.ok(!/leaderboard|ranking|top investors/i.test(src), `${f}: no leaderboard`);
    assert.ok(!/flash\(|push\(\s*["']price/i.test(src), `${f}: no price alerts`);
  }
  const panel = readFileSync("src/hindsight/game/hud/PlacePanel.tsx", "utf8");
  assert.ok(!/>\s*(Buy|Sell|Trade)\b/.test(panel), "no trade button in the panel");
});

test("hide amounts: every euro amount is masked, percentages and dates stay", () => {
  assert.equal(maskMoney("Home loan € 121.950 left · 49% paid back"), "Home loan € ••• left · 49% paid back");
  assert.equal(maskMoney("−€ 590 (−8,4%) since Jan 2022"), "€ ••• (−8,4%) since Jan 2022");
});

test("your streets run straight across the square between two junctions, clear of the tower", () => {
  assert.equal(net.streets.length, 2);
  for (const s of net.streets) {
    const a = s.pts[0];
    const b = s.pts[s.pts.length - 1];
    assert.ok(Math.abs(Math.hypot(a.x, a.z) - RING_R) < 0.01 && Math.abs(Math.hypot(b.x, b.z) - RING_R) < 0.01, "ends on the ring");
    assert.ok(net.junctions.some((j) => Math.hypot(j.x - a.x, j.z - a.z) < 0.01), "starts at a junction");
    for (const p of s.pts) assert.ok(Math.abs(Math.abs(p.z) - STREET_Z) < 0.01);
  }
});

test("places stand inside the ring, off the street, apart, and you can pull over at each", () => {
  for (const id of ["tom", "karim", "lina", "sofie"]) {
    const p = PEOPLE[id];
    assert.ok(p.world);
    const built = buildPlaces(p.world, lifeOf(p).life, p.advisor);
    const spots = layoutPlaces(built.places, built.market);
    assert.equal(spots.length, built.places.length);
    for (const s of spots) {
      const far = Math.hypot(Math.abs(s.x) + s.width / 2, Math.abs(s.z) + s.depth / 2);
      assert.ok(far < RING_R - HALF_W - 14, `${id}/${s.id} inside the ring (${far.toFixed(1)})`);
      assert.ok(nearest(net, s.x, s.z).dist > HALF_W + Math.min(s.width, s.depth) / 2, `${id}/${s.id} off the road`);
      assert.ok(Math.hypot(s.x, s.z) > 22, `${id}/${s.id} clear of the tower`);
      for (const o of spots) {
        if (o === s || o.street !== s.street) continue;
        assert.ok(Math.abs(o.x - s.x) >= (o.width + s.width) / 2, `${id}: ${s.id} and ${o.id} apart`);
      }
      const at = placeAt(spots, s.street, s.door.x, s.door.z);
      assert.equal(at?.id, s.id, `${id}: pull over at ${s.id}`);
    }
  }
});

test("you can drive the length of Home Street and stay on the road", () => {
  const sp = streetStart("home", 0.05);
  let car: Car = { ...sp, speed: 0 };
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < 60 * 9; i++) {
    const r = step(car, { ...NO_INPUT, up: true }, 1 / 60, net, { maxSpeed: 25, throttle: 1 });
    car = r.car;
    assert.ok(r.near.dist <= HALF_W);
    max = Math.max(max, car.x);
  }
  assert.ok(max > 60, `drove across the square (x ${max.toFixed(0)})`);
});

test("with your streets, the ring is still drivable all the way round", () => {
  let car: Car = { x: 120, z: 0, heading: Math.PI, speed: 20 };
  for (let i = 0; i < 60 * 25; i++) {
    const r = step(car, { ...NO_INPUT, up: true }, 1 / 60, net, { maxSpeed: 25, throttle: 1 });
    car = r.car;
    assert.ok(r.near.dist <= HALF_W, "stays on the road");
  }
  assert.ok(Math.abs(Math.hypot(car.x, car.z) - RING_R) < HALF_W, "still on the ring");
});
