/**
 * DAI-24: the daily recap failed to save on every run (PGRST204 "Could not find the 'sport' column of
 * 'blog_posts'"). The row must only use columns the shared table really has (live list read 2026-11-23).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { buildRecapRow, BLOG_POSTS_COLUMNS, BLOG_POSTS_REQUIRED } = await import('../../src/lib/blog/recap-row.ts');
const ROUTE = readFileSync(new URL('../../src/app/api/cron/generate-blog-recap/route.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

const input = { slug: 'ai-consensus-picks-today-2026-11-23', title: 'T', content: '<p>x</p>', excerpt: 'E', tags: ['nba picks'], isoDate: '2026-11-23', nowIso: '2026-11-23T15:40:00.000Z' };
const unknownColumns = (row) => Object.keys(row).filter((k) => !BLOG_POSTS_COLUMNS.includes(k));

test('recap row uses only real blog_posts columns (no sport) and fills every required one', () => {
  const row = buildRecapRow(input);
  assert.deepEqual(unknownColumns(row), []);
  assert.equal('sport' in row, false);
  for (const c of BLOG_POSTS_REQUIRED) assert.ok(row[c], `required column ${c} missing`);
  assert.equal(row.site, 'dailyaibetting');
  assert.equal(row.status, 'published');
  assert.deepEqual(row.tags, ['nba picks']);
});

test('the recap route inserts the built row, not an inline object', () => {
  assert.match(ROUTE, /\.insert\(buildRecapRow\(/);
  assert.doesNotMatch(ROUTE, /\bsport:\s*sports/);
});

test('falsifier: a row with a sport field is caught by the column check', () => {
  assert.deepEqual(unknownColumns({ ...buildRecapRow(input), sport: 'nba' }), ['sport']);
});
