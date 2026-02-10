/**
 * Consensus SQL API Route (EXPERIMENTAL)
 *
 * Alternative to /api/consensus — calls Supabase RPC `get_betting_consensus()`
 * for server-side SQL consensus instead of the JS consensus builder.
 *
 * Requires deploying: dailyai-picks-local/sql/consensus-ultra-v3.sql
 * to the Supabase SQL editor. If the RPC function doesn't exist yet,
 * this endpoint will return a 500 error.
 *
 * The primary /api/consensus route uses JS-based consensus and is the
 * production endpoint used by the frontend.
 *
 * @module app/api/consensus-sql
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Create Supabase client for API route
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') || null;
    const minCappers = parseInt(searchParams.get('minCappers') || '2');
    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

    logger.info('Consensus SQL', `Fetching consensus: sport=${sport}, minCappers=${minCappers}, date=${dateParam}`);

    // Call the Supabase RPC function
    const { data: consensus, error } = await supabase.rpc('get_betting_consensus', {
      p_date: dateParam,
      p_sport: sport,
      p_min_cappers: minCappers
    });

    if (error) {
      logger.error('Consensus SQL', 'RPC error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Transform to match existing API format
    const formattedConsensus = (consensus || []).map((pick: any) => ({
      id: pick.bet_key,
      bet: formatBetDisplay(pick),
      sport: pick.sport,
      matchup: pick.team_abbr,
      betType: pick.bet_type,
      line: pick.line?.toString() || null,
      capperCount: pick.capper_count,
      cappers: pick.capper_names || [],
      isFire: pick.is_fire,
      confidence: Math.min(pick.capper_count / 10, 1),
      avgOdds: pick.avg_odds,
      totalUnits: pick.total_units,
    }));

    // Group by sport
    const bySport: Record<string, typeof formattedConsensus> = {};
    for (const pick of formattedConsensus) {
      if (!bySport[pick.sport]) {
        bySport[pick.sport] = [];
      }
      bySport[pick.sport].push(pick);
    }

    // Get fire picks
    const firePicks = formattedConsensus.filter((p: any) => p.isFire);

    logger.info('Consensus SQL', `Found ${formattedConsensus.length} consensus picks, ${firePicks.length} fire`);

    return NextResponse.json({
      success: true,
      source: 'supabase-sql',
      _version: 'sql-v1',
      timestamp: new Date().toISOString(),
      date: dateParam,
      consensusCount: formattedConsensus.length,
      fireCount: firePicks.length,
      consensus: formattedConsensus,
      topOverall: formattedConsensus.slice(0, 6),
      bySport,
      // Insights placeholder - can be expanded
      insights: {
        fireTiers: {
          nuclear: formattedConsensus.filter((p: any) => p.capperCount >= 5),
          hot: formattedConsensus.filter((p: any) => p.capperCount === 4),
          warm: formattedConsensus.filter((p: any) => p.capperCount === 3),
        },
        sportSummary: Object.entries(bySport).map(([sport, picks]) => ({
          sport,
          consensusPicks: picks.length,
          firePicks: picks.filter((p: any) => p.isFire).length,
        })),
      },
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    logger.error('Consensus SQL', 'Request failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch consensus' },
      { status: 500 }
    );
  }
}

/**
 * Format bet display string from SQL result
 */
function formatBetDisplay(pick: any): string {
  const team = pick.team_abbr || 'Unknown';
  
  switch (pick.bet_type) {
    case 'ML':
      return `${team} ML`;
    case 'SPREAD':
    case 'RUN_LINE':
      return `${team} ${pick.line > 0 ? '+' : ''}${pick.line}`;
    case 'OVER':
      return `Over ${pick.line}`;
    case 'UNDER':
      return `Under ${pick.line}`;
    case 'TOTAL':
      return `${pick.direction || 'Total'} ${pick.line}`;
    case 'F5_ML':
      return `${team} F5 ML`;
    case 'F5_SPREAD':
      return `${team} F5 ${pick.line > 0 ? '+' : ''}${pick.line}`;
    case 'TEAM_TOTAL':
      return `${team} TT ${pick.direction} ${pick.line}`;
    case 'PLAYER_PROP':
      return `${pick.player_name || team} ${pick.direction} ${pick.line} ${pick.prop_stat || ''}`;
    case 'NRFI':
      return 'NRFI';
    default:
      return `${team} ${pick.bet_type}`;
  }
}
