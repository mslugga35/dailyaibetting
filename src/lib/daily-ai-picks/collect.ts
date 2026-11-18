/**
 * Data collectors for DailyAI Picks report.
 * Gathers all data sources into a single structured context for the AI prompt.
 *
 * Sources (all network, all free; nothing is read from the local filesystem):
 *   1. Supabase hb_picks — expert picks from Discord + scrapers
 *   2. ESPN API — multi-sport scoreboards; also decides which sports are in season
 *   3. PrizePicks API — prop lines, only for in-season leagues
 *   4. MLB Stats API — probable pitchers, only while MLB is in season
 *   5. Polymarket / Kalshi — market prices (Kalshi series filtered to in-season sports)
 *
 * BallparkPal and Statcast were removed 2026-11-17: both were MLB-only caches that
 * existed only on one local box, and the report must follow the calendar instead
 * of assuming baseball. See ./season.ts.
 *
 * @created 2026-03-27
 */

import { getSupabaseAdmin } from '@/lib/api-helpers';
import { getTodayET, getYesterdayET } from '@/lib/utils/date';
import { getConsensusSource, fetchHbConsensus, toConsensusPick } from '@/lib/data/hb-consensus';
import type { SharedConsensusLite } from '@/lib/ai-picks/consensus-section';
import {
  TRACKED_SPORTS, decideInSeasonSports, normalizeSport,
  type EspnSeasonSignal, type TrackedSport,
} from './season';

export interface ReportContext {
  date: string;
  expertPicks: { picks: ExpertPick[]; capperCount: number };
  /** Shared consensus groups (CONSENSUS_SOURCE=hb only); null in legacy mode or on failure. */
  sharedConsensus?: SharedConsensusLite[] | null;
  prizePicks: PrizePicksProp[];
  mlbSchedule: MLBGame[];
  espnSchedule: Record<string, ESPNGame[]>;
  polymarket: Array<{ question: string; probability: number; volume24hr: number }>;
  kalshi: KalshiMarket[];
  /** sport keys (hb_sport_type) the report covers today, from ./season.ts */
  inSeasonSports: string[];
  /** sport key → why it is in or out today */
  seasonReasons: Record<string, string>;
}

export interface ExpertPick {
  sport: string;
  team: string;
  opponent: string | null;
  pick_type: string;
  line: string | null;
  odds: string | null;
  units: number | null;
  capper_name: string;
  posted_at: string;
}

export interface PrizePicksProp {
  /** hb_sport_type key of the league the line came from */
  sport: string;
  player: string;
  team: string;
  position: string;
  stat: string;
  line: number;
  startTime: string;
}

export interface MLBGame {
  awayAbbr: string;
  homeAbbr: string;
  awayRecord: string;
  homeRecord: string;
  awayPitcher: string;
  homePitcher: string;
  venue: string;
  gameTime: string;
}

export interface ESPNGame {
  name: string;
  status: string;
  homeTeam: string;
  homeRecord: string;
  awayTeam: string;
  awayRecord: string;
}

// ── Supabase Expert Picks ─────────────────────────────────────────────────────

async function collectExpertPicks(): Promise<ReportContext['expertPicks']> {
  try {
    // Service role: since the HiddenBag paywall (2026-11-18) the public key only sees GRADED picks,
    // and this server-side cron needs today's pending expert picks.
    const supabase = getSupabaseAdmin();
    const today = getTodayET();
    // ET calendar day (a UTC date is already tomorrow after 7/8 PM ET and would drop today's picks).
    const yesterday = getYesterdayET();

    const { data: picks, error } = await supabase
      .from('hb_picks')
      .select('sport, team, opponent, pick_type, line, odds, units, capper_id, posted_at')
      .gte('posted_at', `${yesterday}T20:00:00`)
      .lte('posted_at', `${today}T23:59:59`)
      .order('posted_at', { ascending: false })
      .limit(500);

    if (error || !picks) return { picks: [], capperCount: 0 };

    // Get capper names
    const capperIds = [...new Set(picks.map(p => p.capper_id).filter(Boolean))];
    const { data: cappers } = await supabase
      .from('hb_cappers')
      .select('id, name')
      .in('id', capperIds);

    const capperMap = Object.fromEntries((cappers || []).map(c => [c.id, c.name]));

    const enriched = picks.map(p => ({
      ...p,
      // hb_picks.odds is numeric; the prompt only interpolates it, so the text is unchanged
      odds: p.odds == null ? null : String(p.odds),
      posted_at: p.posted_at ?? '', // never null here: the query filters on a posted_at range
      capper_name: capperMap[p.capper_id] || `Capper ${p.capper_id}`,
    }));

    return { picks: enriched, capperCount: capperIds.length };
  } catch {
    return { picks: [], capperCount: 0 };
  }
}

// ── PrizePicks API ────────────────────────────────────────────────────────────

/**
 * PrizePicks league ids per sport. Only leagues for in-season sports are fetched.
 * mlb=2 was the id this module always used; nba/nhl/nfl ids are PrizePicks'
 * documented-by-usage ids (UNVERIFIED against the live API in this change — a wrong
 * id returns no lines, it cannot add an off-season sport).
 */
export const PRIZEPICKS_LEAGUES: Partial<Record<TrackedSport, number>> = {
  mlb: 2, nba: 7, nhl: 8, nfl: 9,
};

async function collectPrizePicks(sports: string[]): Promise<PrizePicksProp[]> {
  const leagues = sports
    .map((s) => [s, PRIZEPICKS_LEAGUES[s as TrackedSport]] as const)
    .filter((e): e is readonly [string, number] => typeof e[1] === 'number');
  const results = await Promise.all(leagues.map(([sport, id]) => collectPrizePicksLeague(sport, id)));
  return results.flat();
}

async function collectPrizePicksLeague(sport: string, leagueId: number): Promise<PrizePicksProp[]> {
  try {
    const res = await fetch(`https://partner-api.prizepicks.com/projections?league_id=${leagueId}&per_page=250`, {
      next: { revalidate: 3600 }, // cache 1 hour
    });
    if (!res.ok) return [];
    const data = await res.json();

    const playerMap: Record<string, { name: string; team: string; position: string }> = {};
    for (const inc of (data.included || []) as Array<{ type: string; id: string; attributes?: Record<string, string> }>) {
      if (inc.type === 'new_player') {
        playerMap[inc.id] = {
          name: inc.attributes?.display_name || inc.attributes?.name || `Player ${inc.id}`,
          team: inc.attributes?.team || '',
          position: inc.attributes?.position || '',
        };
      }
    }

    const props: PrizePicksProp[] = [];
    for (const proj of (data.data || []) as Array<{ attributes?: Record<string, string>; relationships?: Record<string, { data?: { id?: string } }> }>) {
      const attrs = proj.attributes || {};
      if (attrs.odds_type !== 'standard') continue;

      const playerId = proj.relationships?.new_player?.data?.id;
      const player = playerMap[playerId || ''] || { name: `ID:${playerId}`, team: '', position: '' };

      props.push({
        sport,
        player: player.name,
        team: player.team,
        position: player.position,
        stat: attrs.stat_type || '',
        line: parseFloat(attrs.line_score || '0'),
        startTime: attrs.start_time || '',
      });
    }
    return props;
  } catch {
    return [];
  }
}

// ── MLB Schedule ──────────────────────────────────────────────────────────────

async function collectMLBSchedule(): Promise<MLBGame[]> {
  try {
    const today = getTodayET();
    const res = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=probablePitcher,team`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();

    const games: MLBGame[] = [];
    for (const date of (data.dates || [])) {
      for (const game of (date.games || [])) {
        const away = game.teams.away;
        const home = game.teams.home;
        games.push({
          gameTime: game.gameDate,
          venue: game.venue?.name || '',
          awayAbbr: away.team?.abbreviation || '',
          awayRecord: `${away.leagueRecord?.wins || 0}-${away.leagueRecord?.losses || 0}`,
          awayPitcher: away.probablePitcher?.fullName || 'TBD',
          homeAbbr: home.team?.abbreviation || '',
          homeRecord: `${home.leagueRecord?.wins || 0}-${home.leagueRecord?.losses || 0}`,
          homePitcher: home.probablePitcher?.fullName || 'TBD',
        });
      }
    }
    return games;
  } catch {
    return [];
  }
}

// ── ESPN Multi-Sport ──────────────────────────────────────────────────────────

interface ESPNResult {
  schedule: Record<string, ESPNGame[]>;
  signals: Partial<Record<TrackedSport, EspnSeasonSignal>>;
}

async function collectESPN(): Promise<ESPNResult> {
  const schedule: Record<string, ESPNGame[]> = {};
  const signals: Partial<Record<TrackedSport, EspnSeasonSignal>> = {};
  const results = await Promise.allSettled(
    TRACKED_SPORTS.map(async (sport) => {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${sport.espnPath}/scoreboard`, {
        next: { revalidate: 3600 },
      });
      // A failed fetch is "unknown", not "no games": season.ts falls back to the calendar.
      if (!res.ok) throw new Error(`ESPN ${sport.key} ${res.status}`);
      const data = await res.json();
      const events = (data.events || []) as Array<Record<string, unknown>>;
      const rawType = (data.leagues as Array<{ season?: { type?: { type?: unknown } } }> | undefined)?.[0]?.season?.type?.type;
      const signal: EspnSeasonSignal = {
        fetched: true,
        eventDates: events.map((e) => String(e.date || '')).filter(Boolean),
        seasonType: Number.isFinite(Number(rawType)) && rawType !== null && rawType !== undefined ? Number(rawType) : null,
      };

      const games: ESPNGame[] = events.map((e: Record<string, unknown>) => {
        const comp = (e.competitions as Array<Record<string, unknown>>)?.[0];
        const competitors = comp?.competitors as Array<Record<string, unknown>> || [];
        const home = competitors.find((c: Record<string, unknown>) => c.homeAway === 'home') as Record<string, unknown> | undefined;
        const away = competitors.find((c: Record<string, unknown>) => c.homeAway === 'away') as Record<string, unknown> | undefined;
        const homeTeam = home?.team as Record<string, string> | undefined;
        const awayTeam = away?.team as Record<string, string> | undefined;
        const homeRecords = home?.records as Array<{ summary: string }> | undefined;
        const awayRecords = away?.records as Array<{ summary: string }> | undefined;
        return {
          name: e.shortName as string,
          status: ((comp?.status as Record<string, unknown>)?.type as Record<string, string>)?.name || '',
          homeTeam: homeTeam?.displayName || '',
          homeRecord: homeRecords?.[0]?.summary || '',
          awayTeam: awayTeam?.displayName || '',
          awayRecord: awayRecords?.[0]?.summary || '',
        };
      });
      return { key: sport.key, games, signal };
    })
  );
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    signals[r.value.key] = r.value.signal;
    if (r.value.games.length > 0) schedule[r.value.key] = r.value.games;
  }
  return { schedule, signals };
}

// ── Kalshi Sports Markets (player props, K's, NRFI, spreads) ─────────────────

interface KalshiMarket {
  ticker: string;
  title: string;
  yes_bid: number;
  yes_ask: number;
  volume: number;
  series: string;
}

const KALSHI_SERIES: Array<[string, TrackedSport]> = [
  ['KXMLBKS', 'mlb'],     // MLB strikeouts
  ['KXMLBHR', 'mlb'],     // MLB home runs
  ['KXMLBF5', 'mlb'],     // MLB first 5 innings
  ['KXMLBOU', 'mlb'],     // MLB over/under
  ['KXMLBNRFI', 'mlb'],   // NRFI
  ['KXMLBYRFI', 'mlb'],   // YRFI
  ['KXMLBRUNS', 'mlb'],   // MLB team total runs
  ['KXNBAPTS', 'nba'],    // NBA player points
  ['KXNBAAST', 'nba'],    // NBA assists
  ['KXNBAREB', 'nba'],    // NBA rebounds
  ['KXNBA3PT', 'nba'],    // NBA threes
  ['KXNBAGAME', 'nba'],   // NBA game winner
  ['KXNBASPREAD', 'nba'], // NBA spread
  ['KXNHLGAME', 'nhl'],   // NHL game winner
];

async function collectKalshi(sports: string[]): Promise<KalshiMarket[]> {
  const sportsSeries = KALSHI_SERIES.filter(([, sport]) => sports.includes(sport)).map(([series]) => series);
  if (sportsSeries.length === 0) return [];

  try {
    const allMarkets: KalshiMarket[] = [];

    // Fetch each series in parallel (public endpoint, no auth needed for reads)
    const results = await Promise.allSettled(
      sportsSeries.map(async (series) => {
        const res = await fetch(
          `https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker=${series}&status=open&limit=50`,
          { headers: { 'Accept': 'application/json' } }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.markets || []).map((m: Record<string, unknown>) => ({
          ticker: m.ticker as string,
          title: m.title as string || m.subtitle as string || '',
          yes_bid: (m.yes_bid as number || 0) / 100,   // cents → probability
          yes_ask: (m.yes_ask as number || 0) / 100,
          volume: m.volume as number || 0,
          series,
        }));
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') allMarkets.push(...r.value);
    }

    return allMarkets.filter(m => m.volume > 0);
  } catch {
    return [];
  }
}

// ── Polymarket Sports Odds ───────────────────────────────────────────────────

interface PolymarketOdds {
  question: string;
  probability: number;
  volume24hr: number;
}

async function collectPolymarket(): Promise<PolymarketOdds[]> {
  try {
    const res = await fetch(
      'https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=100&order=volume24hr&ascending=false',
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const markets = await res.json();

    // Filter to sports markets (team vs team outcomes)
    return (markets as Array<{ question: string; outcomePrices?: string; volume24hr?: number }>)
      .filter(m => {
        const q = (m.question || '').toLowerCase();
        return q.includes(' vs ') || q.includes('win on') || (q.includes('will') && q.includes('win'));
      })
      .map(m => {
        let prob = 0.5;
        if (m.outcomePrices) {
          try { prob = parseFloat(JSON.parse(m.outcomePrices)[0]) || 0.5; } catch { /* skip */ }
        }
        return {
          question: m.question,
          probability: prob,
          volume24hr: m.volume24hr || 0,
        };
      })
      .filter(m => m.volume24hr > 1000); // Only liquid markets
  } catch {
    return [];
  }
}

// ── Collect All ───────────────────────────────────────────────────────────────

/**
 * Bound a collector so one hung upstream API can't consume the whole maxDuration (120s).
 * Uses Promise.race (NOT an AbortSignal) on purpose — adding a signal to the inner
 * fetch() would opt it out of Next.js's `revalidate` cache. Collectors already
 * try/catch to safe defaults, so the fallback here only fires on a true hang.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), ms); }),
  ]).finally(() => clearTimeout(timer));
}

/** Today's shared consensus (no LLM, no paid API). Null when not in hb mode; [] when stale/unreadable. */
async function collectSharedConsensus(): Promise<SharedConsensusLite[] | null> {
  if (getConsensusSource() !== 'hb') return null;
  try {
    const rows = await fetchHbConsensus([getTodayET()], { minCappers: 2 });
    return rows.map(toConsensusPick).map((c) => ({
      sport: c.sport, bet: c.bet, capperCount: c.capperCount, cappers: c.cappers, opposingCount: c.opposingCount, tier: c.tier,
    }));
  } catch {
    return []; // hb mode: unavailable = no consensus section, never a raw-pick fallback
  }
}

/** Keep only picks for in-season sports; sport normalised to its hb_sport_type key. */
export function filterPicksToSeason(
  expertPicks: ReportContext['expertPicks'],
  inSeason: string[],
): ReportContext['expertPicks'] {
  const keep = new Set(inSeason);
  const picks = expertPicks.picks
    .map((p) => ({ ...p, sport: normalizeSport(p.sport) }))
    .filter((p) => keep.has(p.sport));
  return { picks, capperCount: new Set(picks.map((p) => p.capper_name)).size };
}

export function countPicksBySport(picks: Array<{ sport: string | null }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of picks) {
    const s = normalizeSport(p.sport);
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}

export async function collectAllData(now: Date = new Date()): Promise<ReportContext> {
  // Phase 1: what decides the season (ESPN + today's picks), plus anything sport-agnostic.
  const [rawPicks, espn, polymarket, sharedConsensus] = await Promise.all([
    withTimeout(collectExpertPicks(), 20000, { picks: [], capperCount: 0 }),
    withTimeout(collectESPN(), 15000, { schedule: {}, signals: {} } as ESPNResult),
    withTimeout(collectPolymarket(), 15000, []),
    withTimeout(collectSharedConsensus(), 15000, null),
  ]);

  const season = decideInSeasonSports(espn.signals, countPicksBySport(rawPicks.picks), now);
  const inSeason = season.inSeason;

  // Phase 2: sport-specific sources, only for sports that are in season.
  const [prizePicks, mlbSchedule, kalshi] = await Promise.all([
    withTimeout(collectPrizePicks(inSeason), 15000, []),
    inSeason.includes('mlb') ? withTimeout(collectMLBSchedule(), 15000, []) : Promise.resolve([] as MLBGame[]),
    withTimeout(collectKalshi(inSeason), 20000, []),
  ]);

  const espnSchedule = Object.fromEntries(
    Object.entries(espn.schedule).filter(([sport]) => inSeason.includes(sport)),
  );

  return {
    date: now.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      timeZone: 'America/New_York',
    }),
    expertPicks: filterPicksToSeason(rawPicks, inSeason),
    sharedConsensus,
    prizePicks,
    mlbSchedule,
    espnSchedule,
    polymarket,
    kalshi,
    inSeasonSports: inSeason,
    seasonReasons: season.reasons,
  };
}
