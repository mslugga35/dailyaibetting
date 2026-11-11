import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daily Bets - AI Consensus Sports Picks Today | DailyAI Betting',
  description:
    'Today\'s daily bets from AI consensus across multiple expert cappers. Picks for NFL, NBA, MLB, NHL, and college sports update throughout the day. Spreads, moneylines, and totals.',
  keywords: [
    'daily bets',
    'daily sports bets',
    'today bets',
    'daily betting picks',
    'consensus picks today',
    'daily AI picks',
    'sports bets today',
    'daily free bets',
  ],
  openGraph: {
    title: 'Daily Bets - AI Consensus Sports Picks Today',
    description:
      'Daily bets from multiple expert cappers, updated throughout the day. Spreads, moneylines, and totals across all sports.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Daily Bets | DailyAI Betting',
    description:
      'AI consensus daily bets from multiple expert cappers, updated throughout the day.',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/daily-bets',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Daily Bets',
  description: 'AI-powered daily sports betting picks updated throughout the day',
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
