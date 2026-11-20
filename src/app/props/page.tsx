import type { Metadata } from 'next';
import Link from 'next/link';

// DAI-01: player props are not a DailyAI product. This page exists so /props explains that
// instead of a bare 404, without promising a feature. Not indexed, not in the sitemap or nav.
export const metadata: Metadata = {
  title: 'Player props',
  description: 'DailyAI Betting does not offer player-prop picks. See what is included.',
  robots: { index: false, follow: true },
};

export default function PropsPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 space-y-6" data-testid="props-not-offered">
      <h1 className="text-2xl font-bold">Player props are not part of DailyAI Betting</h1>
      <p className="text-muted-foreground">
        DailyAI tracks where cappers agree on game lines: spreads, moneylines and totals. We do not publish
        player-prop picks, and neither Free nor Pro includes them.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/consensus" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">See today&apos;s consensus picks</Link>
        <Link href="/pricing" className="rounded-md border px-4 py-2">What Free and Pro include</Link>
      </div>
    </div>
  );
}
