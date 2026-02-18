/**
 * ESPN Scores — Fetch yesterday's game results
 *
 * Uses ESPN's free scoreboard API to get final scores for completed games.
 * Used by the consensus API to attach W/L results to yesterday's picks.
 *
 * @module lib/data/espn-scores
 */

import { standardizeTeamName } from '../consensus/team-mappings';
import { getYesterdayET } from '../utils/date';
import { logger } from '../utils/logger';

export interface GameResult {
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalScore: number;
  winner: string; // standardized team name of winner
  completed: boolean;
}

const ESPN_ENDPOINTS: Record<string, string> = {
  NFL: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  NBA: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  MLB: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  NHL: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  NCAAF: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
  NCAAB: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard',
};

/** Cache for yesterday's scores */
let scoresCache: {
  date: string;
  results: GameResult[];
  fetchedAt: number;
} | null = null;

const CACHE_TTL = 60 * 60 * 1000; // 1 hour (yesterday's scores don't change)

/**
 * Fetch yesterday's game results from ESPN
 */
async function fetchScoresForSport(sport: string, dateStr: string): Promise<GameResult[]> {
  const endpoint = ESPN_ENDPOINTS[sport];
  if (!endpoint) return [];

  try {
    const dateParam = dateStr.replace(/-/g, '');
    const url = `${endpoint}?dates=${dateParam}&limit=100`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      logger.warn('ESPNScores', `${sport} API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results: GameResult[] = [];

    for (const event of data.events || []) {
      const competition = event.competitions?.[0];
      if (!competition) continue;

      const statusCompleted = competition.status?.type?.completed === true;
      if (!statusCompleted) continue;

      const competitors = competition.competitors || [];
      if (competitors.length < 2) continue;

      const home = competitors.find((c: any) => c.homeAway === 'home');
      const away = competitors.find((c: any) => c.homeAway === 'away');
      if (!home || !away) continue;

      const homeScore = parseInt(home.score || '0');
      const awayScore = parseInt(away.score || '0');
      const homeTeam = home.team?.displayName || '';
      const awayTeam = away.team?.displayName || '';

      // Use ESPN's winner flag when available; fall back to score comparison
      const espnHomeWinner = home.winner === true;
      const espnAwayWinner = away.winner === true;
      let winnerTeam = '';
      if (espnHomeWinner) winnerTeam = homeTeam;
      else if (espnAwayWinner) winnerTeam = awayTeam;
      else winnerTeam = homeScore > awayScore ? homeTeam : awayTeam;

      results.push({
        sport,
        homeTeam: standardizeTeamName(homeTeam, sport),
        awayTeam: standardizeTeamName(awayTeam, sport),
        homeScore,
        awayScore,
        totalScore: homeScore + awayScore,
        winner: winnerTeam ? standardizeTeamName(winnerTeam, sport) : '',
        completed: true,
      });
    }

    logger.debug('ESPNScores', `${sport}: ${results.length} completed games for ${dateStr}`);
    return results;
  } catch (error) {
    logger.error('ESPNScores', `${sport} fetch error:`, error);
    return [];
  }
}

/**
 * Get all yesterday's game results (cached)
 */
export async function getYesterdaysScores(): Promise<GameResult[]> {
  const yesterday = getYesterdayET();

  if (scoresCache && scoresCache.date === yesterday && Date.now() - scoresCache.fetchedAt < CACHE_TTL) {
    return scoresCache.results;
  }

  const sports = Object.keys(ESPN_ENDPOINTS);
  const allResults = await Promise.all(
    sports.map(sport => fetchScoresForSport(sport, yesterday))
  );

  const results = allResults.flat();
  scoresCache = { date: yesterday, results, fetchedAt: Date.now() };

  logger.info('ESPNScores', `Yesterday (${yesterday}): ${results.length} completed games`);
  return results;
}

/**
 * Determine W/L result for a consensus pick against game results
 */
export function gradeConsensus(
  pick: { bet: string; betType: string; line?: string; sport: string },
  scores: GameResult[]
): 'W' | 'L' | 'P' | null {
  const sportScores = scores.filter(g => g.sport === pick.sport);
  if (sportScores.length === 0) return null;

  // Extract team name from bet display
  let pickTeam = pick.bet
    .replace(/\s+(ML|F5 ML)$/i, '')
    .replace(/\s+[+-][\d.]+$/i, '')
    .replace(/\s+(Over|Under)\s+[\d.]+$/i, '')
    .trim();

  // For O/U, get both teams from "TeamA/TeamB Over X"
  const isTotal = pick.betType === 'OVER' || pick.betType === 'UNDER';
  if (isTotal) {
    const totalMatch = pick.bet.match(/^(.+?)\s+(Over|Under)\s+([\d.]+)/i);
    if (!totalMatch) return null;

    const teamsStr = totalMatch[1];
    const direction = totalMatch[2].toUpperCase();
    const line = parseFloat(totalMatch[3]);
    if (isNaN(line)) return null;

    // Find game by matching either team
    const teamParts = teamsStr.split('/').map(t => t.trim());
    const game = sportScores.find(g =>
      teamParts.some(t => t === g.homeTeam || t === g.awayTeam)
    );
    if (!game) return null;

    if (direction === 'OVER') {
      if (game.totalScore > line) return 'W';
      if (game.totalScore < line) return 'L';
      return 'P';
    } else {
      if (game.totalScore < line) return 'W';
      if (game.totalScore > line) return 'L';
      return 'P';
    }
  }

  // Find game by team name
  const stdTeam = standardizeTeamName(pickTeam, pick.sport);
  const game = sportScores.find(g => g.homeTeam === stdTeam || g.awayTeam === stdTeam);
  if (!game) return null;

  const isHome = game.homeTeam === stdTeam;
  const teamScore = isHome ? game.homeScore : game.awayScore;
  const oppScore = isHome ? game.awayScore : game.homeScore;

  if (pick.betType === 'ML' || pick.betType === 'F5_ML') {
    if (teamScore > oppScore) return 'W';
    if (teamScore < oppScore) return 'L';
    return 'P';
  }

  if (pick.betType === 'SPREAD') {
    const spread = parseFloat(pick.line || '0');
    if (isNaN(spread)) return null;
    const adjusted = teamScore + spread;
    if (adjusted > oppScore) return 'W';
    if (adjusted < oppScore) return 'L';
    return 'P';
  }

  return null;
}
