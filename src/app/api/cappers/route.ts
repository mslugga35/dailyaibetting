// Cappers API - Leaderboard and individual capper data
// GET /api/cappers?view=leaderboard (default)
// GET /api/cappers?view=profile&slug=dave-price

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { rateLimitGuard, parseIntParam } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

// ============ SUPABASE ============

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('Supabase not configured');
    return null;
  }

  supabase = createClient(url, key);
  return supabase;
}

// ============ TYPES ============

interface Capper {
  id: string;
  name: string;
  slug: string;
  source: string;
  avatar_url?: string;
  total_picks: number;
  wins: number;
  losses: number;
  pushes: number;
  win_rate: number;
  total_units: number;
  roi: number;
  specialties: string[];
  streak: number;
  streak_type: 'W' | 'L' | null;
  created_at: string;
  updated_at: string;
}

interface CapperPick {
  id: string;
  date: string;
  sport: string;
  game: string;
  pick_type: string;
  pick: string;
  odds: string;
  units: number;
  result: string;
}

// ============ HANDLERS ============

/**
 * Leaderboard from hb_capper_stats.
 *
 * NOT `cappers` - that table is a Discord registry (id, name, discord_user_id,
 * sheet_tab_name), holds zero rows, and has no stats columns at all, so
 * `.gt('total_picks', 0)` against it returned
 * "column cappers.total_picks does not exist" and 500'd this endpoint for every
 * visitor. The real per-capper stats live in hb_capper_stats (346 rows).
 *
 * SCALES (verified against live data, do not "helpfully" convert):
 *   win_rate and roi are ALREADY PERCENTAGES - 100 means 100%, 92.59 means
 *   92.59%. The old code did `win_rate * 1000 / 10` on the assumption they were
 *   0-1 fractions, which would render 100% as 10000%.
 *   current_streak is a SIGNED integer: +2 = won last two, -2 = lost last two.
 *   There is no streak_type column; derive it from the sign.
 */
async function getLeaderboard(db: SupabaseClient, sport?: string, limit: number = 20) {
  // Floor out one-pick wonders. Without it the top of the board is parse
  // artifacts like "Why I am betting Bethune -5.5" sitting at 100% off a single
  // graded pick. 231 of 346 cappers clear 10 picks.
  const MIN_PICKS = 10;

  const { data, error } = await db
    .from('hb_capper_stats')
    .select('*')
    .gte('total_picks', MIN_PICKS)
    .order('win_rate', { ascending: false })
    .limit(sport ? 200 : limit); // over-fetch when filtering in memory

  if (error) {
    throw new Error(`Failed to fetch leaderboard: ${error.message}`);
  }

  // sport_records is a JSON object keyed by sport, e.g.
  // {"mlb": "6-13 (31.6%)", "nba": "2-3 (40.0%)"} - so filtering by sport is a
  // key-presence check, not the array `.contains()` the old code used.
  let rows = data || [];
  if (sport) {
    const want = sport.toLowerCase();
    rows = rows
      .filter((c: any) => c.sport_records && Object.keys(c.sport_records).some((s) => s.toLowerCase() === want))
      .slice(0, limit);
  }

  return rows.map((c: any) => {
    const streak = Math.abs(c.current_streak || 0);
    const streakType = c.current_streak > 0 ? 'W' : c.current_streak < 0 ? 'L' : null;
    return {
      ...c,
      id: c.capper_id,
      total_units: c.units_won,
      win_pct: Math.round((c.win_rate ?? 0) * 10) / 10,
      roi_pct: Math.round((c.roi ?? 0) * 10) / 10,
      record: `${c.wins}-${c.losses}${c.pushes > 0 ? `-${c.pushes}` : ''}`,
      streak,
      streak_type: streakType,
      streak_display: streak > 0 && streakType ? `${streak}${streakType}` : '-',
      hot: c.current_streak >= 3,
      cold: c.current_streak <= -3,
    };
  });
}

async function getCapperProfile(db: SupabaseClient, slug: string) {
  // Get capper info
  const { data: capper, error: capperError } = await db
    .from('hb_capper_stats')   // not `cappers` - see getLeaderboard note
    .select('*')
    .eq('slug', slug)
    .single();

  if (capperError || !capper) {
    return null;
  }

  // Get capper's recent picks
  const { data: picks, error: picksError } = await db
    // `picks` is empty and has no capper_id column; hb_picks is the real table
    // (61,748 rows) and its timestamp is posted_at, not date.
    .from('hb_picks')
    .select('*')
    .eq('capper_id', capper.capper_id)
    .order('posted_at', { ascending: false })
    .limit(50);

  // Fail loudly. `picks` and `sportStats` both feed numbers a visitor reads as
  // a track record - recent_form, recent_win_pct, by_sport. A failed query here
  // used to fall through to `|| []` and render an empty form line and 0% as if
  // they were the real answer, which is worse than an error: it is a wrong
  // record presented confidently.
  if (picksError) {
    throw new Error(`Failed to fetch capper picks: ${picksError.message}`);
  }

  // Get performance by sport
  const { data: sportStats, error: sportError } = await db
    .from('hb_picks')
    .select('sport, result')
    .eq('capper_id', capper.capper_id)
    .neq('result', 'pending');

  if (sportError) {
    throw new Error(`Failed to fetch capper sport stats: ${sportError.message}`);
  }

  // Calculate per-sport stats
  const sportPerformance: Record<string, { wins: number; losses: number; pushes: number }> = {};
  (sportStats || []).forEach((pick: any) => {
    if (!sportPerformance[pick.sport]) {
      sportPerformance[pick.sport] = { wins: 0, losses: 0, pushes: 0 };
    }
    if (pick.result === 'win') sportPerformance[pick.sport].wins++;
    else if (pick.result === 'loss') sportPerformance[pick.sport].losses++;
    else if (pick.result === 'push') sportPerformance[pick.sport].pushes++;
  });

  // Format sport stats
  const bySport = Object.entries(sportPerformance).map(([sport, stats]) => {
    const total = stats.wins + stats.losses;
    return {
      sport,
      ...stats,
      total,
      win_pct: total > 0 ? Math.round((stats.wins / total) * 1000) / 10 : 0,
    };
  }).sort((a, b) => b.total - a.total);

  // Calculate recent form (last 10 picks)
  const recentPicks = (picks || []).filter((p: any) => p.result !== 'pending').slice(0, 10);
  const recentWins = recentPicks.filter((p: any) => p.result === 'win').length;
  const recentTotal = recentPicks.length;
  const recentForm = recentPicks.map((p: any) => p.result === 'win' ? 'W' : p.result === 'loss' ? 'L' : 'P').join('');

  return {
    ...capper,
    // Already percentages in hb_capper_stats - do not rescale. See getLeaderboard.
    win_pct: Math.round((capper.win_rate ?? 0) * 10) / 10,
    roi_pct: Math.round((capper.roi ?? 0) * 10) / 10,
    id: capper.capper_id,
    total_units: capper.units_won,
    streak: Math.abs(capper.current_streak || 0),
    streak_type: capper.current_streak > 0 ? 'W' : capper.current_streak < 0 ? 'L' : null,
    record: `${capper.wins}-${capper.losses}${capper.pushes > 0 ? `-${capper.pushes}` : ''}`,
    streak_display: capper.current_streak
      ? `${Math.abs(capper.current_streak)}${capper.current_streak > 0 ? 'W' : 'L'}`
      : '-',
    recent_form: recentForm,
    recent_win_pct: recentTotal > 0 ? Math.round((recentWins / recentTotal) * 1000) / 10 : 0,
    by_sport: bySport,
    recent_picks: (picks || []).slice(0, 20).map((p: any) => ({
      id: p.id,
      // hb_picks stores posted_at / team / line - there is no date|game|pick column
      date: p.posted_at,
      sport: p.sport,
      game: p.opponent ? `${p.team} vs ${p.opponent}` : p.team,
      pick: [p.team, p.line].filter(Boolean).join(' '),
      pick_type: p.pick_type,
      odds: p.odds,
      result: p.result,
    })),
  };
}

async function getTopStreaks(db: SupabaseClient, limit: number = 5) {
  // hb_capper_stats has no streak_type column - a winning streak is simply a
  // positive current_streak. The old query filtered `.eq('streak_type','W')` on
  // the empty `cappers` table, so this rail silently returned [] rather than
  // erroring, and nobody noticed it was always empty.
  const { data, error } = await db
    .from('hb_capper_stats')
    .select('name, slug, current_streak, win_rate, total_picks')
    .gte('total_picks', 10)
    .gt('current_streak', 0)
    .order('current_streak', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[cappers] hot-streaks query failed:', error.message);
    return [];
  }

  return (data || []).map((c: any) => ({
    name: c.name,
    slug: c.slug,
    streak: c.current_streak,
    win_pct: Math.round((c.win_rate ?? 0) * 10) / 10, // already a percentage
  }));
}

// ============ MAIN HANDLER ============

export async function GET(request: NextRequest) {
  try {
    const limited = rateLimitGuard(request);
    if (limited) return limited;

    const db = getSupabase();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured'
      }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'leaderboard';
    const slug = searchParams.get('slug');
    const sport = searchParams.get('sport') || undefined;
    const limit = parseIntParam(searchParams.get('limit'), 20, 1, 100);

    switch (view) {
      case 'leaderboard': {
        const data = await getLeaderboard(db, sport, limit);
        return NextResponse.json({
          success: true,
          data,
          count: data.length,
        });
      }

      case 'profile': {
        if (!slug) {
          return NextResponse.json({
            success: false,
            error: 'Slug parameter required for profile view',
          }, { status: 400 });
        }
        const data = await getCapperProfile(db, slug);
        if (!data) {
          return NextResponse.json({
            success: false,
            error: 'Capper not found',
          }, { status: 404 });
        }
        return NextResponse.json({
          success: true,
          data,
        });
      }

      case 'hot-streaks': {
        const data = await getTopStreaks(db, limit);
        return NextResponse.json({
          success: true,
          data,
        });
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown view: ${view}`,
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Cappers API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
