/**
 * Row for the daily recap post in the shared `blog_posts` table (Supabase project A, also used by other
 * sites; rows are told apart by `site`). DAI-24: the recap used to insert a `sport` field that the table
 * does not have (PGRST204), so every recap failed to save. The sports are kept in `tags` instead.
 *
 * BLOG_POSTS_COLUMNS is the live column list (information_schema, read 2026-11-23). The table is shared,
 * so the app adapts to it; never add columns from here.
 */
export const BLOG_POSTS_COLUMNS = [
  'id', 'title', 'slug', 'excerpt', 'content', 'category', 'tags', 'author', 'seo_title', 'seo_description',
  'featured_image', 'read_time', 'featured', 'status', 'published_at', 'ai_generated', 'ai_model', 'ai_prompt',
  'created_at', 'updated_at', 'view_count', 'site',
] as const;

/** NOT NULL columns without a default: an insert must always provide them. */
export const BLOG_POSTS_REQUIRED = ['title', 'slug', 'content'] as const;

export interface RecapRowInput {
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  isoDate: string;
  nowIso: string;
}

export function buildRecapRow(i: RecapRowInput) {
  return {
    slug: i.slug,
    title: i.title,
    content: i.content,
    excerpt: i.excerpt,
    category: 'daily-picks',
    tags: i.tags,
    seo_title: `AI Consensus Sports Picks Today (${i.isoDate}) | DailyAI Betting`,
    seo_description: i.excerpt,
    ai_model: 'claude-haiku-4-5',
    ai_generated: true,
    author: 'DailyAI Betting',
    site: 'dailyaibetting',
    status: 'published',
    published_at: i.nowIso,
  };
}
