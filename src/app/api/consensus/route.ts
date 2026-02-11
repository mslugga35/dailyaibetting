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
 *
 * Data flow:
 *   getAllPicksFromSources() → normalizePicks() → ESPN filter → buildConsensus()
 *
 * @module app/api/consensus
 */

import { NextResponse } from 'next/server';
import { getAllPicksFromSources } from '@/lib/data/google-sheets';
import {
  normalizePicks,
  buildConsensus,
  formatConsensusOutput,
  buildInsights,
  NormalizedPick,
} from '@/lib/consensus/consensus-builder';
import { filterToTodaysGamesAsync, getTodaysScheduleSummary } from '@/lib/consensus/game-schedule';
import { logger } from '@/lib/utils/logger';

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

    // --- Step 1: ESPN schedule (for sport reclassification) ---
    const schedule = await getTodaysScheduleSummary();
    const ncaafHasGames = (schedule['NCAAF'] || 0) > 0;
    const ncaabHasGames = (schedule['NCAAB'] || 0) > 0;

    // --- Step 2: Fetch picks from all data sources ---
    const rawPicks = await getAllPicksFromSources();

    // Reclassify NCAAF → NCAAB when football season is over
    if (!ncaafHasGames && ncaabHasGames) {
      for (const pick of rawPicks) {
        if (pick.league === 'NCAAF' || pick.league === 'CFB') {
          pick.league = 'NCAAB';
        }
      }
    }

    // --- Step 3: Normalize and validate ---
    const normalizedPicks = normalizePicks(rawPicks);

    // ESPN filter: remove teams not playing today
    const { filtered: espnFiltered } = await filterToTodaysGamesAsync(normalizedPicks);

    // Cleanup filter: remove malformed picks that slip through ESPN validation
    // (NFL filtering already handled by filterToTodaysGamesAsync in game-schedule.ts)
    const todaysPicks = espnFiltered.filter(pick => {
      const teamLower = (pick.team || '').toLowerCase();

      // Filter malformed team names (matchup format leaked into team field)
      if (teamLower.includes('@') || teamLower.includes(' vs ')) {
        return false;
      }

      // Filter picks with unresolved parentheses or stray colons
      if (pick.team?.includes('(') || (pick.team?.includes(':') && !pick.team?.match(/^\d/))) {
        return false;
      }

      return true;
    });

    // --- Step 4: Build consensus ---
    const rawConsensus = buildConsensus(todaysPicks);
    const formatted = formatConsensusOutput(rawConsensus);

    let consensus = formatted.filteredConsensus;

    // Apply query filters
    if (sport && sport !== 'ALL') {
      consensus = consensus.filter(p => p.sport === sport.toUpperCase());
    }
    consensus = consensus.filter(p => p.capperCount >= minCappers);

    // Group picks by capper for the All Picks view
    const picksByCapper = groupPicksByCapper(todaysPicks);
    const capperCount = Object.keys(picksByCapper).length;

    // Build insights (fire tiers, stacks, contrarian alerts)
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
