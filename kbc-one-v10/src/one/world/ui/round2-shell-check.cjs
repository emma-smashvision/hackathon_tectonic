// Run from kbc-one-v10. Uses a separate headless browser and real app controls.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SHELL_APP_URL || 'http://localhost:3813';
const shotDir = path.resolve('docs/screenshots');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH,
    args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
  const results = [];
  try {
    for (const persona of ['tom', 'karim', 'sofie', 'lina', 'margaret', 'nadia']) {
      const page = await browser.newPage({ viewport: { width: 1512, height: 806 }, reducedMotion: persona === 'lina' ? 'reduce' : 'no-preference' });
      page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(90000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      const shot = name => page.screenshot({ path: `${shotDir}/r2-ui-shell-${persona}-${name}.png` });
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
      await page.locator('.ls-wrap[data-phase="playing"] canvas').waitFor();
      await page.locator('[data-world-ready=true]').waitFor();
      await page.waitForTimeout(700);
      const world = page.getByTestId('world-game');
      const panel = page.getByTestId('world-panel');
      const rail = page.getByRole('navigation', { name: 'World areas', exact: true });
      assert.equal(await world.getByText('Synthetic demo crowd · not a forecast', { exact: true }).count(), 1);
      await shot('world');
      await rail.getByRole('button', { name: 'Home · open area', exact: true }).click();
      await panel.locator('[data-place-view=home]').waitFor();
      await shot('home-place');
      await page.keyboard.press('Escape');
      if (persona === 'margaret') {
        assert.equal(await world.getAttribute('data-calm'), 'true');
        assert.equal(await world.getByRole('button', { name: /^Prepare:/ }).count(), 0);
        await rail.getByRole('button', { name: 'Home · open area', exact: true }).click();
        await panel.getByRole('button', { name: 'Start lesson', exact: true }).first().click();
        await page.locator('[data-lesson]').waitFor();
        assert.equal(await page.locator('[data-lessonfx-step]').count(), 0);
        const next = await panel.getByRole('button', { name: 'See what helped', exact: true }).boundingBox();
        const bounds = await panel.boundingBox();
        assert.ok(next && bounds && next.y + next.height <= bounds.y + bounds.height, 'Calm lesson action fits the panel');
        await shot('plain-lesson');
        await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
      } else if (persona === 'nadia') {
        const before = await page.evaluate(() => localStorage.getItem('kbcone.v9.village:nadia'));
        await rail.getByRole('button', { name: /^Care garden/ }).click();
        await page.getByRole('region', { name: 'Support options', exact: true }).waitFor();
        assert.equal(await page.getByText('Practical help, when you want it', { exact: true }).count(), 0);
        await shot('care-consent');
        await panel.getByRole('button', { name: 'Not now', exact: true }).click();
        await rail.getByRole('button', { name: /^Care garden/ }).click();
        await panel.getByRole('button', { name: 'Show what helped others when I’m ready', exact: true }).click();
        await page.getByRole('region', { name: 'Care garden', exact: true }).waitFor();
        await panel.locator('summary').first().click();
        await shot('care-garden');
        assert.doesNotMatch(await panel.innerText(), /blueprint|reward|storm|score/i);
        assert.doesNotMatch(await world.innerText(), /blueprints? learned/i);
        assert.equal(await world.locator('.world11-finance-summary').count(), 0, 'Care has no finance caption');
        assert.equal(await page.evaluate(() => localStorage.getItem('kbcone.v9.village:nadia')), before);
        await panel.getByRole('button', { name: 'Enough for now', exact: true }).click();
      }
      await page.getByRole('navigation', { name: 'World controls', exact: true }).getByRole('button', { name: 'Exit', exact: true }).click();
      await page.locator('.ls-wrap').waitFor({ state: 'detached' });
      assert.equal(await page.locator('canvas').count(), 0);
      await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('button', { name: 'Your road', exact: true }).click();
      await page.locator('.r2-world').click();
      await page.locator('.ls-wrap[data-phase="playing"] canvas').waitFor();
      await page.locator('[data-world-ready=true]').waitFor();
      await shot('road-entry');
      await page.getByRole('navigation', { name: 'World controls', exact: true }).getByRole('button', { name: 'Exit', exact: true }).click();
      await page.locator('.ls-wrap').waitFor({ state: 'detached' });
      const violations = await page.evaluate(() => { cancelAnimationFrame(window.shellRaf); return window.shellCanvasViolations; });
      assert.deepEqual(violations, [], `${persona}: no canvas during the phone transform`);
      assert.deepEqual(errors, [], `${persona}: browser errors`);
      results.push({ persona, errors, canvasTransformViolations: violations.length });
      await page.close();
    }
    fs.writeFileSync('src/one/world/ui/round2-shell-results.json', JSON.stringify({ passed: true, checks: ['Home and Road entry for all six', 'plain Margaret lessons', 'Nadia care consent', 'no Canvas during transform'], results }, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
