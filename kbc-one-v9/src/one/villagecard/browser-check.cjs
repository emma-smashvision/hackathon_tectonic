// Run from kbc-one-v9. Uses a separate headless Chrome profile on W3's port.
// PLAYWRIGHT_MODULE and CHROMIUM_PATH can select an existing local installation.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ENTRY_URL || 'http://localhost:3603';
const shotDir = 'docs/screenshots';
const personas = (process.env.ENTRY_PERSONAS || 'tom,karim,sofie,lina,margaret,nadia').split(',');
const lessons = JSON.parse(execFileSync('bun', ['-e', 'import { lessonsFor } from "./src/one/learning/lessons"; console.log(JSON.stringify(Object.fromEntries(["tom","karim","sofie","lina","margaret","nadia"].map(p=>[p,lessonsFor(p)]))))'], { encoding: 'utf8' }));

(async () => {
  mkdirSync(shotDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const shot = name => page.screenshot({ path: `${shotDir}/v9-entry-${name}.png` });
  const home = async persona => {
    await page.goto(`${base}/?p=${persona}`);
    await page.locator('.home-mix .hi').filter({ hasText: persona === 'sofie' ? 'Sofie' : persona[0].toUpperCase()+persona.slice(1) }).waitFor();
    await page.locator('[data-village-entry]').waitFor();
    await page.locator('.kbc-thinking').waitFor({ state: 'hidden' });
  };
  const finishLesson = async (persona, id, save = true) => {
    const lesson = lessons[persona].find(l => l.id === id);
    const card = page.locator(`[data-lesson="${id}"]`);
    await card.waitFor();
    if (await card.getAttribute('data-step') === 'guess') await card.getByRole('button', { name: lesson.guess.choices[0].label, exact: true }).click();
    await card.getByRole('button', { name: 'See what helped', exact: true }).click();
    await card.getByRole('button', { name: /^(Pave this bump|Try an example)$/ }).click();
    const correct = lesson.apply.choices.find(c => c.correct);
    await card.getByRole('button', { name: correct.label, exact: true }).click();
    await card.getByRole('button', { name: 'Keep this lesson', exact: true }).click();
    await card.getByRole('button', { name: save ? lesson.save.label : 'Not now', exact: true }).click();
  };
  try {
    for (const persona of personas) {
      await page.setViewportSize({ width: 390, height: 844 });
      await home(persona);
      assert.equal(await page.locator('.v8-home-road').count(), 0, 'old card removed');
      assert(await page.locator('.mix-field').first().isVisible(), 'bubbles remain');
      assert(await page.locator('.dock .ask').isVisible(), 'Kate stays visible');
      await shot(`${persona}-home`);
      const position = await page.locator('.v9-village-card').evaluate(el => {
        const scroller = el.closest('.scroll');
        const a = el.getBoundingClientRect(), b = scroller.getBoundingClientRect();
        return { top: a.top-b.top+scroller.scrollTop, height: a.height, screen: scroller.clientHeight };
      });
      assert(position.top <= position.screen + 32, `${persona}: card directly after first screen`);
      assert(position.height < position.screen, `${persona}: full card fits after a scroll`);
      await page.locator('.ph > .scroll').evaluate(el => el.scrollTop += el.clientHeight);
      assert(await page.locator('[data-village-entry]').isVisible());
      await shot(`${persona}-card`);
      await page.locator('[data-village-entry]').click();
      if (persona === 'nadia') {
        await page.getByRole('dialog', { name: 'Support options', exact: true }).waitFor();
        assert.equal(await page.locator('.vg-turn, [data-lesson]').count(), 0);
        assert.equal(await page.locator('.road8').count(), 0, 'no care details before consent');
        await shot('nadia-consent');
        await page.getByRole('button', { name: 'Not now', exact: true }).click();
        assert.equal(await page.locator('.road8').count(), 0, 'declining does not consent');
        await page.locator('[data-village-entry]').click();
        await page.getByRole('button', { name: 'Talk to Els', exact: true }).click();
        await page.getByRole('dialog', { name: 'Talk to Els', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Save my question', exact: true }).click();
        assert((await page.getByRole('status').innerText()).includes('No message was sent'));
        await shot('nadia-adviser');
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: 'Show what helped others when I’m ready', exact: true }).click();
        await page.locator('.road8 h1').waitFor();
        assert.equal(await page.locator('.vg-turn').count(), 0);
        await shot('nadia-support');
      } else if (persona === 'margaret') {
        await page.locator('.v9-plain-path [data-lesson]').waitFor();
        assert.equal(await page.locator('.vg-turn').count(), 0, 'plain path never rotates');
        assert.equal(await page.locator('[data-lesson]').getAttribute('data-step'), 'reveal');
        assert(await page.locator('[data-lesson]').evaluate(el => parseFloat(getComputedStyle(el).fontSize)) >= 20);
        await shot('margaret-plain');
        await finishLesson(persona, lessons[persona][0].id, false);
        await page.getByRole('button', { name: 'Back to Home', exact: true }).click();
        assert(!(await page.locator('.v9-entry-receipt').innerText()).includes('Reminder saved'));
        await shot('margaret-receipt');
      } else {
        await page.locator('.vg').waitFor();
        assert((await page.locator('.vg h1').innerText()).includes('Learn'));
        await page.setViewportSize({ width: 1366, height: 768 });
        await page.locator('.vg canvas').waitFor();
        await page.waitForTimeout(500);
        await shot(`${persona}-village`);
        await page.locator('.vg-next .vg-gold').click();
        await page.locator('[data-lesson]').waitFor();
        assert.equal(await page.locator('[data-lesson]').getAttribute('data-lesson'), lessons[persona][0].id);
        await finishLesson(persona, lessons[persona][0].id);
        await page.waitForFunction(() => document.querySelector('.vg')?.getAttribute('data-built') === '1');
        await page.locator('.vg-top').getByRole('button', { name: 'Back to app', exact: false }).click();
        await page.locator('.vg-turn').waitFor({ state: 'detached' });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('[data-village-entry]').scrollIntoViewIfNeeded();
        assert((await page.locator('.v9-entry-receipt').innerText()).includes(`${/remind/i.test(lessons[persona][0].save.label) ? "Reminder" : "Step"} saved · 1/${lessons[persona].length} built`));
        assert.equal(await page.locator('.nav [aria-current="page"]').innerText(), 'Home');
        await shot(`${persona}-receipt`);
      }
      console.log(`PASS ${persona}: Home/card/entry/return`);
    }
    // The road-tab entry keeps the selected lesson identity.
    await page.setViewportSize({ width: 1366, height: 768 });
    await home('tom');
    await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('button', { name: 'Your road', exact: true }).click();
    await page.locator('.road8-stop').filter({ hasText: /Setting up/i }).click();
    await page.locator('.yr-sheet').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('.road8').getByRole('button', { name: 'Drive this road', exact: true }).click();
    await page.locator('.vg-next .vg-gold').click();
    await page.locator('[data-lesson="tom:setting-up"]').waitFor();
    await shot('tom-focused-stop');
    await page.locator('.vg-top').getByRole('button', { name: 'Back to app', exact: false }).click();
    await page.locator('.vg-turn').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.nav [aria-current="page"]').innerText(), 'Home');
    // Full turn plus plain hand-off, then persona switch cleanup.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('[data-village-entry]').click();
    await page.locator('.vg-turn.phase-turning').waitFor();
    await page.waitForTimeout(250);
    await shot('tom-turn');
    await page.locator('.vg-turn.phase-playing').waitFor();
    await page.locator('.vg-top').getByRole('button', { name: 'Plain view', exact: true }).click();
    await page.locator('.v9-plain-path [data-lesson]').waitFor();
    assert.equal(await page.locator('.vg-turn').count(), 0);
    await page.getByRole('button', { name: '← Back to Home', exact: true }).click();
    await page.locator('[data-village-entry]').click();
    await page.locator('.vg-turn.phase-playing').waitFor();
    // Programmatic click exercises the actual stage persona handler behind the full-screen curtain.
    await page.getByRole('button', { name: /^Margaret:/ }).evaluate(el => el.click());
    await page.waitForFunction(() => !document.querySelector('.vg-turn') && !document.body.classList.contains('one-landscape'));
    await page.locator('.home-mix .hi').filter({ hasText: 'Margaret' }).waitFor();
    assert.equal(await page.locator('.v9-entry-receipt').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS road entry, full turn, plain hand-off, persona reset; no page errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
