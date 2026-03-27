/**
 * Cron route for DailyAI Picks — force-refreshes the report.
 * Runs 3x/day via Vercel cron: 10 AM, 2 PM, 6 PM ET.
 *
 * Vercel crons automatically include CRON_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDailyReport } from '@/lib/daily-ai-picks/generate';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  // Vercel crons send authorization header automatically
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await generateDailyReport(true); // force refresh
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
