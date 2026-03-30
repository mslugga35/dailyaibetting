/**
 * Data collectors for DailyAI Picks report.
 * Gathers all data sources into a single structured context for the AI prompt.
 *
 * Sources:
 *   1. Supabase hb_picks — expert picks from Discord + scrapers
 *   2. BallparkPal cache — K center, HR zone, YRFI, F5, +EV, park factors
 *   3. Statcast cache — K%, whiff%, chase% from mlb-statcast-scanner
 *   4. PrizePicks API — live MLB prop lines (free, no auth)
 *   5. MLB Stats API — probable pitchers + schedule (free)
 *   6. ESPN API — multi-sport schedule (free)
 *
 * @created 2026-03-27
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getTodayET } from '@/lib/utils/date';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const BPP_DIR = join(homedir(), '.cache', 'ballparkpal');
const STATCAST_CACHE = join(homedir(), '.cache', 'hiddenbag', 'mlb-statcast.json');

export interface ReportContext {
  date: string;
  expertPicks: { picks: ExpertPick[]; capperCount: number };
  ballparkPal: BallparkPalData | null;
  statcast: StatcastData | null;
  prizePicks: PrizePicksProp[];
  mlbSchedule: MLBGame[];
  espnSchedule: Record<string, ESPNGame[]>;
  polymarket: Array<{ question: string; probability: number; volume24hr: number }>;
  kalshi: KalshiMarket[];
}

interface ExpertPick {
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

interface BallparkPalData {
  date: string;
  [page: string]: unknown;
}

interface StatcastData {
  alerts: Array<{
    pitcher: string;
    team: string;
    opponent: string;
    kLine: number | null;
    expectedK: number | null;
    edge: number | null;
    whiffPct: number | null;
    chasePct: number | null;
    swingPct: number | null;
    signal: string;
  }>;
}

interface PrizePicksProp {
  player: string;
  team: string;
  position: string;
  stat: string;
  line: number;
  startTime: string;
}

interface MLBGame {
  awayAbbr: string;
  homeAbbr: string;
  awayRecord: string;
  homeRecord: string;
  awayPitcher: string;
  homePitcher: string;
  venue: string;
  gameTime: string;
}

interface ESPNGame {
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
    const supabase = await createServerSupabaseClient();
    const today = getTodayET();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

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
      capper_name: capperMap[p.capper_id] || `Capper ${p.capper_id}`,
    }));

    return { picks: enriched, capperCount: capperIds.length };
  } catch {
    return { picks: [], capperCount: 0 };
  }
}

// ── BallparkPal Cache ─────────────────────────────────────────────────────────

function collectBallparkPal(): BallparkPalData | null {
  const today = getTodayET();
  const combinedFile = join(BPP_DIR, today, 'combined.json');

  if (existsSync(combinedFile)) {
    return { date: today, ...JSON.parse(readFileSync(combinedFile, 'utf8')) };
  }

  // Fall back to yesterday
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const yesterdayFile = join(BPP_DIR, yesterday, 'combined.json');
  if (existsSync(yesterdayFile)) {
    return { date: yesterday, ...JSON.parse(readFileSync(yesterdayFile, 'utf8')) };
  }

  return null;
}

// ── Statcast Cache ────────────────────────────────────────────────────────────

function collectStatcast(): StatcastData | null {
  if (!existsSync(STATCAST_CACHE)) return null;
  return JSON.parse(readFileSync(STATCAST_CACHE, 'utf8'));
}

// ── PrizePicks API ────────────────────────────────────────────────────────────

async function collectPrizePicks(): Promise<PrizePicksProp[]> {
  try {
    const res = await fetch('https://partner-api.prizepicks.com/projections?league_id=2&per_page=250', {
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

async function collectESPN(): Promise<Record<string, ESPNGame[]>> {
  const sports = [
    { key: 'nba', path: 'basketball/nba' },
    { key: 'nhl', path: 'hockey/nhl' },
    { key: 'mlb', path: 'baseball/mlb' },
  ];

  const schedule: Record<string, ESPNGame[]> = {};
  const results = await Promise.allSettled(
    sports.map(async (sport) => {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${sport.path}/scoreboard`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) return { key: sport.key, games: [] as ESPNGame[] };
      const data = await res.json();

      const games: ESPNGame[] = (data.events || []).map((e: Record<string, unknown>) => {
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
      return { key: sport.key, games };
    })
  );
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.games.length > 0) {
      schedule[r.value.key] = r.value.games;
    }
  }
  return schedule;
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

async function collectKalshi(): Promise<KalshiMarket[]> {
  const sportsSeries = [
    'KXMLBKS',     // MLB strikeouts
    'KXMLBHR',     // MLB home runs
    'KXMLBF5',     // MLB first 5 innings
    'KXMLBOU',     // MLB over/under
    'KXMLBNRFI',   // NRFI
    'KXMLBYRFI',   // YRFI
    'KXMLBRUNS',   // MLB team total runs
    'KXNBAPTS',    // NBA player points
    'KXNBAAST',    // NBA assists
    'KXNBAREB',    // NBA rebounds
    'KXNBA3PT',    // NBA threes
    'KXNBAGAME',   // NBA game winner
    'KXNBASPREAD', // NBA spread
    'KXNHLGAME',   // NHL game winner
  ];

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

export async function collectAllData(): Promise<ReportContext> {
  const [expertPicks, prizePicks, mlbSchedule, espnSchedule, polymarket, kalshi] = await Promise.all([
    collectExpertPicks(),
    collectPrizePicks(),
    collectMLBSchedule(),
    collectESPN(),
    collectPolymarket(),
    collectKalshi(),
  ]);

  return {
    date: new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      timeZone: 'America/New_York',
    }),
    expertPicks,
    ballparkPal: collectBallparkPal(),
    statcast: collectStatcast(),
    prizePicks,
    mlbSchedule,
    espnSchedule,
    polymarket,
    kalshi,
  };
}
