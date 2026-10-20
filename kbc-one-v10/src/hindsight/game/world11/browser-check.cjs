// Run from kbc-one-v10. Isolated hardware Chrome; no shared browser profile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/kbc-game-browser/node_modules/playwright');
const base = process.env.WORLD_URL || 'http://localhost:3802';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1.5});
 const page=await context.newPage(),errors=[],results=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const shot=async name=>page.screenshot({path:path.resolve(`docs/screenshots/v11-world-${name}.png`)});
 for(const persona of ['tom','karim','sofie','lina']){
  await page.goto(`${base}/dev/world11?p=${persona}`);await page.waitForSelector('[data-world-ready="true"]');await page.waitForTimeout(3500);
  assert.equal(await page.locator('canvas').count(),1);assert.equal(await page.locator('.world11-area-label').count(),11);
  const sample=await page.evaluate(()=>new Promise(resolve=>{let n=0;const start=performance.now();function tick(){n++;if(performance.now()-start<2500)requestAnimationFrame(tick);else resolve({fps:n*1000/(performance.now()-start),...document.documentElement.dataset});}requestAnimationFrame(tick);}));
  results.push({persona,...sample});await shot(persona);
 }
 const before=await page.evaluate(()=>JSON.stringify(localStorage));
 await page.getByRole('button',{name:'Home, stage',exact:false}).click();await page.waitForTimeout(1600);assert.equal(await page.locator('[data-world-focus]').getAttribute('data-world-focus'),'home');await shot('home-focus');
 await page.getByRole('button',{name:'Prepare storm',exact:true}).click();await page.waitForTimeout(500);await shot('prepared');
 await page.getByRole('button',{name:'World ahead',exact:true}).click();await page.waitForTimeout(500);await shot('ahead');
 await page.getByRole('button',{name:'Return to world overview'}).click();await page.waitForTimeout(1500);
 await page.mouse.move(550,400);await page.mouse.down();await page.mouse.move(700,470,{steps:12});await page.mouse.up();await page.mouse.wheel(0,-500);await page.waitForTimeout(500);await shot('pan-zoom');
 await page.getByRole('button',{name:'Return to world overview'}).click();await page.waitForTimeout(1400);
 assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),before,'Scene exploration must not write progress');
 for(const persona of ['margaret','nadia']){await page.goto(`${base}/dev/world11?p=${persona}`);await page.waitForTimeout(500);assert.equal(await page.locator('canvas').count(),0);if(persona==='nadia'){assert.equal(await page.locator('section').count(),0);await page.getByRole('button',{name:'Show my care options'}).click();assert.equal(await page.locator('canvas').count(),0);}await shot(persona);}
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:844,height:390});await page.goto(`${base}/dev/world11?p=sofie&stage=4`);await page.waitForSelector('[data-world-ready="true"]');await page.waitForTimeout(1600);await shot('compact-grown');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:1440,height:900});await page.goto(`${base}/dev/world11?p=tom&stage=3`);await page.waitForSelector('[data-world-ready="true"]');await page.waitForTimeout(1800);await shot('grown');
 await page.addStyleTag({content:'.world11-preview header,.world11-preview nav,.world11-preview footer,.world11-preview-note,.world11-labels,.world11-camera-tools,nextjs-portal{display:none!important}'});
 await page.screenshot({path:path.resolve('src/hindsight/game/world11/world-picture.jpg'),type:'jpeg',quality:85});
 assert.deepEqual(errors,[]);const report={results,errors,checks:['4 game personas','plain Margaret','care consent Nadia','focus/overview','prepare dam','gated ahead','pan/zoom','no scene persistence','compact reduced motion','growth stage4'],timestamp:new Date().toISOString()};fs.writeFileSync(path.resolve('src/hindsight/game/world11/browser-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
