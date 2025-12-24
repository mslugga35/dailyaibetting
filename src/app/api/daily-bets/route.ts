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

    // Format consensus output
    const formatted = formatConsensusOutput(consensus);

    // Build daily bets with enhanced analysis
    const dailyBets = buildDailyBets(
      consensus,
      normalizedPicks,
      formatted.bySport,
      rawPicks.length
    );

    console.log(`[Daily Bets API] Raw: ${rawPicks.length}, Normalized: ${normalizedPicks.length}, Consensus: ${consensus.length}`);

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
