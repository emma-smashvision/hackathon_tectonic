import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// Guard rail: text drawn inside the 3D scene can be hidden behind buildings, lamp posts
// and cars. All readable text must go through the screen-space label layer instead.
test("the 3D scene draws no text", () => {
  const dirs = ["src/hindsight/game"];
  for (const dir of dirs) {
    for (const f of readdirSync(dir)) {
      if (!/\.(ts|tsx)$/.test(f)) continue;
      const src = readFileSync(join(dir, f), "utf8");
      assert.ok(!/fillText|strokeText/.test(src), `${dir}/${f} draws text on a canvas`);
      assert.ok(!/<sprite\b/.test(src), `${dir}/${f} uses a sprite (text billboard)`);
      assert.ok(!/labelTexture/.test(src), `${dir}/${f} uses a text texture`);
    }
  }
});
