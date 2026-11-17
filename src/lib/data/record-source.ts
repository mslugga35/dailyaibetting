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
