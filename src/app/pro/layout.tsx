import { Metadata } from 'next';
import { getCurrentOffer } from '@/lib/pricing/offer';
import { offerCopy } from '@/lib/pricing/plans';

// The meta/OG description carries the price on sale, which changes at runtime (founding
// seats sell out -> $19.99). Rendered per request so it never shows a stale price.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const c = offerCopy(await getCurrentOffer());
  // Price + trial wording comes from the plan on sale (same source as checkout).
  const priceLine = c.price ? `${c.price}${c.trialLabel ? `, ${c.trialLabel} for first-time members` : ''}.` : '';
  return {
  title: 'DailyAI Pro | Premium Sports Betting Picks & Analysis',
  description: `Upgrade to DailyAI Pro for unlimited consensus picks, capper pick detail, and the full graded pick history. ${priceLine}`.trim(),
  openGraph: {
    title: 'DailyAI Pro - Premium Betting Picks',
    description: `Unlimited consensus picks, capper pick detail, and full pick history. ${priceLine}`.trim(),
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
}

export default function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
