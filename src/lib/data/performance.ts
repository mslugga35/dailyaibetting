import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { windowStartET } from '@/lib/utils/date';
import { recordTable, cleanRecordRows } from '@/lib/data/record-source';

/**
 * Verified performance, computed ONLY from graded rows in consensus_results
 * (result WIN / LOSS / PUSH, graded against final scores by the grading cron).
 * Nothing here is estimated, projected or back-filled: an empty table yields zeros
 * and the page says so. Counts run in SQL (count, head) so no row cap can truncate
 * the record (the old page silently stopped at 1,000 rows).
 */

export interface Record3 {
  wins: number;
  losses: number;
  pushes: number;
  /** wins + losses (pushes are excluded from the win rate) */
  decided: number;
  /** wins / decided, one decimal; null when nothing is decided yet */
  winPct: number | null;
}

export interface GradedPick {
  pick_date: string;
  sport: string | null;
  bet: string | null;
  line: string | number | null;
  capper_count: number | null;
  result: string;
  final_score: string | null;
}

export interface Performance {
  configured: boolean;
  allTime: Record3;
  last30: Record3;
  last7: Record3;
  bySport: Array<{ sport: string } & Record3>;
  byCapperCount: Array<{ label: string; min: number; max: number | null } & Record3>;
  firstGradedDate: string | null;
  lastGradedDate: string | null;
  recent: GradedPick[];
}

const SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'WNBA', 'SOCCER', 'MMA'];
export const CAPPER_BUCKETS = [
  { label: '3–4 cappers', min: 3, max: 4 },
  { label: '5–6 cappers', min: 5, max: 6 },
  { label: '7–9 cappers', min: 7, max: 9 },
  { label: '10+ cappers', min: 10, max: null },
];
/** Below this many decided picks a win rate is shown as "small sample". */
export const MIN_SAMPLE = 30;

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** "Last N days" = N ET calendar dates including today (pick_date is an ET date). */
const daysAgo = windowStartET;

/**
 * Estimated ROI in percent (one decimal) if every pick were bet at -110: a win pays
 * 0.91u, a loss costs 1u, a push 0. Same assumption as the Stats page. Odds are not
 * known for most picks, so this is always labelled an estimate.
 */
export function estRoiAt110(r: Pick<Record3, 'wins' | 'losses' | 'pushes'>): number | null {
  const n = r.wins + r.losses + r.pushes;
  if (n === 0) return null;
  return Math.round(((r.wins * 0.91 - r.losses) / n) * 1000) / 10;
}

export function toRecord(wins: number, losses: number, pushes: number): Record3 {
  const decided = wins + losses;
  return { wins, losses, pushes, decided, winPct: decided > 0 ? Math.round((wins / decided) * 1000) / 10 : null };
}

type Filter = { since?: string; sport?: string; min?: number; max?: number | null };

async function countRecord(db: SupabaseClient, f: Filter): Promise<Record3> {
  const count = async (result: 'WIN' | 'LOSS' | 'PUSH') => {
    let q = db.from(recordTable()).select('id', { count: 'exact', head: true }).eq('is_fire', true).eq('result', result);
    if (f.since) q = q.gte('pick_date', f.since);
    if (f.sport) q = q.eq('sport', f.sport);
    if (f.min !== undefined) q = q.gte('capper_count', f.min);
    if (f.max !== undefined && f.max !== null) q = q.lte('capper_count', f.max);
    const { count: n, error } = await q;
    if (error) throw error;
    return n ?? 0;
  };
  const [w, l, p] = await Promise.all([count('WIN'), count('LOSS'), count('PUSH')]);
  return toRecord(w, l, p);
}

const EMPTY = toRecord(0, 0, 0);

/** Graded picks in sports outside the named list are shown as "Other", so the table always sums to the total. */
function withOther(rows: Array<{ sport: string } & Record3>, total: Record3) {
  const sum = (k: 'wins' | 'losses' | 'pushes') => rows.reduce((n, r) => n + r[k], 0);
  const other = toRecord(total.wins - sum('wins'), total.losses - sum('losses'), total.pushes - sum('pushes'));
  return other.wins + other.losses + other.pushes > 0 ? [...rows, { sport: 'Other', ...other }] : rows;
}

let allTimeCache: { at: number; value: Record3 } | null = null;
const ALL_TIME_TTL_MS = 60_000;

/** All-time fire record only (3 count queries), cached briefly: the homepage badge needs nothing else. */
export async function getAllTimeRecord(): Promise<Record3 | null> {
  if (allTimeCache && Date.now() - allTimeCache.at < ALL_TIME_TTL_MS) return allTimeCache.value;
  const db = serviceClient();
  if (!db) return null;
  const value = Object.freeze(await countRecord(db, {}));
  allTimeCache = { at: Date.now(), value };
  return value;
}

export async function getVerifiedPerformance(db: SupabaseClient | null = serviceClient()): Promise<Performance> {
  if (!db) {
    return { configured: false, allTime: EMPTY, last30: EMPTY, last7: EMPTY, bySport: [], byCapperCount: [], firstGradedDate: null, lastGradedDate: null, recent: [] };
  }
  const graded = () => db.from(recordTable()).select('pick_date').eq('is_fire', true).in('result', ['WIN', 'LOSS', 'PUSH']);
  const [allTime, last30, last7, sports, buckets, first, last, recent] = await Promise.all([
    countRecord(db, {}),
    countRecord(db, { since: daysAgo(30) }),
    countRecord(db, { since: daysAgo(7) }),
    Promise.all(SPORTS.map(async (sport) => ({ sport, ...(await countRecord(db, { sport })) }))),
    Promise.all(CAPPER_BUCKETS.map(async (b) => ({ ...b, ...(await countRecord(db, { min: b.min, max: b.max })) }))),
    graded().order('pick_date', { ascending: true }).limit(1),
    graded().order('pick_date', { ascending: false }).limit(1),
    db.from(recordTable())
      .select('pick_date, sport, bet, line, capper_count, result, final_score')
      .eq('is_fire', true)
      .in('result', ['WIN', 'LOSS', 'PUSH'])
      .order('pick_date', { ascending: false })
      .order('id', { ascending: false })
      .limit(25),
  ]);
  for (const r of [first, last, recent]) if (r.error) throw r.error;
  return {
    configured: true,
    allTime,
    last30,
    last7,
    bySport: withOther(sports.filter((s) => s.wins + s.losses + s.pushes > 0).sort((a, b) => b.decided - a.decided), allTime),
    byCapperCount: buckets,
    firstGradedDate: (first.data?.[0] as { pick_date?: string } | undefined)?.pick_date ?? null,
    lastGradedDate: (last.data?.[0] as { pick_date?: string } | undefined)?.pick_date ?? null,
    recent: cleanRecordRows((recent.data ?? []) as GradedPick[]),
  };
}
