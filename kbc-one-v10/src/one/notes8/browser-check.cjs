// Run from kbc-one-v8 with the app on port 3504 (KBC_AI=off).
// PLAYWRIGHT_MODULE may point to an existing playwright/playwright-core install.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.NOTES_BASE_URL || 'http://localhost:3504';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const shot = name => page.screenshot({ path: `docs/screenshots/v8-notes-app-${name}.png` });
    const author = page.getByRole('region', { name: 'Pass it on', exact: true });
    const list = page.getByRole('region', { name: 'Notes from people ahead', exact: true });
    const openStop = async name => {
      await page.getByRole('button', { name: 'Your road', exact: true }).click();
      await page.locator('.road8-stop').filter({ hasText: name }).click();
      await list.getByText('Loading notes…').waitFor({ state: 'hidden' });
    };
    const choose = async name => {
      await page.getByRole('button', { name: 'Close details' }).click();
      await page.getByRole('navigation', { name: 'Customers' }).getByRole('button', { name: new RegExp(`^${name}:`) }).click();
    };
    await page.route('**/api/notes?**', async route => {
      // Regression: requests slower than the poll interval must still complete.
      const response = await route.fetch();
      await new Promise(resolve => setTimeout(resolve, 1400));
      await route.fulfill({ response }).catch(() => {});
    });
    await page.goto(`${base}/?p=karim`);
    await page.request.delete(`${base}/api/notes`, { data: { action: 'reset-demo' } });
    await page.getByRole('button', { name: 'Your road', exact: true }).click();
    await page.getByRole('button', { name: 'All roads', exact: true }).click();
    await page.getByLabel('Describe a situation').fill('We bought our first house');
    await page.getByRole('button', { name: 'Find a road', exact: true }).click();
    await page.getByRole('region', { name: 'Find a road results' }).getByRole('button', { name: /First home/ }).click();
    await page.getByLabel('Where would you like to start?').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Explore First home', exact: true }).click();
    await page.locator('.road8-stop').filter({ hasText: 'First energy settlement' }).click();
    await list.getByText('Loading notes…').waitFor({ state: 'hidden' });
    assert.equal(await author.getByRole('checkbox').count(), 0, 'Karim completed First home');
    const firstHome = 'Photograph the meters before you unpack the boxes.';
    await author.getByRole('textbox').fill(firstHome);
    await author.getByRole('button', { name: 'Leave it on the road' }).click();
    await author.getByText('In review', { exact: true }).waitFor();
    await author.scrollIntoViewIfNeeded(); await shot('karim-review');
    await choose('Sofie');
    await openStop('First energy settlement');
    await list.getByText(`“${firstHome}”`, { exact: true }).waitFor({ timeout: 15000 });
    await list.getByText('Approved', { exact: true }).waitFor();
    assert.equal(await author.getByRole('textbox').count(), 0, 'Sofie is exploring, not eligible');
    await list.scrollIntoViewIfNeeded(); await shot('sofie-roundtrip');
    await choose('Tom');
    await openStop('First energy bill at the new address');
    await author.getByRole('checkbox').check();
    const moving = 'Keep the key handover papers until the deposit comes back.';
    await author.getByRole('textbox').fill(moving);
    await author.getByRole('button', { name: 'Leave it on the road' }).click();
    await author.getByText('In review', { exact: true }).waitFor();
    await author.scrollIntoViewIfNeeded(); await shot('tom-review');
    await choose('Sofie');
    await page.getByRole('button', { name: 'Your road', exact: true }).click();
    await page.getByRole('navigation', { name: 'Customers' }).getByRole('button', { name: /^Tom:/ }).click();
    await openStop('First energy bill at the new address');
    await list.getByText(`“${moving}”`, { exact: true }).waitFor({ timeout: 10000 });
    await list.getByText('Approved', { exact: true }).waitFor();
    await list.scrollIntoViewIfNeeded(); await shot('tom-approved');
    // The real Director control clears shared server notes for every road.
    await page.getByRole('button', { name: 'Close details' }).click();
    await page.getByRole('button', { name: 'Inside: Kate, the crowd gate and presenter controls' }).click();
    await page.getByRole('tab', { name: 'Director', exact: true }).click();
    await page.getByRole('button', { name: 'Reset demo notes', exact: true }).click();
    await page.getByText('Demo notes reset for all personas.').waitFor();
    await shot('director-reset');
    assert.deepEqual((await (await page.request.get(`${base}/api/notes?road=moving-house`)).json()).notes, []);
    assert.deepEqual(errors, []);
    console.log('PASS: actual Karim → Find a road → First home → submit → Sofie sees approved; alumnus → Tom; Director reset; 1400ms GET latency regression. No page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
