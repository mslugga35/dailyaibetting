import { NextResponse } from 'next/server';
import { getAllPicksFromSources } from '@/lib/data/google-sheets';
import {
  normalizePicks,
  buildConsensus,
  formatConsensusOutput,
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

    // Fetch all picks from data sources (pre-filtered by date in google-sheets.ts)
    const rawPicks = await getAllPicksFromSources();

    // Normalize and build consensus
    const normalizedPicks = normalizePicks(rawPicks);
    const rawConsensus = buildConsensus(normalizedPicks);

    // Format output
    const formatted = formatConsensusOutput(rawConsensus);

    // Filter picks using ESPN API (validates teams are actually playing today)
    const todaysPicks = await filterToTodaysGamesAsync(normalizedPicks);

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

    // Debug logging
    console.log(`[Consensus API] Raw: ${rawPicks.length}, Today's Picks: ${todaysPicks.length}, Cappers: ${capperCount}, Filtered Consensus: ${formatted.filteredConsensus.length}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      totalPicks: todaysPicks.length, // Today's picks only
      normalizedCount: todaysPicks.length, // Today's picks only
      capperCount: capperCount,
      consensusCount: consensus.length,
      consensus: consensus, // Filtered to today's games only
      topOverall: formatted.topOverall,
      bySport: formatted.bySport,
      fadeThePublic: formatted.fadeThePublic,
      picksByCapper: picksByCapper,
      allPicks: todaysPicks, // Today's picks only
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
