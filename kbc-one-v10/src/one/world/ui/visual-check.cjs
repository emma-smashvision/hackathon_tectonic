/* Final art integration: short screenshot pass after WB changes its renderer. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.WORLD_UI_URL || 'http://localhost:3803/dev/world-ui';
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  page.setDefaultNavigationTimeout(90000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const shot = name => page.screenshot({ path: `docs/screenshots/v11-ui-${name}-night.png` });
  for (const person of ['tom', 'karim', 'sofie', 'lina']) {
    await page.goto(`${base}?p=${person}`, { waitUntil: 'networkidle' });
    await page.locator('[data-world-ready=true]').waitFor();
    await page.waitForTimeout(500);
    await shot(person);
    assert.equal(await page.getByText('Synthetic demo crowd · not a forecast', { exact: true }).count(), 1);
    if (person === 'sofie') {
      await page.getByRole('button', { name: 'Kids · explore', exact: true }).click();
      await page.getByRole('button', { name: 'Preview a kids mini-world', exact: true }).click();
      await shot('sofie-kids');
    }
  }
  await page.goto(`${base}?p=tom`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Home · open area', exact: true }).click();
  await shot('tom-area');
  await page.getByRole('button', { name: 'Start lesson', exact: true }).first().click();
  await shot('tom-lesson');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Visit a world ahead', exact: true }).click();
  await shot('tom-ahead');
  assert.equal(await page.locator('[data-visiting=true]').count(), 1);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('main').evaluate(el => Object.assign(el.style, { inset: '45px auto auto 102px', width: '640px', height: '300px' }));
  await shot('tom-compact');
  assert.equal(await page.locator('.world11-area-label.is-fogged:visible').count(), 0);
  await page.getByRole('button', { name: 'Home · open area', exact: true }).click();
  await shot('tom-compact-area');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('Final night art: all four worlds, kids, lesson, area, ahead and 640×300 frame passed.');
})().catch(async error => { console.error(error); await browser?.close(); process.exitCode = 1; });
