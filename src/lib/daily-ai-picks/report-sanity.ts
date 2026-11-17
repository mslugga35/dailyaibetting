/**
 * Is this string a real daily report, or wreckage that must not be stored?
 *
 * Ported 2026-11-17 from hiddenbag-v2/scripts/lib/report-sanity.mjs. There, on
 * 2026-09-12, a run spent $1.84 and published 866 characters (the tail of a full
 * report) because the only guard was a 500-character floor chosen against short
 * auth-error stubs. The preamble diagnostic of the HB version is not ported.
 *
 * The floor differs from HB's 5,000. HB measured 14,953–25,445 chars over 30 stored
 * reports — all with the MLB-only sections. An off-season report asks for roughly
 * half the sections, so 3,000 keeps the same purpose (reject stubs and truncated
 * tails, far below any real report) with margin for a smaller slate.
 * UNVERIFIED: no off-season report has been measured yet; re-measure after a week.
 */

export const MIN_REPORT_CHARS = 3000;

/** Error stubs an upstream can return with a 200. */
const ERROR_STUB = /^(Failed to authenticate|OAuth|Invalid API key|Credit balance|Error:)/i;

export interface ReportVerdict {
  ok: boolean;
  kind: 'empty' | 'error-stub' | 'too-short' | 'report';
  chars: number;
  reason: string | null;
}

/** Pure: no clock, no I/O. The caller decides what to do about a bad verdict. */
export function classifyReport(result: unknown): ReportVerdict {
  const text = typeof result === 'string' ? result.trim() : '';
  const chars = text.length;
  if (!chars) return { ok: false, kind: 'empty', chars: 0, reason: 'empty result' };
  if (ERROR_STUB.test(text)) return { ok: false, kind: 'error-stub', chars, reason: `error stub (${chars} chars)` };
  if (chars < MIN_REPORT_CHARS) {
    return { ok: false, kind: 'too-short', chars, reason: `result too short (${chars} chars, floor ${MIN_REPORT_CHARS})` };
  }
  return { ok: true, kind: 'report', chars, reason: null };
}
