/**
 * Option C (2026-11-24): the daily recap post is built from data by a template, not a model.
 * Requirements: every number comes from the inputs (no fabricated statistics), no AI-written or
 * AI-analysis claims, data is HTML-escaped, nothing is published without fire picks, one post per
 * ET date (slug check + unique-slug race), and the route makes no model call.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { buildRecapArticle, recordText, longDate } = await import('../../src/lib/blog/recap-template.ts');
const { buildRecapRow } = await import('../../src/lib/blog/recap-row.ts');
const ROUTE = readFileSync(new URL('../../src/app/api/cron/generate-blog-recap/route.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

const rec = (wins, losses, pushes) => {
  const decided = wins + losses;
  return { wins, losses, pushes, decided, winPct: decided ? Math.round((wins / decided) * 1000) / 10 : null };
};
const base = () => ({
  isoDate: '2026-11-24',
  yesterdayIso: '2026-11-23',
  firePicks: [
    { bet: 'Kansas Jayhawks -5', sport: 'NCAAB', matchup: 'Denver @ Kansas', capperCount: 4 },
    { bet: 'Over 221.5', sport: 'NBA', matchup: null, capperCount: 3 },
  ],
  totalFireCount: 7,
  yesterday: [
    { sport: 'NCAAB', bet: 'Charlotte 49ers -5.5', capper_count: 3, result: 'WIN', final_score: 'Charlotte 71 @ FGCU 58' },
    { sport: 'NCAAB', bet: 'Northern Iowa -8.5', capper_count: 5, result: 'LOSS', final_score: 'Northern Iowa 48 @ Davidson 79' },
    { sport: 'NCAAB', bet: 'Providence ML', capper_count: 3, result: 'WIN', final_score: null },
    { sport: 'NBA', bet: 'Knicks -4', capper_count: 4, result: 'PUSH', final_score: 'Knicks 110 Bulls 106' },
  ],
  record: {
    last7: rec(12, 9, 1),
    last30: rec(219, 189, 4),
    allTime: rec(1044, 951, 24),
    bySport: [{ sport: 'NCAAB', ...rec(300, 280, 5) }, { sport: 'NBA', ...rec(20, 25, 0) }, { sport: 'NFL', ...rec(99, 1, 0) }],
  },
});
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&');

test('every record figure is the input, computed exactly (no fabricated stats)', () => {
  const a = buildRecapArticle(base());
  assert.ok(a);
  const t = text(a.content);
  assert.match(t, /went\s+2-1-1\s+\(66\.7% of decided picks\)/); // 2 W, 1 L, 1 P; pushes excluded
  assert.match(t, /Last 7 days: 12-9-1 \(57\.1%, small sample\)/);
  assert.match(t, /Last 30 days: 219-189-4 \(53\.7%\)/);
  assert.match(t, /All time: 1044-951-24 \(52\.3%\)/);
  assert.match(t, /NCAAB 300-280-5 \(51\.7%\); NBA 20-25 \(44\.4%\)/);
  assert.doesNotMatch(t, /NFL/, 'sports not on today\'s board are not listed');
  // every percentage in the post is one the inputs produce
  const allowed = new Set(['66.7', '57.1', '53.7', '52.3', '51.7', '44.4']);
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)%/g)) assert.ok(allowed.has(m[1]), `unexpected figure ${m[1]}%`);
});

test('headline uses the board total, and hidden Pro picks are counted, not listed', () => {
  const a = buildRecapArticle(base());
  assert.match(a.title, /^Consensus Picks Today \(Nov 24, 2026\): 7 Fire Picks Where 3\+ Cappers Agree$/);
  assert.match(text(a.content), /5 more fire picks are on today's board for Pro members/);
  assert.equal((a.content.match(/<li><strong>/g) || []).length, 2);
});

test('no AI-written or AI-analysis claims; the row is not labelled AI', () => {
  const a = buildRecapArticle(base());
  for (const s of [a.title, a.content, a.excerpt, a.seoTitle, a.tags.join(' ')]) {
    assert.doesNotMatch(s, /\bAI\b|artificial intelligence|machine learning|our model|algorithm/i, s.slice(0, 80));
  }
  const row = buildRecapRow({ slug: 's', title: a.title, content: a.content, excerpt: a.excerpt, tags: a.tags, isoDate: '2026-11-24', nowIso: 'x', seoTitle: a.seoTitle, readTime: a.readTime });
  assert.equal(row.ai_generated, false);
  assert.equal(row.ai_model, null);
  assert.equal(row.seo_title, a.seoTitle);
  assert.match(row.read_time, /^\d+ min read$/);
});

test('responsible-gambling disclaimer and no profit/ROI claim', () => {
  const t = buildRecapArticle(base()).content;
  assert.match(t, /<p class="disclaimer">[^<]*1-800-GAMBLER/);
  assert.match(text(t), /no profit or ROI is claimed/);
  assert.doesNotMatch(text(t), /\bunits?\b|guaranteed win|lock of the/i);
});

test('data is HTML-escaped (a hostile capper bet cannot inject markup)', () => {
  const i = base();
  i.firePicks[0].bet = '<script>alert(1)</script> "x" & y';
  i.yesterday[0].final_score = '<img src=x onerror=1>';
  const c = buildRecapArticle(i).content;
  assert.doesNotMatch(c, /<script|<img/);
  assert.match(c, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &quot;x&quot; &amp; y/);
});

test('nothing to publish without fire picks (also drops blank rows)', () => {
  assert.equal(buildRecapArticle({ ...base(), firePicks: [] }), null);
  assert.equal(buildRecapArticle({ ...base(), firePicks: [{ bet: ' ', sport: 'NBA', capperCount: 5 }, { bet: null, sport: 'NBA', capperCount: 4 }] }), null);
});

test('no graded picks yesterday says so instead of inventing a record', () => {
  const t = text(buildRecapArticle({ ...base(), yesterday: [] }).content);
  assert.match(t, /No fire picks from Nov 23, 2026 have been graded yet/);
  assert.doesNotMatch(t, /went\s+0-0/);
});

test('helpers: recordText and ET date formatting', () => {
  assert.equal(recordText(rec(0, 0, 2)), '0-0-2 (no decided picks yet)');
  assert.equal(recordText(rec(40, 20, 0)), '40-20 (66.7%)');
  assert.equal(longDate('2026-11-24'), 'Tuesday, November 24, 2026');
});

test('route: no model call, free-tier data only, record read errors publish nothing, race-safe', () => {
  assert.doesNotMatch(ROUTE, /openrouter|callOpenRouter|anthropic|claude|haiku/i);
  assert.match(ROUTE, /\.insert\(buildRecapRow\(/);
  assert.match(ROUTE, /buildRecapArticle\(/);
  assert.match(ROUTE, /Deliberately NO cron bearer/);
  assert.match(ROUTE, /\{ status: 503 \}/);
  assert.match(ROUTE, /code === '23505'/);
  assert.match(ROUTE, /\.eq\('slug', slug\)/);
});
