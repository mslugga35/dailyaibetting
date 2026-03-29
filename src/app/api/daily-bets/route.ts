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
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getTodayET } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchAiReport(): Promise<{ aiReport: string | null; aiReportGeneratedAt: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from('daily_ai_report')
      .select('report_text, generated_at')
      .eq('report_date', getTodayET())
      .single();
    if (data?.report_text) {
      return { aiReport: data.report_text, aiReportGeneratedAt: data.generated_at };
    }
  } catch { /* non-fatal — page works without AI report */ }
  return { aiReport: null, aiReportGeneratedAt: null };
}

async function fetchBotPicks(): Promise<{
  botPicks: Array<{ sport: string; team: string; opponent: string; bet_type: string; line: string | null; confidence: number; reasoning: string; result: string }>;
  botRecord: { wins: number; losses: number; pushes: number; pending: number; winPct: number | null } | null;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    const today = getTodayET();

    const [picksRes, recordRes] = await Promise.all([
      supabase
        .from('ai_picks')
        .select('sport, team, opponent, bet_type, line, confidence, reasoning, result')
        .eq('pick_date', today)
        .order('confidence', { ascending: false }),
      supabase.from('ai_picks_overall').select('*').single(),
    ]);

    return {
      botPicks: (picksRes.data || []) as typeof picksRes.data & Array<{ sport: string; team: string; opponent: string; bet_type: string; line: string | null; confidence: number; reasoning: string; result: string }>,
      botRecord: recordRes.data as { wins: number; losses: number; pushes: number; pending: number; winPct: number | null } | null,
    };
  } catch {
    return { botPicks: [], botRecord: null };
  }
}

export async function GET() {
  try {
    // Fire independent network calls in parallel
    const [rawPicks, aiReportResult, botData] = await Promise.all([
      getAllPicksFromSources(),
      fetchAiReport(),
      fetchBotPicks(),
    ]);

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

    const { aiReport, aiReportGeneratedAt } = aiReportResult;

    logger.info('Daily Bets API', `Today's picks: ${todaysPicks.length}, Consensus: ${formatted.filteredConsensus.length}, AI report: ${aiReport ? 'yes' : 'no'}`);

    return NextResponse.json({
      success: true,
      ...dailyBets,
      aiReport,
      aiReportGeneratedAt,
      botPicks: botData.botPicks,
      botRecord: botData.botRecord,
    });
  } catch (error) {
    logger.error('Daily Bets API', 'Request failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to build daily bets' },
      { status: 500 }
    );
  }
}
