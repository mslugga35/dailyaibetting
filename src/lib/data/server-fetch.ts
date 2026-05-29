/**
 * Server-side data fetching for SSR pages.
 *
 * These functions are called from async Server Components at render time,
 * ensuring Google sees full HTML content on first crawl.
 * Client components receive the data as initialData props for hydration.
 *
 * @module lib/data/server-fetch
 */

import { cookies } from 'next/headers';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';

/**
 * Forward the caller's auth cookie to the internal API so it can see the
 * logged-in user. Without this, server-to-server fetches are anonymous and
 * premium/trialing members are wrongly served the free tier.
 */
async function authHeaders(): Promise<HeadersInit> {
  const cookieHeader = (await cookies()).getAll().map((c) => `${c.name}=${c.value}`).join('; ');
  return cookieHeader ? { cookie: cookieHeader } : {};
}

/** Fetch today's consensus data (used by homepage, consensus, free-sports-picks, best-bets, picks) */
export async function getConsensusData() {
  try {
    const res = await fetch(`${BASE_URL}/api/consensus`, { cache: 'no-store', headers: await authHeaders() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Fetch yesterday's consensus data with W/L grades */
export async function getYesterdayConsensusData() {
  try {
    const res = await fetch(`${BASE_URL}/api/consensus?date=yesterday`, { cache: 'no-store', headers: await authHeaders() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Fetch daily bets analysis data */
export async function getDailyBetsData() {
  try {
    const res = await fetch(`${BASE_URL}/api/daily-bets`, { cache: 'no-store', headers: await authHeaders() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
