// Daily Bets Builder - Based on user's Daily Bets AI Analysis Instructions
// Different from consensus rules - focuses on analysis and presentation.
// Every value returned here is derived from the picks themselves (capper agreement
// and counts). No invented win rates, probabilities, odds or payouts.

import { ConsensusPick, NormalizedPick } from '../consensus/consensus-builder';

/**
 * The fields of a consensus pick that the Daily Bets page actually displays.
 * Deliberately excludes the numeric ConsensusPick.confidence field.
 */
export interface DailyBetPick {
  id: string;
  sport: string;
  matchup: string;
  bet: string;
  capperCount: number;
  /** 3+ cappers and not out-voted on the other side of the same game. */
  isFire: boolean;
}

export function toDailyBetPick(pick: ConsensusPick): DailyBetPick {
  return {
    id: pick.id,
    sport: pick.sport,
    matchup: pick.matchup,
    bet: pick.bet,
    capperCount: pick.capperCount,
    isFire: pick.isFire,
  };
}

export interface MostCommonBet {
  bet: string;
  sport: string;
  matchup: string;
  frequency: number;
  capperCount: number;
  isFire: boolean;
}

export interface PlayerProp {
  player: string;
  prop: string;
  line: string;
  sport: string;
  capperCount: number;
  cappers: string[];
}

export interface MLBAnalysis {
  strikeoutProps: PlayerProp[];
  yrfiPicks: DailyBetPick[];
  nrfiPicks: DailyBetPick[];
  pitcherProps: PlayerProp[];
}

export interface BigMoneyParlay {
  legs: DailyBetPick[];
}

export interface LadderPick {
  pick: DailyBetPick;
}

export interface Trend {
  type: 'hot' | 'cold' | 'interesting';
  title: string;
  description: string;
  relevantPicks: string[];
}

export interface BotPick {
  sport: string;
  team: string;
  opponent: string;
  bet_type: string;
  line: string | null;
  reasoning: string;
  result: string;
}

export interface BotRecord {
  wins: number;
  losses: number;
  pushes: number;
  pending: number;
  winPct: number | null;
}

export interface DailyBetsOutput {
  date: string;
  timestamp: string;

  // Main sections (ranked by capper agreement)
  topPicks: DailyBetPick[];
  top5MostCommon: MostCommonBet[];

  // Parlays
  twoLegParlays: DailyBetPick[][];
  threeLegParlays: DailyBetPick[][];
  playerPropParlays: PlayerProp[][];

  // Best by sport
  bestBySport: Record<string, DailyBetPick>;

  // MLB-specific (when in season)
  mlbAnalysis: MLBAnalysis | null;

  // Big money
  bigMoneyParlays: BigMoneyParlay[];

  // Featured picks
  ladderPick: LadderPick | null;

  // Trends
  trends: Trend[];

  // Stats
  totalPicks: number;
  consensusCount: number;
  firePickCount: number; // all of today's consensus picks with 3+ cappers
  activeSports: string[];

  // AI Analysis
  aiReport: string | null;
  aiReportGeneratedAt: string | null;

  // Bot Picks
  botPicks: BotPick[];
  botRecord: BotRecord | null;
}

/**
 * Sort consensus picks by capper agreement, highest first.
 */
function byCapperCountDesc(a: ConsensusPick, b: ConsensusPick): number {
  return b.capperCount - a.capperCount;
}

/**
 * Count most common bets (frequency analysis)
 */
/** "TCU +1.5", "Bruins ML", "Utah Tech/Washington Under 156.5": built from the normalized
 *  pick, not one capper's raw text (which can omit Over/Under or carry book names). */
export function mostCommonLabel(pick: NormalizedPick): string {
  const team = pick.standardizedTeam || pick.team;
  const bt = String(pick.betType || '').toUpperCase();
  if (bt === 'ML' || bt === 'MONEYLINE') return `${team} ML`;
  if (bt === 'OVER' || bt === 'UNDER') return `${team} ${bt === 'OVER' ? 'Over' : 'Under'}${pick.line ? ` ${pick.line}` : ''}`;
  if (bt === 'SPREAD') return `${team}${pick.line ? ` ${/^\d/.test(pick.line) ? '+' : ''}${pick.line}` : ''}`;
  return pick.originalPick || team;
}

export function countMostCommon(normalizedPicks: NormalizedPick[]): MostCommonBet[] {
  const betCounts = new Map<string, {
    count: number;
    sport: string;
    matchup: string;
    bet: string;
    cappers: Set<string>;
  }>();

  for (const pick of normalizedPicks) {
    const key = `${pick.standardizedTeam}_${pick.betType}_${pick.line || ''}`;

    if (!betCounts.has(key)) {
      betCounts.set(key, {
        count: 0,
        sport: pick.sport,
        matchup: pick.matchup,
        bet: mostCommonLabel(pick),
        cappers: new Set(),
      });
    }

    const entry = betCounts.get(key)!;
    entry.count++;
    entry.cappers.add(pick.capper);
  }

  // Convert to array and sort by frequency
  return Array.from(betCounts.entries())
    .map(([, value]) => ({
      bet: value.bet,
      sport: value.sport,
      matchup: value.matchup,
      frequency: value.count,
      capperCount: value.cappers.size,
      isFire: value.cappers.size >= 3,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);
}

/**
 * Extract player props from normalized picks
 */
export function extractPlayerProps(normalizedPicks: NormalizedPick[]): PlayerProp[] {
  const propPicks = normalizedPicks.filter(p => p.betType === 'PROP');

  const propsMap = new Map<string, PlayerProp>();

  for (const pick of propPicks) {
    // Try to extract player name and prop from pick text
    const propMatch = pick.originalPick.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:O|U|Over|Under)?\s*([\d.]+)\s*(K|Ks|strikeouts?|hits?|points?|rebounds?|assists?|yards?)/i);

    if (propMatch) {
      const player = propMatch[1];
      const line = propMatch[2];
      const propType = propMatch[3];
      const key = `${player}_${propType}_${line}`;

      if (!propsMap.has(key)) {
        propsMap.set(key, {
          player,
          prop: propType,
          line,
          sport: pick.sport,
          capperCount: 0,
          cappers: [],
        });
      }

      const prop = propsMap.get(key)!;
      if (!prop.cappers.includes(pick.capper)) {
        prop.cappers.push(pick.capper);
        prop.capperCount++;
      }
    }
  }

  return Array.from(propsMap.values())
    .filter(p => p.capperCount >= 2)
    .sort((a, b) => b.capperCount - a.capperCount);
}

/**
 * Generate MLB-specific analysis
 */
export function generateMLBAnalysis(
  consensus: ConsensusPick[],
  normalizedPicks: NormalizedPick[]
): MLBAnalysis | null {
  const mlbPicks = consensus.filter(p => p.sport === 'MLB');
  const mlbNormalized = normalizedPicks.filter(p => p.sport === 'MLB');

  if (mlbPicks.length === 0) return null;

  // Extract strikeout props
  const strikeoutProps = extractPlayerProps(mlbNormalized).filter(
    p => p.prop.toLowerCase().includes('k') || p.prop.toLowerCase().includes('strikeout')
  );

  // Extract YRFI/NRFI picks
  const yrfiPicks = mlbPicks.filter(p =>
    p.bet.toLowerCase().includes('yrfi') ||
    (p.bet.toLowerCase().includes('yes') && p.bet.toLowerCase().includes('run'))
  );

  const nrfiPicks = mlbPicks.filter(p =>
    p.bet.toLowerCase().includes('nrfi') ||
    (p.bet.toLowerCase().includes('no') && p.bet.toLowerCase().includes('run'))
  );

  // Extract pitcher props
  const pitcherProps = extractPlayerProps(mlbNormalized).filter(
    p => !p.prop.toLowerCase().includes('k') && !p.prop.toLowerCase().includes('strikeout')
  );

  return {
    strikeoutProps,
    yrfiPicks: yrfiPicks.map(toDailyBetPick),
    nrfiPicks: nrfiPicks.map(toDailyBetPick),
    pitcherProps,
  };
}

/**
 * Generate big money parlays (long-shot builds)
 * ONLY generates parlays on exceptional days with strong consensus
 * - Requires 6+ fire picks (3+ cappers each)
 * - Requires at least 2 picks with 5+ cappers
 * - This makes it a special occasion, not an everyday occurrence
 */
export function generateBigMoneyParlays(
  consensus: ConsensusPick[]
): BigMoneyParlay[] {
  const parlays: BigMoneyParlay[] = [];

  // Only show big money parlays on exceptional days
  const firePicks = consensus.filter(p => p.isFire);
  const strongPicks = consensus.filter(p => p.capperCount >= 5);

  // Requirements for big money parlays:
  // - At least 6 fire picks AND
  // - At least 2 strong picks (5+ cappers)
  if (firePicks.length < 6 || strongPicks.length < 2) {
    return []; // Not an exceptional day - no long shots
  }

  // Sort by capper count for best quality legs
  const sorted = [...firePicks].sort(byCapperCountDesc);

  // Generate 4-leg parlay - only from fire picks
  if (sorted.length >= 4) {
    const legs4: ConsensusPick[] = [];
    for (const pick of sorted) {
      if (legs4.length >= 4) break;
      if (!legs4.some(l => l.matchup === pick.matchup)) {
        legs4.push(pick);
      }
    }

    if (legs4.length >= 4) {
      parlays.push({ legs: legs4.map(toDailyBetPick) });
    }
  }

  // Generate 5-leg parlay - requires even more fire picks
  if (sorted.length >= 7) { // Need 7+ fire picks for the 5-leg
    const legs5: ConsensusPick[] = [];
    for (const pick of sorted) {
      if (legs5.length >= 5) break;
      if (!legs5.some(l => l.matchup === pick.matchup)) {
        legs5.push(pick);
      }
    }

    if (legs5.length >= 5) {
      parlays.push({ legs: legs5.map(toDailyBetPick) });
    }
  }

  return parlays;
}

/**
 * Generate ladder pick (daily rollover start): the ML pick with the most capper agreement
 */
export function generateLadderPick(consensus: ConsensusPick[]): LadderPick | null {
  const mlPicks = consensus
    .filter(p => p.betType === 'ML' && p.isFire)
    .sort(byCapperCountDesc);

  if (mlPicks.length === 0) return null;

  return { pick: toDailyBetPick(mlPicks[0]) };
}

/**
 * Generate trends - counts derived from today's consensus picks only
 */
export function generateTrends(
  consensus: ConsensusPick[],
  bySport: Record<string, ConsensusPick[]>
): Trend[] {
  const trends: Trend[] = [];

  // Sport with the most consensus picks
  const sportCounts = Object.entries(bySport)
    .map(([sport, picks]) => ({ sport, count: picks.length }))
    .sort((a, b) => b.count - a.count);

  if (sportCounts[0]?.count >= 5) {
    trends.push({
      type: 'hot',
      title: `${sportCounts[0].sport} Leads Today`,
      description: `${sportCounts[0].count} consensus picks in ${sportCounts[0].sport}, the most of any sport today.`,
      relevantPicks: bySport[sportCounts[0].sport]?.slice(0, 3).map(p => p.bet) || [],
    });
  }

  // Picks with 7+ cappers agreeing
  const superConsensus = consensus.filter(p => p.capperCount >= 7);
  if (superConsensus.length > 0) {
    trends.push({
      type: 'hot',
      title: 'Super Consensus Picks',
      description: `${superConsensus.length} pick(s) with 7+ cappers agreeing.`,
      relevantPicks: superConsensus.map(p => `${p.bet} (${p.capperCount})`),
    });
  }

  // Spread picks on teams getting points
  const dogPicks = consensus.filter(p =>
    p.betType === 'SPREAD' &&
    p.line &&
    parseFloat(p.line) > 0
  );
  if (dogPicks.length >= 2) {
    trends.push({
      type: 'interesting',
      title: 'Underdog Spreads',
      description: `${dogPicks.length} consensus spread picks are on teams getting points.`,
      relevantPicks: dogPicks.slice(0, 3).map(p => p.bet),
    });
  }

  // Totals split
  const overPicks = consensus.filter(p => p.betType === 'OVER').length;
  const underPicks = consensus.filter(p => p.betType === 'UNDER').length;

  if (overPicks >= 3 && overPicks > underPicks * 1.5) {
    trends.push({
      type: 'hot',
      title: 'More Overs Than Unders',
      description: `${overPicks} consensus picks are overs and ${underPicks} are unders.`,
      relevantPicks: consensus.filter(p => p.betType === 'OVER').slice(0, 3).map(p => p.bet),
    });
  } else if (underPicks >= 3 && underPicks > overPicks * 1.5) {
    trends.push({
      type: 'interesting',
      title: 'More Unders Than Overs',
      description: `${underPicks} consensus picks are unders and ${overPicks} are overs.`,
      relevantPicks: consensus.filter(p => p.betType === 'UNDER').slice(0, 3).map(p => p.bet),
    });
  }

  return trends;
}

/**
 * Build complete daily bets output
 */
export function buildDailyBets(
  consensus: ConsensusPick[],
  normalizedPicks: NormalizedPick[],
  bySport: Record<string, ConsensusPick[]>,
  totalPicks: number
): DailyBetsOutput {
  const today = new Date();

  // Rank by capper agreement (highest first)
  const sortedByAgreement = [...consensus].sort(byCapperCountDesc);
  const topPicks = sortedByAgreement.slice(0, 5).map(toDailyBetPick);

  // Top 5 most common
  const top5MostCommon = countMostCommon(normalizedPicks).slice(0, 5);

  // Fire picks: every consensus pick today with 3+ cappers (not just the top five)
  const firePicks = consensus.filter(p => p.isFire);

  // 2-leg parlays (multiple combinations)
  const twoLegParlays: DailyBetPick[][] = [];
  for (let i = 0; i < Math.min(firePicks.length, 3); i++) {
    for (let j = i + 1; j < Math.min(firePicks.length, 4); j++) {
      if (firePicks[i].matchup !== firePicks[j].matchup) {
        twoLegParlays.push([toDailyBetPick(firePicks[i]), toDailyBetPick(firePicks[j])]);
      }
    }
  }

  // 3-leg parlays
  const threeLegParlays: DailyBetPick[][] = [];
  if (firePicks.length >= 3) {
    const usedMatchups = new Set<string>();
    const legs: ConsensusPick[] = [];

    for (const pick of firePicks) {
      if (!usedMatchups.has(pick.matchup) && legs.length < 3) {
        legs.push(pick);
        usedMatchups.add(pick.matchup);
      }
    }

    if (legs.length >= 3) {
      threeLegParlays.push(legs.map(toDailyBetPick));
    }
  }

  // Player prop parlays
  const playerProps = extractPlayerProps(normalizedPicks);
  const playerPropParlays: PlayerProp[][] = [];
  if (playerProps.length >= 2) {
    playerPropParlays.push(playerProps.slice(0, 2));
  }

  // Best by sport
  const bestBySport: Record<string, DailyBetPick> = {};
  for (const [sport, picks] of Object.entries(bySport)) {
    if (picks.length > 0) {
      bestBySport[sport] = toDailyBetPick(picks[0]); // Already sorted by capper count
    }
  }

  // MLB analysis
  const mlbAnalysis = generateMLBAnalysis(consensus, normalizedPicks);

  // Big money parlays
  const bigMoneyParlays = generateBigMoneyParlays(consensus);

  // Ladder pick
  const ladderPick = generateLadderPick(consensus);

  // Trends
  const trends = generateTrends(consensus, bySport);

  return {
    date: today.toISOString().split('T')[0],
    timestamp: today.toISOString(),

    topPicks,
    top5MostCommon,

    twoLegParlays: twoLegParlays.slice(0, 3),
    threeLegParlays: threeLegParlays.slice(0, 2),
    playerPropParlays,

    bestBySport,
    mlbAnalysis,
    bigMoneyParlays,

    ladderPick,

    trends,

    totalPicks,
    consensusCount: consensus.length,
    firePickCount: firePicks.length,
    activeSports: Object.keys(bySport),

    aiReport: null,
    aiReportGeneratedAt: null,

    botPicks: [],
    botRecord: null,
  };
}

/** Picks a non-Pro visitor may see on /daily-bets: the same 5 the free tier gets on /api/consensus. */
export const DAILY_BETS_FREE_LIMIT = 5;

/**
 * Free-tier view of the daily bets. Only the top free picks are revealed; every
 * section that is built from other picks is filtered down to those picks (a parlay
 * or trend is kept only if it reveals nothing beyond them), capper-level player
 * props and MLB analysis are Pro only. The AI write-up is public (/daily-ai-picks). Aggregate counts stay.
 */
export function limitDailyBetsToFreeTier(out: DailyBetsOutput): DailyBetsOutput {
  const free = out.topPicks.slice(0, DAILY_BETS_FREE_LIMIT);
  const ids = new Set(free.map(p => p.id));
  const bets = new Set(free.map(p => p.bet));
  const allFree = (legs: DailyBetPick[]) => legs.length > 0 && legs.every(l => ids.has(l.id));
  const bareBet = (s: string) => s.replace(/\s*\(\d+\)$/, '');
  return {
    ...out,
    topPicks: free,
    top5MostCommon: out.top5MostCommon.filter(b => bets.has(b.bet)),
    twoLegParlays: out.twoLegParlays.filter(allFree),
    threeLegParlays: out.threeLegParlays.filter(allFree),
    playerPropParlays: [],
    bestBySport: Object.fromEntries(Object.entries(out.bestBySport).filter(([, p]) => ids.has(p.id))),
    mlbAnalysis: null,
    bigMoneyParlays: out.bigMoneyParlays.filter(p => allFree(p.legs)),
    ladderPick: out.ladderPick && ids.has(out.ladderPick.pick.id) ? out.ladderPick : null,
    // A trend is kept only if it is about at least one free pick.
    trends: out.trends
      .map(t => ({ ...t, relevantPicks: t.relevantPicks.filter(r => bets.has(bareBet(r))) }))
      .filter(t => t.relevantPicks.length > 0),
    // aiReport stays: the same write-up is published free on /daily-ai-picks.
  };
}
