/**
 * DAI-22: the AI report has not published since 2026-10-18 (OpenRouter credits exhausted). Nothing old
 * was shown as current, but every morning the page said "scheduled to publish around 10:30 AM ET".
 * When 7+ days have no report (real skip-day gaps reached 5), the page and API must say the report is paused and when it last ran.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const s = await import('../../src/lib/daily-ai-picks/report-status.ts');
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const UI = read('src/app/daily-ai-picks/DailyAIPicksContent.tsx');
const PAGE = read('src/app/daily-ai-picks/page.tsx');
const API = read('src/app/api/daily-ai-picks/route.ts');
const LAST = read('src/lib/daily-ai-picks/last-published.ts');

const MORNING = new Date('2026-11-23T14:00:00Z'); // 9:00 AM ET, ET date 2026-11-23
const EVENING = new Date('2026-11-23T21:00:00Z');

test('36-day gap -> outage before AND after the scheduled time (never "scheduled to publish")', () => {
  for (const now of [MORNING, EVENING]) {
    const r = s.getAiReportStatus(now, false, '2026-10-18');
    assert.equal(r.status, 'unavailable');
    assert.equal(r.reason, 'outage');
    assert.equal(r.lastPublishedDate, '2026-10-18');
    assert.equal(r.daysSinceLastReport, 36);
  }
});

test('threshold is 7 days: a 5-day skip gap is NOT an outage, 7 is', () => {
  assert.equal(s.AI_REPORT_OUTAGE_DAYS, 7);
  const five = s.getAiReportStatus(MORNING, false, '2026-11-18');
  assert.equal(five.status, 'pending'); assert.equal(five.daysSinceLastReport, 5);
  assert.equal(s.getAiReportStatus(MORNING, false, '2026-11-17').daysSinceLastReport, 6);
  assert.notEqual(s.getAiReportStatus(MORNING, false, '2026-11-17').reason, 'outage');
  assert.equal(s.getAiReportStatus(MORNING, false, '2026-11-16').reason, 'outage');
});

test('yesterday published -> normal pending/unavailable, with the last date attached', () => {
  const m = s.getAiReportStatus(MORNING, false, '2026-11-22');
  assert.equal(m.status, 'pending'); assert.equal(m.daysSinceLastReport, 1);
  const e = s.getAiReportStatus(EVENING, false, '2026-11-22');
  assert.equal(e.reason, 'past_scheduled_time_no_report'); assert.equal(e.lastPublishedDate, '2026-11-22');
});

test('race: today-read failed but a report for today exists -> no date and no outage claim', () => {
  const r = s.getAiReportStatus(EVENING, false, '2026-11-23');
  assert.equal(r.reason, 'past_scheduled_time_no_report');
  assert.equal('lastPublishedDate' in r, false);
});

test('lookup failed (undefined) or no report ever (null) -> no outage claim', () => {
  const u = s.getAiReportStatus(MORNING, false, undefined);
  assert.equal(u.status, 'pending'); assert.equal('lastPublishedDate' in u, false);
  const n = s.getAiReportStatus(MORNING, false, null);
  assert.equal(n.status, 'pending'); assert.equal(n.lastPublishedDate, null);
});

test('a published report is never marked stale', () => {
  assert.equal(s.getAiReportStatus(EVENING, true, '2026-10-18').status, 'published');
});

test('date helpers: ET date of an instant, calendar days, display without a time-zone shift', () => {
  assert.equal(s.etDateString(new Date('2026-11-24T04:59:00Z')), '2026-11-23'); // 11:59 PM ET
  assert.equal(s.etDateString(new Date('2026-11-24T05:00:00Z')), '2026-11-24');
  assert.equal(s.daysBetween('2026-10-18', '2026-11-23'), 36);
  assert.equal(s.daysBetween('2026-03-07', '2026-03-09'), 2); // across the DST change
  assert.equal(s.daysBetween('bad', '2026-11-23'), null);
  assert.equal(s.formatReportDate('2026-10-18'), 'October 18, 2026');
});

test('page and API pass the last report date; UI shows the outage notice, not the Pro "today" line', () => {
  assert.match(PAGE, /result \? undefined : await getLastPublishedReportDate\(\)/);
  assert.match(PAGE, /getAiReportStatus\(new Date\(\), !!result, lastPublished\)/);
  assert.match(API, /getAiReportStatus\(new Date\(\), false, await getLastPublishedReportDate\(\)\)/);
  assert.match(API, /lastPublishedDate: info\.lastPublishedDate \?\? null/);
  assert.match(UI, /reportStatus\.reason === 'outage'/);
  assert.match(UI, /data-testid="ai-report-outage"/);
  assert.match(UI, /reportStatus\.reason !== 'outage' && isPro/);
});

test('the lookup counts only non-empty reports and the GET path never loads the generator', () => {
  assert.match(LAST, /\.lte\('report_date', getTodayET\(\)\)/);
  assert.match(LAST, /\.not\('report_text', 'is', null\)/);
  assert.match(LAST, /\.neq\('report_text', ''\)/);
  const get = API.slice(API.indexOf('export async function GET'), API.indexOf('export async function POST'));
  assert.doesNotMatch(get, /daily-ai-picks\/generate/);
  assert.doesNotMatch(API.slice(0, API.indexOf('export async function GET')), /daily-ai-picks\/generate/);
});

test('falsifier: the old two-argument call has no outage state', () => {
  assert.equal(s.getAiReportStatus(MORNING, false).status, 'pending');
});
