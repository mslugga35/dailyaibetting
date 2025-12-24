import { NextResponse } from 'next/server';
import { getAllPicksFromSources } from '@/lib/data/google-sheets';
import { normalizePicks } from '@/lib/consensus/consensus-builder';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable static generation

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const capper = searchParams.get('capper');
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch all picks from data sources
    const rawPicks = await getAllPicksFromSources();

    // Normalize picks
    let normalizedPicks = normalizePicks(rawPicks);

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
      date: new Date().toISOString().split('T')[0],
      total,
      limit,
      offset,
      picks: paginatedPicks,
      filters: {
        cappers: uniqueCappers,
        sports: uniqueSports,
      },
    });
  } catch (error) {
    console.error('Picks API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch picks' },
      { status: 500 }
    );
  }
}
