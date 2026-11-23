/**
 * DailyAI Picks API Route
 *
 * GET — returns cached report from Supabase (never triggers generation)
 * POST — force-refresh (requires CRON_SECRET auth)
 *
 * Report is generated locally by hb-daily-ai-report PM2 cron (3x/day)
 * because data collection + the model call exceed a request timeout.
 * This route only reads/writes the Supabase cache.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cronAuthGuard, rateLimitGuard } from '@/lib/api-helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getTodayET } from '@/lib/utils/date';
import { getAiReportStatus } from '@/lib/daily-ai-picks/report-status';
import { getLastPublishedReportDate } from '@/lib/daily-ai-picks/last-published';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Read-only: return cached report from Supabase (no generation, no credit burn)
  const limited = rateLimitGuard(request);
  if (limited) return limited;
  try {
    const supabase = await createServerSupabaseClient();
    const today = getTodayET();

    const { data } = await supabase
      .from('daily_ai_report')
      .select('report_text, generated_at, expert_pick_count, mlb_game_count, has_ballparkpal, has_statcast')
      .eq('report_date', today)
      .single();

    if (!data?.report_text) {
      const info = getAiReportStatus(new Date(), false, await getLastPublishedReportDate());
      return NextResponse.json(
        {
          success: false,
          error: info.status === 'pending' ? 'Report not yet published today' : 'Report unavailable today',
          status: info.status,
          reason: info.reason,
          expectedAt: info.expectedAt,
          lastPublishedDate: info.lastPublishedDate ?? null,
          daysSinceLastReport: info.daysSinceLastReport ?? null,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      report: data.report_text,
      generatedAt: data.generated_at,
      stats: {
        expertPicks: data.expert_pick_count,
        mlbGames: data.mlb_game_count,
        hasBallparkPal: data.has_ballparkpal,
        hasStatcast: data.has_statcast,
      },
    });
  } catch (error) {
    console.error('daily-ai-picks:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Request failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Auth required — prevents public credit burn
  const denied = cronAuthGuard(req);
  if (denied) return denied;

  // Dynamic import to avoid loading generation code on every GET
  const { generateFreshReport } = await import('@/lib/daily-ai-picks/generate');

  try {
    const result = await generateFreshReport();
    return NextResponse.json({
      success: true,
      generatedAt: result.generatedAt,
      reportLength: result.report.length,
      stats: result.dataStats,
    });
  } catch (error) {
    console.error('daily-ai-picks:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Request failed' }, { status: 500 });
  }
}
