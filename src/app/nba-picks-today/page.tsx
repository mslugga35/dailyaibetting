import { Metadata } from 'next'
import { SportPicksToday } from '@/components/picks/SportPicksToday'

export const metadata: Metadata = {
  title: 'Free NBA Picks Today - Expert Consensus Picks',
  description: 'Get free NBA picks today from multiple expert cappers. See where several cappers back the same side. Picks update throughout the day, with spread, moneyline, and total picks.',
  keywords: 'free NBA picks today, NBA betting picks, NBA consensus picks, NBA expert picks',
}

// Live NBA consensus picks (was static text with no picks; QA 2026-11-19).
export default function NBAPicksToday() {
  return <SportPicksToday sport="NBA" label="NBA" />
}
