import assert from "node:assert/strict";
import { test } from "node:test";
import { stopEvidenceFor, roadViewFor } from "../crowd";
import { PEOPLE } from "../people";
import { lessonsFor, lessonById } from "./lessons";
import { lessonEvidence, money } from "./evidence";
import { villageFor } from "../village/model";

test("six personas have their own lessons and only real family/business plots; care has no game or reward", () => {
  const counts: Record<string, number> = { tom: 3, karim: 1, sofie: 1, lina: 1, margaret: 1, nadia: 0 };
  const before = JSON.stringify(PEOPLE);
  const all = new Set<string>();
  for (const [id, count] of Object.entries(counts)) {
    const lessons = lessonsFor(id);
    const village = villageFor(id);
    assert.equal(lessons.length, count);
    const plotCount = ["karim", "sofie", "lina"].includes(id) ? 5 : 4;
    assert.equal(village.plots.length, plotCount);
    assert.equal(new Set(village.plots.map(p => p.id)).size, plotCount);
    assert.equal(village.plots.some(p => p.kind === "family"), ["sofie", "lina"].includes(id));
    assert.equal(village.plots.some(p => p.kind === "business"), id === "karim");
    assert.equal(village.playable, !["margaret", "nadia"].includes(id));
    assert.deepEqual(village.destination?.lessonIds ?? [], lessons.map(l => l.id));
    for (const [index, lesson] of lessons.entries()) {
      assert.equal(lesson.personaId, id);
      assert.equal(lesson.order, index + 1);
      assert.equal(lessonById(lesson.id), lesson);
      assert.equal(all.has(lesson.id), false);
      all.add(lesson.id);
      assert.ok(lesson.apply.choices.some(c => c.correct));
      assert.ok(lesson.apply.choices.some(c => !c.correct));
      assert.ok(lesson.apply.choices.every(c => c.why));
      assert.ok(lesson.guess.choices.some(c => c.id === "unsure"));
      assert.equal(lesson.synthetic, true);
    }
  }
  assert.equal(villageFor("nadia").destination, undefined);
  assert.equal(JSON.stringify(PEOPLE), before);
  for (const id of ["unknown", "__proto__", "toString"]) {
    assert.deepEqual(lessonsFor(id), []);
    assert.equal(villageFor(id).playable, false);
    assert.equal(lessonById(`${id}:energy-new-address`), undefined);
  }
});

test("Tom order and stable crowd save IDs match entry contract", () => {
  assert.deepEqual(lessonsFor("tom").map(l => l.id), ["tom:energy-new-address", "tom:setting-up", "tom:old-deposit"]);
  assert.equal(villageFor("tom").destination?.title, "New flat in Gent");
  assert.equal(lessonsFor("tom")[0].save?.pick, "tip:moving-house:energy-new-address:meter");
  assert.equal(lessonsFor("tom")[2].helped.length, 0);
  assert.match(lessonsFor("tom")[2].reveal.detail!, /Refund timing varies/);
});

test("reveals keep the learning fact and leave demo disclosures to the host footer", () => {
  assert.equal(lessonsFor("tom")[0].reveal.headline, `1 in 7 movers got a first bill their buffer couldn't cover. Typical bill: ${money(240)}.`);
  assert.equal(lessonsFor("tom")[0].note?.by, "— a mover");
  assert.equal(lessonsFor("tom")[1].note?.by, "— a mover, 2025");
  for (const persona of Object.keys(PEOPLE)) for (const lesson of lessonsFor(persona)) {
    assert.doesNotMatch(JSON.stringify(lesson), /in this demo|This describes the demo group|not your next bill|Illustrative note|not a personal prediction|No appointment or notification/i);
    if (lesson.note) assert.match(lesson.note.by, /^— a /);
  }
});

test("readable ratios derive only from published rates and avoid misleading rounding", () => {
  const e = structuredClone(stopEvidenceFor("moving-house", "energy-new-address")!);
  for (const [value, prefix] of [[.15, "1 in 7"], [.17, "1 in 6"], [.18, "18% of"], [.4, "40% of"], [0, "0% of"], [1, "100% of"]] as const) {
    e.surprised.share = { shown: true, value, reason: "Published test value" };
    assert.ok(lessonEvidence(e).reveal.headline.startsWith(prefix));
  }
  e.surprised.share = { shown: false, value: .15, reason: "Withheld" };
  assert.doesNotMatch(lessonEvidence(e).reveal.headline, /1 in 7|15%/);
  e.surprised.median = { shown: false, value: 240, reason: "Withheld" };
  assert.doesNotMatch(lessonEvidence(e).reveal.headline, /240/);
});

test("all stop lesson figures equal gated adapter measurements in ranked order", () => {
  for (const id of ["tom", "sofie", "lina", "margaret"]) for (const lesson of lessonsFor(id)) {
    const stopId = lesson.stopId.slice(lesson.roadId.length + 1);
    const e = stopEvidenceFor(lesson.roadId, stopId)!;
    assert.ok(e.available);
    assert.deepEqual(lesson.helped, e.helped.map(h => ({ label: h.label, ...(h.outcome.shown ? { share: Math.round(h.outcome.value! * 100) } : {}) })));
    if (e.surprised.median.shown) assert.ok(`${lesson.reveal.headline} ${lesson.reveal.detail}`.includes(money(e.surprised.median.value!)));
    assert.ok(!lesson.note || e.notes.some(n => n.text === lesson.note?.text));
  }
});

test("withheld evidence cannot leak even a malformed non-null measurement", () => {
  const e = structuredClone(stopEvidenceFor("moving-house", "energy-new-address")!);
  const hidden = { shown: false, value: 1234567, reason: "Withheld test" };
  e.surprised.share = hidden;
  e.surprised.median = hidden;
  e.helped.forEach(h => { h.outcome = hidden; });
  const result = lessonEvidence(e);
  assert.equal(result.reveal.withheld, "Withheld test");
  assert.ok(result.helped.every(h => h.share === undefined));
  assert.ok(!JSON.stringify(result).includes("1234567"));
  e.available = false;
  assert.deepEqual(lessonEvidence(e).helped, []);
  assert.equal(lessonEvidence(e).note, undefined);
});

test("Karim compares both horizons without exposing the withheld matching subgroup", () => {
  const lesson = lessonsFor("karim")[0];
  const fork = roadViewFor("karim")!.fork!;
  const tableText = JSON.stringify(lesson.reveal.table);
  for (const c of fork.comparisons) {
    assert.ok(tableText.includes(`Year ${c.horizon}`));
    for (const b of c.branches) for (const m of b.metrics.filter(m => ["buffer", "admin"].includes(m.key))) {
      assert.ok(m.value.shown);
      assert.ok(tableText.includes(m.kind === "money" ? money(m.value.value!) : `${Math.round(m.value.value! * 100)}%`));
    }
  }
  assert.match(lesson.reveal.withheld!, /withheld/);
  assert.deepEqual(lesson.guess.choices.map(c => c.id), ["sole", "bv", "unsure"]);
  assert.ok(lesson.helped.every(h => h.share === undefined));
  assert.equal(lesson.note, undefined, "No fabricated fork note");
});
