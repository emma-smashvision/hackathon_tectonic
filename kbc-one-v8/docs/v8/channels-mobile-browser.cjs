// WS-E headless checks. Set PLAYWRIGHT_MODULE / CHROME_PATH for another local browser install.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/tmp/kbc-pitch-browser/node_modules/playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
 for(const id of ['margaret','nadia']) {
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});page.setDefaultTimeout(60000);
  await page.goto('http://localhost:3505/?p='+id);const card=page.locator('.v8-home-road');await card.waitFor();await card.scrollIntoViewIfNeeded();
  await page.screenshot({path:`docs/screenshots/v8-channels-${id}-mobile.png`});

  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  assert.equal(await card.evaluate(el=>el.scrollWidth>el.clientWidth),false);
  if(id==='margaret') assert.ok(await card.locator('span').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))>=18);
  await page.screenshot({path:`docs/screenshots/v8-channels-${id}-mobile.png`});
  await page.setViewportSize({width:1440,height:1080});
  await page.getByRole('button',{name:'Inside: Kate, the crowd gate and presenter controls'}).click();
  await page.getByRole('tab',{name:'Adviser',exact:true}).click();
  if(id==='nadia') {
   assert.equal(await page.locator('.v8-adviser .desk-list li').count(),0);
   await page.getByRole('tab',{name:'Director',exact:true}).click();
   assert.equal(await page.getByRole('button',{name:'Send a journey nudge',exact:true}).isDisabled(),true);
  }
  await page.close();
 }
 console.log('PASS: Margaret large text + no overflow; Nadia pre-consent no crowd evidence/nudge');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
