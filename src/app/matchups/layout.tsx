// Layout exists to export metadata for /matchups, which is a client component
// and therefore cannot export metadata directly from page.tsx.
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Today's Matchups - See Where Cappers Stand on Each Game | DailyAI Betting",
  description:
    'View expert betting picks organized by matchup. See which side cappers favor for every NFL, NBA, MLB, NHL, and college game today.',
  keywords: [
    'sports betting matchups',
    'game matchup picks',
    'capper picks by game',
    'consensus matchups',
    'betting matchup view',
  ],
  openGraph: {
    title: "Today's Matchups - Capper Consensus by Game",
    description:
      'See where expert cappers stand on each game. Matchup view for NFL, NBA, MLB, NHL, and college sports.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/matchups',
  },
};

export default function MatchupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
