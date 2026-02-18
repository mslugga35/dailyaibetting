import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Betting Trends & Insights - AI-Powered Analysis | DailyAI Betting',
  description:
    'Discover sports betting trends and AI-powered insights. Track capper performance, consensus accuracy, and market movements across NFL, NBA, MLB, NHL, and college sports.',
  keywords: [
    'betting trends',
    'sports betting trends',
    'betting insights',
    'capper performance trends',
    'consensus accuracy',
    'betting market trends',
    'AI betting analysis',
    'sports betting data',
  ],
  openGraph: {
    title: 'Betting Trends & Insights - AI-Powered Analysis',
    description:
      'Track capper performance, consensus accuracy, and market movements with AI-powered analysis.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Betting Trends & Insights | DailyAI Betting',
    description:
      'AI-powered betting trends, capper performance, and consensus accuracy tracking.',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/trends',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Betting Trends & Insights',
  description: 'AI-powered sports betting trends and performance analytics',
  url: 'https://dailyaibetting.com/trends',
  publisher: {
    '@type': 'Organization',
    name: 'DailyAI Betting',
    url: 'https://dailyaibetting.com',
  },
};

export default function TrendsLayout({
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
