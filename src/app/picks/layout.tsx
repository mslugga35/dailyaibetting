import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Expert Picks Today - Browse by Sport & Capper | DailyAI Betting',
  description:
    'Browse all expert sports picks today from 10+ professional cappers. Filter by sport, capper, or bet type. NFL, NBA, MLB, NHL, college picks updated in real-time.',
  keywords: [
    'expert picks today',
    'all sports picks',
    'capper picks today',
    'free expert picks',
    'sports betting picks',
    'browse picks by sport',
    'daily expert picks',
    'handicapper picks',
  ],
  openGraph: {
    title: 'All Expert Picks Today - Browse by Sport & Capper',
    description:
      'Browse picks from 10+ professional cappers. Filter by sport, capper, or bet type.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'All Expert Picks Today | DailyAI Betting',
    description:
      'Browse all sports picks from 10+ professional cappers, updated in real-time.',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/picks',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'All Expert Sports Picks Today',
  description: 'Browse all expert sports betting picks by sport, capper, and bet type',
  url: 'https://dailyaibetting.com/picks',
  publisher: {
    '@type': 'Organization',
    name: 'DailyAI Betting',
    url: 'https://dailyaibetting.com',
  },
};

export default function PicksLayout({
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
