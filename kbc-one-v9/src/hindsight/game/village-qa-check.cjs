// Integrated QA at the orchestrator's 1512×806 viewport. Run from kbc-one-v9.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_APP_URL || "http://localhost:3601";
const lessons = JSON.parse(
  execFileSync(
    "bun",
    [
      "-e",
      'import {lessonsFor} from "./src/one/learning/lessons"; console.log(JSON.stringify(lessonsFor("tom")))',
    ],
    { encoding: "utf8" },
  ),
);
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH,
  });
  const page = await browser.newPage({
    viewport: { width: 1512, height: 806 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(base + "/?p=tom");
    await page.locator("[data-village-entry]").waitFor();
    await page.locator(".kbc-thinking").waitFor({ state: "hidden" });
    await page.locator("[data-village-entry]").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000); // Home is visible while its scene module warms.
    assert.equal(await page.locator("canvas").count(), 0);
    await page.evaluate(() => {
      window.worldTiming = [];
      document.addEventListener(
        "click",
        (e) => {
          if (!e.target.closest("[data-village-entry]")) return;
          const start = performance.now();
          const tick = () => {
            const phone = document.querySelector(".ls-phone"),
              canvas = document.querySelector(".vg canvas");
            const t = performance.now() - start;
            window.worldTiming.push({
              t,
              phase: document.querySelector(".vg-turn")?.dataset.phase,
              canvas: !!canvas,
              ready: canvas?.dataset.worldReady === "true",
              power: document.querySelector(".ls-power")
                ? Number(
                    getComputedStyle(document.querySelector(".ls-power"))
                      .opacity,
                  )
                : 1,
              preview: !!document.querySelector(".vg-warm-preview svg"),
              transform: phone ? getComputedStyle(phone).transform : null,
            });
            if (t < 5000) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        },
        { once: true, capture: true },
      );
    });
    await page.locator("[data-village-entry]").click();
    await page.locator(".vg canvas[data-world-ready=true]").waitFor();
    await page.locator(".vg-turn.phase-playing").waitFor();
    await page.screenshot({
      path: "docs/screenshots/v9-world-qa-powered-on.png",
    });
    await page.waitForTimeout(1700);
    const timing = await page.evaluate(() => window.worldTiming);
    const firstCanvas = timing.find((t) => t.canvas),
      firstReady = timing.find((t) => t.ready);
    console.log(
      JSON.stringify({ firstCanvas, firstReady, last: timing.at(-1) }),
    );
    assert(firstCanvas && firstReady, "the scene mounts and draws");
    assert(
      new RegExp("^(none|matrix\\(1, 0, 0, 1, 0, 0\\))$").test(
        firstCanvas.transform,
      ),
      "canvas mounts after rotation",
    );
    const firstVisible = timing.find(
      (t) => t.power < 0.5 && (t.preview || t.ready),
    );
    assert(
      firstVisible && firstVisible.t - firstCanvas.t < 250,
      "power-on reveals the village immediately after the settled turn",
    );
    assert(
      firstReady.t - firstCanvas.t < 2000,
      "live scene takes over the Home preview",
    );
    await page.waitForTimeout(2600);
    await page.screenshot({ path: "docs/screenshots/v9-world-qa-village.png" });
    for (let i = 0; i < 3; i++) {
      await page
        .getByRole("button", { name: i ? /Next bump:/ : /Start lesson/ })
        .click();
      const card = page.locator('[data-lesson="' + lessons[i].id + '"]');
      await card.waitFor();
      await page.waitForTimeout(600);
      if (!i)
        await page.screenshot({
          path: "docs/screenshots/v9-world-qa-road.png",
        });
      await card
        .getByRole("button", {
          name: lessons[i].guess.choices[0].label,
          exact: true,
        })
        .click();
      await card
        .getByRole("button", { name: "See what helped", exact: true })
        .click();
      await card
        .getByRole("button", { name: "Pave this bump", exact: true })
        .click();
      await card
        .getByRole("button", {
          name: lessons[i].apply.choices.find((c) => c.correct).label,
          exact: true,
        })
        .click();
      await card
        .getByRole("button", { name: "Keep this lesson", exact: true })
        .click();
      await card
        .getByRole("button", {
          name: i === 1 ? "Not now" : lessons[i].save.label,
          exact: true,
        })
        .click();
      await page.locator(".vg-toast").waitFor();
      assert.equal(
        await page.locator(".vg-toast svg").count(),
        1,
        "crane is inline SVG",
      );
      assert.equal(
        await page.locator(".vg-labels").count(),
        0,
        "labels cannot be covered by the toast",
      );
      if (!i) {
        await page.waitForTimeout(500);
        await page.screenshot({
          path: "docs/screenshots/v9-world-qa-toast.png",
        });
      }
      await page
        .locator(".vg-toast")
        .waitFor({ state: "hidden", timeout: 3000 });
      await page.locator(".vg-labels").waitFor();
      assert.equal(
        await page.locator(".vg").getAttribute("data-built"),
        String(i + 1),
      );
    }
    await page.waitForTimeout(1200);
    await page.screenshot({ path: "docs/screenshots/v9-world-qa-done.png" });
    assert.equal(await page.locator(".vg-stamps span").count(), 3);
    await page
      .getByRole("button", { name: "← Back to app", exact: true })
      .click();
    await page.locator(".vg-turn").waitFor({ state: "hidden" });
    assert.equal(await page.locator("canvas").count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        {
          viewport: "1512x806",
          firstCanvasMs: Math.round(firstCanvas.t),
          firstVillageVisibleMs: Math.round(firstVisible.t),
          firstWorldFrameMs: Math.round(firstReady.t),
          tom: "3 lessons, 3 stamps, save/Not now, SVG toast/label restoration, return passed",
          errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
