/* Run from kbc-one-v10, with KBC_AI=off bunx next dev -p3702.
   PLAYWRIGHT_MODULE and CHROMIUM_PATH select an existing local browser installation. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LOOK_URL || 'http://localhost:3702/dev/look';
const shot = name => `docs/screenshots/v10-look-${name}.png`;
(async () => {
  const browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--enable-webgl','--ignore-gpu-blocklist']});
  const context = await browser.newContext({viewport:{width:1512,height:900},deviceScaleFactor:2});
  const page = await context.newPage(), errors = [], results = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type() === 'error') errors.push(m.text()); });
  for(const persona of ['tom','karim','sofie','lina']) {
    await page.goto(`${base}?engine=1&debug=1&p=${persona}`);
    await page.locator('canvas').waitFor();
    await page.waitForFunction(() => !!window.__city10);
    await page.waitForTimeout(3000);
    const before = await page.evaluate(() => window.__city10.api.car());
    await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1200); await page.keyboard.up('ArrowUp');
    const after = await page.evaluate(() => window.__city10.api.car());
    assert(Math.hypot(after.pos.x-before.pos.x,after.pos.z-before.pos.z)>5, `${persona} car must move`);
    await page.evaluate(() => window.__city10.api.freeze(true));
    await page.waitForTimeout(350);
    await page.screenshot({path:shot(`${persona}-driving`)});
    const performance = await page.evaluate(async()=>{
      const start=window.performance.now(), frames=[]; let last=start;
      await new Promise(resolve=>{const frame=t=>{frames.push(t-last);last=t;if(t-start>=3000)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});
      const canvas=document.querySelector('canvas'),bounds=canvas.getBoundingClientRect();
      return{fps:frames.length/((last-start)/1000),p95:frames.sort((a,b)=>a-b)[Math.floor(frames.length*.95)],dpr:canvas.width/bounds.width,drawCalls:document.documentElement.dataset.lookCalls,triangles:document.documentElement.dataset.lookTriangles};
    });
    assert(performance.dpr<=1.501,'DPR must be capped at1.5');
    results.push({persona,...performance});
    if(persona==='tom'){
      await page.evaluate(()=>{const api=window.__city10.api;const p=api.pointOn('moving-house',.12);api.teleport(p.pos,p.heading);});
      await page.waitForTimeout(1500);await page.screenshot({path:shot('moving-house-avenue')});
    }
  }
  for(const persona of ['margaret','nadia']){
    await page.goto(`${base}?engine=1&debug=1&p=${persona}`);await page.getByRole('heading',{name:'Your next step'}).waitFor();assert.equal(await page.locator('canvas').count(),0,`${persona} must remain non-game`);
  }
  await page.goto(base);await page.getByRole('button',{name:'View your block'}).click();await page.waitForTimeout(2000);await page.screenshot({path:shot('block-bare')});
  await page.getByRole('button',{name:'0 missions passed'}).click();await page.waitForTimeout(700);await page.screenshot({path:shot('block-lit')});
  await page.getByRole('button',{name:'1 missions passed'}).click();await page.getByRole('button',{name:'2 missions passed'}).click();await page.waitForTimeout(700);await page.screenshot({path:shot('block-crowned')});
  // Verify the real world reads the progress store, independently of preview overrides.
  await page.evaluate(()=>localStorage.setItem('kbcone.v9.village:tom',JSON.stringify({personaId:'tom',done:['tom:energy-new-address','tom:setting-up','tom:old-deposit'],saved:[]})));
  await page.goto(`${base}?engine=1&debug=1&p=tom`);await page.waitForFunction(()=>!!window.__city10);await page.waitForTimeout(2000);await page.waitForFunction(()=>document.documentElement.dataset.lookBlockState==='crowned');
  await page.evaluate(()=>{const{api,engine}=window.__city10;const b=engine.blocks[1];api.teleport({x:b.door.x,z:b.door.z},Math.atan2(b.x-b.door.x,b.z-b.door.z));api.freeze(true);});
  await page.waitForTimeout(800);await page.screenshot({path:shot('tom-persisted-upgrade')});
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForTimeout(2000);await page.screenshot({path:shot('reduced-motion')});
  assert.deepEqual(errors,[],'No browser or shader errors');
  console.log(JSON.stringify({results,errors,checks:['4 personas drive','DPR cap1.5','Margaret/Nadia no canvas','bare/lit/crowned previews','persisted mission progress','reduced motion']},null,2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
