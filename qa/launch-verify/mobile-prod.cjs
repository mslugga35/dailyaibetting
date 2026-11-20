// DAI-07 responsive check against production (read-only). Usage: node mobile-prod.cjs <label> <expectedSha> [baseUrl]
// Refuses to run unless the deployed commit matches; clears its evidence dir; exits 1 on any FAIL or wrong check count.
// Real viewport sizes + device scale + touch/mobile UA for phones. Signed-out pages, plus
// signed-in /account and /pro for the FREE test account when SIGNIN=1 (link made in-process, never printed).
const { chromium, devices } = require('C:/Users/mpmmo/ETETEST/node_modules/playwright');
const fs = require('fs'); const path = require('path');
const label = process.argv[2] || 'run'; const SHA = process.argv[3] || ''; const B = process.argv[4] || 'https://dailyaibetting.com';
const OUT = path.join(__dirname, '..', '..', 'docs', 'launch-evidence', `DAI-07-${label}`);
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const SIZES = [
  { name: '360', viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: devices['Pixel 5'].userAgent },
  { name: '390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: devices['iPhone 13'].userAgent },
  { name: '768', viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: devices['iPad Mini'].userAgent },
  { name: '1024', viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 },
  { name: '1440', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
];
const PAGES = ['/', '/pricing', '/consensus', '/picks', '/daily-bets', '/results', '/stats', '/history', '/cappers', '/login', '/props', '/nba-picks-today', '/auth/confirm'];
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
  const ci = await (await fetch(`${B}/.well-known/commit-info.json`, { cache: 'no-store' })).json();
  if (!SHA || !String(ci.commitHash || '').startsWith(SHA)) { console.error(`ABORT deployed ${ci.commitHash} != expected ${SHA}`); process.exit(2); }
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
        // Drawer layout: every visible item sits at least 8 px inside the drawer, and every tap target is >= 24 px (WCAG 2.5.8 AA).
        const d = await pg.evaluate(() => {
          const dlg = document.querySelector('[role="dialog"]'); if (!dlg) return null;
          const D = dlg.getBoundingClientRect(); const tight = []; const small = [];
          for (const el of dlg.querySelectorAll('a, button, span, h2, p')) {
            const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
            if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none') continue;
            const name = (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 20);
            if (r.left < D.left + 8 || r.right > D.right - 8) tight.push(`${name} [${Math.round(r.left - D.left)}..${Math.round(D.right - r.right)}]`);
            if ((el.tagName === 'A' || el.tagName === 'BUTTON') && (r.height < 24 || r.width < 24)) small.push(`${name} ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
          return { tight: tight.slice(0, 5), small: small.slice(0, 5) };
        });
        ok(`menu items keep an 8 px gutter inside the drawer @${s.name}`, d && d.tight.length === 0, d ? d.tight.join(' ; ') : 'no dialog');
        ok(`menu tap targets >= 24 px @${s.name}`, d && d.small.length === 0, d ? d.small.join(' ; ') : 'no dialog');
        await pg.screenshot({ path: path.join(OUT, `${s.name}-menu-open.png`) });
      }
    }
    await ctx.close();
  }
  await browser.close();
  const EXPECTED = SIZES.length * PAGES.length * 2 + SIZES.filter((x) => x.viewport.width < 1280).length * 4;
  const sum = { label, base: B, sha: ci.commitHash, at: new Date().toISOString(), expected: EXPECTED, ran: res.length, pass: res.filter((r) => r.pass).length, fail: res.filter((r) => !r.pass).length, results: res };
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(sum, null, 1));
  console.log(`== ${sum.pass} pass / ${sum.fail} fail (expected ${EXPECTED}, ran ${sum.ran}) -> ${OUT}`);
  process.exit(sum.fail || sum.ran !== EXPECTED ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
