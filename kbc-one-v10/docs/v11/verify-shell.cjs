// Run from kbc-one-v10. Uses a separate headless browser and real app controls.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SHELL_APP_URL || 'http://localhost:3804';
const shotDir = path.resolve('docs/screenshots');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH,
    args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
  const results = [];
  try {
    for (const persona of ['tom', 'karim', 'sofie', 'lina', 'margaret', 'nadia']) {
      const page = await browser.newPage({ viewport: { width: 1512, height: 806 }, reducedMotion: persona === 'lina' ? 'reduce' : 'no-preference' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      const shot = name => page.screenshot({ path: `${shotDir}/v11-shell-${persona}-${name}.png` });
      await page.goto(`${base}/?p=${persona}&reset=1`);
      await page.locator('[data-world-entry]').waitFor();
      await page.locator('.kbc-thinking').waitFor({ state: 'hidden' });
      assert.equal(new URL(page.url()).searchParams.has('reset'), false);
      assert.equal(await page.locator('canvas').count(), 0, 'Home must use a static postcard');
      await page.locator('[data-world-entry]').scrollIntoViewIfNeeded();
      await shot('home');
      await page.evaluate(() => {
        window.shellCanvasViolations = [];
        const check = () => {
          const phone = document.querySelector('.ls-phone');
          if (phone?.querySelector('canvas') && !new DOMMatrixReadOnly(getComputedStyle(phone).transform).isIdentity)
            window.shellCanvasViolations.push(getComputedStyle(phone).transform);
          window.shellRaf = requestAnimationFrame(check);
        }; check();
      });
      await page.locator('[data-world-entry]').click();
      if (persona === 'margaret') {
        const plain = page.getByRole('dialog', { name: 'Plain world', exact: true });
        await plain.waitFor();
        assert.equal(await page.locator('canvas').count(), 0);
        assert.equal(await page.locator('.ls-wrap').count(), 0);
        await shot('areas');
        await plain.getByRole('button', { name: /Your yearly energy bill/ }).click();
        await page.locator('[data-lesson]').waitFor();
        await shot('lesson');
        await page.getByRole('button', { name: '← Back to your areas', exact: true }).click();
        await plain.getByRole('button', { name: '← Back to Home', exact: true }).click();
      } else if (persona === 'nadia') {
        const consent = page.getByRole('dialog', { name: 'Support options', exact: true });
        await consent.waitFor();
        assert.equal(await page.getByRole('dialog', { name: 'Care garden', exact: true }).count(), 0);
        assert.equal(await page.locator('canvas').count(), 0);
        await shot('consent');
        await page.getByRole('button', { name: 'Not now', exact: true }).click();
        await page.locator('[data-world-entry]').click();
        await page.getByRole('button', { name: 'Show what helped others when I’m ready', exact: true }).click();
        const garden = page.getByRole('dialog', { name: 'Care garden', exact: true });
        await garden.waitFor();
        assert.equal(await page.locator('canvas').count(), 0);
        assert.equal(await page.locator('.ls-wrap').count(), 0);
        await shot('garden');
        await garden.getByRole('button', { name: 'Read the practical steps', exact: true }).click();
        await garden.waitFor({ state: 'detached' });
        await shot('practical-steps');
      } else {
        await page.locator('.ls-wrap[data-phase="playing"] canvas').waitFor();
        await page.waitForTimeout(1400);
        assert.equal(await page.locator('.ls-screen').getByText('Synthetic demo crowd · not a forecast', { exact: true }).count(), 1);
        await shot('world');
        const rail = page.getByRole('navigation', { name: 'World areas', exact: true });
        await rail.getByRole('button', { name: 'Home · open area', exact: true }).click();
        await page.getByRole('heading', { name: 'Hindsight blueprints', exact: true }).waitFor();
        await page.waitForTimeout(700);
        await shot('area');
        await page.keyboard.press('Escape');
        await rail.getByRole('button', { name: 'Private banking · explore', exact: true }).click();
        await page.getByText(/You are exploring/).waitFor();
        await page.waitForTimeout(700);
        await shot('explore');
        await page.keyboard.press('Escape');
        await page.getByTestId('world-panel').waitFor({ state: 'detached' });
        if (persona === 'tom') await page.keyboard.press('Escape');
        else await page.getByRole('navigation', { name: 'World controls', exact: true }).getByRole('button', { name: 'Exit', exact: true }).click();
        await page.locator('.ls-wrap').waitFor({ state: 'detached' });
        assert.equal(await page.locator('canvas').count(), 0);
      }
      const violations = await page.evaluate(() => { cancelAnimationFrame(window.shellRaf); return window.shellCanvasViolations; });
      assert.deepEqual(violations, [], `${persona}: no canvas during the phone transform`);
      assert.deepEqual(errors, [], `${persona}: browser errors`);
      results.push({ persona, errors, canvasTransformViolations: violations.length });
      await page.close();
    }
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
