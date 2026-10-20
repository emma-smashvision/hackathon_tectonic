// Optional PLAYWRIGHT_MODULE and CHROMIUM_PATH select a local browser installation.
/* Run from kbc-one-v8 with playwright-core available. Headless checks use port 3502. */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const results = [];
  for (const person of ["tom", "karim", "sofie", "lina", "margaret", "nadia"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1080 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://localhost:3502/?p=${person}`, {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("navigation", { name: "Main", exact: true })
      .getByRole("button", { name: "Your road", exact: true })
      .click();
    const road = page.locator(".road8");
    await road.locator("h1").waitFor();
    const heading = await road.locator("h1").innerText();
    assert(
      !/\d+% ready|readiness|asset|salary day/i.test(await road.innerText()),
    );
    if (["margaret", "nadia"].includes(person))
      assert.equal(
        await road
          .getByRole("button", { name: "Drive this road", exact: true })
          .count(),
        0,
      );
    assert.equal(
      await road
        .getByRole("button", { name: "All roads", exact: true })
        .count(),
      1,
    );
    if (["margaret", "nadia"].includes(person))
      assert.equal(await road.locator(".road8-ghosts").count(), 0);
    if (person === "nadia") {
      assert.equal(await road.locator(".road8-stop").count(), 0);
      assert(
        await road
          .getByRole("button", { name: "Talk to", exact: false })
          .isVisible(),
      );
    } else {
      const you = await road.locator(".road8-you").boundingBox();
      const next = await road.locator(".road8-next").boundingBox();
      assert(you.y < next.y);
      if (await road.locator(".road8-ghosts").count()) {
        const ghost = await road.locator(".road8-ghosts").boundingBox();
        assert(ghost.y > you.y && ghost.y < next.y);
        assert.equal(
          await road
            .locator(".road8-ghost-dots")
            .evaluate((e) => getComputedStyle(e).animationName),
          "none",
        );
      }
    }
    await page.screenshot({ path: `docs/screenshots/v8-road-${person}.png` });
    if (person === "nadia") {
      await road
        .getByRole("button", {
          name: "Show what helped others when I'm ready",
          exact: true,
        })
        .click();
      assert.equal(await road.locator(".road8-ghosts").count(), 0);
      await road.locator(".road8-stop").first().click();
    } else await road.locator(".road8-stop").first().click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    if (person === "karim") {
      assert(
        await dialog
          .getByText("Some subgroup outcomes are withheld:", { exact: false })
          .isVisible(),
      );
      await dialog
        .getByRole("button", { name: "After 3 years", exact: true })
        .click();
      assert(
        await dialog
          .getByText("Some subgroup outcomes are withheld:", { exact: false })
          .isVisible(),
      );
      await page.screenshot({
        path: "docs/screenshots/v8-road-karim-withheld.png",
      });
      await dialog
        .getByRole("button", { name: "Everyone", exact: true })
        .click();
      assert.equal(
        await dialog.getByText("Withheld", { exact: true }).count(),
        0,
      );
      await page.screenshot({
        path: "docs/screenshots/v8-road-karim-fork.png",
      });
    } else {
      const headings = await dialog.locator("h3").allTextContents();
      assert(
        headings.indexOf("What surprised people") <
          headings.indexOf("What helped"),
      );
      assert(
        headings.indexOf("What helped") <
          headings.indexOf("Notes from people ahead"),
      );
      await page.screenshot({
        path: `docs/screenshots/v8-road-${person}-stop.png`,
      });
      const action = dialog.locator(".road8-save-actions button").first();
      await action.click();
      assert.equal(await action.innerText(), "Saved ✓");
      assert(
        await dialog
          .getByText("Saved in your plan.", { exact: true })
          .isVisible(),
      );
    }
    await page.keyboard.press("Escape");
    assert.equal(await dialog.count(), 0);
    if (person === "tom") {
      await road
        .getByRole("button", { name: "Everyday · October", exact: true })
        .click();
      assert.equal(await road.locator("h1").innerText(), "Everyday");
      await road
        .getByRole("button", { name: "Moving house", exact: true })
        .click();
      await road.locator(".road8-stop").first().click();
      assert.equal(
        await page
          .getByRole("dialog")
          .locator(".road8-save-actions button")
          .first()
          .innerText(),
        "Saved ✓",
      );
      await page.keyboard.press("Escape");
    }
    if (person === "nadia") {
      await road
        .getByRole("button", { name: "Everyday · October", exact: true })
        .click();
      assert.equal(await road.locator(".road8-ghosts").count(), 0);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: `docs/screenshots/v8-road-${person}-mobile.png`,
    });
    const overflow = await road.evaluate(
      (root) => root.scrollWidth > root.clientWidth + 2,
    );
    assert.equal(overflow, false);
    assert.deepEqual(errors, []);
    results.push({
      person,
      heading,
      errors,
      checks: "timeline, gate text, stop/fork, save, reduced motion, mobile",
    });
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
