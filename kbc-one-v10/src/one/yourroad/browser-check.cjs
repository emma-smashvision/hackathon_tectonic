/* Run from kbc-one-v10. Optional PLAYWRIGHT_MODULE and CHROMIUM_PATH select local installs. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ headless:true, executablePath:process.env.CHROMIUM_PATH || undefined, args:['--enable-webgl','--ignore-gpu-blocklist'] });
  const results = [], output = path.resolve('docs/screenshots');
  fs.mkdirSync(output, { recursive:true });
  try {
    for (const size of ['phone','stage']) for (const persona of ['tom','karim','sofie','lina','margaret','nadia']) {
      const viewport = size === 'phone' ? { width:390,height:844 } : { width:1512,height:982 };
      const context = await browser.newContext({ viewport, reducedMotion:'reduce' });
      const page = await context.newPage();
      page.setDefaultTimeout(60000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://localhost:3714/?p=${persona}`, { waitUntil:'domcontentloaded' });
      await page.locator('[data-village-entry]').waitFor();
      await page.locator('.kbc-thinking').waitFor({ state:'hidden' });
      const calm = persona === 'margaret' || persona === 'nadia';
      const homeEntry = calm ? page.locator('[data-city-entry]') : page.locator('[data-village-entry]');
      await homeEntry.scrollIntoViewIfNeeded();
      assert(await homeEntry.isVisible(), `${persona} Home entry`);
      await page.screenshot({ path:path.join(output,`r2-road-${persona}-${size}-home.png`) });
      await homeEntry.click();
      if (calm) {
        await page.getByRole('dialog',{ name:'Your city · Calm mode',exact:true }).waitFor();
        await page.locator('.r2-calm-city canvas').waitFor();
        await page.getByText('Choose a place. We’ll take you there.',{exact:true}).waitFor();
        assert.equal(await page.locator('.c10-controls').count(),0);
        await page.getByRole('button',{name:'Go to Savings',exact:true}).click();
        await page.locator('[data-place-view=savings]').waitFor();
        assert(await page.getByRole('heading',{name:'Your accounts',exact:true}).isVisible());
        await page.getByRole('button',{name:'Go to Everyday',exact:true}).click();
        if (persona === 'margaret') {
          assert.equal(await page.locator('.r2-calm-lesson').count(),1);
          await page.getByRole('button',{name:'Mark as read',exact:true}).click();
          await page.getByRole('button',{name:'Prepared ✓',exact:true}).waitFor();
        } else assert.equal(await page.locator('.r2-calm-lesson').count(),0);
        await page.screenshot({ path:path.join(output,`r2-road-${persona}-${size}-city.png`) });
        await page.getByRole('button',{name:'Back to app',exact:true}).click();
        await page.locator('.r2-calm-city').waitFor({state:'detached'});
      } else {
        if (size === 'phone') {
          await page.getByRole('heading',{name:'Turn your phone to play',exact:true}).waitFor();
          await page.setViewportSize({width:844,height:390});
        }
        await page.locator('.ls-wrap[data-phase="playing"] canvas').waitFor();
        await page.locator('.v10-city-loading').waitFor({state:'detached'});
        await page.screenshot({ path:path.join(output,`r2-road-${persona}-${size}-city.png`) });
        await page.keyboard.press('Escape');
        await page.getByRole('button',{name:'Back to app',exact:true}).click();
        await page.locator('.ls-wrap').waitFor({state:'detached'});
        await page.setViewportSize(viewport);
      }
      await page.getByRole('navigation',{name:'Main',exact:true}).getByRole('button',{name:'Your road',exact:true}).click();
      const road = page.locator('.r2-road');
      await road.locator('.r2-now').waitFor();
      assert((await road.locator('.r2-now').boundingBox()).height > 200);
      assert.equal(await road.getByRole('button',{name:'Open your world',exact:false}).count(),0);
      assert(await road.getByRole('button',{name:'Drive it',exact:true}).isVisible());
      assert.equal(await road.locator('footer').count(),1);
      if (persona === 'margaret') assert((await road.locator('.r2-timeline li').count()) <= 3);
      if (persona === 'nadia') {
        assert.equal(await road.locator('[data-care=true]').count(),0);
        assert.equal(await road.locator('.r2-track').count(),0);
      }
      assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({path:path.join(output,`r2-road-${persona}-${size}.png`)});
      await road.locator('.r2-areas').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(output,`r2-road-${persona}-${size}-areas.png`)});
      const remind = road.getByRole('button',{name:'Remind me',exact:true}).first();
      if (await remind.count()) {
        await remind.click();
        assert(await road.getByRole('status').isVisible());
        assert((await road.getByRole('button',{name:'Reminder saved ✓',exact:false}).count()) >= 1);
        await road.getByRole('button',{name:'Dismiss confirmation',exact:true}).click();
      }
      const learn = road.getByRole('button',{name:/Learn/}).first();
      if (await learn.count()) {
        await learn.click();
        await page.getByRole('dialog').waitFor();
        assert.equal(await page.locator('[data-lesson]').count(),1);
        await page.getByRole('button',{name:'Close details',exact:true}).click();
      }
      if (persona === 'nadia') {
        await road.getByRole('button',{name:'Show what helped others when I’m ready',exact:true}).click();
        assert((await road.locator('[data-care=true]').count()) > 0);
        assert.equal(await road.locator('[data-care=true]').getByRole('button',{name:/Drive|Learn/}).count(),0);
        await road.locator('[data-care=true]').getByRole('button',{name:'Read when ready',exact:true}).first().click();
        await page.getByRole('dialog').waitFor();
        await page.screenshot({path:path.join(output,`r2-road-${persona}-${size}-consent.png`)});
        await page.getByRole('button',{name:'Close details',exact:true}).click();
      }
      await road.getByRole('button',{name:'Drive it',exact:true}).click();
      if (calm) {
        await page.getByRole('dialog',{name:'Your city · Calm mode',exact:true}).waitFor();
        await page.getByRole('button',{name:'Back to app',exact:true}).click();
      } else if (size === 'phone') {
        await page.getByRole('heading',{name:'Turn your phone to play',exact:true}).waitFor();
        await page.getByRole('button',{name:'Back to app',exact:true}).click();
      } else {
        await page.locator('.ls-wrap[data-phase="playing"] canvas').waitFor();
        await page.locator('.v10-city-loading').waitFor({state:'detached'});
        await page.keyboard.press('Escape');
        await page.getByRole('button',{name:'Back to app',exact:true}).click();
      }
      assert.deepEqual(errors,[]);
      results.push({persona,size,homeEntry:true,roadEntry:true,errors});
      console.log(JSON.stringify(results.at(-1)));
      await context.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output,'r2-road-verification.json'),JSON.stringify(results,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
