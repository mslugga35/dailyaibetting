/**
 * Fixes from the Nov 19 multi-agent production break-test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const { fadeSide } = await import('../../src/lib/consensus/fade.ts');
const { redactResultRows, PUBLIC_RESULT_FIELDS } = await import('../../src/lib/data/result-redaction.ts');

test('fade names the opponent at the opposite line, never the same team with the sign flipped', () => {
  const m = 'Oregon State @ Utah';
  assert.equal(fadeSide({ bet: 'Oregon State +1.5', matchup: m, betType: 'SPREAD', line: '+1.5' }), 'Utah -1.5');
  assert.equal(fadeSide({ bet: 'Utah -1.5', matchup: m, betType: 'SPREAD', line: '-1.5' }), 'Oregon State +1.5');
  assert.equal(fadeSide({ bet: 'Utah 0', matchup: m, betType: 'SPREAD', line: '0' }), 'Oregon State PK');
  assert.equal(fadeSide({ bet: 'Utah ML', matchup: m, betType: 'ML' }), 'Oregon State ML');
  assert.equal(fadeSide({ bet: 'Oregon State/Utah Over 141.5', matchup: m, betType: 'OVER', line: '141.5' }), 'Oregon State/Utah Under 141.5');
  assert.equal(fadeSide({ bet: 'Oregon State/Utah Under 141.5', matchup: m, betType: 'UNDER', line: '141.5' }), 'Oregon State/Utah Over 141.5');
  // Unknown opponent or odd input → null (the UI says "the other side"), never a guessed team.
  assert.equal(fadeSide({ bet: 'Houston Cougars -1.5', matchup: 'TBD', betType: 'SPREAD', line: '-1.5' }), null);
  assert.equal(fadeSide({ bet: 'Some prop', matchup: m, betType: 'PROP' }), null);
  assert.match(src('src/components/picks/FadeThePublic.tsx'), /fadeSide\(pick\) \?\? 'the other side'/);
});

test('results API: non-Pro rows keep only sport/date/result; both recent branches redact', () => {
  const rows = redactResultRows([{ id: 1, sport: 'nba', result: 'WIN', pick_date: '2026-11-18', team: 'Lakers', opponent: 'Kings', line: '-4.5', final_score: '110-101', capper_count: 5 }]);
  assert.deepEqual(rows, [{ id: 1, sport: 'nba', result: 'WIN', pick_date: '2026-11-18' }]);
  assert.deepEqual([...PUBLIC_RESULT_FIELDS].sort(), ['id', 'pick_date', 'result', 'sport']);
  const route = src('src/app/api/results/route.ts');
  assert.equal((route.match(/viewerSeesPickDetail\(request\)/g) || []).length, 2, 'both the 50-row and the windowed branch must check the viewer');
  assert.match(route, /EntitlementUnavailableError\) return false/, 'fails closed');
});

test('capper profile API strips pick detail for non-Pro viewers and rejects junk slugs', () => {
  const route = src('src/app/api/cappers/route.ts');
  assert.match(route, /pro \? data : withoutProDetail\(data\)/);
  assert.match(route, /recent_form: '', recent_win_pct: 0, by_sport: \[\], recent_picks: \[\]/);
  assert.match(route, /if \(!SLUG_RE\.test\(slug\)\) return null;/);
  const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/i;
  for (const bad of ["' OR 1=1", "' OR 1=1--", '../x', 'a b', '']) assert.equal(SLUG_RE.test(bad), false, bad);
  for (const ok of ['match-point-bets', 'lev-locks', '502-slips']) assert.equal(SLUG_RE.test(ok), true, ok);
  assert.match(route, /roi_pct: flatRoi\(c\)/);
  assert.match(route, /roi_pct: flatRoi\(capper\)/);
});

test('stat cards use the API full-board counts, not the free preview slice', () => {
  const c = src('src/app/consensus/ConsensusContent.tsx');
  assert.match(c, /data\?\.firePickCount \?\?/);
  assert.match(c, /data\?\.consensusCount \?\?/);
  assert.doesNotMatch(c, /topOverall\.filter\(p => p\.capperCount >= 3\)\.length/);
  const p = src('src/app/picks/PicksContent.tsx');
  assert.match(p, /data\?\.firePickCount \?\? firePicks\.length/);
  assert.match(p, /data\?\.consensusCount \?\?/);
});

test('/pro never shows a dead Manage Subscription button or a browser alert', () => {
  const pro = src('src/app/pro/page.tsx');
  assert.doesNotMatch(pro, /\balert\(/);
  assert.doesNotMatch(pro, /billing-portal/);
  assert.match(pro, /<Link href="\/account">Manage Subscription<\/Link>/);
});

test('login shows only fixed error messages; callback never forwards free text', () => {
  const login = src('src/app/login/page.tsx');
  assert.match(login, /setError\(LOGIN_ERRORS\[callbackError\] \?\? LOGIN_ERRORS\.auth\)/);
  assert.match(login, /link_expired:/);
  const cb = src('src/app/auth/callback/page.tsx');
  assert.doesNotMatch(cb, /encodeURIComponent\(authError\.message\)/);
  assert.match(cb, /error=link_expired/);
});

test('metadata: no site-wide canonical; no doubled brand in page titles; security headers set', () => {
  const layout = src('src/app/layout.tsx');
  assert.doesNotMatch(layout, /canonical: "https:\/\/dailyaibetting\.com"/);
  assert.match(src('src/app/page.tsx'), /alternates: \{ canonical: '\/' \}/);
  for (const f of ['src/app/login/layout.tsx', 'src/app/results/page.tsx', 'src/app/history/layout.tsx', 'src/app/picks/layout.tsx']) {
    assert.doesNotMatch(src(f).split('openGraph')[0], /title: ['"`].*\| DailyAI Betting['"`]/, f);
  }
  const cfg = src('next.config.ts');
  for (const h of ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Strict-Transport-Security']) assert.match(cfg, new RegExp(h));
  assert.match(cfg, /poweredByHeader: false/);
});
