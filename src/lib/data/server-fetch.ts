/**
 * Server-side data fetching for SSR pages.
 *
 * These functions are called from async Server Components at render time,
 * ensuring Google sees full HTML content on first crawl.
 * Client components receive the data as initialData props for hydration.
 *
 * @module lib/data/server-fetch
 */

import { cookies, headers } from 'next/headers';
import { INTERNAL_SSR_HEADER, internalSsrToken } from '@/lib/api-helpers';


/**
 * Base URL for server-to-server calls into this app's own API. Without
 * NEXT_PUBLIC_BASE_URL it must be the port this process actually listens on
 * (PORT, set by PM2: 3103 in production). The old 'http://localhost:3000'
 * fallback hit nothing in production, so every capper profile page 404'd.
 */
export function internalBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || `http://127.0.0.1:${process.env.PORT || '3000'}`;
}

/**
 * Forward the caller's auth cookie to the internal API so it can see the
 * logged-in user. Without this, server-to-server fetches are anonymous and
 * premium/trialing members are wrongly served the free tier.
 */
export async function authHeaders(): Promise<HeadersInit> {
  const cookieHeader = (await cookies()).getAll().map((c) => `${c.name}=${c.value}`).join('; ');
  const out: Record<string, string> = {};
  if (cookieHeader) out.cookie = cookieHeader;
  // Forward the visitor's IP so the API's per-IP rate limit counts this visitor, not
  // the server itself (otherwise every SSR render shares one bucket and the page
  // goes blank for everyone once it fills).
  const xff = (await headers()).get('x-forwarded-for');
  if (xff) out['x-forwarded-for'] = xff;
  // Our own render, not the visitor's API traffic: skip the per-IP limit (only that).
  const ssr = internalSsrToken();
  if (ssr) out[INTERNAL_SSR_HEADER] = ssr;
  return out;
}

/** Fetch today's consensus data (used by homepage, consensus, free-sports-picks, best-bets, picks) */
export async function getConsensusData() {
  try {
    const res = await fetch(`${internalBaseUrl()}/api/consensus`, { cache: 'no-store', headers: await authHeaders() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Fetch yesterday's consensus data with W/L grades */
export async function getYesterdayConsensusData() {
  try {
    const res = await fetch(`${internalBaseUrl()}/api/consensus?date=yesterday`, { cache: 'no-store', headers: await authHeaders() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Fetch daily bets analysis data */
export async function getDailyBetsData() {
  try {
    const res = await fetch(`${internalBaseUrl()}/api/daily-bets`, { cache: 'no-store', headers: await authHeaders() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
