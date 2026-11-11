import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Consensus Picks Today - Where Experts Agree',
  description:
    'See where multiple expert cappers agree on today\'s sports picks. AI-powered consensus highlights fire picks (3+ experts agree) across NFL, NBA, MLB, NHL, and college sports. Picks update throughout the day.',
  keywords: [
    'consensus picks today',
    'expert consensus picks',
    'fire picks today',
    'sports betting consensus',
    'where experts agree',
    'consensus bets today',
    'capper consensus picks',
    'AI sports picks',
    'free consensus picks',
  ],
  openGraph: {
    title: 'Free Consensus Picks Today - Where Experts Agree',
    description:
      'AI-powered consensus from multiple expert cappers. Fire picks where 3+ experts agree, updated throughout the day.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Consensus Picks Today | DailyAI Betting',
    description:
      'See where multiple expert cappers agree. Fire picks update throughout the day.',
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
    'AI-powered consensus picks from expert cappers across all major sports',
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
