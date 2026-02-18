/**
 * Server-side data fetching for SSR pages.
 *
 * These functions are called from async Server Components at render time,
 * ensuring Google sees full HTML content on first crawl.
 * Client components receive the data as initialData props for hydration.
 *
 * @module lib/data/server-fetch
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';

/** Fetch today's consensus data (used by homepage, consensus, free-sports-picks, best-bets, picks) */
export async function getConsensusData() {
  try {
    const res = await fetch(`${BASE_URL}/api/consensus`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Fetch yesterday's consensus data with W/L grades */
export async function getYesterdayConsensusData() {
  try {
    const res = await fetch(`${BASE_URL}/api/consensus?date=yesterday`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Fetch daily bets analysis data */
export async function getDailyBetsData() {
  try {
    const res = await fetch(`${BASE_URL}/api/daily-bets`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
