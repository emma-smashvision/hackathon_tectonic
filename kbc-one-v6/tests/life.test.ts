import assert from "node:assert/strict";
import { test } from "node:test";
import { calOf, EVERYDAY, EVERYDAY_STOPS, kOf } from "../src/hindsight/engine/everyday";
import { type Journey, newJourney } from "../src/hindsight/engine/game";
import { K_MIN } from "../src/hindsight/engine/gate";
import { buildRecap, computeLife, fuelCrowd, goalCrowd, potSpec, todayPick } from "../src/hindsight/engine/life";
import { LIVES } from "../src/hindsight/engine/lives";
import { getRoad, LIVE_ROADS, ROADS } from "../src/hindsight/engine/roads";
import { statsFor } from "../src/hindsight/engine/simulate";

const road = (id: string) => {
  const r = getRoad(id);
  if (!r) throw new Error(id);
  return r;
};
const wealth = (l: ReturnType<typeof computeLife>) => l.account + l.pots.reduce((s, p) => s + p.balance, 0);
const advance = (j: Journey, months: number): Journey => ({ ...j, month: j.month + months });

test("the calendar: journey month anchor is 17 October 2026", () => {
  assert.deepEqual(calOf(3, 3), { year: 2026, month: 9 });
  assert.deepEqual(calOf(3, 4), { year: 2026, month: 10 });
  assert.deepEqual(calOf(3, 6), { year: 2027, month: 0 });
  assert.equal(kOf(3, { year: 2027, month: 0 }), 6);
  const l = computeLife(road("first-home"), newJourney(road("first-home")));
  assert.equal(l.today.day, 17);
  assert.equal(l.account, LIVES["first-home"].balance);
});

test("every persona has a life, and every everyday stop has a crowd", () => {
  for (const r of ROADS) assert.ok(LIVES[r.id], `${r.id} has money`);
  for (const s of EVERYDAY_STOPS) {
    const st = statsFor(EVERYDAY, s);
    assert.ok(st.n >= K_MIN, `${s.id} crowd`);
  }
});

test("the life replay is deterministic", () => {
  for (const r of LIVE_ROADS) {
    const j = advance(newJourney(r), Math.min(4, r.months - r.persona.month));
    assert.deepEqual(computeLife(r, j), computeLife(r, j), r.id);
  }
});

test("everyday stops follow the household: owners get the property tax letter", () => {
  const owner = computeLife(road("freelance"), newJourney(road("freelance")));
  assert.ok(owner.upcoming.some((u) => u.scope === "everyday" && u.ref.id === "property-tax"));
  // Lotte's property tax is already a stop on her First home road, so it isn't doubled
  const lotte = computeLife(road("first-home"), newJourney(road("first-home")));
  assert.ok(!lotte.upcoming.some((u) => u.scope === "everyday" && u.ref.id === "property-tax"));
  assert.ok(lotte.upcoming.some((u) => u.scope === "road" && u.ref.id === "property-tax"));
  // no holiday pay for a freelancer
  assert.ok(!owner.upcoming.some((u) => u.ref.id === "holiday-pay"));
});

test("tips turn into pots and pave the bump; money only moves, it never appears", () => {
  const r = road("first-home");
  const base = newJourney(r);
  const prepared: Journey = { ...base, done: { "energy-settlement": ["pot"] }, doneAt: { "energy-settlement|pot": base.month } };
  const now = computeLife(r, prepared);
  const pot = now.pots.find((p) => p.forKey === "energy-settlement");
  assert.ok(pot && pot.balance === 45, "first €45 goes to the pot right away");
  assert.equal(computeLife(r, base).account - now.account, 45);

  const after = computeLife(r, advance(prepared, 2));
  const unprep = computeLife(r, advance(base, 2));
  const out = after.history.flatMap((m) => m.stops).find((s) => s.ref.id === "energy-settlement");
  const out0 = unprep.history.flatMap((m) => m.stops).find((s) => s.ref.id === "energy-settlement");
  assert.equal(out?.outcome, "paved");
  assert.equal(out?.fromPot, 90, "two monthly transfers of €45");
  assert.equal(out?.fromAccount, 0, "a paved bump doesn't hit the account");
  assert.equal(out0?.outcome, "hit");
  assert.equal(out0?.fromAccount, out0?.amount);
  assert.ok(Math.abs(wealth(after) - wealth(unprep)) < 1, "preparing moves money, it doesn't create it");
});

test("a parked boost lands in savings instead of the account", () => {
  const r = road("first-home");
  const base = advance(newJourney(r), 1);
  const parked: Journey = { ...base, done: { "notary-refund": ["main"] } };
  const a = computeLife(r, parked);
  const b = computeLife(r, base);
  const sv = (l: typeof a) => l.pots.find((p) => p.id === "savings")?.balance ?? 0;
  const refund = a.history[0].stops.find((s) => s.ref.id === "notary-refund");
  assert.equal(refund?.outcome, "parked");
  assert.equal(sv(a) - sv(b), refund?.amount);
  assert.equal(b.account - a.account, refund?.amount);
});

test("goals: a faster pace arrives earlier, and the crowd odds move with it", () => {
  const r = road("first-home");
  const j = newJourney(r);
  const slow = computeLife(r, { ...j, goals: { renovation: { monthly: 100 } } }).goals[0];
  const fast = computeLife(r, { ...j, goals: { renovation: { monthly: 300 } } }).goals[0];
  assert.ok(slow.etaMonths != null && fast.etaMonths != null && fast.etaMonths < slow.etaMonths);
  const odds = [100, 200, 300].map((m) => goalCrowd(r, { ...slow, monthly: m }, 1).reach.value ?? 0);
  assert.ok(odds[0] <= odds[1] + 0.02 && odds[1] <= odds[2] + 0.02, `odds rise with pace: ${odds}`);
  const g = goalCrowd(r, slow, 1);
  assert.ok((g.reachAuto.value ?? 0) > (g.reachManual.value ?? 0), "automating the transfer made the difference");
});

test("goal odds are held back when too few drivers started like you", () => {
  const r = road("moving-abroad");
  const g = computeLife(r, newJourney(r)).goals[1];
  const odd = goalCrowd(r, { ...g, monthly: g.defaultMonthly * 5 }, 1);
  assert.equal(odd.reach.shown, false);
  assert.ok(odd.reach.n < K_MIN);
});

test("salary day closes the month into a recap", () => {
  const r = road("first-home");
  const j = newJourney(r);
  const before = computeLife(r, j);
  const after = computeLife(r, advance(j, 1));
  const recap = buildRecap(r, before, after, false);
  assert.ok(recap);
  assert.equal(recap.month.k, j.month);
  assert.equal(recap.month.partial, true);
  assert.equal(recap.month.income, 2650);
  assert.equal(after.today.day, 1);
  assert.deepEqual(after.today.cal, { year: 2026, month: 10 });
});

test("the fuel gauge and the trip computer", () => {
  for (const r of LIVE_ROADS) {
    const l = computeLife(r, newJourney(r));
    assert.ok(Number.isFinite(l.fuel) && l.fuel >= 0, `${r.id} fuel`);
    assert.equal(l.curve.length, 31, `${r.id} 30 days ahead`);
    assert.ok(fuelCrowd(r).shown, `${r.id} crowd fuel`);
  }
});

test("tip labels become pots", () => {
  assert.deepEqual(potSpec("x", "s", "a", "Set aside €45 a month"), { kind: "monthly", amount: 45 });
  assert.deepEqual(potSpec("x", "s", "a", "Build a €1,500 buffer"), { kind: "target", amount: 1500 });
  assert.deepEqual(potSpec("x", "s", "a", "Put 5% aside automatically"), { kind: "pct", pct: 0.05 });
  assert.deepEqual(potSpec("x", "s", "a", "Spread it out monthly"), { kind: "spread" });
  assert.equal(potSpec("x", "s", "a", "Remind me in May"), null);
});

test("care roads stay quiet: no nudges before the customer opts in", () => {
  for (const id of ["separation", "losing-parent", "job-loss"]) {
    const r = road(id);
    const j = newJourney(r);
    const p = todayPick(r, j, computeLife(r, j));
    assert.equal(p.tone, "care");
    assert.equal(p.action, undefined);
  }
});
