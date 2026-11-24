/**
 * Daily Blog Recap Generator
 *
 * Builds the daily recap post from data only (src/lib/blog/recap-template.ts): today's free fire
 * picks, yesterday's graded fire picks and the verified record. No language model, so $0 per post.
 * Runs once daily (Hetzner systemd timer, see ops/hetzner-cron). One post per ET date: the slug is
 * checked first and is unique in blog_posts, so a second run or a race never creates a duplicate.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cronAuthGuard, INTERNAL_SSR_HEADER, internalSsrToken } from '@/lib/api-helpers';
import { internalBaseUrl } from '@/lib/data/server-fetch';
import { buildRecapRow } from '@/lib/blog/recap-row';
import { buildRecapArticle, type RecapFirePick, type RecapGradedPick } from '@/lib/blog/recap-template';
import { getVerifiedPerformance } from '@/lib/data/performance';
import { recordTable, cleanRecordRows } from '@/lib/data/record-source';
import { getTodayET, getYesterdayET } from '@/lib/utils/date';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** Today's fire picks as the FREE tier sees them, plus the board's total fire count (aggregate only). */
async function getTodaysFirePicks(): Promise<{ picks: RecapFirePick[]; total: number } | null> {
  try {
    // Loopback + rate-limit marker only. Deliberately NO cron bearer: this becomes a
    // public blog post, so it must only ever see the free tier.
    const ssr = internalSsrToken();
    const res = await fetch(`${internalBaseUrl()}/api/consensus?minCappers=3`, {
      cache: 'no-store',
      headers: ssr ? { [INTERNAL_SSR_HEADER]: ssr } : {},
    });
    if (!res.ok) return null;
    const data = await res.json();
    // /api/consensus returns camelCase picks; isFire already applies the opposite-sides rule.
    type ApiPick = { bet: string; matchup?: string; sport: string; capperCount: number; isFire: boolean };
    const picks = ((data.consensus || []) as ApiPick[])
      .filter((p: ApiPick) => p.isFire === true)
      .map((p: ApiPick): RecapFirePick => ({ bet: p.bet, sport: p.sport, matchup: p.matchup ?? null, capperCount: p.capperCount }));
    const total = typeof data.firePickCount === 'number' ? data.firePickCount : picks.length;
    return { picks, total };
  } catch {
    return null;
  }
}

/** Yesterday's graded fire picks from the public record (same rows the /results page lists). */
async function getGradedFirePicks(db: SupabaseClient, isoDate: string): Promise<RecapGradedPick[]> {
  const { data, error } = await db
    .from(recordTable())
    .select('sport, bet, capper_count, result, final_score')
    .eq('is_fire', true)
    .eq('pick_date', isoDate)
    .in('result', ['WIN', 'LOSS', 'PUSH'])
    .order('id', { ascending: true })
    .limit(200);
  if (error) throw error;
  return cleanRecordRows((data ?? []) as RecapGradedPick[]);
}

/** Yesterday's fire picks that are not graded (pending, void, null), so the tally never reads as the full day. */
async function countUngradedFirePicks(db: SupabaseClient, isoDate: string): Promise<number> {
  const { count, error } = await db
    .from(recordTable())
    .select('id', { count: 'exact', head: true })
    .eq('is_fire', true)
    .eq('pick_date', isoDate)
    .or('result.is.null,result.not.in.(WIN,LOSS,PUSH)');
  if (error) throw error;
  return count ?? 0;
}

export async function GET(req: NextRequest) {
  // Auth check
  const denied = cronAuthGuard(req);
  if (denied) return denied;

  // ET calendar date (the UTC date is already tomorrow after 7/8 PM ET)
  const isoDate = getTodayET();
  const yesterdayIso = getYesterdayET();
  const slug = `ai-consensus-picks-today-${isoDate}`;

  const supabase = getSupabaseAdmin();

  // Skip if already generated today
  const { data: existing, error: existingError } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', slug)
    .eq('site', 'dailyaibetting')
    .maybeSingle();
  // Unknown = do not risk a duplicate post.
  if (existingError) {
    return NextResponse.json({ success: false, error: 'Could not check for an existing post' }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ success: true, skipped: true, slug, reason: 'Already generated today' });
  }

  // Get today's fire picks
  const board = await getTodaysFirePicks();
  if (!board) {
    return NextResponse.json({ success: false, error: 'Consensus unavailable' }, { status: 503 });
  }
  if (board.picks.length === 0) {
    return NextResponse.json({ success: false, error: 'No consensus picks available yet' }, { status: 404 });
  }

  // Every number in the post comes from graded rows. If they cannot be read, publish nothing
  // rather than a post with missing or guessed figures.
  let yesterday: RecapGradedPick[];
  let yesterdayUngraded: number;
  let perf: Awaited<ReturnType<typeof getVerifiedPerformance>>;
  try {
    [yesterday, yesterdayUngraded, perf] = await Promise.all([
      getGradedFirePicks(supabase, yesterdayIso),
      countUngradedFirePicks(supabase, yesterdayIso),
      getVerifiedPerformance(supabase),
    ]);
  } catch (e) {
    console.error('Blog recap: record unavailable:', (e as { message?: string })?.message ?? String(e));
    return NextResponse.json({ success: false, error: 'Record unavailable' }, { status: 503 });
  }

  const article = buildRecapArticle({
    isoDate,
    yesterdayIso,
    firePicks: board.picks,
    totalFireCount: board.total,
    yesterday,
    yesterdayUngraded,
    record: { last7: perf.last7, last30: perf.last30, allTime: perf.allTime, bySport: perf.bySport },
  });
  if (!article) {
    return NextResponse.json({ success: false, error: 'No consensus picks available yet' }, { status: 404 });
  }

  const sports = [...new Set(board.picks.map((p) => p.sport))];
  const fireCount = board.total;
  const { error } = await supabase
    .from('blog_posts')
    .insert(buildRecapRow({
      slug, title: article.title, content: article.content, excerpt: article.excerpt, tags: article.tags,
      isoDate, nowIso: new Date().toISOString(), seoTitle: article.seoTitle, readTime: article.readTime,
    }))
    .select('id, slug')
    .single();

  if (error) {
    // The slug is unique: a concurrent run already saved today's post.
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ success: true, skipped: true, slug, reason: 'Already generated today' });
    }
    console.error('Blog insert error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save post' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    slug,
    url: `/blog/${slug}`,
    picks: board.picks.length,
    fireCount,
    sports,
  });
}
