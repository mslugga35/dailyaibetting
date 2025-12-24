// Daily Bets Builder - Based on user's Daily Bets AI Analysis Instructions
// Different from consensus rules - focuses on analysis and presentation

import { ConsensusPick, NormalizedPick, BetType } from '../consensus/consensus-builder';

// Confidence score weights (per user's template)
// 40% implied probability, 40% expert win rate, 20% statistical support
const CONFIDENCE_WEIGHTS = {
  impliedProbability: 0.40,
  expertWinRate: 0.40,
  statisticalSupport: 0.20,
};

export interface ConfidenceScore {
  overall: number;
  impliedProbability: number;
  expertWinRate: number;
  statisticalSupport: number;
  reasoning: string;
}

export interface DailyBet extends ConsensusPick {
  confidence: ConfidenceScore;
  expectedValue: number;
  frequency: number; // How many times this bet appears
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
  yrfiPicks: ConsensusPick[];
  nrfiPicks: ConsensusPick[];
  pitcherProps: PlayerProp[];
}

export interface BigMoneyParlay {
  legs: ConsensusPick[];
  estimatedOdds: string;
  potentialPayout: string; // On $2 bet
  riskLevel: 'high' | 'very-high' | 'extreme';
}

export interface BestBet {
  pick: ConsensusPick;
  recommendedUnit: number; // In dollars
  expectedReturn: string;
  reasoning: string;
}

export interface LadderPick {
  pick: ConsensusPick;
  startingBankroll: number;
  targetMultiplier: number;
  strategy: string;
}

export interface Trend {
  type: 'hot' | 'cold' | 'interesting';
  title: string;
  description: string;
  relevantPicks: string[];
}

export interface DailyBetsOutput {
  date: string;
  timestamp: string;

  // Main sections
  top5Confidence: DailyBet[];
  top5MostCommon: MostCommonBet[];

  // Parlays
  twoLegParlays: ConsensusPick[][];
  threeLegParlays: ConsensusPick[][];
  playerPropParlays: PlayerProp[][];

  // Best by sport
  bestBySport: Record<string, ConsensusPick>;

  // MLB-specific (when in season)
  mlbAnalysis: MLBAnalysis | null;

  // Big money
  bigMoneyParlays: BigMoneyParlay[];

  // Featured picks
  best20Bet: BestBet | null;
  ladderPick: LadderPick | null;

  // Trends
  trends: Trend[];

  // Stats
  totalPicks: number;
  consensusCount: number;
  activeSports: string[];
}

/**
 * Calculate confidence score for a pick
 * Formula: 40% implied probability + 40% expert win rate + 20% statistical support
 */
export function calculateConfidence(
  pick: ConsensusPick,
  totalCappers: number
): ConfidenceScore {
  // Implied probability from capper agreement
  // More cappers = higher implied probability
  const capperRatio = Math.min(pick.capperCount / 10, 1); // Cap at 10 cappers
  const impliedProbability = 0.3 + (capperRatio * 0.5); // Range: 30% to 80%

  // Expert win rate estimation based on consensus strength
  // Fire picks (3+) suggest higher expert conviction
  let expertWinRate: number;
  if (pick.capperCount >= 10) {
    expertWinRate = 0.75; // Very strong consensus
  } else if (pick.capperCount >= 7) {
    expertWinRate = 0.68; // Strong consensus
  } else if (pick.capperCount >= 5) {
    expertWinRate = 0.62; // Good consensus
  } else if (pick.capperCount >= 3) {
    expertWinRate = 0.55; // Fire level
  } else {
    expertWinRate = 0.48; // Weak consensus
  }

  // Statistical support based on bet type
  // ML bets tend to have higher historical hit rates than spreads
  let statisticalSupport: number;
  switch (pick.betType) {
    case 'ML':
      statisticalSupport = 0.55;
      break;
    case 'SPREAD':
      statisticalSupport = 0.52;
      break;
    case 'OVER':
    case 'UNDER':
      statisticalSupport = 0.50;
      break;
    case 'F5_ML':
      statisticalSupport = 0.53;
      break;
    case 'PROP':
      statisticalSupport = 0.48;
      break;
    default:
      statisticalSupport = 0.50;
  }

  // Calculate overall score
  const overall = (
    impliedProbability * CONFIDENCE_WEIGHTS.impliedProbability +
    expertWinRate * CONFIDENCE_WEIGHTS.expertWinRate +
    statisticalSupport * CONFIDENCE_WEIGHTS.statisticalSupport
  );

  // Generate reasoning
  let reasoning = '';
  if (pick.capperCount >= 7) {
    reasoning = `Very strong consensus with ${pick.capperCount} cappers agreeing. `;
  } else if (pick.capperCount >= 3) {
    reasoning = `Fire pick with ${pick.capperCount} cappers agreeing. `;
  } else {
    reasoning = `Moderate consensus with ${pick.capperCount} cappers. `;
  }

  if (pick.betType === 'ML') {
    reasoning += 'Moneyline bets historically hit more often.';
  } else if (pick.betType === 'SPREAD') {
    reasoning += 'Spread bets require close margin analysis.';
  }

  return {
    overall: Math.round(overall * 100) / 100,
    impliedProbability: Math.round(impliedProbability * 100) / 100,
    expertWinRate: Math.round(expertWinRate * 100) / 100,
    statisticalSupport: Math.round(statisticalSupport * 100) / 100,
    reasoning,
  };
}

/**
 * Calculate expected value for a pick
 * Simplified: (Win probability * potential win) - (Loss probability * stake)
 */
export function calculateExpectedValue(
  confidence: number,
  impliedOdds: number = -110
): number {
  // Convert American odds to decimal
  const decimalOdds = impliedOdds > 0
    ? (impliedOdds / 100) + 1
    : (100 / Math.abs(impliedOdds)) + 1;

  const potentialWin = decimalOdds - 1;
  const ev = (confidence * potentialWin) - ((1 - confidence) * 1);

  return Math.round(ev * 100) / 100;
}

/**
 * Count most common bets (frequency analysis)
 */
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
        bet: pick.originalPick,
        cappers: new Set(),
      });
    }

    const entry = betCounts.get(key)!;
    entry.count++;
    entry.cappers.add(pick.capper);
  }

  // Convert to array and sort by frequency
  return Array.from(betCounts.entries())
    .map(([key, value]) => ({
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
    yrfiPicks,
    nrfiPicks,
    pitcherProps,
  };
}

/**
 * Generate big money parlays (long-shot builds)
 */
export function generateBigMoneyParlays(
  consensus: ConsensusPick[]
): BigMoneyParlay[] {
  const parlays: BigMoneyParlay[] = [];

  // Sort by confidence
  const sorted = [...consensus].sort((a, b) => b.capperCount - a.capperCount);

  // Generate 4-leg parlay (very high risk)
  if (sorted.length >= 4) {
    const legs4 = [];
    for (const pick of sorted) {
      if (legs4.length >= 4) break;
      if (!legs4.some(l => l.matchup === pick.matchup)) {
        legs4.push(pick);
      }
    }

    if (legs4.length >= 4) {
      parlays.push({
        legs: legs4,
        estimatedOdds: '+800 to +1500',
        potentialPayout: '$16 to $30',
        riskLevel: 'very-high',
      });
    }
  }

  // Generate 5-leg parlay (extreme risk)
  if (sorted.length >= 5) {
    const legs5 = [];
    for (const pick of sorted) {
      if (legs5.length >= 5) break;
      if (!legs5.some(l => l.matchup === pick.matchup)) {
        legs5.push(pick);
      }
    }

    if (legs5.length >= 5) {
      parlays.push({
        legs: legs5,
        estimatedOdds: '+1500 to +3000',
        potentialPayout: '$30 to $60',
        riskLevel: 'extreme',
      });
    }
  }

  return parlays;
}

/**
 * Generate best $20 bet recommendation
 */
export function generateBest20Bet(consensus: ConsensusPick[]): BestBet | null {
  if (consensus.length === 0) return null;

  // Get the pick with highest capper count
  const sortedPicks = [...consensus].sort((a, b) => b.capperCount - a.capperCount);
  const topPick = sortedPicks[0];

  if (topPick.capperCount < 3) return null;

  const confidence = calculateConfidence(topPick, sortedPicks.length);
  const expectedReturn = confidence.overall >= 0.6
    ? `$${Math.round(20 * (1 + confidence.overall * 0.5))} - $${Math.round(20 * (1 + confidence.overall))}`
    : `$${Math.round(20 * confidence.overall * 1.5)} - $${Math.round(20 * (1 + confidence.overall * 0.3))}`;

  return {
    pick: topPick,
    recommendedUnit: 20,
    expectedReturn,
    reasoning: `${topPick.capperCount} cappers agree on this pick. ${confidence.reasoning}`,
  };
}

/**
 * Generate ladder pick (daily rollover start)
 */
export function generateLadderPick(consensus: ConsensusPick[]): LadderPick | null {
  // Find a safe starter - moderate odds, good consensus
  const safePicks = consensus
    .filter(p => p.betType === 'ML' && p.capperCount >= 3)
    .sort((a, b) => b.capperCount - a.capperCount);

  if (safePicks.length === 0) return null;

  const pick = safePicks[0];

  return {
    pick,
    startingBankroll: 10,
    targetMultiplier: 2,
    strategy: 'Start with $10, roll winnings to next consensus pick. Target: 2x bankroll.',
  };
}

/**
 * Generate trends and angles
 */
export function generateTrends(
  consensus: ConsensusPick[],
  bySport: Record<string, ConsensusPick[]>
): Trend[] {
  const trends: Trend[] = [];

  // Check for hot sports (lots of consensus)
  const sportCounts = Object.entries(bySport)
    .map(([sport, picks]) => ({ sport, count: picks.length }))
    .sort((a, b) => b.count - a.count);

  if (sportCounts[0]?.count >= 5) {
    trends.push({
      type: 'hot',
      title: `${sportCounts[0].sport} Dominates Today`,
      description: `${sportCounts[0].count} consensus picks in ${sportCounts[0].sport} - cappers are locked in on this sport.`,
      relevantPicks: bySport[sportCounts[0].sport]?.slice(0, 3).map(p => p.bet) || [],
    });
  }

  // Check for super consensus (7+ cappers)
  const superConsensus = consensus.filter(p => p.capperCount >= 7);
  if (superConsensus.length > 0) {
    trends.push({
      type: 'hot',
      title: 'Super Consensus Picks',
      description: `${superConsensus.length} pick(s) with 7+ cappers agreeing. Strong conviction from experts.`,
      relevantPicks: superConsensus.map(p => `${p.bet} (${p.capperCount})`),
    });
  }

  // Check for underdog trends (looking at spread picks)
  const dogPicks = consensus.filter(p =>
    p.betType === 'SPREAD' &&
    p.line &&
    parseFloat(p.line) > 0
  );
  if (dogPicks.length >= 2) {
    trends.push({
      type: 'interesting',
      title: 'Underdog Angle',
      description: `${dogPicks.length} picks on underdogs getting points. Cappers fading favorites today.`,
      relevantPicks: dogPicks.slice(0, 3).map(p => p.bet),
    });
  }

  // Check for totals trends
  const overPicks = consensus.filter(p => p.betType === 'OVER').length;
  const underPicks = consensus.filter(p => p.betType === 'UNDER').length;

  if (overPicks >= 3 && overPicks > underPicks * 1.5) {
    trends.push({
      type: 'hot',
      title: 'Over Trend',
      description: `${overPicks} over picks vs ${underPicks} unders. Cappers expecting high-scoring games.`,
      relevantPicks: consensus.filter(p => p.betType === 'OVER').slice(0, 3).map(p => p.bet),
    });
  } else if (underPicks >= 3 && underPicks > overPicks * 1.5) {
    trends.push({
      type: 'interesting',
      title: 'Under Trend',
      description: `${underPicks} under picks vs ${overPicks} overs. Cappers expecting low-scoring games.`,
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

  // Calculate confidence for all picks
  const totalCappers = new Set(normalizedPicks.map(p => p.capper)).size;

  const dailyBets: DailyBet[] = consensus.map(pick => ({
    ...pick,
    confidence: calculateConfidence(pick, totalCappers),
    expectedValue: calculateExpectedValue(
      calculateConfidence(pick, totalCappers).overall
    ),
    frequency: normalizedPicks.filter(p =>
      p.standardizedTeam === pick.bet.split(' ')[0]
    ).length,
  }));

  // Sort by confidence
  const sortedByConfidence = [...dailyBets].sort(
    (a, b) => b.confidence.overall - a.confidence.overall
  );

  // Top 5 confidence
  const top5Confidence = sortedByConfidence.slice(0, 5);

  // Top 5 most common
  const top5MostCommon = countMostCommon(normalizedPicks).slice(0, 5);

  // Generate parlays
  const firePicks = consensus.filter(p => p.capperCount >= 3);

  // 2-leg parlays (multiple combinations)
  const twoLegParlays: ConsensusPick[][] = [];
  for (let i = 0; i < Math.min(firePicks.length, 3); i++) {
    for (let j = i + 1; j < Math.min(firePicks.length, 4); j++) {
      if (firePicks[i].matchup !== firePicks[j].matchup) {
        twoLegParlays.push([firePicks[i], firePicks[j]]);
      }
    }
  }

  // 3-leg parlays
  const threeLegParlays: ConsensusPick[][] = [];
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
      threeLegParlays.push(legs);
    }
  }

  // Player prop parlays
  const playerProps = extractPlayerProps(normalizedPicks);
  const playerPropParlays: PlayerProp[][] = [];
  if (playerProps.length >= 2) {
    playerPropParlays.push(playerProps.slice(0, 2));
  }

  // Best by sport
  const bestBySport: Record<string, ConsensusPick> = {};
  for (const [sport, picks] of Object.entries(bySport)) {
    if (picks.length > 0) {
      bestBySport[sport] = picks[0]; // Already sorted by capper count
    }
  }

  // MLB analysis
  const mlbAnalysis = generateMLBAnalysis(consensus, normalizedPicks);

  // Big money parlays
  const bigMoneyParlays = generateBigMoneyParlays(consensus);

  // Best $20 bet
  const best20Bet = generateBest20Bet(consensus);

  // Ladder pick
  const ladderPick = generateLadderPick(consensus);

  // Trends
  const trends = generateTrends(consensus, bySport);

  return {
    date: today.toISOString().split('T')[0],
    timestamp: today.toISOString(),

    top5Confidence,
    top5MostCommon,

    twoLegParlays: twoLegParlays.slice(0, 3),
    threeLegParlays: threeLegParlays.slice(0, 2),
    playerPropParlays,

    bestBySport,
    mlbAnalysis,
    bigMoneyParlays,

    best20Bet,
    ladderPick,

    trends,

    totalPicks,
    consensusCount: consensus.length,
    activeSports: Object.keys(bySport),
  };
}
