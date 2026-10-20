/* Run from kbc-one-v9 against KBC_AI=off bunx next dev -p 3601.
   PLAYWRIGHT_MODULE and CHROMIUM_PATH can select existing local installations. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.WORLD_URL || 'http://localhost:3601/dev/world';
const shots = 'docs/screenshots';
(async () => {
  fs.mkdirSync(shots, {recursive:true});
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH, args:['--enable-webgl','--ignore-gpu-blocklist']});
  const errors = [];
  const results = [];
  const page = await browser.newPage({viewport:{width:1366,height:768}});
  page.on('pageerror',e=>errors.push(e.message));
  const shot = name => page.screenshot({path:shots+'/v9-world-'+name+'.png'});
  await page.goto(base+'?p=tom');
  await page.getByRole('button',{name:'Play · turn your phone'}).click();
  await page.waitForTimeout(300);
  assert.equal(await page.locator('canvas').count(),0, 'No canvas under a rotating phone');
  await shot('turn');
  await page.locator('.vg').waitFor();
  await page.waitForTimeout(6000);
  await shot('village');
  results.push({person:'tom',fps:await page.locator('canvas').getAttribute('data-world-fps'),drawCalls:await page.locator('canvas').getAttribute('data-draw-calls')});
  await page.getByRole('button',{name:/^Home Moving/}).click();
  await shot('home-overview');
  await page.getByRole('button',{name:'Close panel'}).click();
  const answers = ['A dated meter photo on moving-in day','List essentials, compare second-hand, then set a total','Check money available now and ask about the release steps'];
  for(let i=0;i<3;i++){
    await page.getByRole('button',{name:i?/Next bump:/:/Start lesson/}).click();
    await page.locator('[data-step=guess]').waitFor();
    await page.waitForTimeout(700);
    if(!i)await shot('guess');
    await page.locator('[data-step=guess] button').first().click();
    if(!i)await shot('reveal');
    await page.getByRole('button',{name:'See what helped'}).click();
    if(!i)await shot('helped');
    await page.getByRole('button',{name:'Pave this bump',exact:true}).click();
    assert.equal(await page.locator('.vg').getAttribute('data-built'),String(i),'Paving is provisional');
    await page.waitForTimeout(500);
    if(!i)await shot('paved');
    await page.getByRole('button',{name:answers[i],exact:true}).click();
    await page.getByRole('button',{name:'Keep this lesson'}).click();
    if(i===1)await page.getByRole('button',{name:'Not now',exact:true}).click();
    else await page.locator('[data-step=save] button').first().click();
    await page.waitForFunction(n=>document.querySelector('.vg')?.dataset.built===String(n),i+1);
    await page.waitForTimeout(2400);
    await shot(i===2?'done':'built-'+(i+1));
  }
  assert.equal(await page.locator('.vg-stamps span').count(),3);
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('kbcone.v9.village:tom')));
  assert.equal(stored.done.length,3);assert.equal(stored.saved.length,2);
  await page.getByRole('button',{name:'← Back to app',exact:true}).click();
  await page.waitForTimeout(50);
  assert.equal(await page.locator('canvas').count(),0,'Canvas unmounted before reverse rotation');
  await page.waitForTimeout(1200);
  await page.reload();
  await page.getByRole('button',{name:'Play · turn your phone'}).click();
  await page.locator('.vg[data-built="3"]').waitFor();
  await page.close();
  for(const person of ['karim','sofie','lina','margaret','nadia']){
    const p=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:person==='lina'?'reduce':'no-preference'});
    p.on('pageerror',e=>errors.push(e.message));
    await p.goto(base+'?p='+person);
    await p.getByRole('button',{name:'Play · turn your phone'}).click();
    await p.locator('.vg').waitFor();await p.waitForTimeout(6000);
    if(['margaret','nadia'].includes(person)){
      assert.equal(await p.locator('canvas').count(),0);
      await p.getByRole('button',{name:'Back to app',exact:true}).click();
      results.push({person,game:false});await p.close();continue;
    }
    results.push({person,fps:await p.locator('canvas').getAttribute('data-world-fps'),reduced:person==='lina'});
    await p.screenshot({path:shots+'/v9-world-'+person+'-village.png'});
    await p.getByRole('button',{name:/Start lesson/}).click();
    await p.locator('[data-step=guess]').waitFor();
    await p.locator('[data-step=guess] button').first().click();
    await p.waitForTimeout(500);
    await p.screenshot({path:shots+'/v9-world-'+person+'-reveal.png'});
    await p.getByRole('button',{name:'See what helped'}).click();
    await p.getByRole('button',{name:'Pave this bump',exact:true}).click();
    await p.locator('[data-step=apply] button').first().click();
    await p.getByRole('button',{name:'Keep this lesson'}).click();
    await p.getByRole('button',{name:'Not now',exact:true}).click();
    await p.locator('.vg[data-built="1"]').waitFor();await p.waitForTimeout(2400);
    await p.screenshot({path:shots+'/v9-world-'+person+'-done.png'});
    await p.close();
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({checks:'Tom full3, saves/Not now, reload, turn; Karim/Sofie/Lina full1; care/large excluded',results,errors},null,2));
  await browser.close();
})().catch(error=>{console.error(error);process.exitCode=1});
