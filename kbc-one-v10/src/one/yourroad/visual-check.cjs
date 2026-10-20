/* Final DOM typography/contrast pass; no WebGL is mounted. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || undefined});
  try {
    for(const size of ['phone','stage']) for(const persona of ['tom','karim','sofie','lina','margaret','nadia']) {
      const page=await browser.newPage({viewport:size==='phone'?{width:390,height:844}:{width:1512,height:982},reducedMotion:'reduce'});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(`http://localhost:3714/?p=${persona}`);
      await page.getByRole('navigation',{name:'Main',exact:true}).getByRole('button',{name:'Your road',exact:true}).click();
      await page.locator('.r2-now').waitFor();
      const style=await page.locator('.r2-road').evaluate(el=>({bg:getComputedStyle(el).getPropertyValue('--bg').trim(),color:getComputedStyle(el).color,h2:getComputedStyle(el.querySelector('.r2-now h2')).fontSize,overflow:el.scrollWidth>el.clientWidth,track:el.querySelector('.r2-track')&&getComputedStyle(el.querySelector('.r2-track')).animationName}));
      assert.equal(style.bg,'#091522');assert.equal(style.color,'rgb(241, 247, 252)');assert.equal(style.h2,'23px');assert.equal(style.overflow,false);if(style.track)assert.equal(style.track,'none');
      assert.equal(await page.locator('canvas').count(),0);
      if(persona==='margaret') {
        assert.equal(await page.locator('.r2-timeline h3').first().evaluate(e=>getComputedStyle(e).fontSize),'22px');
        const targets=await page.locator('.r2-road button').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().height));
        assert(targets.every(h=>h>=54));
      }
      await page.screenshot({path:`docs/screenshots/r2-road-${persona}-${size}.png`});
      await page.locator('.r2-areas').scrollIntoViewIfNeeded();
      await page.screenshot({path:`docs/screenshots/r2-road-${persona}-${size}-areas.png`});
      if(persona==='tom') {
        await page.emulateMedia({reducedMotion:'no-preference'});
        assert.equal(await page.locator('.r2-track').evaluate(e=>getComputedStyle(e).animationName),'r2-track-enter');
      }
      assert.deepEqual(errors,[]);console.log(`${persona} ${size}: final type, contrast, reduced motion, no overflow`);
      await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
