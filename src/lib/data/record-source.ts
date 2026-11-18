import { getConsensusSource } from './hb-consensus';

/**
 * Which relation holds the consensus track record DailyAI shows.
 *
 * CONSENSUS_SOURCE=hb → hb_consensus_record: a service-role-only view over
 *   HiddenBag's hb_consensus_live with consensus_results-compatible columns
 *   (pick_date, sport, bet, line, capper_count, is_fire, result WIN/LOSS/PUSH/PENDING,
 *   final_score). It is the SAME record HiddenBag's results pages read, so the two
 *   sites' stats agree.
 * legacy → consensus_results (written by the dailyai-track-record cron).
 *
 * Writes (POST /api/results, grade-and-persist) always target consensus_results;
 * in hb mode that legacy table is simply no longer read.
 */
export function recordTable(): 'hb_consensus_record' | 'consensus_results' {
  return getConsensusSource() === 'hb' ? 'hb_consensus_record' : 'consensus_results';
}

/**
 * Display text for a recorded bet or line. Some upstream picks were stored with a stray
 * "##" parser artifact (e.g. MLB run lines "Dodgers -1.5##"); '#' never belongs in a
 * bet, so drop it and tidy the spacing. Display-only: stored rows are not changed.
 */
export function cleanPickText<T extends string | null | undefined>(s: T): T {
  if (typeof s !== 'string') return s;
  return s.replace(/#+/g, ' ').replace(/\s+/g, ' ').trim() as T;
}

/** cleanPickText on the bet/line fields of record rows (other fields untouched). */
export function cleanRecordRows<T>(rows: T): T {
  if (!Array.isArray(rows)) return rows;
  return rows.map((r) => {
    if (!r || typeof r !== 'object') return r;
    const o = { ...(r as Record<string, unknown>) };
    if ('bet' in o) o.bet = cleanPickText(o.bet as string | null);
    if ('line' in o) o.line = cleanPickText(o.line as string | null);
    return o;
  }) as T;
}
