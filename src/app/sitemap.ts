import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://dailyaibetting.com';
  const today = new Date().toISOString();

  // Static pages that rarely change get a fixed lastModified date
  const staticDate = '2026-02-26';

  return [
    // Dynamic pages updated with live data
    {
      url: baseUrl,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${baseUrl}/daily-bets`,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/consensus`,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/picks`,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 0.85,
    },
    // SEO Landing Pages - Pro Sports
    {
      url: `${baseUrl}/nfl-picks-today`,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/nba-picks-today`,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/mlb-picks-today`,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/nhl-picks-today`,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    // SEO Landing Pages - College Sports
    {
      url: `${baseUrl}/cfb-picks-today`,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/cbb-picks-today`,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 0.85,
    },
    // SEO Landing Pages - High Volume Keywords
    {
      url: `${baseUrl}/free-sports-picks`,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/parlay-picks`,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/expert-picks`,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/best-bets`,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    // Matchups & Stats (live data)
    {
      url: `${baseUrl}/matchups`,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/stats`,
      lastModified: today,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    // Performance & History Pages
    {
      url: `${baseUrl}/results`,
      lastModified: today,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/history`,
      lastModified: today,
      changeFrequency: 'daily',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/trends`,
      lastModified: today,
      changeFrequency: 'daily',
      priority: 0.75,
    },
    // Cappers
    {
      url: `${baseUrl}/cappers`,
      lastModified: today,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    // Blog
    {
      url: `${baseUrl}/blog`,
      lastModified: today,
      changeFrequency: 'daily',
      priority: 0.8,
    },
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
    // AI Visibility
    {
      url: `${baseUrl}/llm.txt`,
      lastModified: '2025-12-30',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
