import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const SPORTS = ['nba', 'nfl', 'nhl', 'mlb', 'ncaab', 'ncaaf'];

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getBlogEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase
      .from('blog_posts')
      .select('slug, published_at')
      .eq('status', 'published')
      .eq('site', 'dailyaibetting')
      .order('published_at', { ascending: false })
      .limit(100);
    if (!data) return [];
    return data.map((post) => ({
      url: `https://dailyaibetting.com/blog/${post.slug}`,
      lastModified: post.published_at || new Date().toISOString(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    return [];
  }
}

async function getCapperEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase
      .from('cappers')
      .select('slug, updated_at')
      .not('slug', 'is', null)
      .gt('total_picks', 0)
      .limit(200);
    if (!data) return [];
    return data
      .filter((c) => c.slug)
      .map((capper) => ({
        url: `https://dailyaibetting.com/cappers/${capper.slug}`,
        lastModified: capper.updated_at || new Date().toISOString(),
        changeFrequency: 'daily' as const,
        priority: 0.65,
      }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://dailyaibetting.com';
  const today = new Date().toISOString();

  // Static pages that rarely change get a fixed lastModified date
  const staticDate = '2026-02-26';

  const staticRoutes: MetadataRoute.Sitemap = [
    // Dynamic pages updated with live data
    { url: baseUrl, lastModified: today, changeFrequency: 'hourly', priority: 1 },
    { url: `${baseUrl}/daily-bets`, lastModified: today, changeFrequency: 'hourly', priority: 0.95 },
    { url: `${baseUrl}/daily-ai-picks`, lastModified: today, changeFrequency: 'hourly', priority: 0.95 },
    { url: `${baseUrl}/consensus`, lastModified: today, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/picks`, lastModified: today, changeFrequency: 'hourly', priority: 0.85 },
    // SEO Landing Pages - Pro Sports
    { url: `${baseUrl}/nfl-picks-today`, lastModified: today, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/nba-picks-today`, lastModified: today, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/mlb-picks-today`, lastModified: today, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/nhl-picks-today`, lastModified: today, changeFrequency: 'hourly', priority: 0.9 },
    // SEO Landing Pages - College Sports
    { url: `${baseUrl}/cfb-picks-today`, lastModified: today, changeFrequency: 'hourly', priority: 0.85 },
    { url: `${baseUrl}/cbb-picks-today`, lastModified: today, changeFrequency: 'hourly', priority: 0.85 },
    // SEO Landing Pages - High Volume Keywords
    { url: `${baseUrl}/free-sports-picks`, lastModified: today, changeFrequency: 'hourly', priority: 0.95 },
    { url: `${baseUrl}/parlay-picks`, lastModified: today, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/expert-picks`, lastModified: today, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/best-bets`, lastModified: today, changeFrequency: 'hourly', priority: 0.9 },
    // Sport-specific Consensus & Picks pages
    ...SPORTS.map((sport) => ({
      url: `${baseUrl}/consensus/${sport}`,
      lastModified: today,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    })),
    ...SPORTS.map((sport) => ({
      url: `${baseUrl}/picks/${sport}`,
      lastModified: today,
      changeFrequency: 'hourly' as const,
      priority: 0.75,
    })),
    // Matchups & Stats (live data)
    { url: `${baseUrl}/matchups`, lastModified: today, changeFrequency: 'hourly', priority: 0.85 },
    { url: `${baseUrl}/stats`, lastModified: today, changeFrequency: 'daily', priority: 0.8 },
    // Performance & History Pages
    { url: `${baseUrl}/results`, lastModified: today, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/history`, lastModified: today, changeFrequency: 'daily', priority: 0.75 },
    { url: `${baseUrl}/trends`, lastModified: today, changeFrequency: 'daily', priority: 0.75 },
    // Cappers
    { url: `${baseUrl}/cappers`, lastModified: today, changeFrequency: 'daily', priority: 0.8 },
    // Blog
    { url: `${baseUrl}/blog`, lastModified: today, changeFrequency: 'daily', priority: 0.8 },
    // Static / rarely-updated pages
    {
      url: `${baseUrl}/sportsbooks`,
      lastModified: staticDate,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/advertise`,
      lastModified: staticDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: staticDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // AI Visibility
    {
      url: `${baseUrl}/llm.txt`,
      lastModified: '2025-12-30',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Fetch dynamic entries in parallel (blog posts + capper profiles)
  const [blogEntries, capperEntries] = await Promise.all([
    getBlogEntries(),
    getCapperEntries(),
  ]);

  return [...staticRoutes, ...blogEntries, ...capperEntries];
}
