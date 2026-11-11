// Layout exists to export metadata for /stats, which is a client component
// and therefore cannot export metadata directly from page.tsx.
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Consensus Performance Stats - Win Rate by Confidence Tier',
  description:
    'Graded win-loss records, win rates and ROI estimated at -110 for top-consensus, strong and lean plays.',
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
      'Graded win-loss records, win rates and ROI estimated at -110, by confidence tier and sport.',
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
