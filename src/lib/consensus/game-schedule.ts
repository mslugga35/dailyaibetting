/**
 * Game Schedule Checker
 * Fetches real-time schedules from ESPN API with fallback logic
 * No hardcoded dates - works automatically every day
 * @module lib/consensus/game-schedule
 */

import { standardizeTeamName } from './team-mappings';
import { getTodayET, getYesterdayET, toEasternDate } from '../utils/date';
import { logger } from '../utils/logger';

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
  games: Map<string, Set<string>>; // sport -> Set of team names
  fetchedAt: number;
  yesterdaysTeams?: Set<string>; // For stale pick detection
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
 * Fetch yesterday's games from ESPN API (to filter out stale picks)
 */
async function fetchYesterdaysGamesFromESPN(sport: string): Promise<string[]> {
  const endpoint = ESPN_ENDPOINTS[sport];
  if (!endpoint) return [];

  try {
    const yesterday = getYesterdayET();
    const url = `${endpoint}?dates=${yesterday.replace(/-/g, '')}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) return [];

    const data: ESPNResponse = await response.json();
    const teams: string[] = [];

    for (const event of data.events || []) {
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

    return teams;
  } catch (error) {
    return [];
  }
}

/**
 * Load all games for today and yesterday (for filtering)
 */
async function loadGamesCache(): Promise<void> {
  const today = getTodayET();

  // Check if cache is still valid
  if (gamesCache && gamesCache.date === today && Date.now() - gamesCache.fetchedAt < CACHE_TTL) {
    return;
  }

  logger.debug('Schedule', 'Refreshing games cache from ESPN...');

  const todaysGames = new Map<string, Set<string>>();
  const yesterdaysTeams = new Set<string>();

  // Fetch all sports in parallel
  const sports = Object.keys(ESPN_ENDPOINTS);
  const [todayResults, yesterdayResults] = await Promise.all([
    Promise.all(sports.map(sport => fetchTodaysGamesFromESPN(sport).then(teams => ({ sport, teams })))),
    Promise.all(sports.map(sport => fetchYesterdaysGamesFromESPN(sport).then(teams => ({ sport, teams })))),
  ]);

  // Process today's games
  for (const { sport, teams } of todayResults) {
    todaysGames.set(sport, new Set(teams.map(t => t.toLowerCase())));
  }

  // Process yesterday's games (for stale pick detection)
  for (const { teams } of yesterdayResults) {
    for (const team of teams) {
      yesterdaysTeams.add(team.toLowerCase());
    }
  }

  gamesCache = {
    date: today,
    games: todaysGames,
    fetchedAt: Date.now(),
  };

  // Store yesterday's teams for filtering
  gamesCache.yesterdaysTeams = yesterdaysTeams;

  logger.debug('Schedule', 'Cache updated:',
    Object.fromEntries([...todaysGames.entries()].map(([k, v]) => [k, v.size / 3]))
  );
}

/**
 * Check if a team is playing today
 */
export async function isTeamPlayingToday(team: string, sport: string): Promise<boolean> {
  await loadGamesCache();

  if (!gamesCache) return true; // Fail open if cache fails

  const sportGames = gamesCache.games.get(sport);
  if (!sportGames || sportGames.size === 0) {
    // No games found for sport - might be API issue, fail open
    return true;
  }

  const standardized = standardizeTeamName(team, sport).toLowerCase();
  const teamLower = team.toLowerCase();

  // Check if team matches any playing today
  return sportGames.has(standardized) ||
         sportGames.has(teamLower) ||
         [...sportGames].some(t => t.includes(teamLower) || teamLower.includes(t));
}

/**
 * Check if a game already happened (team played yesterday but not today)
 */
export function hasGameAlreadyHappened(team: string, sport: string): boolean {
  // This is now handled by the date filter in google-sheets.ts
  // We only check if the pick's date matches today
  return false;
}

/**
 * Check if any games are scheduled today for a sport
 */
export async function hasSportGamesToday(sport: string): Promise<boolean> {
  await loadGamesCache();

  if (!gamesCache) return true; // Fail open

  const sportGames = gamesCache.games.get(sport);
  return sportGames ? sportGames.size > 0 : true; // Fail open for unknown sports
}

/**
 * Filter consensus picks to only include games playing today
 * Uses ESPN API for real schedules, falls back to passing all picks through
 */
export function filterToTodaysGames<T extends { team?: string; standardizedTeam?: string; sport: string }>(
  picks: T[]
): T[] {
  // For now, return all picks - the date filter in google-sheets.ts handles the primary filtering
  // This function can be enhanced to do async ESPN validation if needed
  // The key is that we don't want to block on API calls in the sync filter
  return picks;
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
type RejectionReason = 'UNSUPPORTED_SPORT' | 'NO_GAMES_TODAY' | 'TEAM_NOT_PLAYING' | 'NFL_TEAM_NO_GAMES';

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

    // Check if team is playing today - be LENIENT to avoid missing valid picks
    const teamClean = team.toLowerCase().replace(/[^a-z0-9]/g, '');
    const standardizedClean = standardizeTeamName(team, sport).toLowerCase().replace(/[^a-z0-9]/g, '');

    // Multiple matching strategies - any match = pass through
    const isPlaying = sportGames.has(standardizedClean) ||
                      sportGames.has(teamClean) ||
                      [...sportGames].some(t => {
                        const tClean = t.replace(/[^a-z0-9]/g, '');
                        return tClean.includes(teamClean.slice(0, 4)) ||
                               teamClean.includes(tClean.slice(0, 4)) ||
                               tClean.includes(standardizedClean.slice(0, 4)) ||
                               standardizedClean.includes(tClean.slice(0, 4));
                      });

    if (isPlaying) {
      filtered.push(pick);
    } else if (isCollegeSport) {
      // College: fail open — ESPN doesn't cover all 350+ schools
      filtered.push(pick);
    } else {
      // Pro sports (NBA/NFL/MLB/NHL): fail closed — ESPN covers all teams
      logger.debug('Schedule', `Rejecting ${team} (${sport}) - not in today's ${sport} schedule`);
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
 * Simple async filter (backwards compatible - returns only filtered picks)
 */
export async function filterToTodaysGamesAsyncSimple<T extends PickWithCapper>(
  picks: T[]
): Promise<T[]> {
  const { filtered } = await filterToTodaysGamesAsync(picks);
  return filtered;
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

/**
 * Synchronous version for backwards compatibility
 * Returns empty object - use async version for real data
 */
export function getTodaysScheduleSummarySync(): Record<string, string[]> {
  return {};
}
