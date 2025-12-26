// Game Schedule Checker
// Cross-references picks against actual game schedules to filter out old games

import { standardizeTeamName } from './team-mappings';

interface GameInfo {
  team1: string;
  team2: string;
  sport: string;
  gameDate: string; // YYYY-MM-DD
}

// Get today's date in Eastern timezone
function getTodayET(): string {
  const now = new Date();
  const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return todayET.toISOString().split('T')[0];
}

// Known games schedule - updated daily
// This can be enhanced to fetch from a sports API
const KNOWN_GAMES: Record<string, GameInfo[]> = {
  // December 26, 2025 - Day after Christmas
  '2025-12-26': [
    // NCAAF Bowl Games (Dec 26)
    { team1: 'Northwestern', team2: 'Central Michigan', sport: 'NCAAF', gameDate: '2025-12-26' },
    { team1: 'Minnesota', team2: 'New Mexico', sport: 'NCAAF', gameDate: '2025-12-26' },
    { team1: 'UTSA', team2: 'FIU', sport: 'NCAAF', gameDate: '2025-12-26' },
    // NBA games Dec 26 - Full slate
    { team1: 'Celtics', team2: 'Pacers', sport: 'NBA', gameDate: '2025-12-26' },
    { team1: 'Bulls', team2: 'Bucks', sport: 'NBA', gameDate: '2025-12-26' },
    { team1: 'Nets', team2: 'Hornets', sport: 'NBA', gameDate: '2025-12-26' },
    { team1: 'Pistons', team2: 'Heat', sport: 'NBA', gameDate: '2025-12-26' },
    { team1: 'Hawks', team2: 'Wizards', sport: 'NBA', gameDate: '2025-12-26' },
    { team1: 'Clippers', team2: 'Trail Blazers', sport: 'NBA', gameDate: '2025-12-26' },
    { team1: 'Jazz', team2: 'Kings', sport: 'NBA', gameDate: '2025-12-26' },
    { team1: 'Pelicans', team2: 'Magic', sport: 'NBA', gameDate: '2025-12-26' },
    { team1: 'Raptors', team2: 'Suns', sport: 'NBA', gameDate: '2025-12-26' },
    { team1: 'Rockets', team2: 'Grizzlies', sport: 'NBA', gameDate: '2025-12-26' },
    // NO NFL games on Dec 26 (Christmas games were Dec 25, next games Dec 27)
  ],
  // December 25, 2025 - Christmas Day (for reference, these are YESTERDAY)
  '2025-12-25': [
    // NFL Christmas
    { team1: 'Cowboys', team2: 'Commanders', sport: 'NFL', gameDate: '2025-12-25' },
    { team1: 'Vikings', team2: 'Lions', sport: 'NFL', gameDate: '2025-12-25' },
    { team1: 'Chiefs', team2: 'Broncos', sport: 'NFL', gameDate: '2025-12-25' },
    // NBA Christmas
    { team1: 'Knicks', team2: 'Cavaliers', sport: 'NBA', gameDate: '2025-12-25' },
    { team1: 'Thunder', team2: 'Spurs', sport: 'NBA', gameDate: '2025-12-25' },
    { team1: 'Warriors', team2: 'Mavericks', sport: 'NBA', gameDate: '2025-12-25' },
    { team1: 'Lakers', team2: 'Rockets', sport: 'NBA', gameDate: '2025-12-25' },
    { team1: 'Nuggets', team2: 'Timberwolves', sport: 'NBA', gameDate: '2025-12-25' },
    // NCAAF - Hawaii Bowl
    { team1: 'Hawaii', team2: 'California', sport: 'NCAAF', gameDate: '2025-12-24' },
  ],
  // December 27, 2025 - Saturday NFL
  '2025-12-27': [
    { team1: 'Chargers', team2: 'Texans', sport: 'NFL', gameDate: '2025-12-27' },
    { team1: 'Seahawks', team2: 'Bears', sport: 'NFL', gameDate: '2025-12-27' },
  ],
  // December 28, 2025 - Sunday NFL
  '2025-12-28': [
    { team1: 'Colts', team2: 'Giants', sport: 'NFL', gameDate: '2025-12-28' },
    { team1: 'Broncos', team2: 'Bengals', sport: 'NFL', gameDate: '2025-12-28' },
    { team1: 'Bills', team2: 'Jets', sport: 'NFL', gameDate: '2025-12-28' },
    { team1: 'Cardinals', team2: 'Rams', sport: 'NFL', gameDate: '2025-12-28' },
    { team1: 'Panthers', team2: 'Buccaneers', sport: 'NFL', gameDate: '2025-12-28' },
    { team1: 'Raiders', team2: 'Saints', sport: 'NFL', gameDate: '2025-12-28' },
    { team1: 'Titans', team2: 'Jaguars', sport: 'NFL', gameDate: '2025-12-28' },
    { team1: 'Falcons', team2: 'Commanders', sport: 'NFL', gameDate: '2025-12-28' },
    { team1: 'Eagles', team2: 'Cowboys', sport: 'NFL', gameDate: '2025-12-28' },
    { team1: 'Dolphins', team2: 'Browns', sport: 'NFL', gameDate: '2025-12-28' },
    { team1: 'Patriots', team2: 'Chargers', sport: 'NFL', gameDate: '2025-12-28' },
    { team1: 'Packers', team2: 'Vikings', sport: 'NFL', gameDate: '2025-12-28' },
    { team1: '49ers', team2: 'Lions', sport: 'NFL', gameDate: '2025-12-28' },
    { team1: 'Steelers', team2: 'Chiefs', sport: 'NFL', gameDate: '2025-12-28' },
  ],
};

// Teams that played yesterday (Dec 25 Christmas games)
const CHRISTMAS_DAY_TEAMS: Record<string, string[]> = {
  NFL: ['Cowboys', 'Commanders', 'Vikings', 'Lions', 'Chiefs', 'Broncos', 'Bears'],
  NBA: ['Knicks', 'Cavaliers', 'Thunder', 'Spurs', 'Warriors', 'Mavericks', 'Lakers', 'Rockets', 'Nuggets', 'Timberwolves'],
};

// Hawaii Bowl was Dec 24
const HAWAII_BOWL_TEAMS = ['Hawaii', 'California'];

/**
 * Check if a team is playing today
 */
export function isTeamPlayingToday(team: string, sport: string): boolean {
  const today = getTodayET();
  const todayGames = KNOWN_GAMES[today] || [];

  const standardized = standardizeTeamName(team, sport);

  return todayGames.some(game =>
    game.sport === sport &&
    (game.team1 === standardized || game.team2 === standardized)
  );
}

/**
 * Check if a game already happened (before today)
 */
export function hasGameAlreadyHappened(team: string, sport: string): boolean {
  const standardized = standardizeTeamName(team, sport);
  const today = getTodayET();

  // Check if this was a Christmas Day game (Dec 25)
  if (today === '2025-12-26') {
    const christmasTeams = CHRISTMAS_DAY_TEAMS[sport] || [];

    // Direct match
    if (christmasTeams.includes(standardized)) {
      return true;
    }

    // Partial match for combined teams like "Laker/Rocket"
    // Check if ANY part of the team name matches a Christmas team
    const teamParts = team.split(/[\s\/]+/).map(t => t.toLowerCase().trim());
    for (const christmasTeam of christmasTeams) {
      const christmasLower = christmasTeam.toLowerCase();
      // Check partial matches (Laker matches Lakers, Rocket matches Rockets)
      for (const part of teamParts) {
        if (part.length >= 4 && (christmasLower.startsWith(part) || part.startsWith(christmasLower.slice(0, -1)))) {
          return true;
        }
      }
    }

    // Hawaii Bowl was Dec 24
    if (sport === 'NCAAF') {
      for (const hawaiiTeam of HAWAII_BOWL_TEAMS) {
        if (standardized === hawaiiTeam || team.toLowerCase().includes(hawaiiTeam.toLowerCase())) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Get list of teams playing today for a sport
 */
export function getTeamsPlayingToday(sport: string): string[] {
  const today = getTodayET();
  const todayGames = KNOWN_GAMES[today] || [];

  const teams: string[] = [];
  for (const game of todayGames) {
    if (game.sport === sport) {
      teams.push(game.team1, game.team2);
    }
  }

  return teams;
}

/**
 * Check if any games are scheduled today for a sport
 */
export function hasSportGamesToday(sport: string): boolean {
  const today = getTodayET();
  const todayGames = KNOWN_GAMES[today] || [];

  return todayGames.some(game => game.sport === sport);
}

/**
 * Filter consensus picks to only include games playing today
 */
export function filterToTodaysGames<T extends { team?: string; standardizedTeam?: string; sport: string }>(
  picks: T[]
): T[] {
  return picks.filter(pick => {
    const team = pick.standardizedTeam || pick.team || '';

    // If game already happened, filter it out
    if (hasGameAlreadyHappened(team, pick.sport)) {
      return false;
    }

    // For sports with no games today, filter them out
    if (!hasSportGamesToday(pick.sport)) {
      // Allow props and player bets through if we can't verify
      return false;
    }

    return true;
  });
}

/**
 * Get today's game schedule summary
 */
export function getTodaysScheduleSummary(): Record<string, string[]> {
  const today = getTodayET();
  const todayGames = KNOWN_GAMES[today] || [];

  const summary: Record<string, string[]> = {};

  for (const game of todayGames) {
    if (!summary[game.sport]) {
      summary[game.sport] = [];
    }
    summary[game.sport].push(`${game.team1} vs ${game.team2}`);
  }

  return summary;
}
