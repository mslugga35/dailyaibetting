import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getConsensusData } from '@/lib/data/server-fetch';
import { PicksContent } from '../PicksContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SPORTS = ['nba', 'nfl', 'nhl', 'mlb', 'ncaab', 'ncaaf'] as const;
type SportSlug = typeof SPORTS[number];

const SPORT_META: Record<SportSlug, {
  label: string;
  upper: string;
  description: string;
  keywords: string;
  betTypes: string;
}> = {
  nba: {
    label: 'NBA',
    upper: 'NBA',
    description: 'Get free NBA picks today from expert cappers. AI-powered consensus highlights where 3+ pros agree on the same basketball play. Spread, moneyline, and over/under picks updated daily.',
    keywords: 'NBA picks today, free NBA picks, NBA expert picks, NBA consensus picks, NBA spread picks, NBA best bets, NBA betting predictions',
    betTypes: 'spread, moneyline, and over/under',
  },
  nfl: {
    label: 'NFL',
    upper: 'NFL',
    description: 'Get free NFL picks today from expert cappers. AI-powered consensus highlights where 3+ pros agree on the same football play. Spread, moneyline, and over/under picks updated daily.',
    keywords: 'NFL picks today, free NFL picks, NFL expert picks, NFL consensus picks, NFL spread picks, NFL best bets, NFL betting predictions',
    betTypes: 'spread, moneyline, and over/under',
  },
  nhl: {
    label: 'NHL',
    upper: 'NHL',
    description: 'Get free NHL picks today from expert cappers. AI-powered consensus highlights where 3+ pros agree on the same hockey play. Puck line, moneyline, and total picks updated daily.',
    keywords: 'NHL picks today, free NHL picks, NHL expert picks, NHL consensus picks, NHL puck line picks, NHL best bets, NHL betting predictions',
    betTypes: 'puck line, moneyline, and totals',
  },
  mlb: {
    label: 'MLB',
    upper: 'MLB',
    description: 'Get free MLB picks today from expert cappers. AI-powered consensus highlights where 3+ pros agree on the same baseball play. Run line, moneyline, and over/under picks updated daily.',
    keywords: 'MLB picks today, free MLB picks, MLB expert picks, MLB consensus picks, MLB run line picks, MLB best bets, MLB betting predictions',
    betTypes: 'run line, moneyline, and over/under',
  },
  ncaab: {
    label: 'NCAAB',
    upper: 'NCAAB',
    description: 'Get free college basketball picks today from expert cappers. AI-powered consensus highlights where 3+ pros agree on the same NCAAB play. Spread, moneyline, and over/under picks updated daily.',
    keywords: 'NCAAB picks today, college basketball picks, free NCAAB picks, college basketball expert picks, NCAAB consensus picks, NCAAB best bets',
    betTypes: 'spread, moneyline, and over/under',
  },
  ncaaf: {
    label: 'NCAAF',
    upper: 'NCAAF',
    description: 'Get free college football picks today from expert cappers. AI-powered consensus highlights where 3+ pros agree on the same NCAAF play. Spread, moneyline, and over/under picks updated daily.',
    keywords: 'NCAAF picks today, college football picks, free NCAAF picks, college football expert picks, NCAAF consensus picks, CFB best bets',
    betTypes: 'spread, moneyline, and over/under',
  },
};

interface PageProps {
  params: { sport: string };
}

export async function generateStaticParams() {
  return SPORTS.map((sport) => ({ sport }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params.sport.toLowerCase() as SportSlug;
  if (!SPORTS.includes(slug)) {
    return { title: 'Picks Not Found | DailyAI Betting' };
  }
  const meta = SPORT_META[slug];
  return {
    title: `Free ${meta.label} Picks Today — Expert Predictions | DailyAI Betting`,
    description: meta.description,
    keywords: meta.keywords,
    openGraph: {
      title: `Free ${meta.label} Picks Today — Expert Predictions`,
      description: meta.description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Free ${meta.label} Picks Today | DailyAI Betting`,
      description: meta.description,
    },
    alternates: {
      canonical: `https://dailyaibetting.com/picks/${slug}`,
    },
  };
}

export default async function SportPicksPage({ params }: PageProps) {
  const slug = params.sport.toLowerCase() as SportSlug;
  if (!SPORTS.includes(slug)) {
    notFound();
  }

  const meta = SPORT_META[slug];

  // Fetch consensus data filtered to this sport
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';
  let data = null;
  try {
    const res = await fetch(`${BASE_URL}/api/consensus?sport=${meta.upper}`, { cache: 'no-store' });
    if (res.ok) data = await res.json();
  } catch {
    // fall through — PicksContent handles null gracefully
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Free ${meta.label} Picks Today`,
    description: meta.description,
    url: `https://dailyaibetting.com/picks/${slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'DailyAI Betting',
      url: 'https://dailyaibetting.com',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Sport-specific header injected above the shared PicksContent */}
      <div className="container px-4 pt-8 pb-0">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Free {meta.label} Picks Today
        </h1>
        <p className="text-muted-foreground mb-2">
          Expert consensus {meta.label} picks with {meta.betTypes} analysis. Fire picks (🔥) = 3+ cappers agree.
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          {SPORTS.filter(s => s !== slug).map((s) => (
            <a
              key={s}
              href={`/picks/${s}`}
              className="text-xs px-3 py-1 rounded-full border border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {SPORT_META[s].label} Picks
            </a>
          ))}
        </div>
      </div>
      <PicksContent initialData={data} />
    </>
  );
}
