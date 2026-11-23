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
 * DAI-22: with no report yesterday either, the job is failing (e.g. AI credits exhausted), not just
 * running late. Saying "scheduled to publish around 10:30" would then be false every morning.
 */
export const AI_REPORT_OUTAGE_DAYS = 2;

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
 * @param todayET today's ET date (YYYY-MM-DD); needed only with lastPublishedDate.
 * @param lastPublishedDate newest report_date before today, or null if there is none / unknown.
 *   `undefined` keeps the old behaviour (no outage detection).
 */
export function getAiReportStatus(
  now: Date,
  hasReport: boolean,
  lastPublishedDate?: string | null,
  todayET?: string,
): AiReportStatusInfo {
  const base = { expectedAt: AI_REPORT_PUBLISH_LABEL };
  if (hasReport) return { status: 'published', ...base };
  const days = lastPublishedDate && todayET ? daysBetween(lastPublishedDate, todayET) : null;
  const last = lastPublishedDate === undefined ? {} : { lastPublishedDate: lastPublishedDate ?? null, daysSinceLastReport: days };
  if (days !== null && days >= AI_REPORT_OUTAGE_DAYS) {
    return { status: 'unavailable', reason: 'outage', ...base, ...last };
  }
  if (minutesSinceMidnightET(now) < AI_REPORT_PUBLISH_MINUTES_ET) {
    return { status: 'pending', reason: 'before_scheduled_time', ...base, ...last };
  }
  return { status: 'unavailable', reason: 'past_scheduled_time_no_report', ...base, ...last };
}
