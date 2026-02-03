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

// Group picks by capper for the All Picks view
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
export const revalidate = 0; // Disable static generation

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const minCappers = parseInt(searchParams.get('minCappers') || '2');

    // Log today's ESPN schedule
    const schedule = await getTodaysScheduleSummary();
    console.log('[Consensus API] ESPN Schedule:', schedule);

    // Check if sports have games today (for reclassification)
    const ncaafHasGames = (schedule['NCAAF'] || 0) > 0;
    const ncaabHasGames = (schedule['NCAAB'] || 0) > 0;
    console.log(`[Consensus API] NCAAF games: ${schedule['NCAAF'] || 0}, NCAAB games: ${schedule['NCAAB'] || 0}`);

    // Fetch all picks from data sources (pre-filtered by date in google-sheets.ts)
    const rawPicks = await getAllPicksFromSources();

    // Reclassify NCAAF -> NCAAB when football season is over (no NCAAF games)
    // Teams like Florida, Notre Dame, Auburn play both sports
    if (!ncaafHasGames && ncaabHasGames) {
      for (const pick of rawPicks) {
        if (pick.league === 'NCAAF' || pick.league === 'CFB') {
          console.log(`[Consensus API] Reclassifying ${pick.pick} from NCAAF to NCAAB (no football games today)`);
          pick.league = 'NCAAB';
        }
      }
    }

    // Count by source for debugging
    const sourceCount: Record<string, number> = {};
    for (const p of rawPicks) {
      sourceCount[p.site] = (sourceCount[p.site] || 0) + 1;
    }

    // Normalize picks
    const normalizedPicks = normalizePicks(rawPicks);

    // CRITICAL: Filter picks using ESPN API BEFORE building consensus
    // This ensures only teams actually playing today are included
    const { filtered: todaysPicks, rejected: rejectedPicks } = await filterToTodaysGamesAsync(normalizedPicks);
    console.log(`[Consensus API] ESPN filtered: ${normalizedPicks.length} -> ${todaysPicks.length} picks (${rejectedPicks.length} rejected)`);

    // Build consensus from ESPN-filtered picks only
    const rawConsensus = buildConsensus(todaysPicks);

    // Format output
    const formatted = formatConsensusOutput(rawConsensus);

    // Use filtered consensus
    let consensus = formatted.filteredConsensus;

    // Filter by sport if specified
    if (sport && sport !== 'ALL') {
      consensus = consensus.filter(p => p.sport === sport.toUpperCase());
    }

    // Filter by minimum capper count
    consensus = consensus.filter(p => p.capperCount >= minCappers);

    // Group picks by capper for All Picks view (today's games only)
    const picksByCapper = groupPicksByCapper(todaysPicks);
    const capperCount = Object.keys(picksByCapper).length;

    // Build insights section
    const insights = buildInsights(rawConsensus, todaysPicks);

    // Debug logging
    console.log(`[Consensus API] Raw: ${rawPicks.length}, Today's Picks: ${todaysPicks.length}, Cappers: ${capperCount}, Filtered Consensus: ${formatted.filteredConsensus.length}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      totalPicks: todaysPicks.length,
      normalizedCount: todaysPicks.length,
      capperCount: capperCount,
      consensusCount: consensus.length,
      consensus: consensus,
      topOverall: formatted.topOverall,
      bySport: formatted.bySport,
      fadeThePublic: formatted.fadeThePublic,
      insights: insights, // NEW: Fire tiers, stacks, contrarian alerts
      picksByCapper: picksByCapper,
      allPicks: todaysPicks,
      _sourceCount: sourceCount, // Debug: picks by source
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Consensus API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to build consensus' },
      { status: 500 }
    );
  }
}
