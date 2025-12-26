import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Today's Games - Expert Picks by Matchup | DailyAI Betting",
  description: 'Browse expert consensus picks organized by game. See which matchups have the strongest capper agreement for NFL, NBA, MLB, NHL, and college sports.',
  keywords: [
    'sports betting picks by game',
    'game predictions',
    'matchup picks',
    'NFL game picks',
    'NBA game picks',
    'expert picks by matchup',
    'daily game picks',
  ],
  openGraph: {
    title: "Today's Games - Expert Picks by Matchup",
    description: 'Browse expert consensus picks organized by game matchup.',
    type: 'website',
  },
};

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
