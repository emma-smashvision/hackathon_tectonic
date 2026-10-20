// Optional PLAYWRIGHT_MODULE and CHROMIUM_PATH select a local browser installation.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:3502/?p=tom");
  await page
    .getByRole("navigation", { name: "Main", exact: true })
    .getByRole("button", { name: "Your road", exact: true })
    .click();
  const road = page.locator(".road8");
  await road.getByRole("button", { name: "All roads", exact: true }).click();
  const atlas = page.getByTestId("all-roads");
  await atlas.getByRole("button", { name: /First home.*drove it/ }).click();
  await atlas
    .getByLabel("Where would you like to start?")
    .selectOption("start");
  await atlas
    .getByRole("button", { name: "Explore First home", exact: true })
    .click();
  assert.equal(await road.locator("h1").innerText(), "First home");
  let pointers = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kbcone.v8.pointers:tom")),
  );
  assert.equal(pointers.confirmed.roadId, "moving-house");
  assert.equal(pointers.exploring.at(-1).roadId, "first-home");
  await road.getByRole("button", { name: /First energy settlement/ }).click();
  assert.equal(
    await page.getByRole("dialog").locator("h2").innerText(),
    "First energy settlement",
  );
  await page.screenshot({ path: "docs/screenshots/v8-road-atlas-preview.png" });
  await page.keyboard.press("Escape");
  await road.getByRole("button", { name: "All roads", exact: true }).click();
  await atlas.getByRole("button", { name: /Caring for a parent/ }).click();
  await atlas
    .getByRole("button", {
      name: "Show what helped others when I’m ready",
      exact: true,
    })
    .click();
  await atlas
    .getByLabel("Where would you like to start?")
    .selectOption("start");
  await atlas
    .getByRole("button", { name: "Explore Caring for a parent", exact: true })
    .click();
  assert.equal(await road.locator(".road8-ghosts").count(), 0);
  assert((await road.locator(".road8-stop").count()) > 0);
  await road.locator(".road8-stop").first().click();
  assert(
    await page
      .getByRole("dialog")
      .getByRole("heading", { name: "What helped", exact: true })
      .isVisible(),
  );
  await page.screenshot({ path: "docs/screenshots/v8-road-care-preview.png" });
  await page.keyboard.press("Escape");
  await road.getByRole("button", { name: "All roads", exact: true }).click();
  await atlas
    .getByRole("button", { name: /Going freelance.*drove it/ })
    .click();
  await atlas
    .getByLabel("Where would you like to start?")
    .selectOption("start");
  await atlas.getByText("This is my situation", { exact: true }).click();
  await atlas.getByLabel("Date of this stage").fill("2026-10-18");
  await atlas
    .getByRole("button", { name: "Confirm my situation", exact: true })
    .click();
  assert.equal(await road.locator("h1").innerText(), "Going freelance");
  assert(
    !(await road.locator(".road8-provenance").innerText()).includes(
      "moving to Gent",
    ),
  );
  pointers = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kbcone.v8.pointers:tom")),
  );
  assert.equal(pointers.confirmed.roadId, "freelance");
  await page.screenshot({ path: "docs/screenshots/v8-road-confirmed.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: All roads callback, preview preserves Moving house, exact stop, per-road care consent, confirmed provenance; no page errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
