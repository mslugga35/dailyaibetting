import { Metadata } from 'next';
import { PRO_PRICE_DISPLAY, TRIAL_DAYS, TRIAL_CTA, TRIAL_TERMS } from '@/lib/constants/subscription';

export const metadata: Metadata = {
  title: 'DailyAI Pro | Premium Sports Betting Picks & Analysis',
  description: `Upgrade to DailyAI Pro for real-time picks, full capper stats, unlimited consensus data, and 30-day pick history. ${PRO_PRICE_DISPLAY}, ${TRIAL_DAYS}-day free trial for first-time members.`,
  openGraph: {
    title: 'DailyAI Pro - Premium Betting Picks',
    description: `Real-time picks, full stats, and unlimited consensus data. ${PRO_PRICE_DISPLAY} with a ${TRIAL_DAYS}-day free trial for first-time members.`,
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
