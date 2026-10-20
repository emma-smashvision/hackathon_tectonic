/* KBC_AI=off bunx next dev -p 3803. Uses the real local model/Notes API and WB scene. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.WORLD_UI_URL || 'http://localhost:3803/dev/world-ui';
const shots = 'docs/screenshots';
const people = ['tom', 'karim', 'sofie', 'lina'];
let browser;
(async () => {
  fs.mkdirSync(shots, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const shot = name => page.screenshot({ path: `${shots}/v11-ui-${name}.png` });
  const panel = () => page.getByTestId('world-panel');
  async function open(person) {
    await page.goto(`${base}?p=${person}`, { waitUntil: 'networkidle' });
    await page.getByTestId('world-game').waitFor();
    await page.locator('[data-world-ready=true]').waitFor();
    await page.getByRole('button', { name: 'Reset world demo', exact: true }).click();
    await page.waitForTimeout(500);
    assert.equal(await page.getByText('Synthetic demo crowd · not a forecast', { exact: true }).count(), 1);
  }
  async function state(person) { return page.evaluate(id => JSON.parse(localStorage.getItem(`kbcone.v9.village:${id}`) || 'null'), person); }
  async function finishLesson(save) {
    const card = page.locator('[data-lesson]');
    await card.getByRole('button').first().click();
    await card.getByRole('button', { name: 'See what helped', exact: true }).click();
    await card.getByRole('button', { name: 'Pave this bump', exact: true }).click();
    await card.getByRole('button').nth(1).click();
    assert.equal(await card.getByRole('button', { name: 'Keep this lesson', exact: true }).count(), 0, 'Wrong application cannot earn a blueprint');
    await card.getByRole('button').first().click();
    await card.getByRole('button', { name: 'Keep this lesson', exact: true }).click();
    if (save) await card.getByRole('button').first().click();
    else await card.getByRole('button', { name: 'Not now', exact: true }).click();
    assert.equal(await card.getAttribute('data-step'), 'done');
  }
  for (const person of people) {
    await open(person);
    await shot(`${person}-world`);
    await page.getByRole('button', { name: 'Home · open area', exact: true }).click();
    assert.ok(await panel().getByRole('heading', { name: 'Hindsight blueprints', exact: true }).count());
    await shot(`${person}-area`);
    await panel().getByRole('button', { name: 'Start lesson', exact: true }).first().click();
    await shot(`${person}-lesson`);
    await page.getByRole('button', { name: 'Close area panel', exact: true }).click();
    assert.equal((await state(person)).done.length, 0, 'Unfinished lesson awards nothing');
    await page.getByRole('button', { name: 'Private banking · explore', exact: true }).click();
    assert.match(await panel().innerText(), /You are exploring/);
    await shot(`${person}-explore`);
    assert.equal((await state(person)).done.length, 0);
    await page.keyboard.press('Escape');
    assert.equal(await panel().count(), 0);
  }
  await open('tom');
  await page.getByRole('button', { name: 'Home · open area', exact: true }).click();
  await panel().getByRole('button', { name: 'Prepare this area', exact: true }).click();
  await panel().getByRole('button', { name: 'Learn how to prepare', exact: true }).click();
  await finishLesson(false);
  assert.equal((await state('tom')).done.length, 1);
  assert.equal((await state('tom')).saved.length, 0, 'Not now never prepares a shield');
  await panel().getByRole('button', { name: 'See my preparation', exact: true }).click();
  await shot('tom-storm-learned');
  await panel().getByRole('button', { name: /Save|Put|Set|Remind|Photograph|Check/i }).first().click();
  await page.getByText('Shield built. Your preparation is saved.', { exact: true }).waitFor();
  assert.equal((await state('tom')).saved.length, 1);
  await shot('tom-shield');
  await panel().getByRole('button', { name: 'Return to your area', exact: true }).click();
  await panel().getByRole('button', { name: 'Drive this road', exact: true }).first().click();
  assert.match(await page.getByTestId('shell-event').innerText(), /Drive requested: tom:/);
  await page.getByTestId('shell-event').evaluate(el => { el.style.visibility = 'hidden'; });
  const beforeVisit = await state('tom');
  await panel().getByRole('button', { name: 'Visit a world ahead', exact: true }).click();
  await shot('tom-ahead');
  await panel().getByRole('button', { name: 'Return to my world', exact: true }).click();
  assert.deepEqual(await state('tom'), beforeVisit, 'Visiting must not write progress');
  await panel().getByRole('button', { name: 'Revisit lesson', exact: true }).first().click();
  await finishLesson(false);
  assert.equal((await state('tom')).done.length, 1, 'Replays do not double-award');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal((await state('tom')).done.length, 1, 'Completion persists after reload');
  await open('sofie');
  await page.getByRole('button', { name: 'Kids · explore', exact: true }).click();
  await panel().getByRole('button', { name: 'Preview a kids mini-world', exact: true }).click();
  assert.match(await panel().innerText(), /Family preview/);
  await shot('sofie-kids');
  await panel().getByRole('button', { name: /1\./ }).click();
  await finishLesson(false);
  await panel().getByRole('button', { name: 'See our mini-world', exact: true }).click();
  assert.equal((await state('sofie')).done.length, 1);
  await shot('sofie-kids-built');
  await page.setViewportSize({ width: 844, height: 390 });
  await open('tom');
  await page.locator('main').evaluate(el => { Object.assign(el.style, { inset: '45px auto auto 102px', width: '640px', height: '300px' }); });
  await page.getByRole('button', { name: 'Home · open area', exact: true }).click();
  await panel().getByRole('button', { name: 'Start lesson', exact: true }).first().click();
  await shot('tom-compact');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.setViewportSize({ width: 390, height: 844 });
  await open('lina');
  await page.getByRole('button', { name: 'Home · open area', exact: true }).click();
  await shot('lina-phone');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  for (const person of ['margaret', 'nadia']) {
    await page.goto(`${base}?p=${person}`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('canvas').count(), 0);
    await page.getByRole('button', { name: 'Open plain view', exact: true }).click();
    assert.equal(await page.getByTestId('shell-event').innerText(), 'Plain view requested');
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('World UI browser check passed: four worlds, paths, lesson/repair flow, drive callback, persisted shield, ahead, locked preview, kids co-build, compact/phone, plain/care.');
})().catch(async error => { console.error(error); await browser?.close(); process.exitCode = 1; });
