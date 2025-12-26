import { NextResponse } from 'next/server';
import { getAllPicksFromSources } from '@/lib/data/google-sheets';
import {
  normalizePicks,
  buildConsensus,
  formatConsensusOutput,
} from '@/lib/consensus/consensus-builder';
import { buildDailyBets } from '@/lib/daily-bets/daily-bets-builder';
import { filterToTodaysGamesAsync } from '@/lib/consensus/game-schedule';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Fetch all picks from data sources (pre-filtered by date)
    const rawPicks = await getAllPicksFromSources();

    // Normalize and build consensus
    const normalizedPicks = normalizePicks(rawPicks);
    const consensus = buildConsensus(normalizedPicks);

    // Format consensus output
    const formatted = formatConsensusOutput(consensus);

    // Filter picks using ESPN API (validates teams are actually playing today)
    const todaysPicks = await filterToTodaysGamesAsync(normalizedPicks);

    // Build daily bets with enhanced analysis
    const dailyBets = buildDailyBets(
      formatted.filteredConsensus,
      todaysPicks,
      formatted.bySport,
      todaysPicks.length
    );

    console.log(`[Daily Bets API] Raw: ${rawPicks.length}, ESPN Filtered: ${todaysPicks.length}, Consensus: ${formatted.filteredConsensus.length}`);

    return NextResponse.json({
      success: true,
      ...dailyBets,
    });
  } catch (error) {
    console.error('Daily Bets API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to build daily bets' },
      { status: 500 }
    );
  }
}
