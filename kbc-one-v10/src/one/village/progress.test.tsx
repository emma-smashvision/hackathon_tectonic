import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "react-dom/server";
import { lessonsFor } from "../learning/lessons";
import { advanceProgress, emptyProgress, restoreProgress } from "./progress";
import { useVillageProgress } from "./useVillageProgress";

test("completion is idempotent and saved actions alone never build a floor", () => {
  for (const personaId of ["tom", "karim", "sofie", "lina", "margaret"]) {
    let state = emptyProgress(personaId);
    for (const lesson of lessonsFor(personaId)) {
      const previous = state.done.length;
      if (lesson.save) state = advanceProgress(state, { type: "save", id: lesson.save.id });
      assert.equal(state.done.length, previous);
      state = advanceProgress(state, { type: "complete", id: lesson.id });
      state = advanceProgress(state, { type: "complete", id: lesson.id });
      assert.equal(state.done.length, previous + 1);
    }
    assert.deepEqual(advanceProgress(state, { type: "reset" }), emptyProgress(personaId));
  }
});

test("restore rejects corrupt, cross-persona, unknown and duplicate identities", () => {
  for (const raw of [null, 5, [], "bad", { personaId: "karim", done: ["tom:energy-new-address"] }]) assert.deepEqual(restoreProgress("tom", raw), emptyProgress("tom"));
  assert.deepEqual(restoreProgress("tom", { personaId: "tom", done: ["tom:energy-new-address", "karim:company", "unknown", "tom:energy-new-address"], saved: ["bad", "tip:moving-house:energy-new-address:meter", "tip:moving-house:energy-new-address:meter"] }), {
    personaId: "tom", done: ["tom:energy-new-address"], saved: ["tip:moving-house:energy-new-address:meter"],
  });
  assert.deepEqual(advanceProgress(emptyProgress("nadia"), { type: "complete", id: "tom:energy-new-address" }), emptyProgress("nadia"));
});

test("progress hook renders without window or storage during SSR", () => {
  function Probe() { const p = useVillageProgress("tom"); return <span>{p.personaId}:{p.done.length}:{p.saved.length}</span>; }
  assert.equal(renderToString(<Probe />), "<span>tom<!-- -->:<!-- -->0<!-- -->:<!-- -->0</span>");
});
