/**
 * Honest availability state for the daily AI report.
 *
 * The report is published by a scheduled job (about 10:20-10:30 AM ET, see
 * ops/hetzner-cron/README.md). Before that time an empty page is expected; after it, an empty
 * page means the report did not publish today and we must say so instead of implying it is coming.
 */

/** Scheduled publish time, minutes after midnight ET (10:30 AM). TODO: keep in sync with the cron. */
export const AI_REPORT_PUBLISH_MINUTES_ET = 10 * 60 + 30;
export const AI_REPORT_PUBLISH_LABEL = '10:30 AM ET';

export type AiReportStatus = 'published' | 'pending' | 'unavailable';

export interface AiReportStatusInfo {
  status: AiReportStatus;
  /** Machine-readable reason, only for non-published states. */
  reason?: 'before_scheduled_time' | 'past_scheduled_time_no_report' | 'outage';
  expectedAt: string;
  /** DAI-22: newest report date before today (YYYY-MM-DD), when known. */
  lastPublishedDate?: string | null;
  /** DAI-22: whole days since that report (ET calendar days). */
  daysSinceLastReport?: number | null;
}

/**
 * DAI-22: a gap this long means the job is failing (e.g. AI credits exhausted), not a skip day.
 * The job skips days with no expert picks: real gaps of 2-5 days occurred (Mar-Oct 2026: 176x1,
 * 3x2, 3x3, 2x4, 1x5 days), so a shorter gap must not be called an outage.
 */
export const AI_REPORT_OUTAGE_DAYS = 7;

/** ET calendar date (YYYY-MM-DD) of an instant. */
export function etDateString(now: Date): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const v = (t: string) => p.find((x) => x.type === t)?.value;
  return `${v('year')}-${v('month')}-${v('day')}`;
}

/** Calendar days between two YYYY-MM-DD dates (b - a); null if either is not a date. */
export function daysBetween(a: string, b: string): number | null {
  const re = /^(\d{4})-(\d{2})-(\d{2})$/;
  const ma = re.exec(a);
  const mb = re.exec(b);
  if (!ma || !mb) return null;
  const ta = Date.UTC(+ma[1], +ma[2] - 1, +ma[3]);
  const tb = Date.UTC(+mb[1], +mb[2] - 1, +mb[3]);
  return Math.round((tb - ta) / 86_400_000);
}

/** "October 18, 2026" for a YYYY-MM-DD date (no time-zone shift). */
export function formatReportDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

export function minutesSinceMidnightET(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

/**
 * @param lastPublishedDate newest report_date with text (today included), null if none.
 *   `undefined` = the lookup failed: claim nothing (old behaviour). A date of today while
 *   hasReport is false means the today-read failed but a report exists: claim nothing either.
 */
export function getAiReportStatus(
  now: Date,
  hasReport: boolean,
  lastPublishedDate?: string | null,
): AiReportStatusInfo {
  const base = { expectedAt: AI_REPORT_PUBLISH_LABEL };
  if (hasReport) return { status: 'published', ...base };
  const days = lastPublishedDate ? daysBetween(lastPublishedDate, etDateString(now)) : null;
  const known = lastPublishedDate !== undefined && (days === null || days > 0);
  const last = known ? { lastPublishedDate: lastPublishedDate ?? null, daysSinceLastReport: days } : {};
  if (known && days !== null && days >= AI_REPORT_OUTAGE_DAYS) {
    return { status: 'unavailable', reason: 'outage', ...base, ...last };
  }
  if (minutesSinceMidnightET(now) < AI_REPORT_PUBLISH_MINUTES_ET) {
    return { status: 'pending', reason: 'before_scheduled_time', ...base, ...last };
  }
  return { status: 'unavailable', reason: 'past_scheduled_time_no_report', ...base, ...last };
}
