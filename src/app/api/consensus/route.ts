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
 *   getAllPicksFromSources() → normalizePicks() → ESPN filter → buildConsensus()
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
import { getYesterdayET } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';

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
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const minCappers = parseInt(searchParams.get('minCappers') || '2');
    const dateParam = searchParams.get('date');

    // --- Yesterday's consensus with results ---
    if (dateParam === 'yesterday') {
      return handleYesterday(sport, minCappers);
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

    logger.info('Consensus API', `Raw: ${rawPicks.length}, Filtered: ${todaysPicks.length}, Cappers: ${capperCount}, Consensus: ${consensus.length}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      totalPicks: todaysPicks.length,
      normalizedCount: todaysPicks.length,
      capperCount,
      consensusCount: consensus.length,
      consensus,
      topOverall: formatted.topOverall,
      bySport: formatted.bySport,
      fadeThePublic: formatted.fadeThePublic,
      insights,
      picksByCapper,
      allPicks: todaysPicks,
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
 * Handle yesterday's consensus with W/L results
 */
async function handleYesterday(sport: string | null, minCappers: number) {
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

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      date: yesterdayStr,
      isYesterday: true,
      totalPicks: cleanPicks.length,
      consensusCount: consensus.length,
      consensus: gradedConsensus,
      topOverall: formatted.topOverall.map(pick => ({
        ...pick,
        result: gradeConsensus(pick, scores),
      })),
      bySport: Object.fromEntries(
        Object.entries(formatted.bySport).map(([s, picks]) => [
          s,
          picks.map(pick => ({ ...pick, result: gradeConsensus(pick, scores) })),
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
        'Cache-Control': 'public, max-age=3600',
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
