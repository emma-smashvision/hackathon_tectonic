// Run from kbc-one-v10. Hardware-backed, isolated headless Chrome at 1366×768.
const assert = require('node:assert/strict');
const { writeFileSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/kbc-game-browser/node_modules/playwright');
const base = process.env.ENGINE_URL || 'http://localhost:3701';
(async () => {
 const browser = await chromium.launch({ headless:true, executablePath:process.env.CHROMIUM_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
 const page = await browser.newPage({ viewport:{width:1366,height:768}, deviceScaleFactor:1 });
 const errors=[]; page.on('pageerror', e=>errors.push(e.message)); page.on('console', m=>{if(m.type()==='error')errors.push(m.text())});
 const shot=name=>page.screenshot({path:`docs/screenshots/v10-engine-${name}.png`});
 const fps=label=>page.evaluate(async label=>{
   const r=window.__city10.engine.rt.current, frames=r.frameStats.frames, start=performance.now(); let peakSmoke=0, activeSmokeFrames=0;
   await new Promise(resolve=>{const poll=()=>{peakSmoke=Math.max(peakSmoke,r.effects.smokeCount);if(r.effects.smokeCount)activeSmokeFrames++;performance.now()-start>=5000?resolve():requestAnimationFrame(poll)};requestAnimationFrame(poll)});
   return {label, fps:Number(((r.frameStats.frames-frames)*1000/(performance.now()-start)).toFixed(2)), traffic:r.traffic.length, peakSmoke, activeSmokeFrames, smoke:r.effects.smokeCount, skid:r.effects.skidCount, fov:r.frameStats.fov};
 },label);
 const report={viewport:'1366x768',dpr:1,samples:[]};
 try {
  await page.goto(`${base}/dev/engine?debug=1&night=1`);await page.waitForFunction(()=>window.__city10?.engine.rt.current.frameStats.frames>120);
  await page.addStyleTag({content:'nextjs-portal{display:none}'});
  const gpu=await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable'});report.gpu=gpu;
  assert.equal(await page.evaluate(()=>window.__city10.engine.rt.current.traffic.length),20);
  report.samples.push(await fps('night city + 20 moving NPC cars'));
  await page.evaluate(()=>{const {api,engine}=window.__city10;const c=engine.rt.current.traffic[8];api.teleport({x:c.x+Math.sin(c.heading)*15,z:c.z+Math.cos(c.heading)*15},c.heading+Math.PI);});
  await page.waitForTimeout(3500);
  const stopped=await page.evaluate(()=>{const r=window.__city10.engine.rt.current,c=r.traffic[8];return{speed:c.speed,gap:Math.hypot(c.x-r.car.x,c.z-r.car.z),braking:c.braking}});
  assert(stopped.speed<.8,JSON.stringify(stopped));assert(stopped.gap>4);await shot('traffic-yield');
  await page.evaluate(()=>{const {api}=window.__city10;api.teleport(api.home(),-Math.PI/2)});await page.waitForTimeout(1800);
  assert(await page.evaluate(()=>window.__city10.engine.rt.current.traffic[8].speed>4));
  // Actual keyboard acceleration + handbrake steering creates tyre marks and smoke.
  await page.keyboard.down('KeyW');await page.waitForTimeout(1450);await page.keyboard.down('Space');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(500);
  const drift=await page.evaluate(()=>({telemetry:window.__city10.engine.rt.current.telemetry,effects:window.__city10.engine.rt.current.effects}));
  assert(drift.telemetry.slip>.28,JSON.stringify(drift));assert(drift.effects.smokeCount>0);assert(drift.effects.skidCount>0);await shot('drift-smoke');
  await page.keyboard.up('ArrowLeft');await page.keyboard.up('Space');await page.keyboard.up('KeyW');
  await page.evaluate(()=>{const {api,engine}=window.__city10;api.teleport(api.home(),-Math.PI/2);engine.rt.current.car.speed=36;window.__samples=[];window.__offSpeed=api.onSpeed(t=>window.__samples.push({...t,at:performance.now()}));api.boost(1600)});
  await page.keyboard.down('KeyW');await page.waitForTimeout(700);
  const boosted=await page.evaluate(()=>({telemetry:window.__city10.engine.rt.current.telemetry,fov:window.__city10.engine.rt.current.frameStats.fov,boostMs:window.__city10.engine.rt.current.boostMs}));
  assert(boosted.telemetry.boosting);assert(boosted.telemetry.speed>42);assert(boosted.fov>68);await shot('boost-speed');await page.keyboard.up('KeyW');
  await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>window.__city10.engine.rt.current.boostMs),0);
  const {count,telemetryHz}=await page.evaluate(()=>{window.__offSpeed();const s=window.__samples;return{count:s.length,telemetryHz:(s.length-1)*1000/(s.at(-1).at-s[0].at)}});assert(count>=10&&telemetryHz>=8.5&&telemetryHz<=11.5,`10Hz: ${telemetryHz}`);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__samples.length),count);
  // Camera height grows gradually for 3 seconds, then the map appears.
  await page.keyboard.press('KeyM');await page.waitForSelector('.c10-overview');await page.waitForTimeout(150);
  const early=await page.evaluate(()=>window.__city10.engine.rt.current.frameStats.cameraY);await page.waitForTimeout(2150);
  const high=await page.evaluate(()=>window.__city10.engine.rt.current.frameStats.cameraY);assert(high>500&&early<high*.2,`${early}->${high}`);await shot('overview-swoop');await page.waitForSelector('.c10-map');await shot('round2-map');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__city10.engine.rt.current.frameStats.cameraY<50,null,{timeout:4000});
  // Real contact applies the bounded camera-jolt envelope.
  await page.evaluate(()=>{const {api,engine}=window.__city10,b=engine.blocks[0];api.teleport({x:b.x,z:b.z-b.depth/2-5},0);engine.rt.current.car.speed=22;});
  await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__city10.engine.rt.current.jolt>0);await page.keyboard.up('KeyW');
  assert(await page.evaluate(()=>window.__city10.engine.rt.current.scraped));
  const marker=await page.evaluate(()=>{const {api}=window.__city10;window.__clearMarker=api.spawnMarker({id:'test-marker',at:api.home(),label:'Engine marker',color:'#9dffdc'});return window.__city10.engine.rt.current.spawnedMarkers.size});assert.equal(marker,1);await page.evaluate(()=>window.__clearMarker());assert.equal(await page.evaluate(()=>window.__city10.engine.rt.current.spawnedMarkers.size),0);
  await page.evaluate(()=>{const {api}=window.__city10;api.teleport(api.pointOn('everyday',.18).pos,api.pointOn('everyday',.18).heading);api.setAutopilot(api.pointOn('first-home',.45).pos)});await page.waitForTimeout(1500);
  report.samples.push(await fps('driving with traffic, reflections and post'));
  await page.evaluate(()=>{const {api,engine}=window.__city10;api.setAutopilot(null);api.teleport({x:0,z:-80},0);engine.rt.current.car.speed=28;engine.rt.current.car.travelHeading=-.8;engine.rt.current.keys.up=true;engine.rt.current.keys.left=true;engine.rt.current.keys.brake=true});
  report.samples.push(await fps('continuous drift and smoke pool'));
  await page.evaluate(()=>{const {engine}=window.__city10;engine.rt.current.keys={up:false,down:false,left:false,right:false,brake:false}});
  assert(report.samples[2].activeSmokeFrames>200,'smoke remains active through the five-second performance sample');
  assert.deepEqual(errors,[]);report.errors=errors;report.behavior={trafficYield:stopped,drift,boosted,telemetrySamples:count,telemetryHz,overview:{early,high}};
  console.log(JSON.stringify(report,null,2));
  writeFileSync('docs/screenshots/v10-engine-performance.json',JSON.stringify(report,null,2)+'\n');
  assert(report.samples.every(s=>s.fps>=57),'60fps target (allow 5% frame scheduling variance)');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
