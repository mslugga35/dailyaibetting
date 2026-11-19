'use client';

import { SportPicksToday } from '@/components/picks/SportPicksToday';

// Asks the API for NCAAB only (QA 2026-11-19: the list was the all-sport free slice, filtered client-side).
export default function Page() {
  return <SportPicksToday sport="NCAAB" label="College Basketball" />;
}
