// Actual Home → city → three missions → Home, using map/autopilot and driving controls.
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SHELL_APP_URL || 'http://localhost:3704';
const lessons = JSON.parse(execFileSync('bun', ['-e', 'import {lessonsFor} from "./src/one/learning/lessons"; console.log(JSON.stringify(lessonsFor("tom")))'], { encoding: 'utf8' }));
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH,
    args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1512, height: 806 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = name => page.screenshot({ path: path.resolve(`docs/screenshots/v10-shell-tom-${name}.png`) });
  try {
    await page.goto(`${base}/?p=tom&reset=1`);
    await page.locator('[data-village-entry]').waitFor();
    await page.locator('.kbc-thinking').waitFor({ state: 'hidden' });
    await page.locator('[data-village-entry]').click();
    await page.locator('.ls-wrap[data-phase="playing"] canvas').waitFor();
    for (const [index, lesson] of lessons.entries()) {
      await page.getByRole('button', { name: `GPS · ${lesson.title}`, exact: true }).click();
      await page.getByRole('button', { name: 'Map · M', exact: true }).click();
      await page.getByRole('dialog', { name: 'City map', exact: true }).waitFor();
      if (index === 0) {
        await shot('map');
        await page.keyboard.press('Escape');
        await page.getByRole('dialog', { name: 'City map', exact: true }).waitFor({ state: 'detached' });
        assert.equal(await page.getByRole('dialog', { name: 'City paused', exact: true }).count(), 0);
        await page.getByRole('button', { name: 'Map · M', exact: true }).click();
      }
      await page.getByRole('button', { name: 'Autopilot there →', exact: true }).click();
      await page.locator('[data-mission-phase="intro"]').waitFor({ timeout: 60000 });
      if (index === 0) await shot('intro');
      const deadline = Date.now() + 120000;
      let phase = 'intro', previous = '', sawPreparation = false;
      while (Date.now() < deadline) {
        phase = await page.locator('[data-mission-phase]').getAttribute('data-mission-phase');
        if (phase !== previous) console.log(lesson.id, phase);
        previous = phase;
        if (phase === 'passed') break;
        if (phase === 'prepare') {
          sawPreparation = true;
          if (index === 0) await shot('preparation');
          await page.getByRole('button', { name: lesson.apply.choices.find(c => c.correct).label + ' →', exact: true }).click();
        } else if (['convoy', 'collect', 'cross', 'pave'].includes(phase)) {
          const drive = page.getByRole('button', { name: 'Drive for me', exact: true });
          if (await drive.isVisible() && !await page.getByRole('button', { name: 'Stop autopilot', exact: true }).isVisible()) await drive.click();

        }
        await page.waitForTimeout(250);
      }
      assert.equal(phase, 'passed', `${lesson.id}: complete the mission by driving`);
      assert.ok(sawPreparation);
      await shot(`passed-${index + 1}`);
      const save = page.getByRole('button', { name: 'Save reminder', exact: true });
      if (await save.isVisible()) await save.click();
      await page.getByRole('button', { name: 'Keep driving', exact: true }).click();
    }
    await page.keyboard.press('Escape');
    await shot('passport');
    await page.getByRole('dialog', { name: 'City paused', exact: true }).getByRole('button', { name: 'Back to app', exact: true }).click();
    await page.locator('.ls-wrap').waitFor({ state: 'detached' });
    assert.match(await page.locator('.v9-village-card').innerText(), /3\/3 missions passed/);
    await shot('complete-home');
    await page.reload(); await page.locator('[data-village-entry]').waitFor();
    assert.match(await page.locator('.v9-village-card').innerText(), /3\/3 missions passed/);
    await page.locator('[data-village-entry]').click();
    await page.locator('.ls-wrap[data-phase="playing"] canvas').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
    await page.waitForTimeout(500);
    const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('kbcone.v9.village:tom')));
    assert.deepEqual(progress.done, []); assert.deepEqual(progress.saved, []);
    assert.equal(await page.getByRole('button', { name: 'Turn sound on', exact: true }).getAttribute('aria-pressed'), 'false');
    assert.deepEqual(errors, []);
    console.log('Tom: 3 real driving missions, saves, Home progress, reload persistence and pause reset PASS');
  } catch (error) {
    await page.screenshot({ path: '/tmp/v10-shell-mission-failure.png' });
    console.error(await page.locator('body').innerText());
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
