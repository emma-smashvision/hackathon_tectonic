// WS-E headless checks. Set PLAYWRIGHT_MODULE / CHROME_PATH for another local browser install.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/tmp/kbc-pitch-browser/node_modules/playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const results=[];
 for(const id of ['tom','karim','sofie','lina','margaret','nadia']){
  const page=await browser.newPage({viewport:{width:1440,height:1080},reducedMotion:'reduce'});
  page.setDefaultTimeout(60000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:3505/?p='+id);
  const card=page.locator('.v8-home-road');await card.waitFor();
  await page.waitForTimeout(2300);
  const focus=await card.evaluate(el=>({roadId:el.dataset.roadId,stopId:el.dataset.stopId}));
  assert.equal(await card.count(),1);
  assert.deepEqual(focus, {tom:{roadId:'moving-house',stopId:'energy-new-address'},karim:{roadId:'freelance',stopId:'company'},sofie:{roadId:'first-home',stopId:'energy-settlement'},lina:{roadId:'everyday-only',stopId:'december'},margaret:{roadId:'everyday-only',stopId:'december'},nadia:{roadId:'losing-parent',stopId:'frozen-accounts'}}[id]);
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({path:`docs/screenshots/v8-channels-${id}-home.png`});
  assert.equal(await page.getByRole('button',{name:/Play it in 3D|Explore your city/}).count(),0);
  await card.click();
  await page.locator('.yr-sheet').waitFor();
  const homeStopTitle=await page.locator('.yr-sheet h2').innerText();
  await page.locator('.yr-sheet').getByRole('button',{name:'Close details',exact:true}).click();
  await page.getByRole('button',{name:'Home',exact:true}).click();
  await page.getByRole('button',{name:'Ask Kate anything…'}).click();
  const box=page.locator('.kate-sheet textarea, .kate-sheet input').first();
  await box.fill("What's ahead for me?");await box.press('Enter');
  await page.getByRole('button',{name:'Open Your road',exact:true}).last().waitFor();
  await page.screenshot({path:`docs/screenshots/v8-channels-${id}-kate.png`});
  await page.getByRole('button',{name:'Open Your road',exact:true}).last().click();

  await page.locator('.yr-sheet').waitFor();
  assert.equal(await page.locator('.yr-sheet h2').innerText(),homeStopTitle);
  await page.screenshot({path:`docs/screenshots/v8-channels-${id}-road.png`});
  await page.locator('.yr-sheet').getByRole('button',{name:id==='sofie'?'Save a question for Thursday':'Save an adviser question',exact:true}).click();
  await page.locator('.yr-sheet').getByRole('button',{name:'Close details',exact:true}).click();
  await page.getByRole('button',{name:'Inside: Kate, the crowd gate and presenter controls'}).click();
  await page.getByRole('tab',{name:'Adviser',exact:true}).click();
  await page.locator('.v8-adviser .desk').waitFor();
  assert.equal(await page.locator('.v8-adviser .desk').getAttribute('data-road-id'),focus.roadId);
  assert.equal(await page.locator('.v8-adviser .desk').getAttribute('data-stop-id'),focus.stopId);
  assert.equal(await page.getByText('No saved steps on this road yet.',{exact:false}).count(),0);
  await page.screenshot({path:`docs/screenshots/v8-channels-${id}-adviser.png`});
  await page.getByRole('tab',{name:'Director',exact:true}).click();
  const send=page.getByRole('button',{name:'Send a journey nudge',exact:true});
  if(id==='nadia') assert.equal(await send.isDisabled(),true);
  else {
   await send.click();await page.locator('.journey-notification').waitFor();
   assert.doesNotMatch(await page.locator('.journey-notification').innerText(),/moving|parent|freelance|December|payment/i);
   await page.screenshot({path:`docs/screenshots/v8-channels-${id}-nudge.png`});
   await page.locator('.journey-notification').click();
   await page.locator('.yr-sheet').waitFor();
   assert.equal(await page.locator('.yr-sheet h2').innerText(),homeStopTitle);
  }
  assert.deepEqual(errors,[]); console.log(id, 'PASS', focus);results.push({id,focus,errors});await page.close();
 }
 console.log(JSON.stringify(results,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
