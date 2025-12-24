import { NextResponse } from 'next/server';
import { getAllPicksFromSources } from '@/lib/data/google-sheets';
import {
  normalizePicks,
  buildConsensus,
  formatConsensusOutput,
} from '@/lib/consensus/consensus-builder';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable static generation

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const minCappers = parseInt(searchParams.get('minCappers') || '2');

    // Fetch all picks from data sources
    const rawPicks = await getAllPicksFromSources();

    // Normalize and build consensus
    const normalizedPicks = normalizePicks(rawPicks);
    let consensus = buildConsensus(normalizedPicks);

    // Filter by sport if specified
    if (sport && sport !== 'ALL') {
      consensus = consensus.filter(p => p.sport === sport.toUpperCase());
    }

    // Filter by minimum capper count
    consensus = consensus.filter(p => p.capperCount >= minCappers);

    // Format output
    const formatted = formatConsensusOutput(consensus);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      totalPicks: rawPicks.length,
      consensus: consensus,
      topOverall: formatted.topOverall,
      bySport: formatted.bySport,
      fadeThePublic: formatted.fadeThePublic,
    });
  } catch (error) {
    console.error('Consensus API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to build consensus' },
      { status: 500 }
    );
  }
}
