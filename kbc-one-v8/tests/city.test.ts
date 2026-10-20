import assert from "node:assert/strict";
import { test } from "node:test";
import { getRoad } from "../src/hindsight/engine/roads";
import { nextRoads } from "../src/hindsight/game/next";

test("next roads are gated and live", () => {
  const next = nextRoads("first-home");
  assert.ok(next.length > 0);
  for (const n of next) assert.ok(n.road?.status === "live");
  assert.ok(getRoad("first-home"));
});
