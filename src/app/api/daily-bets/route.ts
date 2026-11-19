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
import { buildDailyBets, limitDailyBetsToFreeTier, DAILY_BETS_FREE_LIMIT } from '@/lib/daily-bets/daily-bets-builder';
import type { BotPick, BotRecord } from '@/lib/daily-bets/daily-bets-builder';
import { filterToTodaysGamesAsync } from '@/lib/consensus/game-schedule';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getTodayAIPicks } from '@/lib/ai-picks/engine';
import { getTodayET } from '@/lib/utils/date';
import { getConsensusSource, fetchHbConsensus, toConsensusPick, toNormalizedPicks } from '@/lib/data/hb-consensus';
import { logger } from '@/lib/utils/logger';
import { rateLimitGuard, isCronAuthorized } from '@/lib/api-helpers';
import { getCurrentUser, isPremium, EntitlementUnavailableError } from '@/lib/auth/subscription';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Entitlement = 'premium' | 'free' | 'unknown';

/**
 * Server-side Pro check (same rule as /api/consensus). An entitlement outage is
 * 'unknown' and is served the free view, never the full list (fail closed).
 */
async function resolveEntitlement(request: Request): Promise<Entitlement> {
  if (isCronAuthorized(request)) return 'premium';
  try {
    const user = await getCurrentUser();
    if (!user) return 'free';
    return (await isPremium(user.id)) ? 'premium' : 'free';
  } catch (err) {
    if (err instanceof EntitlementUnavailableError) return 'unknown';
    throw err;
  }
}

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

// The ai_picks rows carry a `result` column that the AIPick type does not declare.
function readResult(pick: object): string {
  const result = (pick as { result?: unknown }).result;
  return typeof result === 'string' ? result : 'PENDING';
}

async function fetchBotData(): Promise<{ botPicks: BotPick[]; botRecord: BotRecord | null }> {
  try {
    const [aiPicks, supabase] = await Promise.all([
      getTodayAIPicks(),
      createServerSupabaseClient(),
    ]);
    const { data: overall } = await supabase
      .from('ai_picks_overall')
      .select('wins, losses, pushes, pending, win_pct')
      .single();

    // Explicit projections: only the fields declared in DailyBetsOutput (no model confidence)
    const botPicks: BotPick[] = aiPicks.map(p => ({
      sport: p.sport,
      team: p.team,
      opponent: p.opponent,
      bet_type: p.bet_type,
      line: p.line ?? null,
      reasoning: p.reasoning,
      result: readResult(p),
    }));

    const botRecord: BotRecord | null = overall
      ? {
          wins: overall.wins ?? 0,
          losses: overall.losses ?? 0,
          pushes: overall.pushes ?? 0,
          pending: overall.pending ?? 0,
          winPct: overall.win_pct ?? null,
        }
      : null;

    return { botPicks, botRecord };
  } catch {
    return { botPicks: [], botRecord: null };
  }
}

export async function GET(request: Request) {
  try {
    const limited = rateLimitGuard(request);
    if (limited) return limited;
    const entitlement = await resolveEntitlement(request);
    // Fire independent network calls in parallel
    const [aiReportResult, botData] = await Promise.all([fetchAiReport(), fetchBotData()]);

    // One definition of consensus for every page: with CONSENSUS_SOURCE=hb this is the
    // same shared hb_consensus_live set /api/consensus serves (homepage, /consensus,
    // /picks). The local rebuild below is only the legacy/rollback path.
    let todaysPicks: ReturnType<typeof normalizePicks>;
    let formatted: ReturnType<typeof formatConsensusOutput>;
    if (getConsensusSource() === 'hb') {
      const rows = await fetchHbConsensus([getTodayET()], { minCappers: 2 });
      todaysPicks = toNormalizedPicks(rows);
      formatted = formatConsensusOutput(rows.map(toConsensusPick));
    } else {
      const normalizedPicks = normalizePicks(await getAllPicksFromSources());
      // CRITICAL: Filter picks using ESPN API BEFORE building consensus
      ({ filtered: todaysPicks } = await filterToTodaysGamesAsync(normalizedPicks));
      formatted = formatConsensusOutput(buildConsensus(todaysPicks));
    }

    // Build daily bets with enhanced analysis
    const dailyBets = buildDailyBets(
      formatted.filteredConsensus,
      todaysPicks,
      formatted.bySport,
      todaysPicks.length
    );

    const { aiReport, aiReportGeneratedAt } = aiReportResult;

    logger.info('Daily Bets API', `Today's picks: ${todaysPicks.length}, Consensus: ${formatted.filteredConsensus.length}, AI report: ${aiReport ? 'yes' : 'no'}`);

    const full = {
      ...dailyBets,
      aiReport,
      aiReportGeneratedAt,
      botPicks: botData.botPicks,
      botRecord: botData.botRecord,
    };
    const isPro = entitlement === 'premium';
    const output = isPro ? full : limitDailyBetsToFreeTier(full);

    return NextResponse.json(
      {
        success: true,
        ...output,
        entitlement,
        isLimited: !isPro,
        freeTierLimit: DAILY_BETS_FREE_LIMIT,
      },
      // The body depends on who is asking: never let a shared cache store it.
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    logger.error('Daily Bets API', 'Request failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to build daily bets' },
      { status: 500 }
    );
  }
}
