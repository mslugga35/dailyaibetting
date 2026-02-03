// Consensus Builder - Based on your MASTER_CONSENSUS_RULES
// Follows exact rules from ConsensusProject
// Primary date filtering done in google-sheets.ts
// ESPN API validation available via filterToTodaysGamesAsync

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

  // Step 0: Remove sportsbook names (at PlayMGM, at DraftKings, etc.)
  cleanPick = cleanPick.replace(/\s+at\s+(PlayMGM|DraftKings|FanDuel|BetMGM|Caesars|PointsBet|BetRivers|Barstool|WynnBET|Unibet|bet365|Betway|SugarHouse)/gi, '');

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
    const cleanMatchup = matchup
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
 * Handles whitespace issues ("Dave  Price" vs "Dave Price")
 */
export function normalizeCapper(capper: string): string {
  // Step 1: Normalize whitespace (collapse multiple spaces, trim)
  const normalized = capper.trim().replace(/\s+/g, ' ');

  // Special entities that count as single cappers (expanded list)
  const specialEntities: Record<string, string> = {
    'dimers': 'Dimers',
    'dimers model': 'Dimers',
    'consensus leans': 'Consensus Leans',
    'exclusive': 'Exclusive',
    'exclusive play': 'Exclusive',
    'exclusiveplay': 'Exclusive',
    'ballpark pal': 'Ballpark Pal',
    'ballparkpal': 'Ballpark Pal',
    'lightning bolt': 'Lightning Bolt',
    'sportsline': 'SportsLine',
    'sports line': 'SportsLine',
    'boydsbets': 'BoydsBets',
    'boyds bets': 'BoydsBets',
    'boyd bets': 'BoydsBets',
    'pickswise': 'Pickswise',
    'picks wise': 'Pickswise',
    'wagertalk': 'WagerTalk',
    'wager talk': 'WagerTalk',
    'sportsmemo': 'SportsMemo',
    'sports memo': 'SportsMemo',
    'covers expert': 'Covers Expert',
    'coversexpert': 'Covers Expert',
    'betfirm': 'BetFirm',
    'bet firm': 'BetFirm',
    'pure lock': 'Pure Lock',
    'purelock': 'Pure Lock',
    'matt fargo': 'Matt Fargo',
    'dave price': 'Dave Price',
    'jack jones': 'Jack Jones',
    'chris vasile': 'Chris Vasile',
    'quinn allen': 'Quinn Allen',
  };

  // Check special entities (case insensitive, whitespace normalized)
  const lowerNoSpace = normalized.toLowerCase().replace(/\s+/g, '');
  const lowerWithSpace = normalized.toLowerCase();

  for (const [key, value] of Object.entries(specialEntities)) {
    const keyNoSpace = key.replace(/\s+/g, '');
    // Check both with and without spaces for flexibility
    if (lowerNoSpace.includes(keyNoSpace) || lowerWithSpace.includes(key)) {
      return value;
    }
  }

  // Handle numbered cappers (Capper 1-99)
  const capperNumMatch = normalized.match(/capper\s*(\d+)/i);
  if (capperNumMatch) {
    return `Capper ${capperNumMatch[1]}`;
  }

  // Title case for consistency (prevents "Dave Price" vs "dave price" as different cappers)
  // Handle multi-word names properly
  return normalized
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      // Keep all-caps abbreviations (e.g., "NBA", "ML")
      if (word === word.toUpperCase() && word.length <= 4) return word;
      // Title case otherwise
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
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

  // Get today's date in Eastern timezone (using reliable Intl.DateTimeFormat)
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const todayStr = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`;

  // Parse pick date - handle various formats
  let pickDateClean = pickDate.split('T')[0];
  const currentYear = todayStr.split('-')[0];

  // Handle MM/DD/YYYY or M/D/YYYY format
  const slashMatch = pickDateClean.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3] ? (slashMatch[3].length === 2 ? '20' + slashMatch[3] : slashMatch[3]) : currentYear;
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
      pickDateClean = `${currentYear}-${String(monthNum).padStart(2, '0')}-${day}`;
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

// Sports that we support (have ESPN endpoints for)
export const SUPPORTED_SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'WNBA'];

// Sports to always filter out (tennis, soccer, etc.)
const UNSUPPORTED_SPORTS = ['SOCCER', 'TENNIS', 'ATP', 'WTA', 'UFC', 'MMA', 'GOLF', 'PGA', 'BOXING', 'ESPORTS'];

/**
 * Check if sport is supported (has ESPN endpoint)
 */
export function isSupportedSport(sport: string): boolean {
  const upper = sport.toUpperCase();
  // Filter out explicitly unsupported sports
  if (UNSUPPORTED_SPORTS.includes(upper)) return false;
  // Only allow supported sports
  return SUPPORTED_SPORTS.includes(upper);
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
      return false; // Unknown sports filtered out
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

      // Filter out unsupported sports (soccer, tennis, etc.)
      if (!isSupportedSport(sport)) {
        console.log(`[Consensus] Filtering out unsupported sport: ${sport} - ${pick.pick}`);
        return false;
      }

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
 * Also handles single team + matchup: "Cal" with matchup "Cal vs Hawaii"
 */
function normalizeGameForTotal(team: string, sport: string, matchup?: string): string {
  // First, try to extract both teams from the team field itself
  const teamParts = team.split(/\s*[\/]|(?:\s+(?:vs\.?|@|at)\s+)/i).map(t => t.trim()).filter(Boolean);

  if (teamParts.length >= 2) {
    // Team field has both teams (e.g., "Cal/Hawaii" or "Cal vs Hawaii")
    const standardizedParts = teamParts.map(t => standardizeTeamName(t, sport));
    standardizedParts.sort((a, b) => a.localeCompare(b));
    return standardizedParts.join('/');
  }

  // Single team in team field - try to get opponent from matchup
  if (matchup && matchup.trim()) {
    // Parse matchup for both teams
    const matchupClean = matchup
      .replace(/\s*[ou]\s*\d+[½]?\.?\d*[½]?/gi, '')  // Remove totals
      .replace(/\s*over\s*\d+[½]?\.?\d*[½]?/gi, '')
      .replace(/\s*under\s*\d+[½]?\.?\d*[½]?/gi, '')
      .replace(/\s+[+-]?\d+[½]?\.?\d*[½]?\s*/g, ' ')  // Remove spreads
      .trim();

    const matchupParts = matchupClean.split(/\s*[\/]|(?:\s+(?:vs\.?|@|at)\s+)/i)
      .map(t => t.trim())
      .filter(Boolean);

    if (matchupParts.length >= 2) {
      // Matchup has both teams
      const standardizedParts = matchupParts.map(t => standardizeTeamName(t, sport));
      standardizedParts.sort((a, b) => a.localeCompare(b));
      return standardizedParts.join('/');
    }
  }

  // Single team only - just return standardized name
  // This will at least group "Cal Over 50" picks together
  return standardizeTeamName(team, sport);
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
 * Round spread line for grouping - groups within ±0.5 points
 * NC State +3 and +3.5 become the same group
 * Uses floor for positive, ceil for negative to group .5 with base number
 * +3 and +3.5 → +3, -7 and -7.5 → -7
 */
function roundSpreadLineForGrouping(line: string): string {
  const num = parseFloat(line);
  if (isNaN(num)) return line;
  // Floor positive numbers, ceil negative numbers
  // This groups +3 and +3.5 together, -7 and -7.5 together
  const rounded = num >= 0 ? Math.floor(num) : Math.ceil(num);
  const sign = rounded >= 0 ? '+' : '';
  return `${sign}${rounded}`;
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

    // Round spread lines to group within ±0.5 points (NC State +3 and +3.5 combine)
    if (pick.betType === 'SPREAD' && lineForKey) {
      lineForKey = roundSpreadLineForGrouping(lineForKey);
    }

    if (pick.betType === 'OVER' || pick.betType === 'UNDER') {
      // For totals, normalize game name using both team and matchup fields
      // This handles "Cal Over 50" with matchup "Cal vs Hawaii" -> "California/Hawaii"
      teamForKey = normalizeGameForTotal(pick.standardizedTeam, pick.sport, pick.matchup);
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
 * Primary filtering is done by date in google-sheets.ts
 * ESPN API provides backup validation (async, optional)
 */
export function formatConsensusOutput(consensus: ConsensusPick[]): {
  topOverall: ConsensusPick[];
  bySport: Record<string, ConsensusPick[]>;
  fadeThePublic: ConsensusPick[];
  filteredConsensus: ConsensusPick[]; // All consensus picks (date-filtered by google-sheets.ts)
} {
  // Primary filtering already done by google-sheets.ts date filter
  // All picks passed here should be from today's date
  console.log(`[Consensus] Processing ${consensus.length} picks (pre-filtered by date)`);

  // Include ALL consensus picks (2+ cappers), not just sports with fire picks
  // This ensures NBA/NCAAB with 2-capper consensus still appear
  const activeConsensus = consensus;

  // Top 6 overall (sorted by capper count)
  const topOverall = activeConsensus.slice(0, 6);

  // Group by sport - include ALL sports with consensus picks
  const bySport: Record<string, ConsensusPick[]> = {};
  for (const pick of activeConsensus) {
    if (!bySport[pick.sport]) {
      bySport[pick.sport] = [];
    }
    bySport[pick.sport].push(pick);
  }

  // Fade the public - highest consensus (7+ cappers may indicate public bet to fade)
  const fadeThePublic = activeConsensus
    .filter(p => p.capperCount >= 7)
    .slice(0, 5);

  const activeSports = Object.keys(bySport);
  const fireCount = activeConsensus.filter(p => p.isFire).length;
  console.log(`[Consensus] Active sports: ${activeSports.join(', ')}, Total: ${activeConsensus.length}, Fire: ${fireCount}`);

  return { topOverall, bySport, fadeThePublic, filteredConsensus: activeConsensus };
}

/**
 * Build insights section with additional analysis
 */
export interface ConsensusInsights {
  fireTiers: {
    nuclear: ConsensusPick[];  // 5+ cappers 🔥🔥🔥
    hot: ConsensusPick[];      // 4 cappers 🔥🔥
    warm: ConsensusPick[];     // 3 cappers 🔥
  };
  sameGameStacks: {
    team: string;
    sport: string;
    picks: ConsensusPick[];
    totalCappers: number;
    signal: string; // "BULLISH" or "MIXED"
  }[];
  contrarianAlerts: {
    game: string;
    sport: string;
    heavySide: string;
    heavyPercent: number;
    fadeSide: string;
    warning: string;
  }[];
  sportSummary: {
    sport: string;
    totalPicks: number;
    consensusPicks: number;
    firePicks: number;
  }[];
  mostActive: {  // renamed from hotCappers
    name: string;
    pickCount: number;
    sports: string[];
  }[];
  fadeAlerts: {  // NEW: potential fades on high-consensus picks
    pick: ConsensusPick;
    reason: string;
    fadePlay: string;
  }[];
}

export function buildInsights(
  consensus: ConsensusPick[],
  allPicks: NormalizedPick[]
): ConsensusInsights {
  // 1. Fire Tiers
  const fireTiers = {
    nuclear: consensus.filter(p => p.capperCount >= 5),
    hot: consensus.filter(p => p.capperCount === 4),
    warm: consensus.filter(p => p.capperCount === 3),
  };

  // 2. Same Game Stacks - multiple bet types on same team
  const teamBets = new Map<string, ConsensusPick[]>();
  for (const pick of consensus) {
    // Extract base team name (remove ML, spread, over/under)
    const baseTeam = pick.bet
      .replace(/\s+(ML|Over|Under).*$/i, '')
      .replace(/\s+[+-][\d.]+.*$/, '')
      .trim();
    const key = `${baseTeam}|${pick.sport}`;
    
    if (!teamBets.has(key)) {
      teamBets.set(key, []);
    }
    teamBets.get(key)!.push(pick);
  }

  const sameGameStacks = Array.from(teamBets.entries())
    .filter(([_, picks]) => picks.length >= 2) // Multiple bet types on same team
    .map(([key, picks]) => {
      const [team, sport] = key.split('|');
      const totalCappers = picks.reduce((sum, p) => sum + p.capperCount, 0);
      const hasML = picks.some(p => p.betType === 'ML' || p.betType === 'SPREAD');
      const hasOver = picks.some(p => p.betType === 'OVER');
      const hasUnder = picks.some(p => p.betType === 'UNDER');
      
      let signal = 'MIXED';
      if (hasML && hasOver && !hasUnder) signal = 'BULLISH 📈';
      if (hasML && hasUnder && !hasOver) signal = 'BEARISH 📉';
      
      return { team, sport, picks, totalCappers, signal };
    })
    .sort((a, b) => b.totalCappers - a.totalCappers)
    .slice(0, 5);

  // 3. Contrarian Alerts - when one side is heavily favored
  const gameMap = new Map<string, { team: string; count: number }[]>();
  for (const pick of allPicks) {
    // Group opposing sides
    const game = pick.matchup || pick.team;
    if (!gameMap.has(game)) {
      gameMap.set(game, []);
    }
    const existing = gameMap.get(game)!.find(t => t.team === pick.standardizedTeam);
    if (existing) {
      existing.count++;
    } else {
      gameMap.get(game)!.push({ team: pick.standardizedTeam, count: 1 });
    }
  }

  const contrarianAlerts: ConsensusInsights['contrarianAlerts'] = [];
  for (const [game, sides] of gameMap) {
    if (sides.length >= 2) {
      const total = sides.reduce((sum, s) => sum + s.count, 0);
      const heavySide = sides.sort((a, b) => b.count - a.count)[0];
      const percent = Math.round((heavySide.count / total) * 100);
      
      if (percent >= 75 && total >= 4) {
        const fadeSide = sides.find(s => s.team !== heavySide.team)?.team || 'Other side';
        contrarianAlerts.push({
          game,
          sport: allPicks.find(p => p.matchup === game)?.sport || 'ALL',
          heavySide: heavySide.team,
          heavyPercent: percent,
          fadeSide,
          warning: `⚠️ ${percent}% on ${heavySide.team} - potential trap!`,
        });
      }
    }
  }

  // 4. Sport Summary
  const sportStats = new Map<string, { total: number; consensus: number; fire: number }>();
  for (const pick of allPicks) {
    if (!sportStats.has(pick.sport)) {
      sportStats.set(pick.sport, { total: 0, consensus: 0, fire: 0 });
    }
    sportStats.get(pick.sport)!.total++;
  }
  for (const pick of consensus) {
    if (sportStats.has(pick.sport)) {
      sportStats.get(pick.sport)!.consensus++;
      if (pick.isFire) sportStats.get(pick.sport)!.fire++;
    }
  }

  const sportSummary = Array.from(sportStats.entries())
    .map(([sport, stats]) => ({
      sport,
      totalPicks: stats.total,
      consensusPicks: stats.consensus,
      firePicks: stats.fire,
    }))
    .sort((a, b) => b.consensusPicks - a.consensusPicks);

  // 5. Most Active Cappers (renamed from "Hot" - we don't track performance yet)
  const capperStats = new Map<string, { count: number; sports: Set<string> }>();
  for (const pick of allPicks) {
    if (!capperStats.has(pick.capper)) {
      capperStats.set(pick.capper, { count: 0, sports: new Set() });
    }
    capperStats.get(pick.capper)!.count++;
    capperStats.get(pick.capper)!.sports.add(pick.sport);
  }

  const mostActive = Array.from(capperStats.entries())
    .map(([name, stats]) => ({
      name,
      pickCount: stats.count,
      sports: Array.from(stats.sports),
    }))
    .sort((a, b) => b.pickCount - a.pickCount)
    .slice(0, 6);

  // 6. Fade Alerts - High consensus picks that might be public traps
  // Lower threshold to 4+ cappers and add analysis
  const fadeAlerts: {
    pick: ConsensusPick;
    reason: string;
    fadePlay: string;
  }[] = [];

  for (const pick of consensus) {
    // Flag picks with 4+ cappers as potential public plays
    if (pick.capperCount >= 4) {
      let fadePlay = '';
      let reason = '';
      
      if (pick.betType === 'ML') {
        fadePlay = `Fade ${pick.bet.replace(' ML', '')} / Take opponent`;
        reason = `${pick.capperCount} cappers on ML - heavy public action`;
      } else if (pick.betType === 'SPREAD') {
        const line = pick.line || '';
        const isPlus = line.startsWith('+');
        fadePlay = isPlus 
          ? `Fade the dog - take favorite`
          : `Fade the favorite - take ${pick.bet.split(' ')[0]} opponent`;
        reason = `${pick.capperCount} cappers on spread - potential trap`;
      } else if (pick.betType === 'OVER') {
        fadePlay = `Take the UNDER instead`;
        reason = `${pick.capperCount} cappers on Over - books want Over action`;
      } else if (pick.betType === 'UNDER') {
        fadePlay = `Take the OVER instead`;
        reason = `${pick.capperCount} cappers on Under - contrarian Over`;
      }

      if (fadePlay) {
        fadeAlerts.push({ pick, reason, fadePlay });
      }
    }
  }

  // Sort by capper count (highest = most fadeable)
  fadeAlerts.sort((a, b) => b.pick.capperCount - a.pick.capperCount);

  return {
    fireTiers,
    sameGameStacks,
    contrarianAlerts,
    sportSummary,
    mostActive, // renamed from hotCappers
    fadeAlerts, // NEW: potential fades
  };
}
