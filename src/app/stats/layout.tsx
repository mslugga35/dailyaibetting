// Layout exists to export metadata for /stats, which is a client component
// and therefore cannot export metadata directly from page.tsx.
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Consensus Performance Stats - Win Rate by Confidence Tier | DailyAI Betting',
  description:
    'Track how consensus picks perform by confidence tier. See win rates, ROI, and performance breakdowns for lock, strong, and lean consensus plays.',
  keywords: [
    'consensus pick stats',
    'betting win rate',
    'sports betting ROI',
    'consensus performance',
    'confidence tier stats',
  ],
  openGraph: {
    title: 'Consensus Performance Stats | DailyAI Betting',
    description:
      'Track how consensus picks perform by confidence tier. Win rates, ROI, and sport breakdowns.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/stats',
  },
};

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
