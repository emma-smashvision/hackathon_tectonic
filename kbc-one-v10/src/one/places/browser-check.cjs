/* From kbc-one-v10: KBC_AI=off bunx next dev -p 3712
   PLAYWRIGHT_MODULE=/tmp/kbc-game-browser/node_modules/playwright node src/one/places/browser-check.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.PLACES_URL || 'http://localhost:3712';
const shot = name => `docs/screenshots/r2-places-${name}.png`;
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage(), errors = [], results = [];
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(30000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const openMap = async () => { await page.getByRole('button', { name: 'Map · M', exact: true }).click(); const skip = page.getByRole('button', { name: 'Open map now', exact: true }); if (!await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches) && await skip.isVisible()) await skip.click(); await page.getByRole('button', { name: 'Go there: Savings', exact: true }).waitFor(); };
  const visit = async title => { await openMap(); await page.getByRole('button', { name: `Go there: ${title}`, exact: true }).click(); await page.getByRole('dialog', { name: title, exact: true }).waitFor(); await page.waitForFunction(() => { const r = window.__city10.engine.rt.current, c = window.__city10.view?.camera, from = r.shot?.from; return c && from && r.frozen && !r.mapOpen && Math.hypot(c.position.x - from.x, c.position.y - 24, c.position.z - from.z) < .7; }); await page.waitForTimeout(200); };
  const leave = async () => { await page.getByRole('button', { name: 'Back on the road', exact: false }).click(); await page.waitForTimeout(200); assert.equal(await page.locator('[data-place-view]').count(), 0); assert.equal(await page.evaluate(() => window.__city10.engine.rt.current.frozen), false); };
  // Real pointer click on a building (screen centre above its base), no debug open action.
  await page.goto(`${base}/dev/missions?debug=1&p=tom`); await page.waitForFunction(() => !!window.__city10?.view?.scene?.getObjectByName('place-building-savings'));
  await page.evaluate(() => { const { api, engine } = window.__city10; const b = engine.blocks[2]; api.teleport({ x: b.door.x, z: b.door.z }, Math.atan2(b.x - b.door.x, b.z - b.door.z)); void api.cinematic({ target: { x: b.x, z: b.z }, from: { x: b.door.x + (b.door.x - b.x), z: b.door.z + (b.door.z - b.z) }, ms: 15000 }); });
  await page.waitForTimeout(1500);
  const hit = await page.evaluate(() => { const { view } = window.__city10; const building = view.scene.getObjectByName('place-building-savings'); if (!building) throw new Error('Savings hit box did not receive place context'); const point = building.getWorldPosition(building.position.clone()).project(view.camera); const bounds = document.querySelector('canvas').getBoundingClientRect(); return { x: bounds.left + (point.x + 1) / 2 * bounds.width, y: bounds.top + (1 - point.y) / 2 * bounds.height }; });
  console.log('Building pointer target', { ...hit, element: await page.evaluate(({x,y}) => document.elementFromPoint(x,y)?.tagName, hit) });
  await page.mouse.click(hit.x, hit.y);
  await page.getByRole('dialog', { name: 'Savings', exact: true }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: shot('tom-building-tap') });
  // Lesson routes back into the existing mission; no synthetic completion/reward.
  await page.getByRole('button', { name: 'Open lesson', exact: false }).nth(1).click();
  await page.getByRole('button', { name: 'Drive this mission', exact: true }).click();
  await page.waitForTimeout(200);
  assert.equal(await page.locator('[data-place-view]').count(), 0);
  assert(await page.evaluate(() => !!window.__city10.engine.rt.current.waypoint), 'lesson must set GPS');
  for (const persona of ['tom', 'karim', 'sofie', 'lina']) {
    console.log(`Checking ${persona} places`);
    // The real mission host verifies interaction with mission keyboard and timing controls.
    await page.goto(`${base}/dev/missions?debug=1&p=${persona}`);
    await page.waitForFunction(() => !!window.__city10);
    await page.waitForTimeout(700);
    assert.equal(await page.locator('[data-place-view]').count(), 0, 'spawn is not an arrival');
    const storageBefore = await page.evaluate(() => JSON.stringify(localStorage));
    await visit('Savings');
    const sourceAccount = await page.getByLabel('From account').inputValue();
    const firstGoalText = await page.getByRole('progressbar').first().getAttribute('aria-valuetext');
    const firstAccountText = await page.getByLabel('From account').locator('option:checked').textContent();
    const firstPercent = Number(await page.getByRole('progressbar').first().getAttribute('aria-valuenow'));
    await page.screenshot({ path: shot(`${persona}-savings`) });
    await page.getByLabel('Amount in euros').fill('50');
    await page.getByRole('button', { name: 'Move in demo', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'No real transfer was made' }).waitFor();
    const afterPercent = Number(await page.getByRole('progressbar').first().getAttribute('aria-valuenow'));
    assert(afterPercent >= firstPercent);
    assert.notEqual(await page.getByRole('progressbar').first().getAttribute('aria-valuetext'), firstGoalText, 'goal amount must rise even when rounded percent stays the same');
    assert.notEqual(await page.getByLabel('From account').locator('option:checked').textContent(), firstAccountText, 'source account must be debited');
    assert.equal(await page.evaluate(() => JSON.stringify(localStorage)), storageBefore, 'goal moves must not persist or write source stores');
    assert.equal(await page.evaluate(() => window.__city10.engine.rt.current.car.speed), 0);
    assert.equal(await page.evaluate(() => window.__city10.engine.rt.current.frozen), true);
    await page.getByLabel('Amount in euros').fill('999999');
    await page.getByRole('button', { name: 'Move in demo', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'enough available money' }).waitFor();
    if (persona === 'tom') {
      await page.screenshot({ path: shot('tom-demo-validation') });
      await page.getByRole('button', { name: 'Open lesson', exact: false }).last().focus();
      await page.keyboard.press('Tab');
      assert((await page.evaluate(() => document.activeElement.textContent)).includes('Back on the road'), 'Tab stays within the place');
      await page.keyboard.press('M');
      assert.equal(await page.locator('.c10-map').count(), 0, 'M must not open a map behind the place');
    }
    await leave();
    // Escape must leave the place without opening the mission pause panel.
    await visit('Home');
    if (persona === 'karim') {
      await page.getByText('176 of 300', { exact: true }).waitFor();
      await page.getByRole('heading', { name: 'Balance insurance', exact: true }).waitFor();
      assert.equal(await page.locator('[data-paid="true"]').count(), 176);
    }
    await page.screenshot({ path: shot(`${persona}-home`) });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    assert.equal(await page.locator('[data-place-view]').count(), 0);
    assert.equal(await page.getByRole('dialog', { name: 'City paused', exact: true }).count(), 0, 'Escape belongs to place');
    await visit('Car');
    if (persona === 'tom') { await page.getByText('2 Nov 2026', { exact: true }).waitFor(); await page.screenshot({ path: shot('tom-car') }); }
    await page.getByRole('button', { name: 'Open lesson', exact: false }).click();
    await page.getByText('Compare the premium, excess and included cover.', { exact: true }).waitFor();
    await leave();
    await visit('Pension');
    if (persona === 'karim') await page.getByText('€ 870 of € 1.050 demo yearly maximum', { exact: true }).waitFor();
    await page.screenshot({ path: shot(`${persona}-pension`) });
    await leave();
    if (persona === 'karim' || persona === 'lina' || persona === 'sofie') {
      await visit(persona === 'karim' ? 'Business' : persona === 'lina' ? 'Kids' : 'Family');
      await page.screenshot({ path: shot(`${persona}-extra`) }); await leave();
    }
    // Move the car to the actual road entrance, then drive with a real keyboard input onto its pad.
    await page.evaluate(() => { const { api, engine } = window.__city10; const b = engine.blocks[0]; api.teleport(b.door, Math.atan2(b.x - b.door.x, b.z - b.door.z)); });
    await page.keyboard.down('ArrowUp');
    await page.getByRole('dialog', { name: 'Home', exact: true }).waitFor({ timeout: 10000 });
    await page.keyboard.up('ArrowUp');
    assert.equal(await page.evaluate(() => window.__city10.engine.rt.current.frozen), true);
    await leave();
    await page.waitForTimeout(600);
    assert.equal(await page.locator('[data-place-view]').count(), 0, 'leave must not immediately reopen the same pad');
    // Verify local state remains within a session, and the source resets after reload.
    await visit('Savings');
    assert.equal(Number(await page.getByRole('progressbar').first().getAttribute('aria-valuenow')), afterPercent);
    await leave();
    await page.reload(); await page.waitForFunction(() => !!window.__city10); await visit('Savings');
    assert.equal(Number(await page.getByRole('progressbar').first().getAttribute('aria-valuenow')), firstPercent);
    await leave();
    console.log(`${persona}: map, pad, Escape, allocation, isolation and reset passed`);
    results.push({ persona, sourceAccount, firstPercent, afterPercent, map: true, physicalPad: true, escape: true, localOnly: true, reset: true });
  }
  // Keyboard focus trap, no page overflow and reduced motion on a narrow screen.
  await page.goto(`${base}/dev/missions?debug=1&p=tom`); await page.waitForFunction(() => !!window.__city10);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await visit('Savings');
  await page.getByLabel('Amount in euros').fill('25');
  await page.getByRole('button', { name: 'Move in demo', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'No real transfer' }).waitFor();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal page overflow');
  await page.screenshot({ path: shot('tom-phone-reduced-motion') });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-place-view]').count(), 0);
  await page.setViewportSize({ width: 844, height: 390 }); await visit('Home');
  await page.screenshot({ path: shot('tom-compact-home') }); await leave();
  assert.deepEqual(errors, []);
  const report = { results, checks: ['all own destinations', 'real keyboard pad arrival', 'real building click', 'map Go there', 'park/freeze/camera', 'Escape and no retrigger', 'goal validation and reload reset', 'existing mission GPS handoff', 'narrow/reduced-motion and compact'], errors };
  fs.writeFileSync('docs/screenshots/r2-places-results.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
