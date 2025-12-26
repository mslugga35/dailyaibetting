import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://dailyaibetting.com';
  const today = new Date().toISOString();

  return [
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
    // Monetization Pages
    {
      url: `${baseUrl}/sportsbooks`,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/advertise`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    // Blog
    {
      url: `${baseUrl}/blog`,
      lastModified: today,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];
}
