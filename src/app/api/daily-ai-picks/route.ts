/**
 * DailyAI Picks API Route
 *
 * GET — returns cached report only (never triggers generation, prevents credit burn)
 * POST — force-refresh (requires CRON_SECRET auth)
 *
 * Generation is triggered ONLY by:
 *   1. Vercel cron (GET /api/cron/daily-ai-picks with CRON_SECRET)
 *   2. Server-side page render (page.tsx calls generateDailyReport directly)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Read-only: return cached report from Supabase (no generation, no credit burn)
  try {
    const supabase = await createServerSupabaseClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data } = await supabase
      .from('daily_ai_report')
      .select('report_text, generated_at, expert_pick_count, mlb_game_count, has_ballparkpal, has_statcast')
      .eq('report_date', today)
      .single();

    if (!data?.report_text) {
      return NextResponse.json({ success: false, error: 'No report generated yet today' }, { status: 404 });
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Auth required — prevents public credit burn
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Dynamic import to avoid loading generation code on every GET
  const { generateDailyReport } = await import('@/lib/daily-ai-picks/generate');

  try {
    const result = await generateDailyReport(true);
    return NextResponse.json({
      success: true,
      generatedAt: result.generatedAt,
      reportLength: result.report.length,
      stats: result.dataStats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
