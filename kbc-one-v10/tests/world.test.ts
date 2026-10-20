import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildPlaces, holdingSeries, maskMoney, mortgageAt, towerState } from "../src/hindsight/engine/world";
import { PEOPLE } from "../src/one/people";
import { lifeOf } from "../src/one/road";


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
  const src = readFileSync("src/hindsight/engine/world.ts", "utf8");
  assert.ok(!/Date\.now\(|setInterval\(|new Date\(\)/.test(src), "No live prices in the retained world model");
  assert.ok(!/leaderboard|ranking|top investors/i.test(src), "No leaderboard");
  assert.ok(!/flash\(|push\(\s*["']price/i.test(src), "No price alerts");

});

test("hide amounts: every euro amount is masked, percentages and dates stay", () => {
  assert.equal(maskMoney("Home loan € 121.950 left · 49% paid back"), "Home loan € ••• left · 49% paid back");
  assert.equal(maskMoney("−€ 590 (−8,4%) since Jan 2022"), "€ ••• (−8,4%) since Jan 2022");
});
