/**
 * Cron: Generate AI Picks
 * Collects all data sources → Claude structured output → saves to ai_picks table.
 * Schedule: Daily at 2 PM UTC (10 AM ET) — before afternoon games.
 *
 * GET /api/cron/ai-picks
 * GET /api/cron/ai-picks?force=true  (regenerate even if already run today)
 */

import { NextResponse } from 'next/server';
import { generateAIPicks } from '@/lib/ai-picks/engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: Request) {
  const start = Date.now();

  // Auth check
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';

    const result = await generateAIPicks(force);

    if (!result.generated) {
      return NextResponse.json({
        success: true,
        message: 'Already generated today',
        pickCount: 0,
        duration: Date.now() - start,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${result.pickCount} AI picks`,
      pickCount: result.pickCount,
      picks: result.picks.map(p => ({
        sport: p.sport,
        team: p.team,
        bet_type: p.bet_type,
        line: p.line,
        confidence: p.confidence,
      })),
      dataStats: result.dataStats,
      duration: Date.now() - start,
    });
  } catch (error) {
    console.error('AI Picks cron error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    }, { status: 500 });
  }
}
