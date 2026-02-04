/**
 * Daily Bets API Route
 * Returns curated daily bet recommendations based on consensus
 * @module app/api/daily-bets
 */

import { NextResponse } from 'next/server';
import { getAllPicksFromSources } from '@/lib/data/google-sheets';
import {
  normalizePicks,
  buildConsensus,
  formatConsensusOutput,
} from '@/lib/consensus/consensus-builder';
import { buildDailyBets } from '@/lib/daily-bets/daily-bets-builder';
import { filterToTodaysGamesAsync } from '@/lib/consensus/game-schedule';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Fetch all picks from data sources (pre-filtered by date)
    const rawPicks = await getAllPicksFromSources();

    // Normalize picks
    const normalizedPicks = normalizePicks(rawPicks);

    // CRITICAL: Filter picks using ESPN API BEFORE building consensus
    const { filtered: todaysPicks } = await filterToTodaysGamesAsync(normalizedPicks);
    logger.debug('Daily Bets API', `ESPN filtered: ${normalizedPicks.length} -> ${todaysPicks.length} picks`);

    // Build consensus from ESPN-filtered picks only
    const consensus = buildConsensus(todaysPicks);

    // Format consensus output
    const formatted = formatConsensusOutput(consensus);

    // Build daily bets with enhanced analysis
    const dailyBets = buildDailyBets(
      formatted.filteredConsensus,
      todaysPicks,
      formatted.bySport,
      todaysPicks.length
    );

    logger.info('Daily Bets API', `Today's picks: ${todaysPicks.length}, Consensus: ${formatted.filteredConsensus.length}`);

    return NextResponse.json({
      success: true,
      ...dailyBets,
    });
  } catch (error) {
    logger.error('Daily Bets API', 'Request failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to build daily bets' },
      { status: 500 }
    );
  }
}
