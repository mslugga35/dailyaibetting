import { NextResponse } from 'next/server';
import { getAllPicksFromSources } from '@/lib/data/google-sheets';
import { normalizePicks } from '@/lib/consensus/consensus-builder';
import { cleanFeedPicks } from '@/lib/data/feed-clean';
import { getTodayET } from '@/lib/utils/date';
import { rateLimitGuard, parseIntParam, resolveUser } from '@/lib/api-helpers';
import { isPremium, EntitlementUnavailableError } from '@/lib/auth/subscription';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable static generation

export async function GET(request: Request) {
  try {
    const limited = rateLimitGuard(request);
    if (limited) return limited;

    // Every capper's individual picks are a Pro feature (S1): signed-in Pro only.
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 });
    }
    try {
      if (!(await isPremium(user.id))) {
        return NextResponse.json({ success: false, error: 'Premium subscription required' }, { status: 403 });
      }
    } catch (err) {
      if (!(err instanceof EntitlementUnavailableError)) throw err;
      return NextResponse.json(
        { success: false, error: 'We could not verify your subscription right now. Please try again shortly.', entitlement: 'unknown' },
        { status: 503, headers: { 'Retry-After': '30' } },
      );
    }

    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const capper = searchParams.get('capper');
    const date = searchParams.get('date');
    const limit = parseIntParam(searchParams.get('limit'), 100, 1, 500);
    const offset = parseIntParam(searchParams.get('offset'), 0, 0, 100_000);

    // Fetch all picks from data sources
    const rawPicks = await getAllPicksFromSources();

    // Normalize picks
    // Strip prices / sportsbook names / status words from team text and drop non-picks.
    let normalizedPicks = cleanFeedPicks(normalizePicks(rawPicks));

    // Apply filters
    if (sport && sport !== 'ALL') {
      normalizedPicks = normalizedPicks.filter(p => p.sport === sport.toUpperCase());
    }

    if (capper) {
      normalizedPicks = normalizedPicks.filter(p =>
        p.capper.toLowerCase().includes(capper.toLowerCase())
      );
    }

    if (date) {
      normalizedPicks = normalizedPicks.filter(p => p.date === date);
    }

    // Get total count before pagination
    const total = normalizedPicks.length;

    // Apply pagination
    const paginatedPicks = normalizedPicks.slice(offset, offset + limit);

    // Get unique cappers and sports for filtering
    const uniqueCappers = [...new Set(normalizedPicks.map(p => p.capper))].sort();
    const uniqueSports = [...new Set(normalizedPicks.map(p => p.sport))].sort();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      date: getTodayET(),
      total,
      limit,
      offset,
      picks: paginatedPicks,
      filters: {
        cappers: uniqueCappers,
        sports: uniqueSports,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const e = error as { code?: string; message?: string } | null;
    console.error('Picks API error:', e?.code || '(no code)', e?.message || String(error));
    return NextResponse.json(
      { success: false, error: 'Failed to fetch picks' },
      { status: 500 }
    );
  }
}
