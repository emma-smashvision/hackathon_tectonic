/* Run against KBC_AI=off bunx next dev -p 3602. No production route is exposed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LEARNING_URL || 'http://localhost:3602/dev/learning';
const shots = 'docs/screenshots';
const answers = {
  tom: ['A dated meter photo on moving-in day', 'List essentials, compare second-hand, then set a total', 'Check money available now and ask about the release steps'],
  karim: ['No. Compare horizons, administration and Sam’s needs'],
  sofie: ['Meter readings and whether the advance still fits'],
  lina: ['Review the full list and decide what to swap or leave'],
  margaret: ['The meter reading and the monthly advance'],
};
(async () => {
  fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const shot = name => page.screenshot({ path: `${shots}/v9-learning-${name}.png`, fullPage: true });
  async function checkCopy(card, helped = false) {
    assert.doesNotMatch(await card.innerText(), /in this demo|This describes the demo group|not your next bill|Illustrative note|No appointment or notification/i);
    assert.equal(await card.getByText('Associated with these actions, not proof of cause.', { exact: true }).count(), helped ? 1 : 0);
    assert.equal(await page.getByText('Synthetic demo crowd · not a forecast', { exact: true }).count(), 1);
  }
  async function runLesson(person, index, save) {
    let card = page.locator('[data-lesson]');
    if (await card.getAttribute('data-step') === 'guess') {
      if (person === 'tom' && index === 0) await shot('tom-guess');
      await card.getByRole('button', { name: person === 'karim' ? 'Stay a sole trader' : 'Not sure, show me', exact: true }).click();
    }
    assert.equal(await card.getAttribute('data-step'), 'reveal');
    await checkCopy(card);
    if (person === 'karim') {
      const panel = await card.boundingBox();
      const action = await card.getByRole('button', { name: 'See what helped', exact: true }).boundingBox();
      assert.ok(action.y + action.height <= panel.y + panel.height - 8, 'Fork CTA fits without scrolling');
    }
    if (index === 0) await shot(`${person}-reveal`);
    await card.getByRole('button', { name: 'See what helped', exact: true }).click();
    await checkCopy(card, true);
    if (person === 'tom' && index === 0) await shot('tom-helped');
    await card.getByRole('button', { name: person === 'margaret' ? 'Try an example' : 'Pave this bump', exact: true }).click();
    assert.equal(await page.getByTestId('progress').textContent(), `${index}/${person === 'tom' ? 3 : 1} lessons complete · ${index === 0 ? 0 : 1} saved steps`);
    const options = card.getByRole('button');
    await options.nth(1).click();
    assert.equal(await card.getByRole('button', { name: 'Keep this lesson', exact: true }).count(), 0);
    await card.getByRole('button', { name: answers[person][index], exact: true }).click();
    if (person === 'tom' && index === 0) await shot('tom-apply');
    await card.getByRole('button', { name: 'Keep this lesson', exact: true }).click();
    await checkCopy(card);
    if (save) await card.getByRole('button').first().click();
    else await card.getByRole('button', { name: 'Not now', exact: true }).click();
    assert.equal(await card.getAttribute('data-step'), 'done');
    assert.ok((await page.getByTestId('progress').textContent()).startsWith(`${index + 1}/`));
    assert.equal(await page.getByTestId('subscriber').textContent(), `Second subscriber: ${index + 1} complete`);
    if (index === 0) await shot(`${person}-done`);
  }
  for (const person of Object.keys(answers)) {
    await page.goto(`${base}?p=${person}&variant=${person === 'margaret' ? 'plain' : 'game'}`, { waitUntil: 'networkidle' });
    for (let index = 0; index < answers[person].length; index++) {
      if (index) await page.getByLabel('Lesson', { exact: true }).selectOption(String(index));
      await runLesson(person, index, index === 0);
    }
    const persisted = await page.getByTestId('progress').textContent();
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.getByTestId('progress').textContent(), persisted);
  }
  // Both exploratory company branches earn the same single workshop.
  await page.goto(`${base}?p=karim`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start a company (BV)', exact: true }).click();
  await page.getByRole('button', { name: 'See what helped', exact: true }).click();
  await page.getByRole('button', { name: 'Pave this bump', exact: true }).click();
  await page.getByRole('button', { name: answers.karim[0], exact: true }).click();
  await page.getByRole('button', { name: 'Keep this lesson', exact: true }).click();
  await page.getByRole('button', { name: 'Not now', exact: true }).click();
  assert.equal(await page.getByTestId('progress').textContent(), '1/1 lessons complete · 1 saved steps');
  assert.equal((await page.getByTestId('events').textContent()).split('onDone').length - 1, 1);
  // Care never creates a lesson or destination.
  await page.goto(`${base}?p=nadia`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('[data-lesson]').count(), 0);
  assert.match(await page.getByTestId('progress').textContent(), /^0\/0/);
  await shot('nadia-care');
  // A persona switch resets an unfinished lesson, without leaking progress.
  await page.getByLabel('Persona', { exact: true }).selectOption('tom');
  assert.equal(await page.locator('[data-lesson]').getAttribute('data-step'), 'guess');
  assert.match(await page.getByTestId('progress').textContent(), /^3\/3/);
  // Cross-tab reset reaches every mounted hook; other personas remain intact.
  const tab = await context.newPage();
  await tab.goto(`${base}?p=tom`, { waitUntil: 'networkidle' });
  await tab.getByRole('button', { name: 'Reset persona', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid="progress"]').textContent.startsWith('0/3'));
  await page.getByLabel('Persona', { exact: true }).selectOption('karim');
  assert.match(await page.getByTestId('progress').textContent(), /^1\/1/);
  await tab.close();
  // Large plain cards on a phone, including the optional guess and keyboard focus.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}?p=margaret&variant=plain`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('[data-lesson]').getAttribute('data-step'), 'reveal');
  await shot('margaret-mobile');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.getByRole('button', { name: 'Try the opening question', exact: true }).click();
  assert.equal(await page.locator('[data-lesson]').getAttribute('data-step'), 'guess');
  await page.getByRole('button', { name: 'Not sure, show me', exact: true }).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-lesson]').getAttribute('data-step'), 'reveal');
  assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H2');
  // Optional browser storage must not prevent a completed lesson.
  const blocked = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await blocked.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  });
  const blockedPage = await blocked.newPage();
  blockedPage.on('pageerror', e => errors.push(e.message));
  await blockedPage.goto(`${base}?p=tom`, { waitUntil: 'networkidle' });
  for (const name of ['Not sure, show me', 'See what helped', 'Pave this bump', answers.tom[0], 'Keep this lesson', 'Not now']) {
    await blockedPage.getByRole('button', { name, exact: true }).click();
  }
  assert.equal(await blockedPage.getByTestId('progress').textContent(), '1/3 lessons complete · 0 saved steps');
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('PASS: 6 personas; 7 lessons; both Karim branches; save/decline; wrong-answer retry; reload; same-tab/cross-tab sync; persona isolation; storage blocked; keyboard; plain mobile; zero page errors.');
})().catch(error => { console.error(error); process.exit(1); });
