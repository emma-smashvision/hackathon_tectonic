/* Real-engine QA. Read-only debug geometry guides actual keyboard events. No teleport, autopilot or state mutation. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/kbc-game-browser/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 1512, height: 900 } });
  const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  fs.mkdirSync('docs/screenshots', { recursive: true });
  const shot = async name => { if (/intro|rewind/.test(name)) await page.waitForTimeout(450); return page.screenshot({ path: `docs/screenshots/v10-missions-${name}.png` }); };
  const phase = () => page.locator('[data-mission-phase]').getAttribute('data-mission-phase');
  const keys = new Set();
  async function press(wanted) {
    for (const k of [...keys]) if (!wanted.includes(k)) { await page.keyboard.up(k); keys.delete(k); }
    for (const k of wanted) if (!keys.has(k)) { await page.keyboard.down(k); keys.add(k); }
  }
  async function driveUntil(expected, limit = 90000) {
    const start = Date.now(); let lastLog = 0; let cursor = 1; let version = -1;
    while (Date.now() - start < limit) {
      const current = await phase();
      if (current === expected) { await press([]); if (expected === 'prepare') await page.getByRole('button', { name: 'Plain lessons', exact: true }).click(); console.log('Reached', expected); return; }
      const s = await page.evaluate(() => { const r = window.__city10.engine.rt.current; return { car: window.__city10.api.car(), route: r.route, version: r.routeVersion, frozen: r.frozen, way: r.waypoint }; });
      if (s.frozen) { await press([]); await page.waitForTimeout(100); continue; }
      if (s.version !== version) { cursor = 1; version = s.version; }
      const p = s.car.pos, path = s.route;
      while (cursor < path.length - 1 && Math.hypot(path[cursor].x - p.x, path[cursor].z - p.z) < 8) cursor++;
      const target = path[Math.min(cursor, path.length - 1)] ?? s.way;
      if (!target) throw Error(`No GPS route in ${current}`);
      const desired = Math.atan2(target.x - p.x, target.z - p.z);
      const delta = Math.atan2(Math.sin(desired - s.car.heading), Math.cos(desired - s.car.heading));
      const wanted = [], maxSpeed = Math.abs(delta) > .45 ? 8 : Math.abs(delta) > .15 ? 17 : 30;
      if (Math.abs(delta) > .08) wanted.push(delta > 0 ? 'ArrowLeft' : 'ArrowRight');
      if (s.car.speed > maxSpeed + 2) wanted.push('Space'); else if (s.car.speed < maxSpeed) wanted.push('ArrowUp');
      await press(wanted);
      if (Date.now() - lastLog > 5000) { console.log(current, 'car', [p.x.toFixed(1),p.z.toFixed(1)], 'speed', s.car.speed.toFixed(1), 'turn', delta.toFixed(2), 'route', cursor+'/'+path.length); lastLog = Date.now(); }
      await page.waitForTimeout(100);
    }
    await shot('failure'); throw Error(`Driving timed out waiting for ${expected}; phase=${await phase()}`);
  }
  async function open(person) {
    await press([]); await page.goto(`${process.env.MISSIONS_URL || 'http://localhost:3703/dev/missions'}?p=${person}&debug=1`);
    await page.waitForFunction(() => window.__city10 && document.querySelector('[data-mission-phase]')); await page.waitForTimeout(600);
    assert.equal(await page.getByText('Synthetic demo crowd · not a forecast', { exact: true }).count(), 1);
  }
  await open('tom');
  await page.keyboard.press('m'); await page.waitForSelector('.c10-map'); await page.keyboard.press('Escape');
  await page.waitForSelector('.c10-map', {state:'detached'}); assert.equal(await page.getByRole('dialog', {name:'City paused'}).count(),0);
  await shot('tom-free-roam');
  await driveUntil('intro'); await shot('tom-intro'); await page.waitForSelector('[data-mission-phase="convoy"]');
  await driveUntil('collect'); await shot('tom-convoy'); await driveUntil('prepare'); await shot('tom-preparation');
  assert.equal(await page.locator('[data-mission-phase]').getAttribute('data-pickups'), '3');
  assert.equal(await page.getByText('Associated with these actions, not proof of cause.', {exact:true}).count(),1);
  await page.getByRole('button', { name: 'Split the monthly advance in two' }).click(); await driveUntil('rewind'); await shot('tom-rewind');
  assert.equal(await page.getByRole('button', {name:'Rewind 5 s'}).evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(184, 255, 227)');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('kbcone.v9.village:tom') || '{"done":[]}').done.length), 0);
  await page.getByRole('button', { name: 'Rewind 5 s' }).click(); await driveUntil('prepare');
  await page.getByRole('button', { name: 'A dated meter photo on moving-in day' }).click(); await driveUntil('pave'); await shot('tom-pave');
  await driveUntil('passed'); await shot('tom-passed');
  await page.getByRole('button', { name: 'Save reminder', exact: true }).click(); await page.getByRole('button', { name: 'Keep driving' }).click();
  await page.keyboard.press('Escape'); await shot('tom-passport');
  const tom = await page.evaluate(() => JSON.parse(localStorage.getItem('kbcone.v9.village:tom')));
  assert.deepEqual(tom.done, ['tom:energy-new-address']); assert.equal(tom.saved.length, 1);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.reload(); await page.waitForSelector('[data-mission-phase]');
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('kbcone.v9.village:tom')).done), tom.done);
  if (process.env.MISSIONS_TOM_ONLY) { assert.deepEqual(errors, []); console.log('PASS Tom keyboard mission, rewind contrast, save, reload, map/Esc; zero page errors'); await browser.close(); return; }
  await open('karim'); await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Test drive · First energy bill' }).click();
  await driveUntil('intro'); await shot('karim-test-drive-intro'); await page.waitForSelector('[data-mission-phase="convoy"]');
  await driveUntil('collect'); await driveUntil('prepare'); await page.getByRole('button', { name: 'A dated meter photo on moving-in day' }).click();
  await driveUntil('pave'); await driveUntil('passed'); await shot('karim-test-drive-passed');
  assert.equal(await page.getByRole('button', { name: 'Save reminder', exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('kbcone.v9.village:karim') || '{"done":[]}').done.length), 0);
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('kbcone.v9.village:tom')).done), tom.done);
  assert.deepEqual(errors, []); console.log('PASS Tom keyboard mission + rewind + save + reload; Karim keyboard test drive; zero page errors');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
