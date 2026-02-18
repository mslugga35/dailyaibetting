import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daily Bets - AI-Powered Sports Picks Updated Live | DailyAI Betting',
  description:
    'Today\'s daily bets powered by AI consensus from 10+ expert cappers. Live-updating picks for NFL, NBA, MLB, NHL, and college sports. Spreads, moneylines, and totals.',
  keywords: [
    'daily bets',
    'daily sports bets',
    'today bets',
    'daily betting picks',
    'live sports picks',
    'daily AI picks',
    'sports bets today',
    'daily free bets',
  ],
  openGraph: {
    title: 'Daily Bets - AI-Powered Sports Picks Updated Live',
    description:
      'Live-updating daily bets from 10+ expert cappers. Spreads, moneylines, and totals across all sports.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Daily Bets | DailyAI Betting',
    description:
      'AI-powered daily bets updated live. 10+ expert cappers, all major sports.',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/daily-bets',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Daily Bets',
  description: 'AI-powered daily sports betting picks updated in real-time',
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
