import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/api-helpers';
import { adminGuard } from '@/lib/auth/admin';
import { getTodaysScheduleSummary, filterToTodaysGamesAsync } from '@/lib/consensus/game-schedule';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Diagnostic endpoint: cron secret or a server-verified admin only.
  if (!isCronAuthorized(request)) {
    const denied = await adminGuard(request);
    if (denied) return denied;
  }
  try {
    // Get ESPN schedule
    const schedule = await getTodaysScheduleSummary();

    // Test filter with sample picks
    const testPicks = [
      { team: 'Thunder', standardizedTeam: 'Thunder', sport: 'NBA' },
      { team: 'Rockets', standardizedTeam: 'Rockets', sport: 'NBA' },
      { team: 'Lions', standardizedTeam: 'Lions', sport: 'NFL' },
      { team: 'Bulls', standardizedTeam: 'Bulls', sport: 'NBA' },
      { team: 'Celtics', standardizedTeam: 'Celtics', sport: 'NBA' },
      { team: 'New Mexico', standardizedTeam: 'New Mexico', sport: 'NCAAF' },
    ];

    const { filtered, rejected } = await filterToTodaysGamesAsync(testPicks);
    const filteredTeams = filtered.map(p => p.team);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      espnSchedule: schedule,
      testPicks: testPicks.map(p => p.team),
      filteredPicks: filteredTeams,
      removed: testPicks.filter(p => !filteredTeams.includes(p.team)).map(p => p.team),
    });
  } catch (error) {
    const e = error as { message?: string } | null;
    console.error('Debug schedule error:', e?.message || String(error));
    return NextResponse.json({ success: false, error: 'Debug schedule failed' }, { status: 500 });
  }
}
