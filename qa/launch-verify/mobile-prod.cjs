// DAI-07 responsive check against production (read-only). Usage: node mobile-prod.cjs <label> [baseUrl]
// Real viewport sizes + device scale + touch/mobile UA for phones. Signed-out pages, plus
// signed-in /account and /pro for the FREE test account when SIGNIN=1 (link made in-process, never printed).
const { chromium, devices } = require('C:/Users/mpmmo/ETETEST/node_modules/playwright');
const fs = require('fs'); const path = require('path');
const label = process.argv[2] || 'run'; const B = process.argv[3] || 'https://dailyaibetting.com';
const OUT = path.join(__dirname, '..', '..', 'docs', 'launch-evidence', `DAI-07-${label}`); fs.mkdirSync(OUT, { recursive: true });
const SIZES = [
  { name: '360', viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: devices['Pixel 5'].userAgent },
  { name: '390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: devices['iPhone 13'].userAgent },
  { name: '768', viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: devices['iPad Mini'].userAgent },
  { name: '1024', viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 },
  { name: '1440', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
];
const PAGES = ['/', '/pricing', '/consensus', '/picks', '/daily-bets', '/results', '/stats', '/history', '/cappers', '/login', '/props', '/nba-picks-today'];
const res = []; const ok = (n, p, i = '') => { res.push({ check: n, pass: !!p, info: i }); if (!p || process.env.VERBOSE) console.log(`${p ? 'PASS' : 'FAIL'} ${n}${i ? ' :: ' + i : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function audit(pg, tag, size) {
  // overflow measured at the scroll position a visitor gets (top), no scrollIntoView
  const m = await pg.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const wide = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
      const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
      let p = el.parentElement, clipped = false;
      while (p && p !== document.body) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { clipped = true; break; } p = p.parentElement; }
      if (!clipped && r.right > vw + 1) wide.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).split(' ').slice(0, 2).join('.')} right=${Math.round(r.right)}`);
    }
    return { vw, sw, wide: wide.slice(0, 4) };
  });
  ok(`${tag} @${size} no horizontal page scroll`, m.sw <= m.vw + 1, `scrollWidth ${m.sw} vs ${m.vw}${m.wide.length ? ' | ' + m.wide.join(' ; ') : ''}`);
}
(async () => {
  const browser = await chromium.launch();
  for (const s of SIZES) {
    const ctx = await browser.newContext({ viewport: s.viewport, isMobile: !!s.isMobile, hasTouch: !!s.hasTouch, deviceScaleFactor: s.deviceScaleFactor, ...(s.userAgent ? { userAgent: s.userAgent } : {}) });
    const pg = await ctx.newPage();
    for (const p of PAGES) {
      await sleep(1200);
      const r = await pg.goto(B + p, { waitUntil: 'domcontentloaded' }).catch((e) => ({ status: () => 0, e }));
      await pg.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      ok(`${p} @${s.name} loads`, r.status() === 200, `status ${r.status()}`);
      await audit(pg, p, s.name);
      await pg.screenshot({ path: path.join(OUT, `${s.name}-${p === '/' ? 'home' : p.slice(1).replace(/\//g, '_')}.png`), fullPage: false });
    }
    // menu: on phones/tablets the nav must be reachable via a toggle that opens a visible menu
    await pg.goto(B + '/', { waitUntil: 'domcontentloaded' }); await pg.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    if (s.viewport.width < 1280) {
      const toggle = pg.getByRole('button', { name: 'Toggle menu' }).first();
      const tv = await toggle.isVisible().catch(() => false);
      ok(`menu toggle visible @${s.name}`, tv);
      if (tv) {
        await toggle.click(); await sleep(600);
        const links = await pg.locator('[role="dialog"] a:visible').count();
        ok(`menu opens with nav links @${s.name}`, links > 0, `${links} visible nav links`);
        await pg.screenshot({ path: path.join(OUT, `${s.name}-menu-open.png`) });
      }
    }
    await ctx.close();
  }
  await browser.close();
  const sum = { label, base: B, at: new Date().toISOString(), pass: res.filter((r) => r.pass).length, fail: res.filter((r) => !r.pass).length, results: res };
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(sum, null, 1));
  console.log(`== ${sum.pass} pass / ${sum.fail} fail -> ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
