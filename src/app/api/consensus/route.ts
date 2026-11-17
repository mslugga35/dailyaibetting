/**
 * Consensus API Route
 *
 * Aggregates picks from Google Sheets, Google Doc, and Supabase (hb_picks),
 * normalizes them, validates against ESPN schedule, builds consensus, and
 * returns structured insights.
 *
 * Query params:
 *   ?sport=NBA        - Filter consensus by sport
 *   ?minCappers=2     - Minimum capper agreement (default: 2)
 *   ?date=yesterday   - Get yesterday's consensus with W/L results
 *
 * Data flow:
 *   CONSENSUS_SOURCE=hb (shared): hb_consensus_live (written by HiddenBag's one
 *     consensus writer) → fetchHbConsensus() → ConsensusPick. DailyAI computes
 *     nothing; results come from the shared record. Gating below is unchanged.
 *   CONSENSUS_SOURCE=legacy (default until the flip; rollback path):
 *     getAllPicksFromSources() → normalizePicks() → ESPN filter → buildConsensus()
 *
 * @module app/api/consensus
 */

import { NextResponse } from 'next/server';
import { getAllPicksFromSources, getAllYesterdayPicksFromSources } from '@/lib/data/google-sheets';
import {
  normalizePicks,
  normalizePicksNoDateFilter,
  buildConsensus,
  formatConsensusOutput,
  buildInsights,
  NormalizedPick,
} from '@/lib/consensus/consensus-builder';
import { filterToTodaysGamesAsync, getTodaysScheduleSummary } from '@/lib/consensus/game-schedule';
import { getYesterdaysScores, gradeConsensus } from '@/lib/data/espn-scores';
import { getTodayET, getYesterdayET } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import { getCurrentUser, isPremium, EntitlementUnavailableError } from '@/lib/auth/subscription';
import { rateLimitGuard, parseIntParam, isCronAuthorized } from '@/lib/api-helpers';
import {
  getConsensusSource,
  fetchHbConsensus,
  toConsensusPick,
  toNormalizedPicks,
  toLetterResult,
} from '@/lib/data/hb-consensus';

const FREE_TIER_LIMIT = 5;

type Entitlement = 'premium' | 'free' | 'unknown';

/**
 * The ONE set of picks the free tier may see: today's (or yesterday's) overall top
 * FREE_TIER_LIMIT, chosen before any ?sport= / ?minCappers= filter. Every list in a
 * free response is intersected with it, so no combination of query params or
 * per-sport lists reveals more than FREE_TIER_LIMIT distinct picks.
 */
function freePickIds(all: Array<{ id: string }>): Set<string> {
  return new Set(all.slice(0, FREE_TIER_LIMIT).map(p => p.id));
}

/** Remove malformed picks (matchup-style text, parentheticals, etc.) */
function filterMalformedPicks(picks: NormalizedPick[]): NormalizedPick[] {
  return picks.filter(pick => {
    const teamLower = (pick.team || '').toLowerCase();
    if (teamLower.includes('@') || teamLower.includes(' vs ')) return false;
    if (pick.team?.includes('(') || (pick.team?.includes(':') && !pick.team?.match(/^\d/))) return false;
    return true;
  });
}

/** Group picks by capper name for the All Picks view. */
function groupPicksByCapper(picks: NormalizedPick[]): Record<string, NormalizedPick[]> {
  const grouped: Record<string, NormalizedPick[]> = {};
  for (const pick of picks) {
    if (!grouped[pick.capper]) {
      grouped[pick.capper] = [];
    }
    grouped[pick.capper].push(pick);
  }
  return grouped;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const limited = rateLimitGuard(request);
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const minCappers = parseIntParam(searchParams.get('minCappers'), 2, 1, 100);
    const dateParam = searchParams.get('date');

    // Determine subscription tier.
    // Internal bypass: the grade-and-persist cron passes Bearer CRON_SECRET to get
    // the FULL (unsliced) consensus so it can snapshot every fire pick.
    const isInternal = isCronAuthorized(request);
    // 'unknown' = the user or their subscription could not be read. It is served the
    // free slice (never the full list) and is labelled, so the client can say so
    // instead of silently presenting a paying subscriber as free.
    let entitlement: Entitlement = isInternal ? 'premium' : 'free';
    if (!isInternal) {
      try {
        const user = await getCurrentUser();
        if (user) entitlement = (await isPremium(user.id)) ? 'premium' : 'free';
      } catch (err) {
        if (!(err instanceof EntitlementUnavailableError)) throw err;
        entitlement = 'unknown';
      }
    }
    const userIsPremium = entitlement === 'premium';

    // --- Shared consensus (one writer on HiddenBag, identical on both sites) ---
    if (getConsensusSource() === 'hb') {
      // `await` so a read failure lands in the catch below (500), never a fallback.
      return dateParam === 'yesterday'
        ? await handleHbYesterday(sport, minCappers, userIsPremium, entitlement)
        : await handleHbToday(sport, minCappers, userIsPremium, entitlement);
    }

    // --- Yesterday's consensus with results ---
    if (dateParam === 'yesterday') {
      return handleYesterday(sport, minCappers, userIsPremium, entitlement);
    }

    // --- Today's consensus (default) ---
    // Step 1: ESPN schedule (for sport reclassification)
    const schedule = await getTodaysScheduleSummary();
    const ncaafHasGames = (schedule['NCAAF'] || 0) > 0;
    const ncaabHasGames = (schedule['NCAAB'] || 0) > 0;

    // Step 2: Fetch picks from all data sources
    const rawPicks = await getAllPicksFromSources();

    // Reclassify NCAAF → NCAAB when football season is over
    if (!ncaafHasGames && ncaabHasGames) {
      for (const pick of rawPicks) {
        if (pick.league === 'NCAAF' || pick.league === 'CFB') {
          pick.league = 'NCAAB';
        }
      }
    }

    // Step 3: Normalize and validate
    const normalizedPicks = normalizePicks(rawPicks);

    // ESPN filter: remove teams not playing today
    const { filtered: espnFiltered } = await filterToTodaysGamesAsync(normalizedPicks);

    const todaysPicks = filterMalformedPicks(espnFiltered);

    // Step 4: Build consensus
    const rawConsensus = buildConsensus(todaysPicks);
    const formatted = formatConsensusOutput(rawConsensus);

    let consensus = formatted.filteredConsensus;
    if (sport && sport !== 'ALL') {
      consensus = consensus.filter(p => p.sport === sport.toUpperCase());
    }
    consensus = consensus.filter(p => p.capperCount >= minCappers);

    const picksByCapper = groupPicksByCapper(todaysPicks);
    const capperCount = Object.keys(picksByCapper).length;
    const insights = buildInsights(rawConsensus, todaysPicks);

    logger.info('Consensus API', `Raw: ${rawPicks.length}, Filtered: ${todaysPicks.length}, Cappers: ${capperCount}, Consensus: ${consensus.length}, Premium: ${userIsPremium}`);

    // Free tier: cap results and hide detailed capper data
    const freeIds = freePickIds(formatted.filteredConsensus);
    const isFree = (p: { id: string }) => freeIds.has(p.id);
    const responseConsensus = userIsPremium ? consensus : consensus.filter(isFree);
    const responseTopOverall = userIsPremium ? formatted.topOverall : formatted.topOverall.filter(isFree);
    const responseBySport = userIsPremium ? formatted.bySport : Object.fromEntries(
      Object.entries(formatted.bySport).map(([s, picks]) => [s, picks.filter(isFree)])
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      date: getTodayET(),
      totalPicks: todaysPicks.length,
      normalizedCount: todaysPicks.length,
      capperCount,
      consensusCount: consensus.length,
      // Aggregate count only (no pick details), so the free tier can show the true number.
      firePickCount: consensus.filter(p => p.capperCount >= 3).length,
      consensus: responseConsensus,
      topOverall: responseTopOverall,
      bySport: responseBySport,
      fadeThePublic: userIsPremium ? formatted.fadeThePublic : [],
      insights: userIsPremium ? insights : {},
      picksByCapper: userIsPremium ? picksByCapper : {},
      allPicks: userIsPremium ? todaysPicks : [],
      // Tier metadata for the frontend to show upgrade prompts
      tier: userIsPremium ? 'premium' : 'free',
      entitlement,
      freeTierLimit: FREE_TIER_LIMIT,
      totalConsensusCount: consensus.length,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    logger.error('Consensus API', 'Request failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to build consensus' },
      { status: 500 }
    );
  }
}

/**
 * Today's SHARED consensus. Same response shape and the same free-tier rule as the
 * legacy path: the free slice is the overall top FREE_TIER_LIMIT chosen before any
 * sport / minCappers filter, and every list is intersected with it.
 */
async function handleHbToday(sport: string | null, minCappers: number, userIsPremium: boolean, entitlement: Entitlement) {
  const today = getTodayET();
  const rows = await fetchHbConsensus([today], { minCappers: 2 });
  const all = rows.map(toConsensusPick);
  const formatted = formatConsensusOutput(all);
  const filtered = rows.filter((r) => r.capper_count >= minCappers && (!sport || sport.toUpperCase() === 'ALL' || r.sport === sport.toLowerCase()));
  const consensus = filtered.map(toConsensusPick);
  const allPicks = toNormalizedPicks(rows);
  const picksByCapper = groupPicksByCapper(allPicks);
  const insights = buildInsights(all, allPicks);

  const freeIds = freePickIds(formatted.filteredConsensus);
  const isFree = (p: { id: string }) => freeIds.has(p.id);
  return NextResponse.json({
    success: true,
    source: 'hb',
    timestamp: new Date().toISOString(),
    date: today,
    totalPicks: allPicks.length,
    normalizedCount: allPicks.length,
    capperCount: Object.keys(picksByCapper).length,
    consensusCount: consensus.length,
    firePickCount: consensus.filter((p) => p.capperCount >= 3).length,
    consensus: userIsPremium ? consensus : consensus.filter(isFree),
    topOverall: userIsPremium ? formatted.topOverall : formatted.topOverall.filter(isFree),
    bySport: userIsPremium ? formatted.bySport : Object.fromEntries(
      Object.entries(formatted.bySport).map(([s, picks]) => [s, picks.filter(isFree)])
    ),
    fadeThePublic: userIsPremium ? formatted.fadeThePublic : [],
    insights: userIsPremium ? insights : {},
    picksByCapper: userIsPremium ? picksByCapper : {},
    allPicks: userIsPremium ? allPicks : [],
    tier: userIsPremium ? 'premium' : 'free',
    entitlement,
    freeTierLimit: FREE_TIER_LIMIT,
    totalConsensusCount: consensus.length,
  }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

/**
 * Yesterday's SHARED consensus with results from the shared record (graded by the
 * HiddenBag writer from final scores). No ESPN call, no local grading.
 */
async function handleHbYesterday(sport: string | null, minCappers: number, userIsPremium: boolean, entitlement: Entitlement) {
  const yesterday = getYesterdayET();
  const rows = await fetchHbConsensus([yesterday], { minCappers: 2 });
  const resultOf = new Map(rows.map((r) => [r.group_key, toLetterResult(r.result)]));
  const all = rows.map(toConsensusPick);
  const formatted = formatConsensusOutput(all);
  const gradedConsensus = rows
    .filter((r) => r.capper_count >= minCappers && (!sport || sport.toUpperCase() === 'ALL' || r.sport === sport.toLowerCase()))
    .map((r) => ({ ...toConsensusPick(r), result: toLetterResult(r.result) }));

  const graded = gradedConsensus.filter((p) => p.result !== null);
  const wins = graded.filter((p) => p.result === 'W').length;
  const losses = graded.filter((p) => p.result === 'L').length;
  const pushes = graded.filter((p) => p.result === 'P').length;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const fireGraded = graded.filter((p) => p.capperCount >= 3);
  const fireWins = fireGraded.filter((p) => p.result === 'W').length;
  const fireLosses = fireGraded.filter((p) => p.result === 'L').length;
  const fireWinRate = fireWins + fireLosses > 0 ? Math.round((fireWins / (fireWins + fireLosses)) * 100) : 0;

  const freeIds = freePickIds(formatted.filteredConsensus);
  const isFree = (p: { id: string }) => userIsPremium || freeIds.has(p.id);
  const withResult = <T extends { id: string }>(p: T) => ({ ...p, result: resultOf.get(p.id) ?? null });

  return NextResponse.json({
    success: true,
    source: 'hb',
    timestamp: new Date().toISOString(),
    date: yesterday,
    isYesterday: true,
    entitlement,
    totalPicks: toNormalizedPicks(rows).length,
    consensusCount: gradedConsensus.length,
    consensus: gradedConsensus.filter(isFree),
    topOverall: formatted.topOverall.filter(isFree).map(withResult),
    bySport: Object.fromEntries(
      Object.entries(formatted.bySport).map(([s, picks]) => [s, picks.filter(isFree).map(withResult)])
    ),
    stats: {
      wins, losses, pushes, winRate, totalGraded: graded.length,
      fireWins, fireLosses, fireWinRate, fireTotal: fireGraded.length,
      gamesWithScores: new Set(rows.filter((r) => r.final_score).map((r) => r.game_id)).size,
    },
  }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

/**
 * Handle yesterday's consensus with W/L results
 */
async function handleYesterday(sport: string | null, minCappers: number, userIsPremium: boolean = false, entitlement: Entitlement = 'free') {
  try {
    const [rawPicks, scores] = await Promise.all([
      getAllYesterdayPicksFromSources(),
      getYesterdaysScores(),
    ]);

    logger.info('Consensus API', `Yesterday: ${rawPicks.length} raw picks, ${scores.length} completed games`);

    // Normalize without date filter (already filtered at fetch level)
    const normalizedPicks = normalizePicksNoDateFilter(rawPicks);

    const cleanPicks = filterMalformedPicks(normalizedPicks);

    // Build consensus
    const rawConsensus = buildConsensus(cleanPicks);
    const formatted = formatConsensusOutput(rawConsensus);

    let consensus = formatted.filteredConsensus;
    if (sport && sport !== 'ALL') {
      consensus = consensus.filter(p => p.sport === sport.toUpperCase());
    }
    consensus = consensus.filter(p => p.capperCount >= minCappers);

    // Grade each consensus pick against ESPN scores
    const gradedConsensus = consensus.map(pick => {
      const result = gradeConsensus(pick, scores);
      return { ...pick, result };
    });

    // Calculate stats
    const graded = gradedConsensus.filter(p => p.result !== null);
    const wins = graded.filter(p => p.result === 'W').length;
    const losses = graded.filter(p => p.result === 'L').length;
    const pushes = graded.filter(p => p.result === 'P').length;
    const winRate = graded.length > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

    // Fire picks stats
    const fireGraded = gradedConsensus.filter(p => p.result !== null && p.capperCount >= 3);
    const fireWins = fireGraded.filter(p => p.result === 'W').length;
    const fireLosses = fireGraded.filter(p => p.result === 'L').length;
    const fireWinRate = fireGraded.length > 0 ? Math.round((fireWins / (fireWins + fireLosses)) * 100) : 0;

    const yesterdayStr = getYesterdayET();
    const freeIds = freePickIds(formatted.filteredConsensus);
    const isFree = (p: { id: string }) => userIsPremium || freeIds.has(p.id);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      date: yesterdayStr,
      isYesterday: true,
      entitlement,
      totalPicks: cleanPicks.length,
      consensusCount: consensus.length,
      consensus: gradedConsensus.filter(isFree),
      topOverall: formatted.topOverall.filter(isFree).map(pick => ({
        ...pick,
        result: gradeConsensus(pick, scores),
      })),
      // Free tier: every list is limited to the same overall top picks (S3b).
      bySport: Object.fromEntries(
        Object.entries(formatted.bySport).map(([s, picks]) => [
          s,
          picks.filter(isFree).map(pick => ({ ...pick, result: gradeConsensus(pick, scores) })),
        ])
      ),
      stats: {
        wins,
        losses,
        pushes,
        winRate,
        totalGraded: graded.length,
        fireWins,
        fireLosses,
        fireWinRate,
        fireTotal: fireGraded.length,
        gamesWithScores: scores.length,
      },
    }, {
      headers: {
        // The body depends on the caller's tier: never let a shared cache store it (S6).
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    logger.error('Consensus API', 'Yesterday request failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to build yesterday consensus' },
      { status: 500 }
    );
  }
}
