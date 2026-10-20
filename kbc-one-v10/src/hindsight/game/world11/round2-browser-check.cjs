// Run from kbc-one-v10 with KBC_AI=off server on3812. Isolated hardware Chrome.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sourceRevision=require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/tmp/kbc-game-browser/node_modules/playwright');
const base=process.env.WORLD_URL||'http://localhost:3812';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1.5,hasTouch:true});
  const page=await context.newPage(),errors=[],results=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const shot=async name=>page.screenshot({path:path.resolve(`docs/screenshots/r2-world-${name}.png`)});
  const open=async persona=>{await page.goto(`${base}/dev/world11?p=${persona}`);await page.waitForSelector('[data-world-ready="true"]');await page.waitForTimeout(3400);};
  for(const persona of ['tom','karim','sofie','lina']){
   await open(persona);assert.equal(await page.locator('canvas').count(),1);assert.equal(await page.locator('.world11-area-label').count(),11);
   assert(await page.locator('.world11-area-label').evaluateAll(labels=>labels.every(label=>{const r=label.getBoundingClientRect();return getComputedStyle(label).visibility==='visible'&&r.top>=0&&r.bottom<innerHeight-12;})),'All district labels, including Care, must fit the overview');
   const sample=await page.evaluate(()=>new Promise(resolve=>{let frames=0;const start=performance.now();function tick(){frames++;if(performance.now()-start<3000)requestAnimationFrame(tick);else resolve({rafFps:frames*1000/(performance.now()-start),...document.documentElement.dataset});}requestAnimationFrame(tick);}));
   assert(Number(sample.worldDpr)<=1.5);results.push({persona,...sample});await shot(persona);
  }
  await open('karim');await page.getByRole('button',{name:'Home, stage'}).click();await page.waitForTimeout(1800);await shot('karim-home');
  await page.getByRole('button',{name:'Return to world overview'}).click();await page.waitForTimeout(1800);await page.getByRole('button',{name:'Pension, stage'}).click();await page.waitForTimeout(1800);await shot('pension');
  await open('tom');const before=await page.evaluate(()=>JSON.stringify(localStorage));
  await page.getByRole('button',{name:'Home, stage'}).click();await page.waitForTimeout(1800);await shot('tom-home');
  await page.getByRole('button',{name:'Prepare storm',exact:true}).click();await page.waitForTimeout(300);await shot('dam-build');await page.waitForTimeout(2400);await shot('prepared');assert(await page.locator('.world11-energy-plan').isVisible());assert(await page.getByText('Illustrative storm · dam built',{exact:true}).isVisible());
  await page.getByRole('button',{name:'Return to world overview'}).click();await page.waitForTimeout(1800);await page.getByRole('button',{name:'Savings, stage'}).click();await page.waitForTimeout(1800);await shot('savings');
  await page.getByRole('button',{name:'Return to world overview'}).click();await page.waitForTimeout(1800);await page.getByRole('button',{name:'Car, stage'}).click();await page.waitForTimeout(1800);await shot('car');
  await page.getByRole('button',{name:'Return to world overview'}).click();await page.waitForTimeout(1800);await page.getByRole('button',{name:'Kids, explore:'}).click();await page.waitForTimeout(1600);await shot('locked');
  await page.getByRole('button',{name:'Preview unlock',exact:true}).click();await page.waitForTimeout(330);await shot('unlock-rise');await page.waitForTimeout(1900);await shot('unlocked');assert.equal(await page.getByRole('button',{name:'Kids, stage'}).count(),1);
  assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),before,'Scene review must not save progress');
  await page.getByRole('button',{name:'Return to world overview'}).click();await page.waitForTimeout(2600);
  const cameraBefore=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.worldCamera));
  await page.mouse.move(650,420);await page.mouse.down();await page.mouse.move(740,450,{steps:12});await page.mouse.up();await page.waitForTimeout(2400);
  const pan=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.worldCamera));assert(Math.hypot(...pan.position.map((v,i)=>v-cameraBefore.position[i]))>1);
  const client=await context.newCDPSession(page);await client.send('Input.synthesizePinchGesture',{x:600,y:400,scaleFactor:1.4,relativeSpeed:400,gestureSourceType:'touch'});await page.waitForTimeout(2400);
  const pinch=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.worldCamera));assert(Math.hypot(...pinch.position.map((v,i)=>v-pan.position[i]))>1);await shot('pan-pinch');
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:844,height:390});await open('sofie');await shot('reduced-compact');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  // Margaret's calm world and Nadia's ordinary districts use the same scene contract.
  await page.setViewportSize({width:1366,height:768});
  for(const persona of ['margaret','nadia']){await open(persona);assert.equal(await page.locator('canvas').count(),1);if(persona==='margaret'){assert.equal(await page.locator('.world11-calm').count(),1);assert.equal(await page.locator('.world11-storm-caption').count(),0);}await shot(persona);}
  // Calm world retains taps but ignores actual pointer pan and wheel zoom.
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1366,height:768});
  await page.goto(`${base}/dev/world11?p=tom&calm=1`);await page.waitForSelector('.world11-calm');await page.waitForTimeout(6500);
  const calmBefore=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.worldCamera));
  await page.mouse.move(600,420);await page.mouse.down();await page.mouse.move(720,470,{steps:12});await page.mouse.up();await page.mouse.wheel(0,-600);await page.waitForTimeout(2400);
  const calmAfter=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.worldCamera));assert(Math.hypot(...calmAfter.position.map((v,i)=>v-calmBefore.position[i]))<1,'Calm ignores pan and zoom');await shot('calm');
  const gpu=await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown';});
  assert.deepEqual(errors,[]);const report={sourceRevision,results,errors,gpu,checks:['four game personas + Margaret calm + Nadia ordinary','own finance districts','mortgage/rent/insurance','goal tanks','contribution tower','single seven-home storm','sequential dam','locked hint + unlock land/fog/build','no scene persistence','fly-to + overview','pointer pan + native touch pinch','compact reduced motion','Calm ignores pan/zoom'],timestamp:new Date().toISOString()};
  fs.writeFileSync(path.resolve('src/hindsight/game/world11/round2-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
