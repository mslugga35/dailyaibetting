import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Consensus Picks Today - Where Experts Agree | DailyAI Betting',
  description:
    'See where 10+ expert cappers agree on today\'s sports picks. AI-powered consensus highlights fire picks (3+ experts agree) across NFL, NBA, MLB, NHL, and college sports. Updated every 5 minutes.',
  keywords: [
    'consensus picks today',
    'expert consensus picks',
    'fire picks today',
    'sports betting consensus',
    'where experts agree',
    'best consensus bets',
    'capper consensus picks',
    'AI sports picks',
    'free consensus picks',
  ],
  openGraph: {
    title: 'Free Consensus Picks Today - Where Experts Agree',
    description:
      'AI-powered consensus from 10+ expert cappers. Fire picks where 3+ experts agree, updated every 5 minutes.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Consensus Picks Today | DailyAI Betting',
    description:
      'See where 10+ expert cappers agree. Fire picks updated every 5 minutes.',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/consensus',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Free Consensus Picks Today',
  description:
    'AI-powered consensus picks from expert handicappers across all major sports',
  url: 'https://dailyaibetting.com/consensus',
  publisher: {
    '@type': 'Organization',
    name: 'DailyAI Betting',
    url: 'https://dailyaibetting.com',
  },
};

export default function ConsensusLayout({
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
