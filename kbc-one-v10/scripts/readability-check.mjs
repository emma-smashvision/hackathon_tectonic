// Readability check for Hindsight City.
// For a set of scenes and screen sizes it verifies that every piece of text on screen
// (HUD blocks and world labels) does not overlap any other, stays inside the viewport,
// is not clipped, is at least 10px, and meets WCAG contrast (4.5:1, 3:1 for large text).
//
//   npm run build && npm start            # in one terminal
//   npx -y playwright@1 install chromium  # once
//   node scripts/readability-check.mjs     # optional: SHOTS=./shots to save screenshots
//
// Exit code is the number of issues found (0 = all readable).
import { chromium } from 'playwright';
const ARGS = ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'];
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ARGS });

const audit = () => {
  const city = document.querySelector('.city'); const cr = city.getBoundingClientRect();
  const vis = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.5; };
  const blocks = [...document.querySelectorAll('.city [data-hud], .wl.on')].filter(vis);
  const name = (el) => el.classList.contains('wl') ? 'label:' + el.dataset.label : (el.className.split(' ')[0] || el.tagName);
  const issues = [];
  const rects = blocks.map((el) => ({ el, n: name(el), r: el.getBoundingClientRect() }));
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], c = rects[j];
    if (a.el.contains(c.el) || c.el.contains(a.el)) continue;
    const ix = Math.min(a.r.right, c.r.right) - Math.max(a.r.left, c.r.left);
    const iy = Math.min(a.r.bottom, c.r.bottom) - Math.max(a.r.top, c.r.top);
    if (ix > 1 && iy > 1) issues.push(`OVERLAP ${a.n} × ${c.n} (${Math.round(ix)}×${Math.round(iy)})`);
  }
  for (const a of rects) {
    if (a.r.left < cr.left - 1 || a.r.top < cr.top - 1 || a.r.right > cr.right + 1 || a.r.bottom > cr.bottom + 1) {
      if (!a.el.classList.contains('sheet')) issues.push(`OUTSIDE ${a.n}`);
    }
  }
  // text checks inside every visible block
  const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  const bgOf = (el) => { let e = el; while (e) { const bg = getComputedStyle(e).backgroundColor; const m = bg.match(/[\d.]+/g); if (m && (m.length < 4 || Number(m[3]) > 0.85)) return bg; e = e.parentElement; } return 'rgb(6,13,24)'; };
  let texts = 0;
  for (const { el, n } of rects) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let t;
    while ((t = walker.nextNode())) {
      if (!t.textContent.trim()) continue;
      const p = t.parentElement; if (!vis(p)) continue;
      texts++;
      const cs = getComputedStyle(p);
      const fs = parseFloat(cs.fontSize);
      if (fs < 10) issues.push(`SMALL ${n} "${t.textContent.trim().slice(0, 30)}" ${fs}px`);
      if (p.scrollWidth > p.clientWidth + 2 && cs.overflow !== 'visible') issues.push(`CLIPPED ${n} "${t.textContent.trim().slice(0, 30)}"`);
      const L1 = lum(cs.color), L2 = lum(bgOf(p));
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const large = fs >= 24 || (fs >= 18.6 && Number(cs.fontWeight) >= 600);
      if (ratio < (large ? 3 : 4.5)) issues.push(`CONTRAST ${n} "${t.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}`);
    }
  }
  return { issues, blocks: rects.length, labels: rects.filter((r) => r.n.startsWith('label')).length, texts };
};

// The App (phone): every text node readable, nothing clipped, no sideways scroll.
const auditApp = () => {
  const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  const bgOf = (el) => { let e = el; while (e) { const bg = getComputedStyle(e).backgroundColor; const m = bg.match(/[\d.]+/g); if (m && (m.length < 4 || Number(m[3]) > 0.85)) return bg; e = e.parentElement; } return 'rgb(11,22,38)'; };
  const opacityOf = (el) => { let o = 1; let e = el; while (e) { o *= Number(getComputedStyle(e).opacity); e = e.parentElement; } return o; };
  const issues = [];
  const root = document.querySelector('.phone');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let t; let texts = 0;
  while ((t = walker.nextNode())) {
    if (!t.textContent.trim()) continue;
    const el = t.parentElement; const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || !el.getBoundingClientRect().width) continue;
    if (el.closest('.recap-overlay') === null && document.querySelector('.recap-overlay')) continue; // behind the recap sheet
    texts++;
    const fs = parseFloat(cs.fontSize);
    if (fs < 10.5) issues.push(`SMALL "${t.textContent.trim().slice(0, 30)}" ${fs}px`);
    if (el.scrollWidth > el.clientWidth + 2 && cs.overflow !== 'visible') issues.push(`CLIPPED "${t.textContent.trim().slice(0, 30)}"`);
    if (opacityOf(el) < 0.9 && !el.closest('[class*="rise"]')) issues.push(`FADED "${t.textContent.trim().slice(0, 30)}"`);
    const L1 = lum(cs.color), L2 = lum(bgOf(el));
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const large = fs >= 24 || (fs >= 18.6 && Number(cs.fontWeight) >= 600);
    if (ratio < (large ? 3 : 4.5)) issues.push(`CONTRAST "${t.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}`);
  }
  const body = document.querySelector('.phone-body');
  if (body.scrollWidth > body.clientWidth + 1) issues.push(`SIDEWAYS SCROLL ${body.scrollWidth}px`);
  return { issues, blocks: 1, labels: 0, texts };
};

async function run(vp, label, steps, opts = {}) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: !!opts.touch, isMobile: !!opts.touch });
  const p = await ctx.newPage();
  await p.goto((process.env.URL || 'http://localhost:3100') + '/' + (opts.intro ? '' : '?debug=1'), { waitUntil: 'networkidle' });
  if (!opts.app) {
    // the App opens by default: switch to the city
    await p.click('.views button[aria-label="City"]');
    await p.waitForTimeout(5000);
  } else await p.waitForSelector('.phone');
  for (const s of steps) await s(p);
  await p.waitForTimeout(opts.app ? 800 : 2500);
  const res = await p.evaluate(opts.app ? auditApp : audit);
  if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/r-${label}.png`, timeout: 120000 });
  console.log(`${label} ${vp.width}x${vp.height}: ${res.blocks} blocks, ${res.labels} labels, ${res.texts} texts, ${res.issues.length} issues`);
  for (const i of res.issues.slice(0, 12)) console.log('   ', i);
  await ctx.close();
  return res.issues.length;
}
const tp = (r, m, br = 'a') => async (p) => { await p.evaluate(([r, m, br]) => window.__hindsight.teleport(r, m, br), [r, m, br]); await p.waitForTimeout(2500); };
const key = (k) => async (p) => { await p.keyboard.press(k); await p.waitForTimeout(1200); };
const click = (sel) => async (p) => { await p.click(sel); await p.waitForTimeout(1000); };
const ring = (m, f = 0.5) => async (p) => { await p.evaluate(([m, f]) => window.__hindsight.ring(m, f), [m, f]); await p.waitForTimeout(2500); };
const wait = (ms) => async (p) => p.waitForTimeout(ms);

const sets = process.argv[2] ? process.argv[2].split(',') : null;
const scen = [
  ['start', { width: 1440, height: 900 }, [tp('first-home', 3)]],
  ['bump', { width: 1440, height: 900 }, [tp('first-home', 4.4)]],
  ['fork', { width: 1440, height: 900 }, [tp('first-home', 13.1)]],
  ['ring', { width: 1440, height: 900 }, [tp('first-child', -1.55)]],
  ['map', { width: 1440, height: 900 }, [key('KeyM'), async (p) => p.waitForTimeout(3000)]],
  ['panel', { width: 1440, height: 900 }, [tp('first-home', 4.4), key('KeyE')]],
  ['postcard', { width: 1280, height: 800 }, [tp('first-home', 6.2)]],
  ['care', { width: 1280, height: 800 }, [tp('separation', 0.4), click('text=Show me what\'s ahead'), tp('separation', 2.3)]],
  ['small', { width: 1024, height: 700 }, [tp('first-home', 4.4)]],
  ['tablet', { width: 768, height: 1024 }, [tp('first-home', 4.4)], { touch: true }],
  ['phone', { width: 390, height: 844 }, [tp('first-home', 4.4)], { touch: true }],
  ['intro', { width: 1280, height: 800 }, [], { intro: true }],
  ['everyday', { width: 1440, height: 900 }, [ring(11, 0.2)]],
  ['everyday-panel', { width: 1440, height: 900 }, [ring(11, 0.2), key('KeyE')]],
  ['today-ring', { width: 1280, height: 800 }, [ring(9, 0.3)]],
  ['destination', { width: 1440, height: 900 }, [tp('first-home', 15.2)]],
  ['salary-day', { width: 1440, height: 900 }, [click('.status-fuel button'), wait(9000)]],
  ['salary-phone', { width: 390, height: 844 }, [click('.status-fuel button'), wait(9000)], { touch: true }],
  ['app-today', { width: 1440, height: 1000 }, [], { app: true }],
  ['app-route', { width: 1440, height: 1000 }, [click('.tabbar button:has-text("Route")')], { app: true }],
  ['app-recap', { width: 1440, height: 1000 }, [click('.salary .btn')], { app: true }],
  ['app-care', { width: 1440, height: 1000 }, [click('.road-item:has-text("Losing your job")')], { app: true }],
  ['app-mobile', { width: 390, height: 844 }, [], { app: true, touch: true }],
];
let total = 0;
for (const [label, vp, steps, opts] of scen) {
  if (sets && !sets.includes(label)) continue;
  try { total += await run(vp, label, steps, opts); } catch (e) { console.log(label, 'ERROR', e.message.split('\n')[0]); total++; }
}
console.log('TOTAL ISSUES', total);
await b.close();
process.exit(Math.min(total, 100));
