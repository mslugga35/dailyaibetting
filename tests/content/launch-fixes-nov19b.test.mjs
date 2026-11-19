/**
 * Owner decisions 2026-11-19 (second round): data fixes, seat copy, blog claim corrections.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');
const { resolveFireConflicts } = await import('../../src/lib/consensus/fire-conflicts.ts');
const { mergeCapperRows, identityKey, isJunkCapperName } = await import('../../src/lib/data/capper-identity.ts');
const { cleanTeamText, cleanFeedPicks } = await import('../../src/lib/data/feed-clean.ts');
const { foundingSeatsCopy } = await import('../../src/lib/pricing/plans.ts');

const row = (o) => ({ et_date: '2026-11-15', game_id: 'g1', market: 'spread', side: 'home', team: 'A', capper_count: 4, is_fire: true, ...o });

test('fire conflicts: only the side with more cappers stays fire; a tie leaves neither', () => {
  const [a, b] = resolveFireConflicts([row({ team: 'Bengals', capper_count: 8 }), row({ team: 'Steelers', side: 'away', capper_count: 5 })]);
  assert.deepEqual([a.is_fire, b.is_fire, b.fire_conflict], [true, false, true]);
  const tie = resolveFireConflicts([row({ team: 'Nets', capper_count: 4 }), row({ team: '76ers', side: 'away', capper_count: 4 })]);
  assert.deepEqual(tie.map((r) => r.is_fire), [false, false]);
  // Spread on one team vs moneyline on the other team: still opposite sides.
  const cross = resolveFireConflicts([row({ team: '76ers', capper_count: 6 }), row({ team: 'Magic', market: 'moneyline', capper_count: 3 })]);
  assert.deepEqual(cross.map((r) => r.is_fire), [true, false]);
  // Same team spread + ML, a total, another game, another day: no conflict.
  const ok = resolveFireConflicts([
    row({ team: 'Lakers' }), row({ team: 'Lakers', market: 'moneyline' }),
    row({ team: null, market: 'total', side: 'over' }), row({ team: 'Kings', game_id: 'g2' }), row({ team: 'Kings', et_date: '2026-11-16' }),
  ]);
  assert.ok(ok.every((r) => r.is_fire));
  // Over vs under on the same game conflict.
  const tot = resolveFireConflicts([row({ team: null, market: 'total', side: 'over', capper_count: 5 }), row({ team: null, market: 'total', side: 'under', capper_count: 3 })]);
  assert.deepEqual(tot.map((r) => r.is_fire), [true, false]);
  // The board applies it before filtering and maps isFire from it; the record view uses the same rule.
  const hb = src('src/lib/data/hb-consensus.ts');
  assert.match(hb, /return resolveFireConflicts\(await loadDates\(valid, opts\.db\)\)\n\s*\.filter/);
  assert.match(hb, /isFire: r\.is_fire,/);
  const sql = src('supabase/migrations/20261119_record_fire_conflicts.sql');
  assert.match(sql, /o\.capper_count >= l\.capper_count/);
  assert.match(sql, /CASE WHEN l\.market = 'total' THEN o\.side IS DISTINCT FROM l\.side ELSE o\.team IS DISTINCT FROM l\.team END/);
});

test('UI decides fire from isFire, never from a raw capper count', () => {
  const offenders = [];
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of walk(new URL('src', root).pathname.replace(/^\/([A-Z]:)/, '$1'))) {
    if (!/\.(tsx?|mjs)$/.test(f)) continue;
    if (/\b(p|pick)\.capperCount >= 3\b/.test(readFileSync(f, 'utf8'))) offenders.push(f);
  }
  assert.deepEqual(offenders, []);
});

test('capper identities: spelling variants merge into one record; junk rows are dropped', () => {
  assert.equal(identityKey('Tail To Win'), identityKey('TailToWin'));
  assert.equal(identityKey('THIS GIRL BETZ'), identityKey('ThisGirlBetz'));
  for (const junk of ['[no-name]', 'Matchpointbets, Mojo, Learlocks & Thisgirlbetz', 'A & B', '']) assert.equal(isJunkCapperName(junk), true, junk);
  assert.equal(isJunkCapperName('Texas A&M Picks'), false);
  const merged = mergeCapperRows([
    { capper_id: 'c1', name: 'Match Point Bets', slug: 'match-point-bets', wins: 9, losses: 1, pushes: 0, total_picks: 10, units_won: 7.5, current_streak: 2 },
    { capper_id: 'c2', name: 'MatchPointBets', slug: 'matchpointbets', wins: 20, losses: 5, pushes: 1, total_picks: 26, units_won: 12, current_streak: -1 },
    { capper_id: 'c3', name: '[no-name]', slug: 'no-name', wins: 50, losses: 1, total_picks: 51 },
  ]);
  assert.equal(merged.length, 1);
  const m = merged[0];
  assert.deepEqual([m.slug, m.wins, m.losses, m.pushes, m.total_picks, m.units_won, m.current_streak], ['matchpointbets', 29, 6, 1, 36, 19.5, -1]);
  assert.equal(m.win_rate, 82.86);
  assert.deepEqual(m.capper_ids, ['c2', 'c1']);
  const route = src('src/app/api/cappers/route.ts');
  assert.match(route, /mergeCapperRows\(\(raw \|\| \[\]\) as any\[\]\)/);
  assert.match(route, /\.in\('capper_id', capperIds\)/);
});

test('Pro feed: prices, sportsbooks and status words are stripped; spreads typed as ML are fixed; non-picks dropped', () => {
  assert.deepEqual(cleanTeamText('Avalanche +100 at Novig'), { team: 'Avalanche', spread: null });
  assert.deepEqual(cleanTeamText('Utah State -28.5 -102 at Novig'), { team: 'Utah State', spread: '-28.5' });
  assert.deepEqual(cleanTeamText('Live bet OKC'), { team: 'OKC', spread: null });
  assert.deepEqual(cleanTeamText('CASH Buffalo'), { team: 'Buffalo', spread: null });
  assert.deepEqual(cleanTeamText('Lakers -6½ -110 at PlayMGM'), { team: 'Lakers', spread: '-6.5' });
  for (const keep of ['Ole Miss', 'Texas A&M', '76ers', 'Over 220.5']) assert.equal(cleanTeamText(keep).team, keep);
  const base = { id: '1', capper: 'Sharp Sam', standardizedTeam: '', betType: 'ML', sport: 'NCAAF', matchup: '', originalPick: '', date: '2026-11-19' };
  const out = cleanFeedPicks([
    { ...base, team: 'Utah State -28.5 -102 at Novig', standardizedTeam: 'Utah State -28.5 -102 at Novig' },
    { ...base, id: '2', team: '+100' },
    { ...base, id: '3', capper: 'Matchpointbets, Mojo, Learlocks & Thisgirlbetz', team: 'Buffalo' },
  ]);
  assert.equal(out.length, 1);
  assert.deepEqual([out[0].team, out[0].line, out[0].betType, out[0].standardizedTeam], ['Utah State', '-28.5', 'SPREAD', 'Utah State']);
  assert.match(src('src/app/api/picks/route.ts'), /cleanFeedPicks\(normalizePicks\(rawPicks\)\)/);
});

test('founding seat copy shows the same "remaining" number the API and checkout use', () => {
  // 1 seat held by a checkout: API remaining 99 → the page says 99, not "100 left, 1 held".
  assert.equal(foundingSeatsCopy({ cap: 100, remaining: 99, soldOut: false, paid: 0 }),
    '99 of 100 Founding Member spots left (limited to the first 100 paying members). 1 spot is reserved by members in checkout or a free trial and reopens if not paid.');
  assert.equal(foundingSeatsCopy({ cap: 100, remaining: 100, soldOut: false, paid: 0 }), '100 of 100 Founding Member spots left (limited to the first 100 paying members).');
  assert.match(foundingSeatsCopy({ cap: 100, remaining: 0, soldOut: true, paid: 98 }), /^No Founding Member spots are open right now\. 2 spots are reserved/);
  assert.equal(foundingSeatsCopy({ cap: 100, remaining: 0, soldOut: true, paid: 100 }), 'All 100 Founding Member spots are taken.');
});

test('graded totals: home counts W+L+P like /stats and says pushes are not in the win rate', () => {
  const home = src('src/app/page.tsx');
  assert.match(home, /\(trackRecord\.decided \+ trackRecord\.pushes\)\.toLocaleString\(\)\} graded fire picks/);
  assert.match(home, /pushes not counted in the win rate/);
});

test('checkout: no guest/anonymous path on /pro; sign-up first', () => {
  const pro = src('src/app/pro/page.tsx');
  assert.doesNotMatch(pro, /guestEmail|GUEST_CHECKOUT|Pay now, no signup/);
  assert.match(pro, /href="\/login\?mode=signup&redirect=\/pro"/);
  assert.match(src('src/app/api/checkout/route.ts'), /if \(!user\.email_confirmed_at\)/);
});

test('blog: no post makes the corrected claims ($20/mo, 200+ cappers, 80%+ precision, MEGA/NUCLEAR, 30-day archive, alerts)', () => {
  const dir = new URL('public/blog/', root);
  const files = [];
  const walk = (u) => { for (const f of readdirSync(u)) { const p = new URL(f, u); if (statSync(p).isDirectory()) walk(new URL(f + '/', u)); else files.push(p); } };
  walk(dir);
  const BAD = /\$\s?20(?:\.00)?\s*(?:\/\s*mo|per month)|\$20<\/a>|200\+\s*(?:expert|verified|graded|top-tier|elite|Discord)?\s*(?:cappers|handicappers|sources)|MEGA and NUCLEAR|Mega\/Nuclear|30-day pick (?:archive|histor)|5-minute delay|over 80% precision|7[05](?:%| ?[-–] ?8)5?% accuracy|HiddenBag Pro Access/i;
  const hits = files.filter((f) => BAD.test(readFileSync(f, 'utf8'))).map((f) => f.pathname.split('/blog/')[1]);
  assert.deepEqual(hits, []);
  assert.equal(files.filter((f) => f.pathname.endsWith('.html')).length >= 19, true, 'every post file is kept');
});

test('review fixes: names survive the feed cleaner; merged per-sport records are summed; no internal ids leak', async () => {
  for (const name of ['Max Fried', 'Lock Haven', 'Live Oak', 'Cash Money']) assert.equal(cleanTeamText(name).team, name, name);
  for (const [raw, want] of [['LOCK Lakers', 'Lakers'], ['Lock: Lakers', 'Lakers'], ['live bet OKC', 'OKC'], ['MAX BET Kings', 'Kings']]) assert.equal(cleanTeamText(raw).team, want, raw);
  const { sumSportRecords } = await import('../../src/lib/data/capper-identity.ts');
  assert.deepEqual(sumSportRecords([{ nba: '6-13 (31.6%)', mlb: '2-1 (66.7%)' }, { nba: '3-2-1 (60.0%)' }, null]), { nba: '9-15-1 (37.5%)', mlb: '2-1 (66.7%)' });
  const route = src('src/app/api/cappers/route.ts');
  assert.match(route, /const merged = key\r?\n\s*\? mergeCapperRows/);
  assert.match(route, /const \{ capper_ids: _ids, \.\.\.stats \} = merged;/);
  assert.match(route, /return rows\.map\(\(\{ capper_ids: _ids, \.\.\.c \}: any\) =>/);
  const recap = src('src/app/api/cron/generate-blog-recap/route.ts');
  assert.match(recap, /\.filter\(\(p: ApiPick\) => p\.isFire === true\)/);
  assert.doesNotMatch(recap, /capper_count >= 3/);
  for (const f of ['src/app/api/checkout/route.ts', 'src/app/api/contact/route.ts', 'src/app/api/subscribe/route.ts']) {
    assert.doesNotMatch(src(f), /status: 429 \}\)/, `${f}: every 429 carries Retry-After`);
  }
});
