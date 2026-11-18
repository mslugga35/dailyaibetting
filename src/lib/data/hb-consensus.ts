/**
 * DailyAI reader for the SHARED consensus (HiddenBag's hb_consensus_live).
 *
 * DailyAI does not compute consensus when CONSENSUS_SOURCE=hb: one writer on the
 * HiddenBag side (hiddenbag-v2 scripts/consensus-writer.mjs) does, and both sites
 * read the same rows. This module only reads + maps them to DailyAI's existing
 * ConsensusPick shape. Free/Pro gating stays in the API route (server side).
 *
 * Must keep the SAME filter semantics and order as HiddenBag's reader
 * (hiddenbag-v2 src/lib/consensus-live.ts): et_date IN dates, capper_count >= min
 * (min clamped to 2..100), result <> 'void', optional sport; canonical order
 * compareLiveRows. tests/data/hb-consensus.test.mjs pins this against the shared
 * fixture tests/fixtures/consensus-parity/expected-projection.json.
 *
 * Server-only (service role). Cache: 30 s per (dates) key, so a new pick reaches
 * DailyAI within writer interval (60 s) + 30 s.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BetType, ConsensusPick, NormalizedPick } from '../consensus/consensus-builder';

export type ConsensusSource = 'hb' | 'legacy';

/** CONSENSUS_SOURCE=hb → shared HiddenBag consensus; anything else → legacy builder. */
export function getConsensusSource(): ConsensusSource {
  return (process.env.CONSENSUS_SOURCE || '').trim().toLowerCase() === 'hb' ? 'hb' : 'legacy';
}

export interface HbPickDetail {
  pick_id: string;
  canonical_capper_id: string;
  canonical_capper: string;
  original_team: string | null;
  original_line: string | null;
  line: number | null;
  odds: number | null;
  posted_at: string | null;
  created_at: string | null;
  counted: boolean;
  reason: string | null;
}

export interface HbConsensusRow {
  et_date: string;
  group_key: string;
  sport: string;
  game_id: string;
  market: 'moneyline' | 'spread' | 'total';
  side: 'home' | 'away' | 'over' | 'under';
  team: string | null;
  opponent: string | null;
  home_team: string;
  away_team: string;
  commence_time: string;
  consensus_line: number | null;
  line_min: number | null;
  line_max: number | null;
  lines: { line: string; count: number }[];
  picks: HbPickDetail[];
  capper_ids: string[];
  capper_names: string[];
  capper_count: number;
  aggregator_count: number;
  late_pick_count: number;
  opposing_count: number;
  net_agreement: number;
  agreement_pct: number;
  tier: 'lean' | 'consensus' | 'caution';
  warnings: string[];
  is_fire: boolean;
  result: 'pending' | 'win' | 'loss' | 'push' | 'void';
  final_score: string | null;
  updated_at: string;
}

/** DailyAI's ConsensusPick plus the shared fields (all optional on the base type). */
export interface SharedConsensusPick extends ConsensusPick {
  groupKey: string;
  market: HbConsensusRow['market'];
  side: HbConsensusRow['side'];
  tier: HbConsensusRow['tier'];
  opposingCount: number;
  agreementPct: number;
  lineRange: { min: number | null; max: number | null };
  lineBreakdown: { line: string; count: number }[];
  aggregatorCount: number;
  warnings: string[];
  commenceTime: string;
  sharedResult: HbConsensusRow['result'];
  finalScore: string | null;
}

const PAGE = 1000;
const MAX_ROWS = 20_000;
const CACHE_MS = 30_000;
const COLUMNS = 'et_date,group_key,sport,game_id,market,side,team,opponent,home_team,away_team,commence_time,consensus_line,line_min,line_max,lines,picks,capper_ids,capper_names,capper_count,aggregator_count,late_pick_count,opposing_count,net_agreement,agreement_pct,tier,warnings,is_fire,result,final_score,updated_at';

let client: SupabaseClient | null = null;
function serviceClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Never fall back to the anon key: the table has no anon grant, and a silent
  // fallback would turn a config error into an empty board.
  if (!url || !key) throw new Error('hb-consensus: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

const cache = new Map<string, { at: number; rows: HbConsensusRow[] }>();
/** Test hook: drop the 30 s cache, the heartbeat cache and the memoized client. */
export function resetHbConsensusCache(): void { cache.clear(); client = null; health = null; }

// ---- Writer heartbeat (hb_consensus_meta.last_success_at) ----------------------
/** Writer runs every 60 s (PM2 restarts it every 5 min); older than this = stale. */
export function staleAfterSeconds(): number {
  const n = Number(process.env.CONSENSUS_STALE_SECONDS);
  return Number.isFinite(n) && n >= 120 && n <= 3600 ? Math.floor(n) : 300;
}

export class HbConsensusStaleError extends Error {
  constructor(public lastSuccessAt: string | null, public ageSeconds: number | null) {
    super(lastSuccessAt ? `shared consensus is stale (last update ${ageSeconds}s ago)` : 'shared consensus heartbeat unavailable');
    this.name = 'HbConsensusStaleError';
  }
}

export interface WriterHealth { fresh: boolean; lastSuccessAt: string | null; ageSeconds: number | null }
let health: { at: number; h: WriterHealth } | null = null;
const HEALTH_CACHE_MS = 15_000;

function etDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/** Unknown (read error, no row, bad timestamp) counts as NOT fresh. */
export async function getWriterHealth(db?: SupabaseClient, now: Date = new Date()): Promise<WriterHealth> {
  if (!db && health && now.getTime() - health.at < HEALTH_CACHE_MS) return health.h;
  let h: WriterHealth = { fresh: false, lastSuccessAt: null, ageSeconds: null };
  try {
    const { data, error } = await (db || serviceClient()).from('hb_consensus_meta').select('last_success_at').eq('id', 1).maybeSingle();
    const ts = !error && data?.last_success_at ? Date.parse(data.last_success_at as string) : NaN;
    if (Number.isFinite(ts)) {
      const age = Math.max(0, Math.round((now.getTime() - ts) / 1000));
      h = { fresh: age <= staleAfterSeconds(), lastSuccessAt: new Date(ts).toISOString(), ageSeconds: age };
    }
  } catch { /* unknown = stale */ }
  if (!db) health = { at: now.getTime(), h };
  return h;
}

export async function assertWriterFresh(db?: SupabaseClient, now?: Date): Promise<void> {
  const h = await getWriterHealth(db, now);
  if (!h.fresh) throw new HbConsensusStaleError(h.lastSuccessAt, h.ageSeconds);
}

/** Canonical order: identical to hiddenbag consensus-core.compareRows / consensus-live.compareLiveRows. */
export function compareLiveRows(a: Pick<HbConsensusRow, 'capper_count' | 'agreement_pct' | 'commence_time' | 'group_key'>, b: typeof a): number {
  return (b.capper_count - a.capper_count)
    || (Number(b.agreement_pct) - Number(a.agreement_pct))
    || String(a.commence_time).localeCompare(String(b.commence_time))
    || String(a.group_key).localeCompare(String(b.group_key));
}

function clampMin(n: number | undefined): number {
  return Number.isFinite(n) && (n as number) >= 2 ? Math.min(Math.floor(n as number), 100) : 2;
}

async function loadDates(dates: string[], db?: SupabaseClient): Promise<HbConsensusRow[]> {
  const key = [...dates].sort().join(',');
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.rows;
  const sb = db || serviceClient();
  const rows: HbConsensusRow[] = [];
  // Advance by rows received; stop only on an empty page (robust to any max_rows).
  for (let from = 0; from < MAX_ROWS;) {
    const { data, error } = await sb.from('hb_consensus_live').select(COLUMNS)
      .in('et_date', dates)
      .gte('capper_count', 2)
      .neq('result', 'void')
      .order('et_date', { ascending: true }).order('group_key', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`hb_consensus_live: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as HbConsensusRow[]));
    from += data.length;
  }
  const norm = rows.map((r) => ({
    ...r,
    consensus_line: r.consensus_line == null ? null : Number(r.consensus_line),
    agreement_pct: Number(r.agreement_pct),
  }));
  cache.set(key, { at: Date.now(), rows: norm });
  return norm;
}

/**
 * Shared consensus rows for ET `dates`, filtered exactly like HiddenBag's reader.
 * `sport` is case-insensitive ('NBA' / 'nba'); 'ALL'/null = every sport.
 */
export async function fetchHbConsensus(
  dates: string[],
  opts: { sport?: string | null; minCappers?: number; db?: SupabaseClient; now?: Date } = {},
): Promise<HbConsensusRow[]> {
  const valid = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (!valid.length) return [];
  // A board for today (or later) is only served while the writer is alive: stale = error, never old data.
  if (valid.some((d) => d >= etDate(opts.now ?? new Date()))) await assertWriterFresh(opts.db, opts.now);
  const min = clampMin(opts.minCappers);
  const sport = opts.sport && opts.sport.toLowerCase() !== 'all' ? opts.sport.toLowerCase() : null;
  return (await loadDates(valid, opts.db))
    .filter((r) => r.capper_count >= min && (!sport || r.sport === sport))
    .sort(compareLiveRows);
}

/** The fields both sites must agree on (same shape as hiddenbag consensus-live.parityProjection). */
export function parityProjection(r: HbConsensusRow) {
  return {
    group_key: r.group_key,
    market: r.market,
    side: r.side,
    capper_ids: [...r.capper_ids],
    capper_count: r.capper_count,
    opposing_count: r.opposing_count,
    agreement_pct: Number(r.agreement_pct),
    tier: r.tier,
    result: r.result,
  };
}

function fmtLine(n: number | null): string {
  if (n == null) return '';
  if (n === 0) return 'PK';
  return n > 0 ? `+${n}` : String(n);
}

const BET_TYPE: Record<string, BetType> = { moneyline: 'ML', spread: 'SPREAD', over: 'OVER', under: 'UNDER' };

/** Map one shared row to DailyAI's ConsensusPick (id = group_key, stable across both sites). */
export function toConsensusPick(r: HbConsensusRow): SharedConsensusPick {
  const betType = BET_TYPE[r.market === 'total' ? r.side : r.market];
  const totalLabel = `${r.away_team}/${r.home_team}`;
  let bet: string;
  let line: string | undefined;
  if (r.market === 'moneyline') { bet = `${r.team} ML`; line = undefined; }
  else if (r.market === 'spread') { line = fmtLine(r.consensus_line) || undefined; bet = `${r.team} ${line ?? ''}`.trim(); }
  else { line = r.consensus_line == null ? undefined : String(r.consensus_line); bet = `${totalLabel} ${r.side === 'over' ? 'Over' : 'Under'}${line ? ` ${line}` : ''}`; }
  return {
    id: r.group_key,
    bet,
    sport: r.sport.toUpperCase(),
    matchup: `${r.away_team} @ ${r.home_team}`,
    betType,
    line,
    capperCount: r.capper_count,
    cappers: [...r.capper_names],
    isFire: r.capper_count >= 3,
    confidence: Math.min(r.capper_count / 10, 1),
    groupKey: r.group_key,
    market: r.market,
    side: r.side,
    tier: r.tier,
    opposingCount: r.opposing_count,
    agreementPct: Number(r.agreement_pct),
    lineRange: { min: r.line_min == null ? null : Number(r.line_min), max: r.line_max == null ? null : Number(r.line_max) },
    lineBreakdown: r.lines || [],
    aggregatorCount: r.aggregator_count ?? 0,
    warnings: r.warnings || [],
    commenceTime: r.commence_time,
    sharedResult: r.result,
    finalScore: r.final_score,
  };
}

/** Counted picks behind the rows, as NormalizedPick (Pro-only "all picks" / insights inputs). */
export function toNormalizedPicks(rows: HbConsensusRow[]): NormalizedPick[] {
  const out: NormalizedPick[] = [];
  for (const r of rows) {
    const betType = BET_TYPE[r.market === 'total' ? r.side : r.market];
    for (const d of r.picks || []) {
      if (!d.counted) continue;
      out.push({
        id: d.pick_id,
        capper: d.canonical_capper,
        team: r.market === 'total' ? `${r.away_team}/${r.home_team}` : (r.team || ''),
        standardizedTeam: r.market === 'total' ? `${r.away_team}/${r.home_team}` : (r.team || ''),
        betType,
        line: d.line == null ? undefined : String(d.line),
        sport: r.sport.toUpperCase(),
        matchup: `${r.away_team} @ ${r.home_team}`,
        originalPick: `${d.original_team ?? ''} ${d.original_line ?? ''}`.trim(),
        date: r.et_date,
      });
    }
  }
  return out;
}

/** W/L/P/null for the API (DailyAI's yesterday view uses this vocabulary). */
export function toLetterResult(result: HbConsensusRow['result']): 'W' | 'L' | 'P' | null {
  return result === 'win' ? 'W' : result === 'loss' ? 'L' : result === 'push' ? 'P' : null;
}
