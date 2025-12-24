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
    // Sport-specific pages (when implemented)
    {
      url: `${baseUrl}/picks/nfl`,
      lastModified: today,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/picks/nba`,
      lastModified: today,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/picks/mlb`,
      lastModified: today,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/picks/nhl`,
      lastModified: today,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];
}
