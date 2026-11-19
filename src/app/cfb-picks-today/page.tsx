'use client';

import { SportPicksToday } from '@/components/picks/SportPicksToday';

// Asks the API for NCAAF only (QA 2026-11-19: the list was the all-sport free slice, filtered client-side).
export default function Page() {
  return <SportPicksToday sport="NCAAF" label="College Football" />;
}
