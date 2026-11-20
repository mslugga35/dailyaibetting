/**
 * Regression tests for docs/DAILYAI-LAUNCH-MASTER-TRACKER.md (Muse 2026-11-20 production review).
 * Each test name starts with its tracker issue id.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');

// DAI-04: the record disclosure must be in the server HTML on every page that shows the record.
for (const page of ['src/app/page.tsx', 'src/app/results/page.tsx', 'src/app/pricing/page.tsx', 'src/app/stats/page.tsx', 'src/app/history/page.tsx']) {
  test(`DAI-04 ${page} is a server component that fetches the disclosure for the HTML`, () => {
    const s = src(page);
    assert.doesNotMatch(s.split('\n').slice(0, 3).join('\n'), /['"]use client['"]/, `${page} must not be a client component`);
    assert.match(s, /getRecordDisclosure\(\)/, `${page} must fetch the disclosure on the server`);
  });
}
for (const [client, page] of [['src/app/stats/StatsClient.tsx', 'src/app/stats/page.tsx'], ['src/app/history/HistoryClient.tsx', 'src/app/history/page.tsx']]) {
  test(`DAI-04 ${client} renders the server disclosure (initial) instead of a delayed client fetch`, () => {
    assert.ok(existsSync(new URL(client, root)));
    assert.match(src(client), /<RecordDisclosure initial=\{disclosure\}/);
    assert.match(src(page), /disclosure=\{disclosure\}/);
  });
}

// DAI-05: links survive scanners and the copy matches real behavior (24h, newest link only).
test('DAI-05 /auth/confirm spends the token only on a click, never on page load', () => {
  const s = src('src/app/auth/confirm/page.tsx');
  assert.match(s, /verifyOtp\(\{ token_hash: mine/);
  const pre = s.slice(0, s.indexOf('async function signIn')).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  assert.doesNotMatch(pre, /verifyOtp/, 'no verify before the click');
  assert.match(s, /window\.location\.hash/, 'token read from the fragment, never the query');
  assert.doesNotMatch(s, /useSearchParams|location\.search/);
  assert.match(src('src/lib/auth/email-link.ts'), /auth\/confirm#\$\{q/);
  assert.match(s, /onClick=\{signIn\}/);
  assert.match(src('src/app/auth/confirm/layout.tsx'), /referrer: 'no-referrer'/);
  assert.match(src('src/app/auth/confirm/layout.tsx'), /index: false/);
});
test('DAI-05 login page and email say only the newest link works (no bare "expires in 24 hours" promise)', () => {
  for (const f of ['src/app/login/page.tsx', 'src/lib/auth/email-link.ts']) {
    const s = src(f);
    assert.match(s, /Only the newest link works/, f);
    assert.doesNotMatch(s, /expires in 24 hours/, f);
  }
  // Browser and server accept the same links: one shared rule, no copy that can drift.
  for (const f of ['src/app/auth/confirm/page.tsx', 'src/lib/auth/email-link.ts']) assert.match(src(f), /isLinkToken\(/, f);
});

// DAI-01: /props explains props are not offered (no bare 404, no feature promise); no blog claim of prop parlays.
test('DAI-01 /props is an intentional noindex page that promises no props product', () => {
  const s = src('src/app/props/page.tsx');
  assert.match(s, /index: false/);
  assert.match(s, /not part of DailyAI Betting/);
  assert.doesNotMatch(s, /coming soon|Pro includes (player )?props/i);
  assert.doesNotMatch(src('src/app/sitemap.ts'), /\/props/);
  for (const f of ['public/blog/how-to-use-ai-betting-picks-for-consistent-profits-2026-guide.html', 'src/lib/harbor-posts.json']) {
    assert.doesNotMatch(src(f), /our <strong>DAILYAIPICKS<\/strong> layout[^.]*player prop/i, f);
  }
});
// DAI-02: no claim that every fire pick is already graded while some are pending.
test('DAI-02 pricing FAQ does not claim every fire pick is graded', () => {
  const s = src('src/app/pricing/page.tsx');
  assert.doesNotMatch(s, /Every fire pick is graded/);
  assert.match(s, /stay pending and are not counted/);
});

test('DAI-04 /stats and /history render the disclosure outside any loading branch', () => {
  for (const f of ['src/app/stats/StatsClient.tsx', 'src/app/history/HistoryClient.tsx']) {
    const s = src(f);
    const at = s.indexOf('<RecordDisclosure initial={disclosure}');
    assert.ok(at > 0, f);
    // the page's loading ternary hides its whole body on the server; the disclosure must come before it
    const loadingAt = s.search(/\{\s*loading \? \(/);
    assert.ok(loadingAt === -1 || at < loadingAt, `${f}: disclosure must not sit inside the loading branch`);
  }
});
