import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daily Bets - Consensus Sports Picks Today',
  description:
    'Today\'s daily bets from the consensus of multiple expert cappers. Picks for NFL, NBA, MLB, NHL, and college sports update throughout the day. Spreads, moneylines, and totals.',
  keywords: [
    'daily bets',
    'daily sports bets',
    'today bets',
    'daily betting picks',
    'consensus picks today',
    'sports bets today',
    'daily free bets',
  ],
  openGraph: {
    title: 'Daily Bets - Consensus Sports Picks Today',
    description:
      'Daily bets from multiple expert cappers, updated throughout the day. Spreads, moneylines, and totals across all sports.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Daily Bets | DailyAI Betting',
    description:
      'Consensus daily bets from multiple expert cappers, updated throughout the day.',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/daily-bets',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Daily Bets',
  description: 'Daily consensus sports betting picks updated throughout the day',
  url: 'https://dailyaibetting.com/daily-bets',
  publisher: {
    '@type': 'Organization',
    name: 'DailyAI Betting',
    url: 'https://dailyaibetting.com',
  },
};

export default function DailyBetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
