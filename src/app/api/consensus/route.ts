/**
 * Consensus API Route
 * Aggregates picks from multiple sources, builds consensus, and returns insights
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

    // Get today's ESPN schedule
    const schedule = await getTodaysScheduleSummary();
    logger.debug('Consensus API', 'ESPN Schedule:', schedule);

    // Check if sports have games today (for reclassification)
    const ncaafHasGames = (schedule['NCAAF'] || 0) > 0;
    const ncaabHasGames = (schedule['NCAAB'] || 0) > 0;
    logger.debug('Consensus API', `NCAAF games: ${schedule['NCAAF'] || 0}, NCAAB games: ${schedule['NCAAB'] || 0}`);

    // Fetch all picks from data sources (pre-filtered by date in google-sheets.ts)
    const rawPicks = await getAllPicksFromSources();

    // Debug: Track Seattle/New England picks for sport classification debugging
    const seattlePicks = rawPicks.filter(p => {
      const pickLower = (p.pick || '').toLowerCase();
      const matchupLower = (p.matchup || '').toLowerCase();
      return pickLower.includes('seattle') || pickLower.includes('england') || 
             matchupLower.includes('seattle') || matchupLower.includes('england');
    });
    const debugSeattle = seattlePicks.map(p => ({
      site: p.site,
      league: p.league,
      pick: p.pick,
      matchup: p.matchup,
      service: p.service
    }));
    logger.debug('Consensus API', 'Seattle/England picks from parser:', debugSeattle);

    // Reclassify NCAAF -> NCAAB when football season is over (no NCAAF games)
    // Teams like Florida, Notre Dame, Auburn play both sports
    if (!ncaafHasGames && ncaabHasGames) {
      for (const pick of rawPicks) {
        if (pick.league === 'NCAAF' || pick.league === 'CFB') {
          logger.debug('Consensus API', `Reclassifying ${pick.pick} from NCAAF to NCAAB`);
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
    const { filtered: espnFiltered, rejected: rejectedPicks } = await filterToTodaysGamesAsync(normalizedPicks);
    logger.debug('Consensus API', `ESPN filtered: ${normalizedPicks.length} -> ${espnFiltered.length} picks (${rejectedPicks.length} rejected)`);

    // HOTFIX: Aggressive filter to remove bad picks
    // Filter: NFL picks when 0 games, bad format, known bad patterns
    const nflGames = schedule['NFL'] || 0;
    const todaysPicks = espnFiltered.filter(pick => {
      const teamLower = (pick.team || '').toLowerCase();
      const origPick = (pick.originalPick || '').toLowerCase();
      
      // Always filter picks containing NFL team names (seattle, patriots, etc)
      const nflPatterns = ['seahawks', 'patriots', 'new england', 'seattle', 'buffalo', 'bills', 'hunter henry', 'nfl'];
      if (nflPatterns.some(p => teamLower.includes(p) || origPick.includes(p))) {
        logger.debug('HOTFIX', `Filtering NFL-related: ${pick.team}`);
        return false;
      }
      
      // Filter picks with @ in team name (matchup format like "Team @ Team")
      if (teamLower.includes('@') || teamLower.includes(' vs ')) {
        logger.debug('HOTFIX', `Filtering matchup format: ${pick.team}`);
        return false;
      }
      
      // Filter out picks with bad formatting
      if (pick.team?.includes('(') || (pick.team?.includes(':') && !pick.team?.match(/^\d/))) {
        logger.debug('HOTFIX', `Filtering bad format: ${pick.team}`);
        return false;
      }
      
      return true;
    });
    logger.debug('Consensus API', `After HOTFIX: ${todaysPicks.length} picks (filtered ${espnFiltered.length - todaysPicks.length})`);

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

    // Summary logging
    logger.info('Consensus API', `Raw: ${rawPicks.length}, Today's Picks: ${todaysPicks.length}, Cappers: ${capperCount}, Consensus: ${formatted.filteredConsensus.length}`);

    return NextResponse.json({
      success: true,
      _version: '2026-02-03-v3', // Version check for deployment verification
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
      _debugSeattle: debugSeattle, // Debug: Seattle picks from parser
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
