/**
 * Muse launch-readiness review of build b3eacc4 (2026-11-19 evening): fire-emoji mismatch,
 * /daily-bets contradictory counts, unflagged opposite sides, record disclosure, admin 404.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');
const { withOppositeSide, resolveFireConflicts } = await import('../../src/lib/consensus/fire-conflicts.ts');
const { excludedRecord } = await import('../../src/lib/data/record-disclosure.ts');
const { toRecord } = await import('../../src/lib/data/performance.ts');
const { disclosureLines } = await import('../../src/components/results/RecordDisclosure.tsx');
const { oppositeSideText } = await import('../../src/components/picks/OppositeSideNote.tsx');

const row = (o) => ({ et_date: '2026-11-19', game_id: 'g1', market: 'spread', side: 'home', team: 'Texans', capper_count: 11, is_fire: true, ...o });

test('opposite side: each consensus pick carries the strongest group on the other side of its game', () => {
  const rows = withOppositeSide([
    row({}),
    row({ team: 'Colts', side: 'away', capper_count: 4 }),
    row({ team: 'Colts', side: 'away', market: 'moneyline', capper_count: 2 }),
    row({ market: 'total', side: 'over', team: null, capper_count: 3 }),
    row({ game_id: 'g2', team: 'Oregon', capper_count: 5 }),
  ]);
  assert.deepEqual(rows.map((r) => r.opposite_capper_count), [4, 11, 11, 0, 0]);
  // A 1-capper "side" is not consensus and is not reported.
  const lone = withOppositeSide([row({}), row({ team: 'Colts', side: 'away', capper_count: 1 })]);
  assert.equal(lone[0].opposite_capper_count, 0);
  // Over vs under on one game is a split; it never mixes with side markets.
  const tot = withOppositeSide([row({ market: 'total', side: 'over', capper_count: 5 }), row({ market: 'total', side: 'under', capper_count: 3 })]);
  assert.deepEqual(tot.map((r) => r.opposite_capper_count), [3, 5]);
});

test('opposite side: the out-voted side is not fire, so it gets no 🔥 on any list', () => {
  const [texans, colts] = withOppositeSide(resolveFireConflicts([row({}), row({ team: 'Colts', side: 'away', capper_count: 4 })]));
  assert.deepEqual([texans.is_fire, colts.is_fire], [true, false]);
  assert.equal(oppositeSideText(colts.opposite_capper_count), 'Split: 11 cappers took the other side');
  assert.equal(oppositeSideText(0), '');
});

test('every fire-emoji helper respects isFire (homepage report showed 🔥 on an out-voted side)', () => {
  const files = ['src/components/picks/ConsensusReport.tsx', 'src/app/best-bets/BestBetsContent.tsx', 'src/app/daily-bets/DailyBetsContent.tsx',
    'src/app/expert-picks/page.tsx', 'src/app/free-sports-picks/FreeSportsPicksContent.tsx', 'src/app/games/[slug]/page.tsx',
    'src/app/parlay-picks/page.tsx', 'src/app/picks/PicksContent.tsx', 'src/components/picks/YesterdayResults.tsx',
    'src/components/picks/SportPicksToday.tsx', 'src/app/api/notifications/route.ts'];
  for (const f of files) {
    const s = src(f);
    assert.ok(s.includes("if (pick.isFire === false) return '';") || s.includes("if (!pick.isFire) return '';"), `${f}: helper checks isFire`);
    assert.doesNotMatch(s, /getFireEmoji\([\w.]+\.capperCount\)/, `${f}: no call passes a raw count`);
  }
});

test('/daily-bets has no second, differently-sourced capper count', () => {
  const s = src('src/app/daily-bets/DailyBetsContent.tsx');
  assert.doesNotMatch(s, /data\.top5MostCommon/);
  assert.doesNotMatch(s, /Top 5 Most Common Bets/);
  assert.match(s, /<OppositeSideNote count=\{pick\.oppositeCapperCount\}/);
});

test('record disclosure: excluded = before - after, and the text states both records', () => {
  const before = toRecord(1288, 1186, 27);
  const kept = toRecord(1019, 924, 23);
  const ex = excludedRecord(before, kept);
  assert.deepEqual([ex.wins, ex.losses, ex.pushes, ex.winPct], [269, 262, 4, 50.7]);
  const lines = disclosureLines({ kept, excluded: ex, withExcluded: before, byCapperCount: [{ label: '3–4 cappers', ...toRecord(500, 434, 10) }, { label: '10+ cappers', ...toRecord(0, 0, 0) }] });
  const all = lines.join(' ');
  assert.match(all, /removed 535 graded picks, which went 269-262-4 \(50\.7%\)/);
  assert.match(all, /would be 1,288-1,186-27 \(52\.1%\)/);
  assert.match(all, /3–4 cappers 53\.5%/);
  assert.doesNotMatch(all, /10\+ cappers/, 'empty buckets are not listed');
  assert.match(all, /ROI and units are estimates/);
  // Without the shared source there is nothing excluded and no exclusion sentence.
  assert.doesNotMatch(disclosureLines({ kept, excluded: null, withExcluded: null, byCapperCount: [] }).join(' '), /removed/);
});

test('record disclosure is shown wherever the headline record is, and "nothing estimated" is gone', () => {
  for (const f of ['src/app/page.tsx', 'src/app/results/page.tsx', 'src/app/stats/StatsClient.tsx', 'src/app/history/HistoryClient.tsx', 'src/app/pricing/page.tsx']) {
    assert.match(src(f), /<RecordDisclosure\b/, f);
  }
  assert.doesNotMatch(src('src/app/results/page.tsx'), /nothing estimated/i);
  const faq = src('src/app/pricing/page.tsx');
  assert.doesNotMatch(faq, /Nothing is estimated/);
  assert.match(faq, /only the side with more cappers counts as a fire pick/);
  assert.match(src('src/app/api/results/route.ts'), /case 'disclosure':/);
});
