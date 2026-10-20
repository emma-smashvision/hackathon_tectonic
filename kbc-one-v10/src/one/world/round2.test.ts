import { expect, test } from "bun:test";
import { PEOPLE } from "../people";
import { advanceProgress, emptyProgress, restoreProgress } from "../village/progress";
import { exploreArea, kidsWorldFor, stormsFor, worldFor, WORLD_TODAY } from "./model";
import { financeFor, ownPercent } from "./finance";
import { formatWorldDate } from "./dates";
import { restoreUnlocks, unlockArea, unlockRulesFor } from "./unlocks";
import type { AreaId } from "./types";

const personas = Object.keys(PEOPLE);
test("every persona has one stable demo storm, except calm/care; Tom has Home energy", () => {
  for (const id of personas) {
    const storms = stormsFor(id);
    expect(storms).toHaveLength(["nadia", "margaret"].includes(id) ? 0 : 1);
    if (!storms.length) continue;
    const storm = storms[0];
    const saved = { personaId: id, done: [storm.lessonId], saved: [storm.saveId!] };
    expect(stormsFor(id, saved)[0].id).toBe(storm.id);
    expect(stormsFor(id, saved)[0].prepared).toBe(true);
    expect(stormsFor(id, undefined, { today: "2030-01-01" })[0].id).toBe(storm.id);
    expect(storm.dateLabel).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(storm.shareLabel).not.toMatch(/simulated|published|capacity/);
    expect(worldFor(id).areas.flatMap(a => a.storms).map(s => s.id)).toEqual([storm.id]);
  }
  expect(stormsFor("tom")[0]).toMatchObject({ areaId: "home", stopId: "energy-new-address", dueDate: "2027-02-01" });
});

test("three unlock keys, persistent actions, automatic existing products and read-only exploration", () => {
  const source = JSON.stringify(PEOPLE);
  for (const personaId of personas) {
    const empty = emptyProgress(personaId);
    for (const area of worldFor(personaId).areas) {
      expect(area.unlock.keys.map(k => k.key)).toEqual(["life-event", "goal", "existing-product"]);
      if (area.care) {
        expect(unlockArea(empty, area.id, "life-event")).toEqual(empty);
        expect(exploreArea(personaId, area.id)).toBeNull();
        continue;
      }
      const before = worldFor(personaId, empty);
      const preview = exploreArea(personaId, area.id)!;
      expect(preview.areaId).toBe(area.id);
      expect(preview.crowd.every(c => c.denominator.shown)).toBe(true);
      expect(worldFor(personaId, empty)).toEqual(before);
      if (area.id === "kids") expect(preview.crowd).toEqual([]);
      const state = advanceProgress(empty, { type: "unlock", areaId: area.id, key: "life-event" });
      const restored = restoreProgress(personaId, JSON.parse(JSON.stringify(state)));
      expect(worldFor(personaId, restored).areas.find(a => a.id === area.id)?.locked).toBe(false);
      expect(worldFor(personaId, restored).areas.find(a => a.id === area.id)!.stage).toBeGreaterThanOrEqual(1);
      expect(advanceProgress(state, { type: "unlock", areaId: area.id, key: "life-event" })).toEqual(state);
      expect(advanceProgress(state, { type: "reset" })).toEqual(empty);
      if (area.unlock.keys[2].satisfied) expect(area.active).toBe(true);
    }
    expect(empty).toEqual(emptyProgress(personaId));
  }
  expect(JSON.stringify(PEOPLE)).toBe(source);
  expect(unlockRulesFor("lina", "kids").unlockedBy).toBe("existing-product");
  expect(unlockRulesFor("sofie", "kids").unlockedBy).toBeNull();
  expect(exploreArea("unknown", "home")).toBeNull();
});

test("goals accept any positive amount, use own targets and restore without crossing personas", () => {
  for (const personaId of personas) {
    const empty = emptyProgress(personaId);
    const goal = { label: "My own plan", target: .01, saved: 0 };
    const state = advanceProgress(empty, { type: "unlock", areaId: "abroad", key: "goal", goal });
    expect(worldFor(personaId, state).areas.find(a => a.id === "abroad")?.active).toBe(true);
    expect(financeFor(personaId, "abroad", state).goals[0].percent).toBe(0);
    expect(restoreProgress(personaId, JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(restoreProgress(personaId === "tom" ? "karim" : "tom", state).unlocks).toBeUndefined();
  }
  const state = unlockArea(emptyProgress("lina"), "kids", "goal", { label: "Noor’s chosen goal", target: 10, saved: 3.1 });
  expect(financeFor("lina", "kids", state).child?.goal?.percent).toBe(31);
  expect(kidsWorldFor("lina", state)?.goals[0].percent).toBe(31);
  expect(financeFor("lina", "kids").child?.goal).toBeNull();
});

test("untrusted unlocks reject unknown areas, fake products, malformed amounts and care actions", () => {
  const invalid = [null, {}, { areaId: "__proto__", key: "life-event" }, { areaId: "care", key: "life-event" }, { areaId: "kids", key: "existing-product" }, { areaId: "kids", key: "purchase" }, ...[0, -1, NaN, Infinity, "10"].map(target => ({ areaId: "kids", key: "goal", goal: { label: "A goal", target } })), { areaId: "kids", key: "goal", goal: { label: " ", target: 1 } }, { areaId: "kids", key: "goal", goal: { label: "Goal", target: 1, saved: -1 } }];
  expect(restoreUnlocks("tom", invalid)).toEqual([]);
  expect(restoreUnlocks("nadia", [{ areaId: "care", key: "life-event" }])).toEqual([]);
  expect(restoreUnlocks("__proto__", [{ areaId: "home", key: "life-event" }])).toEqual([]);
  const one = { areaId: "kids", key: "life-event" };
  expect(restoreUnlocks("tom", [one, one])).toHaveLength(1);
});

test("Karim's annuity uses original, rate, start and term; count and principal clamp at both ends", () => {
  const finance = financeFor("karim", "home");
  expect(finance.mortgage).toMatchObject({ original: 240000, repaidPrincipal: 118051.23, remaining: 121948.77, paymentsMade: 176, totalPayments: 300, percent: 49, monthlyPayment: 1150.63, fixedRate: true, balanceInsurance: true, homeInsurance: true });
  expect(finance.attachments.map(a => a.visual)).toEqual(["shield", "foundation", "foundation"]);
  expect(financeFor("karim", "home", undefined, "2011-01-01").mortgage?.paymentsMade).toBe(0);
  expect(financeFor("karim", "home", undefined, "2040-01-01").mortgage).toMatchObject({ paymentsMade: 300, remaining: 0, percent: 100 });
  expect(financeFor("karim", "home", undefined, "2026-11-01").mortgage?.paymentsMade).toBe(177);
  expect(finance.summary).toContain("€ 118.051 of € 240.000 repaid");
});

test("rent and future home do not invent Tom's current history; known leases use their own schedule", () => {
  const tom = financeFor("tom", "home");
  expect(tom.percent).toBe(72);
  expect(tom.rent).toMatchObject({ city: "Leuven", paid: null, paymentsMade: null, tenantInsurance: true, nextHome: { city: "Gent", monthly: 950, startsOn: "2026-11-01", dateLabel: "1 Nov 2026", goalPercent: 72 } });
  expect(financeFor("tom", "home", undefined, "2026-11-01").rent).toMatchObject({ city: "Gent", paymentsMade: 1, paid: 950 });
  expect(financeFor("lina", "home").rent).toMatchObject({ paymentsMade: 62, paid: 62 * 890 });
  expect(financeFor("sofie", "home").percent).toBe(69);
});

test("car renewal, goals and pension proportions use only the person's source numbers", () => {
  expect(financeFor("tom", "car").car).toMatchObject({ renewalDate: "2026-11-02", renewalLabel: "2 Nov 2026", yearlyPremium: 412, previousPremium: 381, changePercent: 8, loanPercent: null });
  expect(financeFor("tom", "car", undefined, "2027-01-01").car?.renewalDate).toBe("2026-11-02");
  expect(financeFor("karim", "pension").pension).toEqual({ contributed: 870, yearlyMax: 1050, percent: 83, yearsContributed: null });
  for (const id of ["sofie", "lina"]) expect(financeFor(id, "pension").percent).toBe(0);
  expect(financeFor("lina", "savings").goals[0]).toMatchObject({ saved: 540, target: 1200, percent: 45 });
  expect(financeFor("margaret", "savings").percent).toBeNull();
  expect(financeFor("margaret", "pension").pension).toBeUndefined();
  for (const id of personas) for (const area of worldFor(id).areas) {
    expect(area.finance.label).toBe("Your demo numbers");
    if (area.finance.percent !== null) { expect(area.finance.percent).toBeGreaterThanOrEqual(0); expect(area.finance.percent).toBeLessThanOrEqual(100); }
    expect(area.attachments).toEqual(area.finance.attachments);
    expect(new Set(area.attachments.map(a => a.id)).size).toBe(area.attachments.length);
  }
  expect(ownPercent(300, 100)).toBe(100);
  expect(ownPercent(-5, 100)).toBe(0);
  expect(ownPercent(20, 0)).toBe(0);
});

test("human dates are stable, unknown people and invalid areas disclose no finances", () => {
  expect(formatWorldDate("2027-01-01")).toBe("1 Jan 2027");
  expect(formatWorldDate("2026-02-31")).toBe("Date not recorded");
  expect(financeFor("__proto__", "home").attachments).toEqual([]);
  expect(financeFor("tom", "bogus" as AreaId).percent).toBeNull();
  expect(financeFor("karim", "home", undefined, "bad-date")).toEqual(financeFor("karim", "home", undefined, WORLD_TODAY));
});

// r2-wu: accessibility and consent must coexist with normal district data/actions.
test("all six enter their world; Nadia's care alone has no game layer", () => {
  for (const id of personas) expect(worldFor(id).playable).toBe(true);
  expect(worldFor("margaret").mode).toBe("calm");
  expect(stormsFor("margaret")).toEqual([]);
  const nadia = worldFor("nadia");
  expect(nadia.mode).toBe("game");
  for (const id of ["home", "savings", "work"]) {
    const area = nadia.areas.find(item => item.id === id)!;
    expect(area.active).toBe(true);
    expect(area.quests.length).toBeGreaterThan(0);
  }
  expect(financeFor("nadia", "home").summary).toContain("€ 720/month mortgage");
  expect(financeFor("nadia", "home").mortgage).toBeUndefined();
  const care = nadia.areas.find(item => item.care)!;
  expect(care.locked).toBe(true);
  const opened = worldFor("nadia", undefined, { careOptIn: true }).areas.find(item => item.care)!;
  expect(opened.locked).toBe(false);
  expect(opened.stage).toBe(0);
  expect(opened.quests).toEqual([]);
  expect(opened.storms).toEqual([]);
  const lesson = nadia.areas.find(item => item.id === "home")!.quests[0];
  expect(advanceProgress(emptyProgress("nadia"), { type: "complete", id: lesson.id }).done).toContain(lesson.id);
});
