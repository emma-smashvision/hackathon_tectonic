// Run from kbc-one-v10 with PLAYWRIGHT_MODULE pointing to an installed Playwright.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SHELL_APP_URL || 'http://localhost:3704';
const screenshots = path.resolve('docs/screenshots');
(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
  const results = [];
  try {
    for (const persona of ['tom', 'karim', 'sofie', 'lina', 'margaret', 'nadia']) {
      const page = await browser.newPage({ viewport: { width: 1512, height: 806 },
        reducedMotion: persona === 'lina' ? 'reduce' : 'no-preference' });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto(`${base}/?p=${persona}&reset=1`);
      const entry = page.locator('[data-village-entry]');
      await entry.waitFor();
      await page.locator('.kbc-thinking').waitFor({ state: 'hidden' });
      await entry.scrollIntoViewIfNeeded();
      assert.equal(new URL(page.url()).searchParams.has('reset'), false);
      assert.equal(await page.locator('canvas').count(), 0);
      await page.screenshot({ path: `${screenshots}/v10-shell-${persona}-home.png` });
      await page.evaluate(() => {
        window.shellCanvasViolations = [];
        const check = () => {
          const phone = document.querySelector('.ls-phone');
          if (phone?.querySelector('canvas') && !new DOMMatrixReadOnly(getComputedStyle(phone).transform).isIdentity)
            window.shellCanvasViolations.push(getComputedStyle(phone).transform);
          window.shellRaf = requestAnimationFrame(check);
        };
        check();
      });
      await entry.click();
      if (persona === 'margaret' || persona === 'nadia') {
        await page.getByRole('dialog', { name: persona === 'margaret' ? 'Plain lesson path' : 'Support options', exact: true }).waitFor();
        assert.equal(await page.locator('canvas').count(), 0);
        assert.equal(await page.locator('.ls-wrap').count(), 0);
        await page.screenshot({ path: `${screenshots}/v10-shell-${persona}-path.png` });
        await page.getByRole('button', { name: '← Back to Home', exact: true }).click();
      } else {
        await page.locator('.ls-wrap[data-phase="playing"] canvas').waitFor();
        await page.waitForTimeout(1800);
        assert.equal(await page.locator('.ls-screen').getByText('Synthetic demo crowd · not a forecast', { exact: true }).count(), 1);
        assert.equal(await page.getByRole('button', { name: 'Turn sound on', exact: true }).getAttribute('aria-pressed'), 'false');
        await page.screenshot({ path: `${screenshots}/v10-shell-${persona}-city.png` });
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: 'Reset demo', exact: true }).waitFor();
        await page.screenshot({ path: `${screenshots}/v10-shell-${persona}-pause.png` });
        await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
        await page.locator('.ls-wrap[data-phase="playing"] canvas').waitFor();
        await page.waitForTimeout(300);
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: 'Back to app', exact: true }).click();
        await page.locator('.ls-wrap').waitFor({ state: 'detached' });
        assert.equal(await page.locator('canvas').count(), 0);
      }
      const violations = await page.evaluate(() => {
        cancelAnimationFrame(window.shellRaf); return window.shellCanvasViolations;
      });
      assert.deepEqual(violations, [], `${persona}: canvas must never mount during a transformed phone frame`);
      assert.deepEqual(errors, [], `${persona}: page errors`);
      results.push({ persona, errors, canvasTransformViolations: violations.length });
      await page.close();
    }
    const compact = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
    const compactErrors = [];
    compact.on('pageerror', error => compactErrors.push(error.message));
    await compact.goto(`${base}/?p=tom&reset=1`);
    await compact.locator('[data-village-entry]').waitFor();
    await compact.locator('.kbc-thinking').waitFor({ state: 'hidden' });
    await compact.locator('[data-village-entry]').click();
    await compact.locator('.ls-wrap[data-phase="playing"] canvas').waitFor();
    const objective = await compact.locator('[data-city-hud="objective"]').boundingBox();
    const minimap = await compact.locator('.c10-minimap').boundingBox();
    assert.ok(objective.y + objective.height <= minimap.y, 'Compact objective must stay above the minimap');
    await compact.screenshot({ path: `${screenshots}/v10-shell-tom-compact.png` });
    await compact.keyboard.press('Escape');
    await compact.getByRole('dialog', { name: 'City paused', exact: true }).waitFor();
    await compact.screenshot({ path: `${screenshots}/v10-shell-tom-compact-pause.png` });
    assert.deepEqual(compactErrors, []);
    results.push({ persona: 'tom-compact', errors: compactErrors, hudOverlap: false });
    await compact.close();
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
