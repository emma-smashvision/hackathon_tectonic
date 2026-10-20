// Run from kbc-one-v10. No injected completions: UI lesson and physical v10 mission.
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SHELL_APP_URL || 'http://localhost:3813';
const lesson = JSON.parse(execFileSync('bun', ['-e', 'import {lessonsFor} from "./src/one/learning/lessons"; console.log(JSON.stringify(lessonsFor("tom")[0]))'], { encoding: 'utf8' }));
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH,
    args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1512, height: 806 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const shot = name => page.screenshot({ path: path.resolve(`docs/screenshots/r2-ui-drive-${name}.png`) });
  const progress = () => page.evaluate(() => JSON.parse(localStorage.getItem('kbcone.v9.village:tom')));
  const openHome = () => page.getByRole('navigation', { name: 'World areas', exact: true }).getByRole('button', { name: 'Home · open area', exact: true }).click();
  try {
    await page.goto(`${base}/?p=tom&reset=1`);
    await page.locator('[data-world-entry]').waitFor();
    await page.locator('.kbc-thinking').waitFor({ state: 'hidden' });
    await page.locator('[data-world-entry]').click();
    await page.locator('.ls-wrap[data-phase="playing"] canvas').waitFor();
    const started = Date.now();
    await openHome();
    const quest = () => page.locator('li').filter({ has: page.getByRole('heading', { name: lesson.title, exact: true }) });
    await quest().getByRole('button', { name: 'Start lesson', exact: true }).click();
    const card = page.locator(`[data-lesson="${lesson.id}"]`);
    await card.getByRole('button', { name: 'Plain lessons', exact: true }).click();
    await shot('plain-lesson');
    await card.getByRole('button', { name: lesson.apply.choices.find(choice => choice.correct).label, exact: true }).click();
    await card.getByRole('button', { name: 'Not now', exact: true }).click();
    assert.ok((await progress()).done.includes(lesson.id));
    assert.ok(!(await progress()).saved.includes(lesson.save.id));
    await page.getByRole('button', { name: 'See my area grow', exact: true }).click();
    await shot('blueprint-earned');
    await quest().getByRole('button', { name: 'Drive this road', exact: true }).click();
    await page.locator('[data-mission-phase]').waitFor();
    await page.getByRole('button', { name: `GPS · ${lesson.title}`, exact: true }).click();
    await page.getByRole('button', { name: 'Map · M', exact: true }).click();
    await page.getByRole('dialog', { name: 'City map', exact: true }).waitFor();
    await shot('drive-map');
    await page.getByRole('button', { name: 'Autopilot there →', exact: true }).click();
    await page.locator('[data-mission-phase="intro"]').waitFor({ timeout: 60000 });
    const deadline = Date.now() + 120000;
    let phase = '', previous = '', sawPreparation = false;
    while (Date.now() < deadline) {
      phase = await page.locator('[data-mission-phase]').getAttribute('data-mission-phase');
      if (phase !== previous) console.log(lesson.id, phase);
      previous = phase;
      if (phase === 'passed') break;
      if (phase === 'prepare') {
        assert.equal(await page.locator('[data-mission-id]').getAttribute('data-mission-id'), lesson.id, 'The drive must keep the exact world quest, including a completed quest');
        sawPreparation = true;
        await shot('drive-preparation');
        const cinema = page.locator('[data-lessonfx-step]');
        if (await cinema.count()) {
          if (await cinema.getByRole('button', { name: 'Plain lessons', exact: true }).count()) await cinema.getByRole('button', { name: 'Plain lessons', exact: true }).click();
          await cinema.getByRole('button', { name: lesson.apply.choices.find(choice => choice.correct).label, exact: true }).click();
        } else await page.getByRole('button', { name: lesson.apply.choices.find(choice => choice.correct).label + ' →', exact: true }).click();
      } else if (['convoy', 'collect', 'cross', 'pave'].includes(phase)) {
        const drive = page.getByRole('button', { name: 'Drive for me', exact: true });
        if (await drive.isVisible() && !await page.getByRole('button', { name: 'Stop autopilot', exact: true }).isVisible()) await drive.click();
      }
      await page.waitForTimeout(250);
    }
    assert.equal(phase, 'passed'); assert.ok(sawPreparation);
    assert.equal(await page.locator('[data-mission-id]').getAttribute('data-mission-id'), lesson.id);
    await page.getByRole('button', { name: 'Save reminder', exact: true }).click();
    await shot('drive-passed');
    await page.getByRole('button', { name: 'Back to your world', exact: true }).click();
    await page.locator('[data-testid="world-game"]').waitFor();
    assert.equal(await page.locator('[data-mission-phase]').count(), 0);
    const saved = await progress();
    assert.ok(saved.done.includes(lesson.id)); assert.ok(saved.saved.includes(lesson.save.id));
    const world = JSON.parse(execFileSync('bun', ['-e', `import {worldFor} from "./src/one/world/model"; console.log(JSON.stringify(worldFor("tom",${JSON.stringify(saved)})))`], { encoding: 'utf8' }));
    assert.ok(world.storms.find(storm => storm.lessonId === lesson.id)?.prepared, 'done + saved step builds the storm shield');
    await page.waitForTimeout(1200);
    await shot('world-reward');
    console.log(`Live lesson + physical drive + world return: ${((Date.now() - started) / 1000).toFixed(1)} s`);
    await page.getByRole('button', { name: 'Dismiss drive result', exact: true }).click();
    await page.getByRole('navigation', { name: 'World controls', exact: true }).getByRole('button', { name: 'Exit', exact: true }).click();
    await page.locator('.ls-wrap').waitFor({ state: 'detached' });
    await shot('reward-home');
    await page.reload(); await page.locator('[data-world-entry]').waitFor();
    assert.ok((await progress()).done.includes(lesson.id)); assert.ok((await progress()).saved.includes(lesson.save.id));
    await page.goto(`${base}/?p=karim`); await page.locator('[data-world-entry]').waitFor();
    const karim = await page.evaluate(() => JSON.parse(localStorage.getItem('kbcone.v9.village:karim') || 'null'));
    assert.ok(!karim || !karim.done.includes(lesson.id));
    await page.goto(`${base}/?p=tom&reset=1`); await page.locator('[data-world-entry]').waitFor();
    await page.waitForFunction(() => !new URL(location.href).searchParams.has('reset'));
    assert.deepEqual((await progress()).done, []); assert.deepEqual((await progress()).saved, []);
    assert.deepEqual(errors, []);
    console.log('PASS: world lesson → exact v10 mission → saved shield → return reward → reload → persona isolation → reset');
  } catch (error) {
    await page.screenshot({ path: '/tmp/r2-ui-drive-failure.png' });
    console.error(await page.locator('body').innerText()); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
