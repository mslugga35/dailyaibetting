import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sports Betting Blog | Daily Picks & Analysis',
  description: 'AI-assisted sports betting analysis, game previews, and expert consensus picks.',
  keywords: ['sports betting blog', 'betting analysis', 'AI picks', 'sports predictions', 'betting tips', 'consensus picks'],
  openGraph: {
    title: 'Sports Betting Blog | DailyAI Betting',
    description: 'Daily consensus recaps, betting analysis and expert consensus picks.',
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
    description: 'Daily consensus recaps, betting strategy guides and expert consensus picks.',
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
