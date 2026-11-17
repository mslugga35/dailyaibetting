/**
 * Cron: Generate AI Picks
 * Collects all data sources → Claude structured output → saves to ai_picks table.
 * Schedule: Daily at 2 PM UTC (10 AM ET) — before afternoon games.
 *
 * GET /api/cron/ai-picks
 * GET /api/cron/ai-picks?force=true  (regenerate even if already run today)
 */

import { NextResponse } from 'next/server';
import { cronAuthGuard } from '@/lib/api-helpers';
import { generateAIPicks } from '@/lib/ai-picks/engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: Request) {
  const start = Date.now();

  // Auth check: fails closed when CRON_SECRET is unset/blank (paid model call + Discord post).
  const denied = cronAuthGuard(request);
  if (denied) return denied;

  try {
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';

    const result = await generateAIPicks(force);

    if (!result.generated) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: result.skipReason === 'no_expert_picks'
          ? 'Skipped: no expert picks to analyse (no paid call made)'
          : 'Already generated today',
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
