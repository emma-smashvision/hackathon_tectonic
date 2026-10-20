// WS-E headless checks. Set PLAYWRIGHT_MODULE / CHROME_PATH for another local browser install.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/tmp/kbc-pitch-browser/node_modules/playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1080},reducedMotion:'reduce'});page.setDefaultTimeout(60000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3505/?p=tom');await page.locator('.v8-home-road').waitFor();
 await page.getByRole('button',{name:'Your road',exact:true}).click();
 await page.getByRole('button',{name:'All roads',exact:true}).click();
 await page.getByLabel('Describe a situation',{exact:true}).fill('we just bought our first house');
 await page.getByRole('button',{name:'Find a road',exact:true}).click();
 await page.locator('.a8-results').getByRole('button',{name:/First home/}).click();
 await page.getByLabel('Where would you like to start?').selectOption('start');
 await page.getByRole('button',{name:'Explore First home',exact:true}).click();
 await page.locator('.road8-header h1').waitFor();
 assert.equal(await page.locator('.road8-header h1').innerText(),'First home');
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kbcone.v8.pointers:tom')));
 assert.equal(saved.confirmed.roadId,'moving-house');
 await page.getByRole('button',{name:'Home',exact:true}).click();
 assert.equal(await page.locator('.v8-home-road').getAttribute('data-road-id'),'moving-house');
 await page.getByRole('button',{name:'Your road',exact:true}).click();
 await page.getByRole('button',{name:'All roads',exact:true}).click();
 await page.locator('.a8-group').getByRole('button',{name:/^First home/}).click();
 await page.getByLabel('Where would you like to start?').selectOption('start');
 await page.getByText('This is my situation',{exact:true}).click();
 await page.getByLabel('Date of this stage',{exact:true}).fill('2026-11-01');
 await page.getByRole('button',{name:'Confirm my situation',exact:true}).click();
 await page.getByRole('button',{name:'Home',exact:true}).click();
 assert.equal(await page.locator('.v8-home-road').getAttribute('data-road-id'),'first-home');
 await page.reload();await page.locator('.v8-home-road[data-road-id="first-home"]').waitFor();
 await page.getByRole('button',{name:'Ask Kate anything…'}).click();
 await page.locator('.kate-sheet input').fill('Describe my situation');await page.locator('.kate-sheet input').press('Enter');
 await page.getByRole('button',{name:'Open Your road',exact:true}).last().click();
 await page.locator('.yr-sheet').waitFor();assert.match(await page.locator('.yr-sheet h2').innerText(),/energy/i);
 await page.screenshot({path:'docs/screenshots/v8-channels-confirmed-persistence.png'});
 assert.deepEqual(errors,[]);console.log('PASS: preview purity; explicit confirmation; reload; Home/Kate shared live pointers');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
