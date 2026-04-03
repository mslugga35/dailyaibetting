import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Sports Betting Blog | Daily Picks & Analysis',
  description: 'AI-generated daily sports betting analysis, game previews, and expert consensus picks. Updated every morning at 9 AM ET.',
  keywords: ['sports betting blog', 'betting analysis', 'AI picks', 'sports predictions', 'betting tips', 'consensus picks'],
  openGraph: {
    title: 'AI Sports Betting Blog | DailyAI Betting',
    description: 'AI-generated daily sports betting analysis and expert consensus picks.',
    type: 'website',
    url: 'https://dailyaibetting.com/blog',
    siteName: 'DailyAI Betting',
    images: [
      {
        url: 'https://dailyaibetting.com/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'DailyAI Betting Blog',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sports Betting Blog | DailyAI Betting',
    description: 'AI-powered betting analysis, strategy guides, and expert consensus picks.',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/blog',
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
