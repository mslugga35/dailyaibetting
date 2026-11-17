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
  reason?: 'before_scheduled_time' | 'past_scheduled_time_no_report';
  expectedAt: string;
}

export function minutesSinceMidnightET(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

export function getAiReportStatus(now: Date, hasReport: boolean): AiReportStatusInfo {
  if (hasReport) return { status: 'published', expectedAt: AI_REPORT_PUBLISH_LABEL };
  if (minutesSinceMidnightET(now) < AI_REPORT_PUBLISH_MINUTES_ET) {
    return { status: 'pending', reason: 'before_scheduled_time', expectedAt: AI_REPORT_PUBLISH_LABEL };
  }
  return { status: 'unavailable', reason: 'past_scheduled_time_no_report', expectedAt: AI_REPORT_PUBLISH_LABEL };
}
