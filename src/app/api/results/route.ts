import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { rateLimitGuard, parseIntParam, cronAuthGuard, isCronAuthorized, resolveUser } from '@/lib/api-helpers';
import { isPremium, EntitlementUnavailableError } from '@/lib/auth/subscription';
import { isAdminUser } from '@/lib/auth/admin';
import { recordTable } from '@/lib/data/record-source';
import { getConsensusSource } from '@/lib/data/hb-consensus';

// Lazy initialization to avoid build errors
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // The shared record (hb_consensus_record) is service-role only: never fall back to
  // the anon key for it (that would only turn a config error into a confusing 500).
  const supabaseKey = getConsensusSource() === 'hb'
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured - results tracking disabled');
    return null;
  }

  supabase = createClient(supabaseUrl, supabaseKey);
  return supabase;
}

import { windowStartET } from '@/lib/utils/date';
export const dynamic = 'force-dynamic';

/** PostgREST caps an unpaginated select at 1000 rows; page past it (bounded). */
const PAGE = 1000;
const MAX_WINDOW_ROWS = 10_000;

/** "Last N days" = N ET calendar dates including today (pick_date is an ET date). */
function daysAgoISO(days: number): string {
  return windowStartET(days);
}

/** Exact WIN/LOSS counts in SQL (count, no rows transferred), so the record is never truncated (M4). */
async function countRecord(db: SupabaseClient, sinceDate: string | null) {
  const count = async (result: 'WIN' | 'LOSS') => {
    let q = db
      .from(recordTable())
      .select('id', { count: 'exact', head: true })
      .eq('is_fire', true)
      .eq('result', result);
    if (sinceDate) q = q.gte('pick_date', sinceDate);
    const { count: n, error } = await q;
    if (error) throw error;
    return n ?? 0;
  };
  const [wins, losses] = await Promise.all([count('WIN'), count('LOSS')]);
  const total = wins + losses;
  return { wins, losses, total, winPct: total > 0 ? Math.round((wins / total) * 1000) / 10 : 0 };
}

// GET - Fetch results and performance stats
export async function GET(request: Request) {
  try {
    const limited = rateLimitGuard(request);
    if (limited) return limited;

    const db = getSupabase();

    // Shared-record mode without the service key is a misconfiguration, not "no data yet".
    if (!db && getConsensusSource() === 'hb') {
      return NextResponse.json({ success: false, error: 'Results temporarily unavailable' }, { status: 503 });
    }

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
    const days = parseIntParam(searchParams.get('days'), 30, 1, 365);

    let data;
    let error;

    switch (view) {
      case 'recent': {
        // Recent graded picks, newest first. With ?days=N: EVERY graded pick in that
        // window (paged past PostgREST's 1000-row cap, bounded), not the first 50 (M5).
        const windowed = searchParams.has('days');
        if (!windowed) {
          let query = db
            .from(recordTable())
            .select('*')
            .eq('is_fire', true)
            .neq('result', 'PENDING')
            .order('pick_date', { ascending: false })
            .limit(50);
          if (sport) query = query.eq('sport', sport);
          ({ data, error } = await query);
          break;
        }
        const rows: unknown[] = [];
        for (let from = 0; from < MAX_WINDOW_ROWS; from += PAGE) {
          let page = db
            .from(recordTable())
            .select('*')
            .eq('is_fire', true)
            .neq('result', 'PENDING')
            .gte('pick_date', daysAgoISO(days))
            .order('pick_date', { ascending: false })
            .order('id', { ascending: false })
            .range(from, from + PAGE - 1);
          if (sport) page = page.eq('sport', sport);
          const res = await page;
          if (res.error) { error = res.error; break; }
          rows.push(...(res.data || []));
          if (!res.data || res.data.length < PAGE) break;
        }
        data = rows;
        break;
      }

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

      case 'pending': {
        // Pending picks are TODAY's ungraded picks: premium data. Only the grading cron
        // or a signed-in Pro user (admin grading page) may read them.
        if (!isCronAuthorized(request)) {
          const user = await resolveUser(request);
          if (!user) return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 });
          if (!isAdminUser(user)) try {
            if (!(await isPremium(user.id))) {
              return NextResponse.json({ success: false, error: 'Premium subscription required' }, { status: 403 });
            }
          } catch (err) {
            if (!(err instanceof EntitlementUnavailableError)) throw err;
            return NextResponse.json({ success: false, error: 'Could not verify subscription' }, { status: 503 });
          }
        }
        ({ data, error } = await db
          .from(recordTable())
          .select('*')
          .eq('result', 'PENDING')
          .order('pick_date', { ascending: false }));
        break;
      }

      case 'stats': {
        // Overall stats for social proof. Counted in SQL so the record covers every
        // graded pick (M4); the streak reads the most recent picks first (M7).
        const since30 = daysAgoISO(30);
        const [allTime, last30Days, streakRes] = await Promise.all([
          countRecord(db, null),
          countRecord(db, since30),
          db
            .from(recordTable())
            .select('result, pick_date')
            .eq('is_fire', true)
            .neq('result', 'PENDING')
            .gte('pick_date', since30)
            .order('pick_date', { ascending: false })
            .order('id', { ascending: false })
            .limit(500),
        ]);
        if (streakRes.error) throw streakRes.error;
        data = { allTime, last30Days, streak: calculateStreak(streakRes.data || []) };
        break;
      }

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
    const e = error as { code?: string; message?: string } | null;
    console.error('Results API error:', e?.code || '(no code)', e?.message || String(error));
    return NextResponse.json(
      { success: false, error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}

// POST - Save today's top picks or grade a pick (writes the public track record).
// Auth-gated: only the grade-and-persist cron (CRON_SECRET) may write, so the
// track record can't be forged.
export async function POST(request: Request) {
  try {
    const denied = cronAuthGuard(request);
    if (denied) return denied;

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

  // Callers pass picks newest first (ORDER BY pick_date DESC in SQL).
  const sorted = picks;
  let streak = 0;
  const firstResult = sorted.find((p) => p.result === 'WIN' || p.result === 'LOSS')?.result;

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
