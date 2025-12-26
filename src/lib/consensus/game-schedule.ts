// Game Schedule Checker
// Fetches real-time schedules from ESPN API with fallback logic
// No hardcoded dates - works automatically every day

import { standardizeTeamName } from './team-mappings';

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

// Cache for today's games (refreshes daily)
let gamesCache: {
  date: string;
  games: Map<string, Set<string>>; // sport -> Set of team names
  fetchedAt: number;
} | null = null;

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ESPN API endpoints (free, no auth required)
const ESPN_ENDPOINTS: Record<string, string> = {
  NFL: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  NBA: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  MLB: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  NHL: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  NCAAF: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
  NCAAB: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard',
};

// Get today's date in Eastern timezone
function getTodayET(): string {
  const now = new Date();
  const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return todayET.toISOString().split('T')[0];
}

// Get yesterday's date in Eastern timezone
function getYesterdayET(): string {
  const now = new Date();
  const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  todayET.setDate(todayET.getDate() - 1);
  return todayET.toISOString().split('T')[0];
}

/**
 * Convert UTC date string to Eastern timezone date (YYYY-MM-DD)
 */
function toEasternDate(utcDateStr: string): string {
  try {
    const date = new Date(utcDateStr);
    // Format in Eastern timezone
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  } catch {
    return utcDateStr.split('T')[0];
  }
}

/**
 * Fetch today's games from ESPN API
 */
async function fetchTodaysGamesFromESPN(sport: string): Promise<string[]> {
  const endpoint = ESPN_ENDPOINTS[sport];
  if (!endpoint) return [];

  try {
    const response = await fetch(endpoint, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 1800 }, // Cache for 30 min
    });

    if (!response.ok) {
      console.warn(`[Schedule] ESPN ${sport} API returned ${response.status}`);
      return [];
    }

    const data: ESPNResponse = await response.json();
    const teams: string[] = [];
    const today = getTodayET();

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

    console.log(`[Schedule] ESPN ${sport}: ${teams.length / 3} teams playing today (${today})`);
    return teams;
  } catch (error) {
    console.error(`[Schedule] ESPN ${sport} fetch error:`, error);
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

  console.log('[Schedule] Refreshing games cache from ESPN...');

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
  (gamesCache as any).yesterdaysTeams = yesterdaysTeams;

  console.log('[Schedule] Cache updated:',
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
 * Async version that actually checks ESPN
 */
export async function filterToTodaysGamesAsync<T extends { team?: string; standardizedTeam?: string; sport: string }>(
  picks: T[]
): Promise<T[]> {
  await loadGamesCache();

  if (!gamesCache || gamesCache.games.size === 0) {
    console.warn('[Schedule] No cache available, passing all picks through');
    return picks;
  }

  const filtered: T[] = [];

  for (const pick of picks) {
    const team = pick.standardizedTeam || pick.team || '';
    const sport = pick.sport;

    // Check if sport has games today
    const sportGames = gamesCache.games.get(sport);
    if (!sportGames || sportGames.size === 0) {
      // No games for this sport today - filter OUT (not pass through)
      // This prevents yesterday's picks from showing when sport has no games
      console.log(`[Schedule] Filtering out ${team} (${sport}) - no ${sport} games today`);
      continue;
    }

    // Check if team is playing today
    const teamLower = team.toLowerCase();
    const standardized = standardizeTeamName(team, sport).toLowerCase();

    const isPlaying = sportGames.has(standardized) ||
                      sportGames.has(teamLower) ||
                      [...sportGames].some(t =>
                        t.includes(teamLower.slice(0, 4)) ||
                        teamLower.includes(t.slice(0, 4))
                      );

    if (isPlaying) {
      filtered.push(pick);
    } else {
      console.log(`[Schedule] Filtering out ${team} (${sport}) - not playing today`);
    }
  }

  console.log(`[Schedule] Filtered ${picks.length} -> ${filtered.length} picks`);
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
