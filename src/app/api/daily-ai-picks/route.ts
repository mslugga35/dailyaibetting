/**
 * DailyAI Picks API Route
 *
 * GET  — returns cached report (or generates fresh if stale)
 * POST — force-refresh the report (requires CRON_SECRET)
 *
 * Report is cached in Supabase for 1 hour. After 1 hour,
 * the next GET request triggers a fresh generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDailyReport } from '@/lib/daily-ai-picks/generate';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 min for Claude API call

export async function GET() {
  try {
    const result = await generateDailyReport();
    return NextResponse.json({
      success: true,
      report: result.report,
      cached: result.cached,
      generatedAt: result.generatedAt,
      stats: result.dataStats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Auth check for manual refresh
  const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await generateDailyReport(true); // force refresh
    return NextResponse.json({
      success: true,
      report: result.report,
      cached: false,
      generatedAt: result.generatedAt,
      stats: result.dataStats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
