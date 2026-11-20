// DAI-04 production check (read-only, signed out). Usage: node disclosure-prod.cjs <label> [baseUrl]
// 1) raw server HTML (no JS) must contain the disclosure with numbers
// 2) rendered with JS DISABLED: disclosure visible
// 3) rendered with JS enabled: disclosure visible, numbers identical to the API
const { chromium } = require('C:/Users/mpmmo/ETETEST/node_modules/playwright');
const fs = require('fs'); const path = require('path');
const label = process.argv[2] || 'run'; const B = process.argv[3] || 'https://dailyaibetting.com';
const OUT = path.join(__dirname, '..', '..', 'docs', 'launch-evidence', `DAI-04-${label}`); fs.mkdirSync(OUT, { recursive: true });
const PAGES = ['/', '/results', '/stats', '/history', '/pricing'];
const res = []; const ok = (n, p, i = '') => { res.push({ check: n, pass: !!p, info: i }); console.log(`${p ? 'PASS' : 'FAIL'} ${n}${i ? ' :: ' + i : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
(async () => {
  const api = await (await fetch(`${B}/api/results?view=disclosure`)).json(); const d = api.data;
  const rec = (r) => `${r.wins.toLocaleString('en-US')}-${r.losses.toLocaleString('en-US')}-${r.pushes.toLocaleString('en-US')}`;
  ok('API disclosure present', d?.excluded && d?.withExcluded, `kept ${rec(d.kept)} excluded ${rec(d.excluded)} with ${rec(d.withExcluded)}`);
  ok('API arithmetic: kept + excluded = withExcluded', d.kept.wins + d.excluded.wins === d.withExcluded.wins && d.kept.losses + d.excluded.losses === d.withExcluded.losses && d.kept.pushes + d.excluded.pushes === d.withExcluded.pushes);
  const exclN = d.excluded.wins + d.excluded.losses + d.excluded.pushes;
  for (const p of PAGES) {
    await sleep(1500);
    const html = await (await fetch(B + p)).text(); const t = strip(html);
    const ssr = /data-testid="record-disclosure"/.test(html);
    ok(`${p} raw HTML has disclosure (no JS)`, ssr && t.includes(`removed ${exclN.toLocaleString('en-US')} graded picks`) && t.includes(rec(d.withExcluded)), ssr ? (t.match(/When fire picks landed on both sides[^.]*\.[^.]*\.[^.]*\./) || [''])[0].slice(0, 220) : 'no data-testid in server HTML');
  }
  const browser = await chromium.launch();
  for (const js of [false, true]) {
    const ctx = await browser.newContext({ javaScriptEnabled: js, viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
    for (const p of PAGES) {
      await sleep(1500);
      await pg.goto(B + p, { waitUntil: 'domcontentloaded' }); if (js) await pg.waitForLoadState('networkidle').catch(() => {});
      const el = pg.locator('[data-testid="record-disclosure"]').first();
      const vis = await el.isVisible().catch(() => false);
      const txt = vis ? (await el.innerText()).replace(/\s+/g, ' ') : '';
      const box = vis ? await el.boundingBox() : null;
      ok(`${p} disclosure visible (JS ${js ? 'on' : 'off'})`, vis && box && box.width > 50 && box.height > 10 && txt.includes(rec(d.withExcluded)), txt.slice(0, 160));
      if (vis) { await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: path.join(OUT, `${p === '/' ? 'home' : p.slice(1)}-js${js ? 'on' : 'off'}.png`) }); }
    }
    await ctx.close();
  }
  await browser.close();
  const sum = { label, base: B, at: new Date().toISOString(), pass: res.filter((r) => r.pass).length, fail: res.filter((r) => !r.pass).length, results: res, api: d };
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(sum, null, 1));
  console.log(`== ${sum.pass} pass / ${sum.fail} fail -> ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
