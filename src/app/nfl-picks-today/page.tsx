import { Metadata } from 'next'
import { SportPicksToday } from '@/components/picks/SportPicksToday'

export const metadata: Metadata = {
  title: 'Free NFL Picks Today - Expert Consensus Picks',
  description: 'Get free NFL picks today from multiple expert cappers. See where several cappers back the same side. Picks update throughout the day, with spread, moneyline, and total picks.',
  keywords: 'free NFL picks today, NFL betting picks, NFL consensus picks, NFL expert picks',
}

// Live NFL consensus picks (was static text with no picks; QA 2026-11-19).
export default function NFLPicksToday() {
  return <SportPicksToday sport="NFL" label="NFL" />
}
