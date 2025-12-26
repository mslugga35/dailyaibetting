import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build errors
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured - results tracking disabled');
    return null;
  }

  supabase = createClient(supabaseUrl, supabaseKey);
  return supabase;
}

export const dynamic = 'force-dynamic';

// GET - Fetch results and performance stats
export async function GET(request: Request) {
  try {
    const db = getSupabase();

    // Return mock data if Supabase not configured
    if (!db) {
      return NextResponse.json({
        success: true,
        view: 'stats',
        data: {
          allTime: { wins: 0, losses: 0, total: 0, winPct: 0 },
          last30Days: { wins: 0, losses: 0, total: 0, winPct: 0 },
          streak: { type: 'none', count: 0 }
        },
        message: 'Results tracking not yet configured'
      });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'recent'; // recent, daily, monthly, sport
    const sport = searchParams.get('sport');
    const days = parseInt(searchParams.get('days') || '30');

    let data;
    let error;

    switch (view) {
      case 'recent':
        // Recent graded picks
        const query = db
          .from('consensus_results')
          .select('*')
          .neq('result', 'PENDING')
          .order('pick_date', { ascending: false })
          .limit(50);

        if (sport) query.eq('sport', sport);

        ({ data, error } = await query);
        break;

      case 'daily':
        // Daily summary
        ({ data, error } = await db
          .from('daily_results_summary')
          .select('*')
          .limit(days));
        break;

      case 'monthly':
        // Monthly performance
        ({ data, error } = await db
          .from('monthly_performance')
          .select('*')
          .limit(12));
        break;

      case 'sport':
        // By sport breakdown
        ({ data, error } = await db
          .from('fire_picks_performance')
          .select('*'));
        break;

      case 'pending':
        // Pending picks to grade
        ({ data, error } = await db
          .from('consensus_results')
          .select('*')
          .eq('result', 'PENDING')
          .order('pick_date', { ascending: false }));
        break;

      case 'stats':
        // Overall stats for social proof
        const [totalRes, recentRes] = await Promise.all([
          db
            .from('consensus_results')
            .select('result')
            .eq('is_fire', true)
            .neq('result', 'PENDING'),
          db
            .from('consensus_results')
            .select('result')
            .eq('is_fire', true)
            .neq('result', 'PENDING')
            .gte('pick_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        ]);

        const allTime = totalRes.data || [];
        const recent = recentRes.data || [];

        const calcStats = (picks: { result: string }[]) => {
          const wins = picks.filter(p => p.result === 'WIN').length;
          const losses = picks.filter(p => p.result === 'LOSS').length;
          const total = wins + losses;
          return {
            wins,
            losses,
            total,
            winPct: total > 0 ? Math.round((wins / total) * 1000) / 10 : 0
          };
        };

        data = {
          allTime: calcStats(allTime),
          last30Days: calcStats(recent),
          streak: calculateStreak(recent)
        };
        error = totalRes.error || recentRes.error;
        break;

      default:
        return NextResponse.json({ success: false, error: 'Invalid view' }, { status: 400 });
    }

    if (error) throw error;

    return NextResponse.json({
      success: true,
      view,
      data
    });
  } catch (error) {
    console.error('Results API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}

// POST - Save today's top picks or grade a pick
export async function POST(request: Request) {
  try {
    const db = getSupabase();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'save_picks') {
      // Save today's consensus picks
      const { picks } = body;

      if (!picks || !Array.isArray(picks)) {
        return NextResponse.json({ success: false, error: 'Invalid picks array' }, { status: 400 });
      }

      const { data, error } = await db
        .rpc('save_daily_consensus', { p_picks: picks });

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Saved ${data} picks`,
        count: data
      });

    } else if (action === 'grade') {
      // Grade a single pick
      const { id, result, finalScore } = body;

      if (!id || !['WIN', 'LOSS', 'PUSH'].includes(result)) {
        return NextResponse.json({ success: false, error: 'Invalid id or result' }, { status: 400 });
      }

      const { error } = await db
        .from('consensus_results')
        .update({
          result,
          final_score: finalScore || null,
          graded_at: new Date().toISOString(),
          graded_by: 'manual',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Pick graded as ${result}`
      });

    } else if (action === 'bulk_grade') {
      // Grade multiple picks at once
      const { grades } = body; // [{id, result, finalScore}, ...]

      if (!grades || !Array.isArray(grades)) {
        return NextResponse.json({ success: false, error: 'Invalid grades array' }, { status: 400 });
      }

      let graded = 0;
      for (const grade of grades) {
        const { error } = await db
          .from('consensus_results')
          .update({
            result: grade.result,
            final_score: grade.finalScore || null,
            graded_at: new Date().toISOString(),
            graded_by: 'bulk',
            updated_at: new Date().toISOString()
          })
          .eq('id', grade.id);

        if (!error) graded++;
      }

      return NextResponse.json({
        success: true,
        message: `Graded ${graded}/${grades.length} picks`
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Results POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Calculate current winning/losing streak
function calculateStreak(picks: { result: string }[]): { type: string; count: number } {
  if (picks.length === 0) return { type: 'none', count: 0 };

  const sorted = [...picks].sort((a, b) => 0); // Already sorted by date
  let streak = 0;
  const firstResult = sorted[0]?.result;

  if (firstResult !== 'WIN' && firstResult !== 'LOSS') {
    return { type: 'none', count: 0 };
  }

  for (const pick of sorted) {
    if (pick.result === firstResult) {
      streak++;
    } else if (pick.result === 'WIN' || pick.result === 'LOSS') {
      break;
    }
  }

  return {
    type: firstResult === 'WIN' ? 'winning' : 'losing',
    count: streak
  };
}
