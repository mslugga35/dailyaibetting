import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DailyAI Pro | Premium Sports Betting Picks & Analysis',
  description: 'Upgrade to DailyAI Pro for real-time picks, full capper stats, unlimited consensus data, and 30-day pick history. $20/month, free 7-day trial.',
  openGraph: {
    title: 'DailyAI Pro - Premium Betting Picks',
    description: 'Real-time picks, full stats, and unlimited consensus data. $20/month with 7-day free trial.',
    url: 'https://dailyaibetting.com/pro',
    type: 'website',
    images: [
      {
        url: 'https://dailyaibetting.com/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'DailyAI Pro',
      },
    ],
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/pro',
  },
};

export default function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
