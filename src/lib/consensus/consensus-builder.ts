// Consensus Builder - Based on your MASTER_CONSENSUS_RULES
// Follows exact rules from ConsensusProject

import { standardizeTeamName, identifySport } from './team-mappings';

export type BetType = 'ML' | 'SPREAD' | 'OVER' | 'UNDER' | 'F5_ML' | 'PROP';

export interface RawPick {
  site: string;
  league: string;
  date: string;
  matchup: string;
  service: string; // Capper name
  pick: string;
  runDate?: string;
}

export interface NormalizedPick {
  id: string;
  capper: string;
  team: string;
  standardizedTeam: string;
  betType: BetType;
  line?: string;
  sport: string;
  matchup: string;
  originalPick: string;
  date: string;
}

export interface ConsensusPick {
  id: string;
  bet: string; // e.g., "Guardians ML", "Tigers -1.5", "Over 12"
  sport: string;
  matchup: string;
  betType: BetType;
  line?: string;
  capperCount: number;
  cappers: string[];
  isFire: boolean; // 3+ cappers = 🔥
  confidence: number; // 0-1 based on capper count
}

/**
 * Parse bet type from pick text
 * Based on MASTER_CONSENSUS_RULES Section 3
 */
export function parseBetType(pick: string): { betType: BetType; line?: string } {
  const text = pick.toUpperCase();

  // F5 (First 5 innings) - must check first
  if (text.includes('F5') || text.includes('FIRST 5')) {
    return { betType: 'F5_ML' };
  }

  // Spread/Runline - look for +/- with number
  const spreadMatch = text.match(/([+-]\d+\.?\d*)/);
  if (spreadMatch && !text.includes('OVER') && !text.includes('UNDER')) {
    // Check if it's a spread (not just odds)
    const num = parseFloat(spreadMatch[1]);
    if (Math.abs(num) <= 20) {
      // Likely a spread, not odds
      return { betType: 'SPREAD', line: spreadMatch[1] };
    }
  }

  // Totals - Over/Under
  const overMatch = text.match(/OVER\s*(\d+\.?\d*)/);
  if (overMatch) {
    return { betType: 'OVER', line: overMatch[1] };
  }

  const underMatch = text.match(/UNDER\s*(\d+\.?\d*)/);
  if (underMatch) {
    return { betType: 'UNDER', line: underMatch[1] };
  }

  // Props - Player specific
  if (text.includes('STRIKEOUT') || text.includes('HITS') || text.includes('POINTS') ||
      text.includes('REBOUNDS') || text.includes('ASSISTS') || text.includes('YARDS')) {
    return { betType: 'PROP' };
  }

  // Default to ML
  return { betType: 'ML' };
}

/**
 * Extract team name from pick text
 */
export function extractTeam(pick: string, matchup: string): string {
  // Try to match from matchup (format: "Team1 vs Team2" or "Team1 @ Team2")
  const teams = matchup.split(/\s+(?:vs\.?|@|at)\s+/i);

  // Clean the pick text
  const cleanPick = pick.replace(/[+-]\d+\.?\d*/g, '')
                        .replace(/ML|MONEYLINE|F5|OVER|UNDER/gi, '')
                        .trim();

  // Try to find which team matches
  for (const team of teams) {
    if (cleanPick.toLowerCase().includes(team.toLowerCase().trim())) {
      return team.trim();
    }
  }

  // Return first word(s) as team name
  return cleanPick.split(/\s+/).slice(0, 2).join(' ');
}

/**
 * Normalize capper name
 * Based on MASTER_CONSENSUS_RULES Section 2
 */
export function normalizeCapper(capper: string): string {
  // Remove spaces/punctuation for consistency
  let normalized = capper.trim();

  // Special entities that count as single cappers
  const specialEntities: Record<string, string> = {
    'dimers': 'Dimers',
    'consensus leans': 'Consensus Leans',
    'ballpark pal': 'Ballpark Pal',
    'ballparkpal': 'Ballpark Pal',
    'lightning bolt': 'Lightning Bolt',
  };

  const lower = normalized.toLowerCase().replace(/\s+/g, '');
  for (const [key, value] of Object.entries(specialEntities)) {
    if (lower.includes(key.replace(/\s+/g, ''))) {
      return value;
    }
  }

  // Handle numbered cappers (Capper 1-99)
  const capperNumMatch = normalized.match(/capper\s*(\d+)/i);
  if (capperNumMatch) {
    return `Capper ${capperNumMatch[1]}`;
  }

  return normalized;
}

/**
 * Check if pick is for today's games
 * Based on MASTER_CONSENSUS_RULES Section 1
 */
export function isTodayPick(pickDate: string): boolean {
  // Handle "TODAY" literal
  if (pickDate.toUpperCase() === 'TODAY') {
    return true;
  }

  // Get today's date in Eastern timezone
  const today = new Date();
  const todayET = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const todayStr = todayET.toISOString().split('T')[0];

  // Also accept yesterday's date (for picks made late at night)
  const yesterday = new Date(todayET);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Parse pick date
  const pickDateClean = pickDate.split('T')[0];

  return pickDateClean === todayStr || pickDateClean === yesterdayStr;
}

/**
 * Check if sport is in season
 * Based on MASTER_CONSENSUS_RULES Section 1
 */
export function isInSeason(sport: string): boolean {
  const month = new Date().getMonth() + 1; // 1-12

  switch (sport) {
    case 'MLB':
      return month >= 3 && month <= 10;
    case 'NFL':
      return month >= 9 || month <= 2;
    case 'NBA':
      return month >= 10 || month <= 6;
    case 'NHL':
      return month >= 10 || month <= 6;
    case 'WNBA':
      return month >= 5 && month <= 9;
    case 'NCAAF':
      return month >= 8 && month <= 1;
    case 'NCAAB':
      return month >= 11 || month <= 4;
    default:
      return true;
  }
}

/**
 * Normalize picks from raw data
 */
export function normalizePicks(rawPicks: RawPick[]): NormalizedPick[] {
  return rawPicks
    .filter(pick => {
      // Filter today's picks only
      if (!isTodayPick(pick.date)) return false;

      // Filter in-season sports
      const sport = pick.league?.toUpperCase() || identifySport(pick.matchup) || 'OTHER';
      if (!isInSeason(sport)) return false;

      return true;
    })
    .map((pick, index) => {
      const sport = pick.league?.toUpperCase() || identifySport(pick.matchup) || 'OTHER';
      const team = extractTeam(pick.pick, pick.matchup);
      const standardizedTeam = standardizeTeamName(team, sport);
      const { betType, line } = parseBetType(pick.pick);

      return {
        id: `${pick.site}-${index}`,
        capper: normalizeCapper(pick.service),
        team,
        standardizedTeam,
        betType,
        line,
        sport,
        matchup: pick.matchup,
        originalPick: pick.pick,
        date: pick.date,
      };
    });
}

/**
 * Build consensus from normalized picks
 * One vote per capper per unique bet
 */
export function buildConsensus(normalizedPicks: NormalizedPick[]): ConsensusPick[] {
  // Group by unique bet (team + betType + line)
  const betGroups = new Map<string, {
    cappers: Set<string>;
    sport: string;
    matchup: string;
    betType: BetType;
    line?: string;
    team: string;
  }>();

  for (const pick of normalizedPicks) {
    // Create unique bet key: Team + BetType + Line (if applicable)
    let betKey = `${pick.standardizedTeam}_${pick.betType}`;
    if (pick.line) {
      betKey += `_${pick.line}`;
    }

    if (!betGroups.has(betKey)) {
      betGroups.set(betKey, {
        cappers: new Set(),
        sport: pick.sport,
        matchup: pick.matchup,
        betType: pick.betType,
        line: pick.line,
        team: pick.standardizedTeam,
      });
    }

    // Only count each capper ONCE per unique bet
    betGroups.get(betKey)!.cappers.add(pick.capper);
  }

  // Convert to consensus picks
  const consensusPicks: ConsensusPick[] = [];

  for (const [key, group] of betGroups) {
    const capperCount = group.cappers.size;

    // Only include if 2+ cappers agree
    if (capperCount < 2) continue;

    // Format bet display string
    let betDisplay = group.team;
    switch (group.betType) {
      case 'ML':
        betDisplay += ' ML';
        break;
      case 'SPREAD':
        betDisplay += ` ${group.line}`;
        break;
      case 'OVER':
        betDisplay = `Over ${group.line}`;
        break;
      case 'UNDER':
        betDisplay = `Under ${group.line}`;
        break;
      case 'F5_ML':
        betDisplay += ' F5 ML';
        break;
      case 'PROP':
        betDisplay = group.team;
        break;
    }

    consensusPicks.push({
      id: key,
      bet: betDisplay,
      sport: group.sport,
      matchup: group.matchup,
      betType: group.betType,
      line: group.line,
      capperCount,
      cappers: Array.from(group.cappers),
      isFire: capperCount >= 3, // 🔥 for 3+ cappers
      confidence: Math.min(capperCount / 10, 1), // Normalize to 0-1
    });
  }

  // Sort by capper count (highest first)
  return consensusPicks.sort((a, b) => b.capperCount - a.capperCount);
}

/**
 * Format consensus output
 * Based on consensusinstructions.txt
 */
export function formatConsensusOutput(consensus: ConsensusPick[]): {
  topOverall: ConsensusPick[];
  bySport: Record<string, ConsensusPick[]>;
  fadeThePublic: ConsensusPick[];
} {
  // Top 5 overall (sorted by capper count)
  const topOverall = consensus.slice(0, 5);

  // Group by sport - include all picks (frontend will limit to top 3)
  const bySport: Record<string, ConsensusPick[]> = {};
  for (const pick of consensus) {
    if (!bySport[pick.sport]) {
      bySport[pick.sport] = [];
    }
    bySport[pick.sport].push(pick);
  }

  // Fade the public - highest consensus (10+ cappers may indicate public bet to fade)
  const fadeThePublic = consensus
    .filter(p => p.capperCount >= 7)
    .slice(0, 5);

  return { topOverall, bySport, fadeThePublic };
}
