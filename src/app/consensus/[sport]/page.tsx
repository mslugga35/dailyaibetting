import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getConsensusData, getYesterdayConsensusData } from '@/lib/data/server-fetch';
import { ConsensusContent } from '../ConsensusContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SPORTS = ['nba', 'nfl', 'nhl', 'mlb', 'ncaab', 'ncaaf'] as const;
type SportSlug = typeof SPORTS[number];

const SPORT_META: Record<SportSlug, {
  label: string;
  upper: string;
  description: string;
  keywords: string[];
}> = {
  nba: {
    label: 'NBA',
    upper: 'NBA',
    description: 'Today\'s NBA consensus picks — find where 3+ expert cappers agree on the same basketball play. AI-powered fire picks updated every 5 minutes.',
    keywords: ['NBA consensus picks today', 'NBA expert consensus', 'NBA fire picks', 'NBA betting consensus', 'free NBA picks', 'NBA best bets today'],
  },
  nfl: {
    label: 'NFL',
    upper: 'NFL',
    description: 'Today\'s NFL consensus picks — find where 3+ expert cappers agree on the same football play. AI-powered fire picks updated every 5 minutes.',
    keywords: ['NFL consensus picks today', 'NFL expert consensus', 'NFL fire picks', 'NFL betting consensus', 'free NFL picks', 'NFL best bets today'],
  },
  nhl: {
    label: 'NHL',
    upper: 'NHL',
    description: 'Today\'s NHL consensus picks — find where 3+ expert cappers agree on the same hockey play. AI-powered fire picks updated every 5 minutes.',
    keywords: ['NHL consensus picks today', 'NHL expert consensus', 'NHL fire picks', 'NHL betting consensus', 'free NHL picks', 'NHL best bets today'],
  },
  mlb: {
    label: 'MLB',
    upper: 'MLB',
    description: 'Today\'s MLB consensus picks — find where 3+ expert cappers agree on the same baseball play. AI-powered fire picks updated every 5 minutes.',
    keywords: ['MLB consensus picks today', 'MLB expert consensus', 'MLB fire picks', 'MLB betting consensus', 'free MLB picks', 'MLB best bets today'],
  },
  ncaab: {
    label: 'NCAAB',
    upper: 'NCAAB',
    description: 'Today\'s college basketball consensus picks — find where 3+ expert cappers agree on the same NCAAB play. AI-powered fire picks updated every 5 minutes.',
    keywords: ['NCAAB consensus picks today', 'college basketball consensus', 'NCAAB fire picks', 'college basketball expert picks', 'free NCAAB picks', 'March Madness picks'],
  },
  ncaaf: {
    label: 'NCAAF',
    upper: 'NCAAF',
    description: 'Today\'s college football consensus picks — find where 3+ expert cappers agree on the same NCAAF play. AI-powered fire picks updated every 5 minutes.',
    keywords: ['NCAAF consensus picks today', 'college football consensus', 'CFB fire picks', 'college football expert picks', 'free NCAAF picks', 'CFB best bets today'],
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
    return { title: 'Consensus Not Found | DailyAI Betting' };
  }
  const meta = SPORT_META[slug];
  return {
    title: `${meta.label} Consensus Picks Today | DailyAI Betting`,
    description: meta.description,
    keywords: meta.keywords,
    openGraph: {
      title: `${meta.label} Consensus Picks Today — Where Experts Agree`,
      description: meta.description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${meta.label} Consensus Picks Today | DailyAI Betting`,
      description: meta.description,
    },
    alternates: {
      canonical: `https://dailyaibetting.com/consensus/${slug}`,
    },
  };
}

export default async function SportConsensusPage({ params }: PageProps) {
  const slug = params.sport.toLowerCase() as SportSlug;
  if (!SPORTS.includes(slug)) {
    notFound();
  }

  const meta = SPORT_META[slug];

  // Fetch consensus data pre-filtered to this sport so the server HTML is sport-specific
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';
  let todayData = null;
  let yesterdayData = null;
  try {
    const [todayRes, yesterdayRes] = await Promise.all([
      fetch(`${BASE_URL}/api/consensus?sport=${meta.upper}`, { cache: 'no-store' }),
      fetch(`${BASE_URL}/api/consensus?sport=${meta.upper}&date=yesterday`, { cache: 'no-store' }),
    ]);
    if (todayRes.ok) todayData = await todayRes.json();
    if (yesterdayRes.ok) yesterdayData = await yesterdayRes.json();
  } catch {
    // fall through — ConsensusContent handles null gracefully
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${meta.label} Consensus Picks Today`,
    description: meta.description,
    url: `https://dailyaibetting.com/consensus/${slug}`,
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

      {/* Sport-specific header */}
      <div className="container px-4 pt-8 pb-0">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {meta.label} Consensus Picks Today
        </h1>
        <p className="text-muted-foreground mb-4">
          Where expert cappers agree on today&apos;s {meta.label} games. Fire picks (🔥) = 3+ cappers on the same play.
        </p>

        {/* Cross-links to other sport consensus pages */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-sm text-muted-foreground self-center">Other sports:</span>
          {SPORTS.filter(s => s !== slug).map((s) => (
            <Link
              key={s}
              href={`/consensus/${s}`}
              className="text-xs px-3 py-1 rounded-full border border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {SPORT_META[s].label}
            </Link>
          ))}
          <Link
            href="/consensus"
            className="text-xs px-3 py-1 rounded-full border border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
          >
            All Sports
          </Link>
        </div>
      </div>

      <ConsensusContent initialData={todayData} initialYesterdayData={yesterdayData} />
    </>
  );
}
