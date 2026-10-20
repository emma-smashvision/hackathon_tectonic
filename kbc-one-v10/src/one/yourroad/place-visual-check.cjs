/* DOM-only embedded-place check: hide the scene before Canvas has layout, avoiding a GPU renderer. */
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || undefined});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:3714/?p=margaret');
  await page.addStyleTag({content:'.r2-calm-scene { display:none !important; }'});
  await page.locator('[data-city-entry]').click();
  await page.getByRole('dialog',{name:'Your city · Calm mode',exact:true}).waitFor();
  await page.getByRole('button',{name:'Go to Savings',exact:true}).click();
  const place=page.locator('[data-place-view=savings]');
  await place.waitFor();await place.scrollIntoViewIfNeeded();
  assert.equal(await place.locator('section').first().evaluate(e=>getComputedStyle(e).opacity),'1');
  assert((await place.locator('button').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().height))).every(h=>h>=54));
  assert.equal(await place.getByRole('button',{name:'Open lesson',exact:false}).evaluate(e=>getComputedStyle(e).fontSize),'18px');
  assert(await place.getByRole('heading',{name:'Your accounts',exact:true}).isVisible());
  await page.screenshot({path:'docs/screenshots/r2-road-margaret-phone-savings.png'});
  assert.deepEqual(errors,[]);console.log('Calm Savings final typography,54px controls, full opacity and source accounts passed; no scene renderer.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
