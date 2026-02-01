// Cappers API - Leaderboard and individual capper data
// GET /api/cappers?view=leaderboard (default)
// GET /api/cappers?view=profile&slug=dave-price

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

async function getLeaderboard(db: SupabaseClient, sport?: string, limit: number = 20) {
  let query = db
    .from('cappers')
    .select('*')
    .gt('total_picks', 0) // Only cappers with graded picks
    .order('win_rate', { ascending: false })
    .limit(limit);

  // Filter by sport specialty if provided
  if (sport) {
    query = query.contains('specialties', [sport.toUpperCase()]);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch leaderboard: ${error.message}`);
  }

  // Calculate additional stats
  const enrichedData = (data || []).map((capper: Capper) => ({
    ...capper,
    win_pct: Math.round(capper.win_rate * 1000) / 10, // 0.599 -> 59.9%
    roi_pct: Math.round(capper.roi * 1000) / 10,
    record: `${capper.wins}-${capper.losses}${capper.pushes > 0 ? `-${capper.pushes}` : ''}`,
    streak_display: capper.streak > 0 && capper.streak_type 
      ? `${capper.streak}${capper.streak_type}` 
      : '-',
    hot: capper.streak >= 3 && capper.streak_type === 'W',
    cold: capper.streak >= 3 && capper.streak_type === 'L',
  }));

  return enrichedData;
}

async function getCapperProfile(db: SupabaseClient, slug: string) {
  // Get capper info
  const { data: capper, error: capperError } = await db
    .from('cappers')
    .select('*')
    .eq('slug', slug)
    .single();

  if (capperError || !capper) {
    return null;
  }

  // Get capper's recent picks
  const { data: picks, error: picksError } = await db
    .from('picks')
    .select('*')
    .eq('capper_id', capper.id)
    .order('date', { ascending: false })
    .limit(50);

  // Get performance by sport
  const { data: sportStats } = await db
    .from('picks')
    .select('sport, result')
    .eq('capper_id', capper.id)
    .neq('result', 'pending');

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
    win_pct: Math.round(capper.win_rate * 1000) / 10,
    roi_pct: Math.round(capper.roi * 1000) / 10,
    record: `${capper.wins}-${capper.losses}${capper.pushes > 0 ? `-${capper.pushes}` : ''}`,
    streak_display: capper.streak > 0 && capper.streak_type 
      ? `${capper.streak}${capper.streak_type}` 
      : '-',
    recent_form: recentForm,
    recent_win_pct: recentTotal > 0 ? Math.round((recentWins / recentTotal) * 1000) / 10 : 0,
    by_sport: bySport,
    recent_picks: (picks || []).slice(0, 20).map((p: any) => ({
      id: p.id,
      date: p.date,
      sport: p.sport,
      game: p.game,
      pick: p.pick,
      pick_type: p.pick_type,
      odds: p.odds,
      result: p.result,
    })),
  };
}

async function getTopStreaks(db: SupabaseClient, limit: number = 5) {
  const { data, error } = await db
    .from('cappers')
    .select('name, slug, streak, streak_type, win_rate')
    .eq('streak_type', 'W')
    .gt('streak', 0)
    .order('streak', { ascending: false })
    .limit(limit);

  if (error) return [];

  return (data || []).map((c: any) => ({
    name: c.name,
    slug: c.slug,
    streak: c.streak,
    win_pct: Math.round(c.win_rate * 1000) / 10,
  }));
}

// ============ MAIN HANDLER ============

export async function GET(request: NextRequest) {
  try {
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
    const limit = parseInt(searchParams.get('limit') || '20');

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
