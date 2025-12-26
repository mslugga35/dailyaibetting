// Consensus Builder - Based on your MASTER_CONSENSUS_RULES
// Follows exact rules from ConsensusProject

import { standardizeTeamName, identifySport } from './team-mappings';
import { hasGameAlreadyHappened, hasSportGamesToday, getTodaysScheduleSummary } from './game-schedule';

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
 * Per MASTER_CONSENSUS_RULES: Team names must be included in output
 *
 * Handles formats like:
 * - "Hawaii ML" → Hawaii
 * - "California +100" → California (odds, not spread)
 * - "Hawaii -115" → Hawaii (odds)
 * - "Hawaii -1.5" → Hawaii (spread)
 * - "Hawaii over 50½" → Hawaii (total)
 * - "Hawaii PK" → Hawaii (pick'em)
 */
export function extractTeam(pick: string, matchup: string): string {
  // For totals (over/under), extract team from matchup or pick prefix
  // Handle ½ (half) character in numbers like "50½"
  const isTotal = /\b(over|under|o|u)\s*\d+[½]?/i.test(pick);

  if (isTotal) {
    // Try to get team from text before "over/under"
    // Handle ½ character in totals
    const totalMatch = pick.match(/^([A-Za-z][A-Za-z\s.'/-]+?)\s+(?:over|under|o|u)\s*\d+[½]?/i);
    if (totalMatch) {
      return totalMatch[1].trim();
    }

    // Try matchup field
    if (matchup && matchup.trim()) {
      const cleanMatchup = matchup
        .replace(/\s*[ou]\s*\d+[½]?\.?\d*[½]?/gi, '')
        .replace(/\s*over\s*\d+[½]?\.?\d*[½]?/gi, '')
        .replace(/\s*under\s*\d+[½]?\.?\d*[½]?/gi, '')
        .trim();

      if (cleanMatchup.length > 0) {
        return cleanMatchup;
      }
    }
  }

  // Clean the pick text step by step
  let cleanPick = pick;

  // Step 1: Remove odds in parentheses (-110), (+150)
  cleanPick = cleanPick.replace(/\([+-]?\d+\)/g, '');

  // Step 2: Remove American odds at end (values >= 100 or <= -100)
  // "Hawaii -115" → "Hawaii", "California +100" → "California"
  cleanPick = cleanPick.replace(/\s+[+-]1\d{2,}$/g, ''); // -100 to -199, +100 to +199
  cleanPick = cleanPick.replace(/\s+[+-][2-9]\d{2,}$/g, ''); // -200+, +200+

  // Step 3: Remove spreads (small numbers with +/- like -1.5, +3, -7.5)
  // But keep the team name before it
  cleanPick = cleanPick.replace(/\s+[+-]?\d{1,2}\.?\d*½?$/g, '');

  // Step 4: Remove PK (pick'em)
  cleanPick = cleanPick.replace(/\s+PK$/gi, '');

  // Step 5: Remove bet type keywords
  cleanPick = cleanPick.replace(/\bML\b|\bMONEYLINE\b|\bF5\b/gi, '');
  cleanPick = cleanPick.replace(/\bOVER\b|\bUNDER\b/gi, '');

  // Step 6: Remove "over/under X" patterns that might remain (including ½ fractions)
  cleanPick = cleanPick.replace(/\b(over|under|o|u)\s*\d+[½]?\.?\d*[½]?/gi, '');
  // Also remove standalone fraction numbers like "50½"
  cleanPick = cleanPick.replace(/\s+\d+[½]$/g, '');

  // Clean up whitespace
  cleanPick = cleanPick.replace(/\s+/g, ' ').trim();

  // If we have a clean team name (letters present, not just numbers/symbols), use it
  if (cleanPick.length > 0 && /[A-Za-z]/.test(cleanPick) && !/^[\d\s.+-]+$/.test(cleanPick)) {
    return cleanPick;
  }

  // Try to match from matchup if provided
  if (matchup && matchup.trim()) {
    // Clean matchup (handle ½ character in numbers)
    let cleanMatchup = matchup
      .replace(/\s*[ou]\s*\d+[½]?\.?\d*[½]?/gi, '')
      .replace(/\s*over\s*\d+[½]?\.?\d*[½]?/gi, '')
      .replace(/\s*under\s*\d+[½]?\.?\d*[½]?/gi, '')
      .replace(/\s+[+-]?\d+[½]?\.?\d*[½]?\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const teams = cleanMatchup.split(/\s+(?:vs\.?|@|at|\/)\s*/i);
    for (const team of teams) {
      const trimmedTeam = team.trim();
      if (trimmedTeam.length > 0 && /[A-Za-z]/.test(trimmedTeam)) {
        return trimmedTeam;
      }
    }
    if (cleanMatchup.length > 0 && /[A-Za-z]/.test(cleanMatchup)) {
      return cleanMatchup;
    }
  }

  // Last resort: try to find any word-like content in original pick
  const wordMatch = pick.match(/^([A-Za-z][A-Za-z\s.'/-]+?)(?:\s+[+-]?\d|$|\s+ML|\s+PK)/i);
  if (wordMatch) {
    return wordMatch[1].trim();
  }

  return 'Unknown';
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
 * Only accepts picks with valid dates matching today or yesterday
 */
export function isTodayPick(pickDate: string): boolean {
  // Reject empty or missing dates - we need a valid date
  if (!pickDate || pickDate.trim() === '') {
    return false;
  }

  // Handle "TODAY" literal
  if (pickDate.toUpperCase() === 'TODAY') {
    return true;
  }

  // Get today's date in Eastern timezone
  const today = new Date();
  const todayET = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const todayStr = todayET.toISOString().split('T')[0];

  // Parse pick date - handle various formats
  let pickDateClean = pickDate.split('T')[0];

  // Handle MM/DD/YYYY or M/D/YYYY format
  const slashMatch = pickDateClean.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3] ? (slashMatch[3].length === 2 ? '20' + slashMatch[3] : slashMatch[3]) : todayET.getFullYear();
    pickDateClean = `${year}-${month}-${day}`;
  }

  // Handle "Dec 24" or "December 24" format
  const monthNameMatch = pickDateClean.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
  if (monthNameMatch) {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthAbbr = pickDateClean.slice(0, 3).toLowerCase();
    const monthNum = monthNames.indexOf(monthAbbr) + 1;
    if (monthNum > 0) {
      const day = monthNameMatch[1].padStart(2, '0');
      pickDateClean = `${todayET.getFullYear()}-${String(monthNum).padStart(2, '0')}-${day}`;
    }
  }

  // Only accept picks from TODAY - not yesterday
  return pickDateClean === todayStr;
}

/**
 * Normalize sport name to standard format
 * Handles variations like NCAA-F -> NCAAF, NCAA-B -> NCAAB
 */
export function normalizeSport(sport: string): string {
  const upper = sport.toUpperCase().trim();

  const sportMap: Record<string, string> = {
    'NCAA-F': 'NCAAF',
    'NCAAF': 'NCAAF',
    'CFB': 'NCAAF',
    'COLLEGE FOOTBALL': 'NCAAF',
    'NCAA-B': 'NCAAB',
    'NCAAB': 'NCAAB',
    'CBB': 'NCAAB',
    'COLLEGE BASKETBALL': 'NCAAB',
    'NFL': 'NFL',
    'NBA': 'NBA',
    'NHL': 'NHL',
    'MLB': 'MLB',
    'WNBA': 'WNBA',
  };

  return sportMap[upper] || upper;
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
      return month >= 8 || month <= 1; // Aug-Jan (bowl season includes Dec/Jan)
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

      // Normalize and filter in-season sports
      const rawSport = pick.league?.toUpperCase() || identifySport(pick.matchup) || 'OTHER';
      const sport = normalizeSport(rawSport);
      if (!isInSeason(sport)) return false;

      return true;
    })
    .map((pick, index) => {
      // Normalize sport name (NCAA-F -> NCAAF, etc.)
      const rawSport = pick.league?.toUpperCase() || identifySport(pick.matchup) || 'OTHER';
      const sport = normalizeSport(rawSport);

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
 * Normalize game name for totals (over/under)
 * Ensures "Cal/Hawaii", "Hawaii/California", "California vs Hawaii" all become the same
 */
function normalizeGameForTotal(team: string, sport: string): string {
  // Split by common separators
  const parts = team.split(/\s*[\/vs@]+\s*/i).map(t => t.trim()).filter(Boolean);

  if (parts.length < 2) {
    // Single team, just return standardized
    return standardizeTeamName(team, sport);
  }

  // Standardize each team name, then sort alphabetically
  const standardizedParts = parts.map(t => standardizeTeamName(t, sport));
  standardizedParts.sort((a, b) => a.localeCompare(b));
  return standardizedParts.join('/');
}

/**
 * For game totals, group all similar lines together
 * Round to nearest 2 points to group 50.5, 51, 51.5, 52 together
 */
function roundTotalLineForGrouping(line: string): string {
  const num = parseFloat(line);
  if (isNaN(num)) return line;
  // Round to nearest 2 points for aggressive grouping
  const rounded = Math.round(num / 2) * 2;
  return String(rounded);
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
    // For totals, normalize game name and round line
    let teamForKey = pick.standardizedTeam;
    let lineForKey = pick.line;

    if (pick.betType === 'OVER' || pick.betType === 'UNDER') {
      // For totals, try to get both teams from matchup or team field
      // If only one team mentioned, try to use matchup for the game name
      let gameTeams = pick.standardizedTeam;
      if (pick.matchup && pick.matchup.includes('/') || pick.matchup.includes(' vs ') || pick.matchup.includes('@')) {
        // Matchup has both teams, normalize it
        gameTeams = normalizeGameForTotal(pick.matchup, pick.sport);
      } else if (!pick.standardizedTeam.includes('/')) {
        // Only one team in standardizedTeam, try to get game from matchup
        gameTeams = normalizeGameForTotal(pick.matchup || pick.standardizedTeam, pick.sport);
      } else {
        gameTeams = normalizeGameForTotal(pick.standardizedTeam, pick.sport);
      }
      teamForKey = gameTeams;
      if (lineForKey) {
        lineForKey = roundTotalLineForGrouping(lineForKey);
      }
    }

    // Create unique bet key: Team + BetType + Line (if applicable)
    let betKey = `${teamForKey}_${pick.betType}`;
    if (lineForKey) {
      betKey += `_${lineForKey}`;
    }

    if (!betGroups.has(betKey)) {
      betGroups.set(betKey, {
        cappers: new Set(),
        sport: pick.sport,
        matchup: pick.matchup,
        betType: pick.betType,
        line: lineForKey || pick.line, // Use rounded line for totals
        team: teamForKey, // Use normalized team for totals
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
        // Include team/matchup for totals: "Cal/Hawaii Over 50.5"
        betDisplay = `${group.team} Over ${group.line}`;
        break;
      case 'UNDER':
        // Include team/matchup for totals: "Cal/Hawaii Under 51.5"
        betDisplay = `${group.team} Under ${group.line}`;
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
 * Extract team name from consensus pick for schedule checking
 */
function getTeamFromPick(pick: ConsensusPick): string {
  // For totals, get first team from "Team1/Team2 Over X"
  if (pick.betType === 'OVER' || pick.betType === 'UNDER') {
    const teams = pick.bet.split(/\s+(?:Over|Under)\s+/i)[0];
    const firstTeam = teams.split('/')[0].trim();
    return firstTeam;
  }
  // For spreads/ML, extract team name
  const team = pick.bet.replace(/\s+(ML|[+-][\d.]+).*$/, '').trim();
  return team;
}

/**
 * Format consensus output
 * Based on consensusinstructions.txt
 * Filters out games that have already happened
 */
export function formatConsensusOutput(consensus: ConsensusPick[]): {
  topOverall: ConsensusPick[];
  bySport: Record<string, ConsensusPick[]>;
  fadeThePublic: ConsensusPick[];
  filteredConsensus: ConsensusPick[]; // All consensus picks filtered to today's games only
} {
  // Log today's schedule for debugging
  const schedule = getTodaysScheduleSummary();
  console.log('[Consensus] Today\'s game schedule:', JSON.stringify(schedule));

  // STEP 1: Filter out games that have already happened (yesterday's games)
  const todaysGamesOnly = consensus.filter(pick => {
    const team = getTeamFromPick(pick);

    // Check if this game already happened
    if (hasGameAlreadyHappened(team, pick.sport)) {
      console.log(`[Consensus] Filtering out ${pick.bet} (${pick.sport}) - game already happened`);
      return false;
    }

    // Check if sport has games today
    if (!hasSportGamesToday(pick.sport)) {
      console.log(`[Consensus] Filtering out ${pick.bet} - ${pick.sport} has no games today`);
      return false;
    }

    return true;
  });

  console.log(`[Consensus] After schedule filter: ${todaysGamesOnly.length} picks (was ${consensus.length})`);

  // STEP 2: Find sports with at least one "fire" pick (3+ cappers)
  const sportsWithFire = new Set<string>();
  for (const pick of todaysGamesOnly) {
    if (pick.isFire) {
      sportsWithFire.add(pick.sport);
    }
  }

  // Filter to only sports with fire picks (indicates real consensus)
  const activeConsensus = todaysGamesOnly.filter(p => sportsWithFire.has(p.sport));

  // Top 6 overall from active sports (sorted by capper count)
  const topOverall = activeConsensus.slice(0, 6);

  // Group by sport - only include sports with fire picks
  const bySport: Record<string, ConsensusPick[]> = {};
  for (const pick of activeConsensus) {
    if (!bySport[pick.sport]) {
      bySport[pick.sport] = [];
    }
    bySport[pick.sport].push(pick);
  }

  // Fade the public - highest consensus (10+ cappers may indicate public bet to fade)
  const fadeThePublic = activeConsensus
    .filter(p => p.capperCount >= 7)
    .slice(0, 5);

  return { topOverall, bySport, fadeThePublic, filteredConsensus: activeConsensus };
}
