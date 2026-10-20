/* Verify the non-gamer path using only the map and Drive for me buttons. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/kbc-game-browser/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${process.env.MISSIONS_URL || 'http://localhost:3703/dev/missions'}?p=tom&debug=1`);
  await page.waitForFunction(() => window.__city10 && document.querySelector('[data-mission-phase="roam"]'));
  await page.keyboard.press('m');
  await page.getByRole('button', { name: 'Autopilot there' }).click();
  await page.waitForSelector('[data-mission-phase="intro"]', { timeout: 60000 });
  await page.waitForSelector('[data-mission-phase="convoy"]');
  await page.getByRole('button', { name: 'Drive for me', exact: true }).click();
  await page.waitForSelector('[data-mission-phase="prepare"]', { timeout: 60000 });
  await page.getByRole('button', { name: 'Plain lessons', exact: true }).click();
  await page.getByRole('button', { name: 'A dated meter photo on moving-in day' }).click();
  await page.getByRole('button', { name: 'Drive for me', exact: true }).click();
  await page.waitForSelector('[data-mission-phase="passed"]', { timeout: 45000 });
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('kbcone.v9.village:tom')).done), ['tom:energy-new-address']);
  assert.deepEqual(errors, []);
  console.log('PASS UI autopilot beam → convoy → 3 pickups → crossing → passed without keyboard driving');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
