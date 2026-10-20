const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || undefined,args:['--enable-webgl','--ignore-gpu-blocklist']});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:3714/?p=margaret');
  await page.locator('[data-city-entry]').click();
  await page.getByText('Choose a place. We’ll take you there.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Go to Savings',exact:true}).click();
  await page.getByRole('button',{name:'Stop here',exact:true}).click();
  await page.getByRole('button',{name:'Go to Everyday',exact:true}).click();
  await page.getByRole('button',{name:'Arrive now',exact:true}).click();
  assert.equal(await page.locator('.c10-controls').count(),0);
  await page.locator('.r2-calm-layout').evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:'docs/screenshots/r2-road-margaret-phone-city.png'});
  await page.getByRole('button',{name:'Go to Savings',exact:true}).click();
  await page.getByRole('button',{name:'Arrive now',exact:true}).click();
  await page.locator('[data-place-view=savings]').waitFor();
  await page.locator('[data-place-view=savings]').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('[data-place-view=savings]>section').evaluate(e=>getComputedStyle(e).opacity),'1');
  assert((await page.locator('[data-place-view=savings] button').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().height))).every(h=>h>=54));
  await page.screenshot({path:'docs/screenshots/r2-road-margaret-phone-savings.png'});
  await page.getByRole('button',{name:'Back to app',exact:true}).click();
  assert.deepEqual(errors,[]);console.log('Motion-enabled Calm autopilot, Stop here, Arrive now, Savings contents and exit passed.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
