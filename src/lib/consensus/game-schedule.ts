/**
 * ESPN Game Schedule Validator
 *
 * Fetches today's schedules from ESPN's free API and validates consensus
 * picks against real game data. Pro sports (NBA/NFL/MLB/NHL) are fail-closed
 * (rejected if team not in schedule), college sports fail-open (350+ schools).
 *
 * Exports:
 *   filterToTodaysGamesAsync() - Main filter: validates picks against ESPN
 *   getTodaysScheduleSummary() - Debug: returns {sport: teamCount} map
 *
 * @module lib/consensus/game-schedule
 */

import { standardizeTeamName } from './team-mappings';
import { getTodayET, toEasternDate } from '../utils/date';
import { logger } from '../utils/logger';
import { createClient } from '@supabase/supabase-js';

interface ESPNEvent {
  id: string;
  name: string;
  date: string;
  competitions: {
    competitors: {
      team: {
        displayName: string;
        shortDisplayName: string;
        abbreviation: string;
      };
    }[];
  }[];
}

interface ESPNResponse {
  events: ESPNEvent[];
}

/** Cache for today's games (refreshes based on TTL) */
let gamesCache: {
  date: string;
  games: Map<string, Set<string>>; // sport -> Set of team names (3 per team: display, short, abbreviation)
  fetchedAt: number;
} | null = null;

/** Cache time-to-live: 30 minutes */
const CACHE_TTL = 30 * 60 * 1000;

/** ESPN API endpoints (free, no auth required) */
const ESPN_ENDPOINTS: Record<string, string> = {
  NFL: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  NBA: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  MLB: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  NHL: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  NCAAF: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
  NCAAB: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard',
};

/**
 * Fetch today's games from ESPN API
 */
async function fetchTodaysGamesFromESPN(sport: string): Promise<string[]> {
  const endpoint = ESPN_ENDPOINTS[sport];
  if (!endpoint) return [];

  try {
    // Add date parameter to ensure we get TODAY's games (ESPN default may show yesterday)
    const today = getTodayET();
    const dateParam = today.replace(/-/g, ''); // YYYYMMDD format
    const url = `${endpoint}?dates=${dateParam}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 }, // Cache for 5 min (reduced from 30)
    });

    if (!response.ok) {
      logger.warn('Schedule', `ESPN ${sport} API returned ${response.status}`);
      return [];
    }

    const data: ESPNResponse = await response.json();
    const teams: string[] = [];

    for (const event of data.events || []) {
      // Convert ESPN UTC date to Eastern timezone for comparison
      const gameDate = event.date ? toEasternDate(event.date) : '';

      // Include games from today (accounting for timezone)
      if (gameDate === today) {
        for (const competition of event.competitions || []) {
          for (const competitor of competition.competitors || []) {
            const team = competitor.team;
            if (team) {
              teams.push(team.displayName);
              teams.push(team.shortDisplayName);
              teams.push(team.abbreviation);
            }
          }
        }
      }
    }

    logger.debug('Schedule', `ESPN ${sport}: ${teams.length / 3} teams playing today (${today})`);
    return teams;
  } catch (error) {
    logger.error('Schedule', `ESPN ${sport} fetch error:`, error);
    return [];
  }
}

/**
 * Fetch today's games from Supabase hb_games table (populated by The Odds API).
 * Returns a comprehensive schedule including ALL NCAAB/NCAAF games (not just 6 featured).
 */
async function fetchTodaysGamesFromSupabase(): Promise<Map<string, Set<string>>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.debug('Schedule', 'Supabase not configured, skipping hb_games check');
    return new Map();
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const todayStr = getTodayET();

    // Compute tomorrow's date for range query
    const [y, m, d] = todayStr.split('-').map(Number);
    const tomorrow = new Date(y, m - 1, d + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('hb_games')
      .select('sport, home_team, away_team')
      .gte('commence_time', `${todayStr}T04:00:00Z`)   // midnight ET ≈ 4am UTC (safe buffer)
      .lt('commence_time', `${tomorrowStr}T06:00:00Z`); // 1am ET next day

    if (error || !data) {
      logger.warn('Schedule', `Supabase hb_games error: ${error?.message || 'no data'}`);
      return new Map();
    }

    // Map Odds API sport keys to our standard format
    const sportMap: Record<string, string> = {
      'basketball_ncaab': 'NCAAB',
      'basketball_nba': 'NBA',
      'americanfootball_nfl': 'NFL',
      'americanfootball_ncaaf': 'NCAAF',
      'icehockey_nhl': 'NHL',
      'baseball_mlb': 'MLB',
    };

    const games = new Map<string, Set<string>>();
    for (const game of data) {
      const sport = sportMap[game.sport] || game.sport;
      if (!games.has(sport)) games.set(sport, new Set());
      const teams = games.get(sport)!;
      // Add raw Odds API names (e.g., "nebraska cornhuskers")
      teams.add(game.home_team.toLowerCase());
      teams.add(game.away_team.toLowerCase());
      // Add standardized names (e.g., "nebraska") for exact matching against picks
      const homeStd = standardizeTeamName(game.home_team, sport).toLowerCase().replace(/[^a-z0-9]/g, '');
      const awayStd = standardizeTeamName(game.away_team, sport).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (homeStd) teams.add(homeStd);
      if (awayStd) teams.add(awayStd);
    }

    const summary = [...games.entries()].map(([s, t]) => `${s}:${t.size / 2}`).join(', ');
    logger.debug('Schedule', `Supabase hb_games: ${data.length} games (${summary})`);
    return games;
  } catch (err) {
    logger.error('Schedule', 'Supabase fetch error:', err);
    return new Map();
  }
}

/**
 * Load today's games into cache from ESPN + Supabase (all in parallel).
 * Cache refreshes after CACHE_TTL (30 min) or on date change.
 */
async function loadGamesCache(): Promise<void> {
  const today = getTodayET();

  if (gamesCache && gamesCache.date === today && Date.now() - gamesCache.fetchedAt < CACHE_TTL) {
    return;
  }

  logger.debug('Schedule', 'Refreshing games cache from ESPN + Supabase...');

  // Fetch from both sources in parallel
  const [espnResults, supabaseGames] = await Promise.all([
    Promise.all(
      Object.keys(ESPN_ENDPOINTS).map(sport =>
        fetchTodaysGamesFromESPN(sport).then(teams => ({ sport, teams }))
      )
    ),
    fetchTodaysGamesFromSupabase(),
  ]);

  // Start with ESPN data
  const todaysGames = new Map<string, Set<string>>();
  for (const { sport, teams } of espnResults) {
    todaysGames.set(sport, new Set(teams.map(t => t.toLowerCase())));
  }

  // Merge Supabase data (adds comprehensive college sports coverage)
  for (const [sport, teams] of supabaseGames) {
    if (!todaysGames.has(sport)) todaysGames.set(sport, new Set());
    const existing = todaysGames.get(sport)!;
    for (const team of teams) {
      existing.add(team);
    }
  }

  gamesCache = {
    date: today,
    games: todaysGames,
    fetchedAt: Date.now(),
  };

  const summary = Object.fromEntries(
    [...todaysGames.entries()].map(([k, v]) => [k, v.size])
  );
  logger.debug('Schedule', 'Cache updated (ESPN+Supabase):', summary);
}


/**
 * Extended pick type with optional capper field for better logging
 */
interface PickWithCapper {
  team?: string;
  standardizedTeam?: string;
  sport: string;
  capper?: string;
  originalPick?: string;
}

/**
 * Rejection reason types for clear logging
 */
type RejectionReason = 'NO_GAMES_TODAY' | 'TEAM_NOT_PLAYING' | 'NFL_TEAM_NO_GAMES';

interface RejectedPick {
  team: string;
  sport: string;
  capper?: string;
  reason: RejectionReason;
  details: string;
}

/**
 * Async version that actually checks ESPN
 * Returns both filtered picks and rejection details for debugging
 */
export async function filterToTodaysGamesAsync<T extends PickWithCapper>(
  picks: T[]
): Promise<{ filtered: T[]; rejected: RejectedPick[] }> {
  await loadGamesCache();

  if (!gamesCache || gamesCache.games.size === 0) {
    logger.warn('Schedule', 'No cache available, passing all picks through');
    return { filtered: picks, rejected: [] };
  }

  const filtered: T[] = [];
  const rejected: RejectedPick[] = [];

  // Only allow sports we have ESPN endpoints for
  const SUPPORTED_SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'];

  // NFL team keywords - reject these when NFL has no games
  // This catches NFL picks that got misclassified as other sports
  // NOTE: 'bucs' excluded - too easy to confuse with NBA 'Bucks'
  // NOTE: 'bears', 'lions', 'giants', 'cardinals' excluded - overlap with MLB/other
  const NFL_KEYWORDS = [
    'patriots', 'new england', 'seahawks', 'chiefs', 'eagles', 'bills', 'cowboys',
    '49ers', 'niners', 'packers', 'steelers', 'ravens', 'bengals', 'dolphins',
    'broncos', 'raiders', 'chargers', 'falcons', 
    'vikings', 'saints', 'buccaneers', 'tampa bay bucs', 'commanders', 'jets',
    'texans', 'colts', 'jaguars', 'titans', 'browns', 'rams', 'panthers'
  ];
  const nflHasGames = (gamesCache.games.get('NFL')?.size || 0) > 0;

  for (const pick of picks) {
    const team = pick.standardizedTeam || pick.team || '';
    const sport = pick.sport.toUpperCase();
    const capper = pick.capper || 'Unknown';
    const teamLower = team.toLowerCase();

    // SPECIAL: Reject NFL team names when NFL season has no games
    // This catches misclassified NFL picks (e.g., "Seattle" as NCAAB Seattle U)
    // EXCEPTION: Skip this check for NBA picks with "bucks" - don't confuse with "bucs"
    if (!nflHasGames && sport !== 'NBA') {
      const isNflTeam = NFL_KEYWORDS.some(kw => teamLower.includes(kw));
      // Also catch "Seattle @ New England" style matchups (NFL game format)
      const isNflMatchup = teamLower.includes('new england') || 
                           (teamLower.includes('seattle') && teamLower.includes('@'));
      // Don't reject if it looks like "bucks" (Milwaukee NBA), not "bucs" (Tampa NFL)
      const looksLikeBucks = teamLower.includes('bucks') || teamLower.includes('milwaukee');
      if ((isNflTeam || isNflMatchup) && !looksLikeBucks) {
        logger.debug('Schedule', `Rejecting NFL team/matchup "${team}" (${sport}) - NO NFL games today`);
        rejected.push({
          team,
          sport,
          capper,
          reason: 'NFL_TEAM_NO_GAMES',
          details: `NFL team detected but no NFL games scheduled`,
        });
        continue;
      }
    }

    // Pass through unsupported sports (soccer, tennis, euroleague, etc.)
    // We can't validate them via ESPN but the picks might still be valid
    if (!SUPPORTED_SPORTS.includes(sport)) {
      logger.debug('Schedule', `Passing through ${sport} pick: ${team} (no ESPN validation available)`);
      filtered.push(pick);
      continue;
    }

    // Check if sport has games today
    // LENIENT for college sports (NCAAB/NCAAF) - 350+ schools, naming chaos
    // STRICT for pro sports (NFL/NBA/MLB/NHL) - easy to verify
    const LENIENT_SPORTS = ['NCAAB', 'NCAAF', 'CBB', 'CFB'];
    const isCollegeSport = LENIENT_SPORTS.includes(sport);
    
    const sportGames = gamesCache.games.get(sport);
    if (!sportGames || sportGames.size === 0) {
      if (isCollegeSport) {
        // College: Pass through even if ESPN shows 0 games (might be data lag)
        logger.debug('Schedule', `Passing through ${team} (${sport}) - college sport, can't verify`);
        filtered.push(pick);
        continue;
      }
      // Pro sports: REJECT if ESPN says 0 games
      logger.debug('Schedule', `Rejecting ${team} (${sport}) - NO ${sport} games today per ESPN`);
      rejected.push({
        team,
        sport,
        capper,
        reason: 'NO_GAMES_TODAY',
        details: `No ${sport} games scheduled for today`,
      });
      continue;
    }

    // Check if team is playing today
    const teamClean = team.toLowerCase().replace(/[^a-z0-9]/g, '');
    const standardizedClean = standardizeTeamName(team, sport).toLowerCase().replace(/[^a-z0-9]/g, '');

    // Strategy 1: Exact match on standardized name (most reliable)
    // The game set includes both raw ("nebraska cornhuskers") and standardized ("nebraska")
    const isExactMatch = sportGames.has(standardizedClean) || sportGames.has(teamClean);

    // Strategy 2: Fuzzy match (for ESPN abbreviations like "PUR" matching "purdue")
    // ONLY used for pro sports (ESPN has reliable full coverage)
    // NOT used for college sports (too many false positives: "Arizona" → "Arizona State")
    const isFuzzyMatch = !isExactMatch && [...sportGames].some(t => {
      const tClean = t.replace(/[^a-z0-9]/g, '');
      return tClean.includes(teamClean.slice(0, 4)) ||
             teamClean.includes(tClean.slice(0, 4)) ||
             tClean.includes(standardizedClean.slice(0, 4)) ||
             standardizedClean.includes(tClean.slice(0, 4));
    });

    const hasComprehensiveData = sportGames.size >= 20;

    if (isExactMatch) {
      // Team found in schedule (exact standardized match)
      filtered.push(pick);
    } else if (isFuzzyMatch && !isCollegeSport) {
      // Pro sports with fuzzy match (ESPN abbreviations)
      filtered.push(pick);
    } else if (isCollegeSport && !hasComprehensiveData) {
      // College with sparse ESPN data: fail open
      filtered.push(pick);
    } else {
      // No match: reject (both college with comprehensive data AND pro sports)
      logger.debug('Schedule', `Rejecting ${team} (${sport}) - not in today's schedule (${sportGames.size} entries, exact: std="${standardizedClean}" raw="${teamClean}")`);
      rejected.push({ team, sport, capper, reason: 'TEAM_NOT_PLAYING', details: `${team} not found in today's ${sport} schedule` });
    }
  }

  // Log summary with rejection breakdown
  if (rejected.length > 0) {
    logger.info('Schedule', `Filtered out ${rejected.length} picks:`);

    // Group by reason for cleaner output
    const byReason = rejected.reduce((acc, r) => {
      acc[r.reason] = acc[r.reason] || [];
      acc[r.reason].push(r);
      return acc;
    }, {} as Record<RejectionReason, RejectedPick[]>);

    for (const [reason, picks] of Object.entries(byReason)) {
      logger.debug('Schedule', `  ${reason}: ${picks.length} picks`);
      // Show first 3 examples for each reason
      for (const p of picks.slice(0, 3)) {
        logger.debug('Schedule', `    - ${p.team} (${p.sport}) from ${p.capper}: ${p.details}`);
      }
      if (picks.length > 3) {
        logger.debug('Schedule', `    ... and ${picks.length - 3} more`);
      }
    }
  }

  logger.info('Schedule', `ESPN Validation: ${picks.length} -> ${filtered.length} picks (${rejected.length} filtered)`);
  return { filtered, rejected };
}

/**
 * Get today's game schedule summary (for debugging)
 */
export async function getTodaysScheduleSummary(): Promise<Record<string, number>> {
  await loadGamesCache();

  if (!gamesCache) return {};

  const summary: Record<string, number> = {};
  for (const [sport, teams] of gamesCache.games.entries()) {
    summary[sport] = Math.floor(teams.size / 3); // Divide by 3 because we store 3 names per team
  }

  return summary;
}

