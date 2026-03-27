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
    const today = new Date().toISOString().slice(0, 10);
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
  const today = new Date().toISOString().slice(0, 10);
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
    const today = new Date().toISOString().slice(0, 10);
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
  for (const sport of sports) {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${sport.path}/scoreboard`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) continue;
      const data = await res.json();

      schedule[sport.key] = (data.events || []).map((e: Record<string, unknown>) => {
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
    } catch { /* skip sport */ }
  }
  return schedule;
}

// ── Collect All ───────────────────────────────────────────────────────────────

export async function collectAllData(): Promise<ReportContext> {
  const [expertPicks, prizePicks, mlbSchedule, espnSchedule] = await Promise.all([
    collectExpertPicks(),
    collectPrizePicks(),
    collectMLBSchedule(),
    collectESPN(),
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
  };
}
