import { NextResponse } from 'next/server';
import { getAllPicksFromSources } from '@/lib/data/google-sheets';
import {
  normalizePicks,
  buildConsensus,
  formatConsensusOutput,
} from '@/lib/consensus/consensus-builder';
import { buildDailyBets } from '@/lib/daily-bets/daily-bets-builder';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Fetch all picks from data sources
    const rawPicks = await getAllPicksFromSources();

    // Normalize and build consensus
    const normalizedPicks = normalizePicks(rawPicks);
    const consensus = buildConsensus(normalizedPicks);

    // Format consensus output (includes game schedule filtering)
    const formatted = formatConsensusOutput(consensus);

    // Build daily bets with enhanced analysis
    // Use filteredConsensus to only include today's actual games
    const dailyBets = buildDailyBets(
      formatted.filteredConsensus, // Use filtered consensus, not raw
      normalizedPicks,
      formatted.bySport,
      rawPicks.length
    );

    console.log(`[Daily Bets API] Raw: ${rawPicks.length}, Normalized: ${normalizedPicks.length}, Consensus: ${consensus.length}, Filtered: ${formatted.filteredConsensus.length}`);

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
