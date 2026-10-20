const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SHELL_APP_URL || 'http://localhost:3804';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH,
    args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
  const errors = [];
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      const page = await browser.newPage({ viewport, hasTouch: true });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/?p=tom&reset=1`);
      await page.locator('[data-world-entry]').waitFor();
      await page.locator('.kbc-thinking').waitFor({ state: 'hidden' });
      await page.locator('[data-world-entry]').click();
      if (viewport.width < viewport.height) {
        await page.getByRole('heading', { name: 'Turn your phone to play', exact: true }).waitFor();
        assert.equal(await page.locator('canvas').count(), 0);
        await page.screenshot({ path: path.resolve('docs/screenshots/v11-shell-tom-portrait.png') });
        await page.getByRole('button', { name: 'Open plain lessons', exact: true }).click();
        await page.getByRole('dialog', { name: 'Plain world', exact: true }).waitFor();
        assert.equal(await page.locator('.ls-wrap').count(), 0);
        await page.screenshot({ path: path.resolve('docs/screenshots/v11-shell-tom-portrait-plain.png') });
      } else {
        await page.locator('.ls-wrap[data-phase="playing"] canvas').waitFor();
        await page.waitForTimeout(1200);
        await page.screenshot({ path: path.resolve('docs/screenshots/v11-shell-tom-compact.png') });
        await page.getByRole('navigation', { name: 'World areas', exact: true }).getByRole('button', { name: 'Home · open area', exact: true }).click();
        await page.getByRole('heading', { name: 'Hindsight blueprints', exact: true }).waitFor();
        await page.screenshot({ path: path.resolve('docs/screenshots/v11-shell-tom-compact-area.png') });
        await page.getByRole('button', { name: 'Close area panel', exact: true }).click();
        await page.getByRole('navigation', { name: 'World controls', exact: true }).getByRole('button', { name: 'Exit', exact: true }).click();
        await page.locator('.ls-wrap').waitFor({ state: 'detached' });
      }
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: portrait has no canvas and opens plain world; compact landscape opens world/area and exits');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
