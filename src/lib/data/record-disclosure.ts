import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getConsensusSource } from '@/lib/data/hb-consensus';
import { CAPPER_BUCKETS, getVerifiedPerformance, toRecord, type Record3 } from '@/lib/data/performance';

/**
 * What a visitor needs next to the headline record (Muse review 2026-11-19):
 * - the record as published (opposite-side rule applied),
 * - the picks that rule removed and how they did, and the record with them included,
 * - win rate by number of cappers, so "more agreement" is never implied to mean "better".
 * All counts come from graded rows; nothing is estimated. Cached for a minute.
 */
export interface RecordDisclosure {
  kept: Record3;
  /** Graded fire picks removed by the opposite-side rule; null outside the shared-record source. */
  excluded: Record3 | null;
  /** kept + excluded: the record before the rule. */
  withExcluded: Record3 | null;
  byCapperCount: Array<{ label: string } & Record3>;
}

let cache: { at: number; value: RecordDisclosure } | null = null;
const TTL_MS = 60_000;

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key) : null;
}

/** Graded fire rows in hb_consensus_live, before the opposite-side rule (results there are lowercase). */
async function liveFireRecord(db: SupabaseClient): Promise<Record3> {
  const count = async (result: 'win' | 'loss' | 'push') => {
    const { count: n, error } = await db
      .from('hb_consensus_live')
      .select('group_key', { count: 'exact', head: true })
      .eq('is_fire', true)
      .eq('result', result);
    if (error) throw error;
    return n ?? 0;
  };
  const [w, l, p] = await Promise.all([count('win'), count('loss'), count('push')]);
  return toRecord(w, l, p);
}

/** Pure: the excluded record is the difference between the record before and after the rule. */
export function excludedRecord(before: Record3, kept: Record3): Record3 {
  return toRecord(
    Math.max(0, before.wins - kept.wins),
    Math.max(0, before.losses - kept.losses),
    Math.max(0, before.pushes - kept.pushes),
  );
}

export async function getRecordDisclosure(db: SupabaseClient | null = serviceClient()): Promise<RecordDisclosure | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  if (!db) return null;
  const perf = await getVerifiedPerformance(db);
  const kept = perf.allTime;
  let excluded: Record3 | null = null;
  let withExcluded: Record3 | null = null;
  if (getConsensusSource() === 'hb') {
    const before = await liveFireRecord(db);
    // The view can only remove rows. If it ever shows MORE than live, the sources disagree:
    // say nothing about exclusions rather than publish a wrong "including them" record.
    if (before.wins >= kept.wins && before.losses >= kept.losses && before.pushes >= kept.pushes) {
      withExcluded = before;
      excluded = excludedRecord(before, kept);
    } else {
      console.warn('record-disclosure: view counts exceed live counts; exclusion line omitted');
    }
  }
  const byCapperCount = perf.byCapperCount.map(({ label, wins, losses, pushes }) => ({ label, ...toRecord(wins, losses, pushes) }));
  const value: RecordDisclosure = { kept, excluded, withExcluded, byCapperCount };
  cache = { at: Date.now(), value };
  return value;
}

export { CAPPER_BUCKETS };
