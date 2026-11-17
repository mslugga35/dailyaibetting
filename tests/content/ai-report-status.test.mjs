import { test } from 'node:test';
import assert from 'node:assert/strict';

const s = await import('../../src/lib/daily-ai-picks/report-status.ts');
// 2026-11-17 is EST (UTC-5): 14:00Z = 9:00 AM ET, 15:30Z = 10:30 AM ET.
const at = (iso) => new Date(iso);

test('report present -> published regardless of time', () => {
  assert.equal(s.getAiReportStatus(at('2026-11-17T20:00:00Z'), true).status, 'published');
});

test('before 10:30 AM ET with no report -> pending (expected)', () => {
  const r = s.getAiReportStatus(at('2026-11-17T14:00:00Z'), false);
  assert.equal(r.status, 'pending');
  assert.equal(r.reason, 'before_scheduled_time');
});

test('10:29 AM ET still pending, 10:30 AM ET is unavailable', () => {
  assert.equal(s.getAiReportStatus(at('2026-11-17T15:29:00Z'), false).status, 'pending');
  assert.equal(s.getAiReportStatus(at('2026-11-17T15:30:00Z'), false).status, 'unavailable');
});

test('after schedule with no report -> unavailable, never "pending"', () => {
  const r = s.getAiReportStatus(at('2026-11-17T21:00:00Z'), false);
  assert.equal(r.status, 'unavailable');
  assert.equal(r.reason, 'past_scheduled_time_no_report');
});

test('uses ET, including DST (summer: 14:30Z = 10:30 AM EDT)', () => {
  assert.equal(s.getAiReportStatus(at('2026-07-15T14:29:00Z'), false).status, 'pending');
  assert.equal(s.getAiReportStatus(at('2026-07-15T14:30:00Z'), false).status, 'unavailable');
});

test('midnight ET (hour 24 quirk) is pending', () => {
  assert.equal(s.getAiReportStatus(at('2026-11-17T05:00:00Z'), false).status, 'pending');
});
