import { NextResponse } from 'next/server';
import { getTodaysScheduleSummary, filterToTodaysGamesAsync } from '@/lib/consensus/game-schedule';

export const dynamic = 'force-dynamic';

export async function GET() {
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
    console.error('Debug schedule error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}
