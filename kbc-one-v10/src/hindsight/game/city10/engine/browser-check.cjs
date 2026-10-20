// Run from kbc-one-v10; isolated headless Chrome, ENGINE_URL overrides port.
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/kbc-game-browser/node_modules/playwright');
const base = process.env.ENGINE_URL || 'http://localhost:3701';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 850 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  mkdirSync('docs/screenshots', { recursive: true });
  const shot = name => page.screenshot({ path: `docs/screenshots/v10-engine-${name}.png` });
  const car = () => page.evaluate(() => window.__city10.api.car());
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  try {
    await page.goto(`${base}/dev/engine?debug=1`);
    await page.waitForFunction(() => window.__city10 && document.querySelector('canvas'));
    await page.addStyleTag({ content: 'nextjs-portal{display:none}' });
    const start = await car();
    await page.keyboard.down('KeyW'); await page.waitForTimeout(1800); await page.keyboard.up('KeyW');
    const driven = await car(); assert(dist(start.pos, driven.pos) > 12); assert(driven.speed > 15); await shot('driving');
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(400); await page.keyboard.up('ArrowLeft');
    assert(Math.abs((await car()).heading - driven.heading) > .1);
    await page.keyboard.down('Space'); await page.waitForTimeout(1000); await page.keyboard.up('Space'); assert(Math.abs((await car()).speed) < 1);
    await page.keyboard.press('KeyM'); await page.getByRole('dialog', { name: 'City map', exact: true }).waitFor();
    await page.locator('.c10-map-canvas svg').click({ position: { x: 350, y: 220 } }); assert(await page.evaluate(() => !!window.__city10.engine.rt.current.waypoint));
    await page.getByRole('button', { name: 'Moving house · Your road', exact: true }).click(); await page.waitForTimeout(150); await shot('map');
    const target = await page.evaluate(() => window.__city10.engine.rt.current.waypoint);
    const paused = await car(); await page.keyboard.down('KeyW'); await page.waitForTimeout(400); await page.keyboard.up('KeyW'); assert(dist(paused.pos, (await car()).pos) < .01);
    await page.getByRole('button', { name: 'Autopilot there →', exact: true }).click(); await page.waitForTimeout(2500);
    assert(await page.evaluate(() => window.__city10.engine.rt.current.autopilot)); await shot('autopilot');
    await page.waitForFunction(() => !window.__city10.engine.rt.current.autopilot, null, { timeout: 45000 });
    assert(dist((await car()).pos, target) < 1); console.log('PASS keyboard, steering, handbrake, map pause, pointer waypoint, cross-city autopilot arrival');
    await page.evaluate(() => { const { api } = window.__city10; const p = api.pointOn('moving-house', .2); api.teleport(p.pos, p.heading); window.__zoneCount = 0; window.__zoneRemove = api.onEnter({ id: 'browser-zone', at: api.pointOn('moving-house', .24).pos, radius: 4 }, () => window.__zoneCount++); api.freeze(true); });
    const frozen = await car(); await page.keyboard.down('ArrowUp'); await page.waitForTimeout(350); await page.keyboard.up('ArrowUp'); assert(dist(frozen.pos, (await car()).pos) < .01);
    await page.evaluate(() => { const { api } = window.__city10; api.freeze(false); api.setAutopilot(api.pointOn('moving-house', .3).pos); });
    await page.waitForFunction(() => !window.__city10.engine.rt.current.autopilot, null, { timeout: 15000 }); assert.equal(await page.evaluate(() => window.__zoneCount), 1);
    await page.evaluate(() => window.__zoneRemove());
    await page.evaluate(async () => { const { api } = window.__city10; await api.cinematic({ target: api.home(), ms: 350 }); }); assert.equal(await page.evaluate(() => window.__city10.engine.rt.current.shot), null);
    await page.evaluate(() => { const { api } = window.__city10; api.teleport(api.home(), -Math.PI / 2); api.setWaypoint(null); });
    const button = await page.getByRole('button', { name: 'Accelerate', exact: true }).boundingBox();
    await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2); await page.mouse.down(); await page.waitForTimeout(1000); await page.mouse.move(700, 500); await page.mouse.up();
    assert((await car()).speed > 8); assert.equal(await page.evaluate(() => window.__city10.engine.rt.current.touch.up), false); await shot('touch');
    console.log('PASS freeze, zone trigger, cinematic, pointer control release');
    for (const persona of ['karim', 'sofie', 'lina']) {
      await page.goto(`${base}/dev/engine?debug=1&persona=${persona}`); await page.waitForFunction(id => window.__city10?.engine.village.personaId === id, persona); await page.addStyleTag({ content: 'nextjs-portal{display:none}' }); await page.waitForTimeout(400); assert.equal(await page.locator('canvas').count(), 1);
      const kinds = await page.evaluate(() => window.__city10.engine.blocks.map(b => b.plot.kind)); assert(['home','car','savings','pension'].every(k => kinds.includes(k))); if (persona === 'karim') assert(kinds.includes('business')); await shot(persona);
    }
    for (const persona of ['margaret', 'nadia']) { await page.goto(`${base}/dev/engine?debug=1&persona=${persona}`); await page.getByRole('heading', { name: 'Your next step', exact: true }).waitFor(); assert.equal(await page.locator('canvas').count(), 0); await shot(persona); }
    assert.deepEqual(errors, []); console.log('PASS all six personas; Margaret/Nadia non-game; zero page/console errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
