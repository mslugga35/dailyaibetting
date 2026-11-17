/**
 * Blog render-time safety helpers (no DB writes; applied when reading blog_posts rows).
 *
 * Some auto-generated `blog_posts` rows (March 2026 daily-picks posts) were stored with the
 * model's raw JSON reply as `content`, e.g. `{ "title": "...", "content": "<p>..." }`, and
 * render as literal JSON. Policy:
 *   - JSON that parses and holds a string `content` -> extract that content and render it.
 *   - Anything that looks like JSON but cannot be recovered -> "broken": hide from the blog
 *     listing and sitemap, answer 404 on the post page. We never show raw JSON to readers.
 */

export type BlogContentResult =
  | { kind: 'ok'; content: string }
  | { kind: 'extracted'; content: string; title?: string }
  | { kind: 'broken' };

function stripFence(s: string): string {
  const m = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1] : s;
}

export function resolveBlogContent(raw: unknown): BlogContentResult {
  if (typeof raw !== 'string' || raw.trim() === '') return { kind: 'broken' };
  const text = stripFence(raw.trim());
  if (!(text.startsWith('{') || text.startsWith('['))) return { kind: 'ok', content: raw };
  // HTML never starts with { or [, so from here on this is JSON-shaped.
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      const body = obj.content ?? obj.body ?? obj.html;
      if (typeof body === 'string' && body.trim().length > 0) {
        return {
          kind: 'extracted',
          content: body,
          title: typeof obj.title === 'string' ? obj.title : undefined,
        };
      }
    }
  } catch {
    /* fall through */
  }
  return { kind: 'broken' };
}

/** Plain text/markdown-ish extracted content has no tags: wrap blank-line paragraphs for display. */
export function toDisplayHtml(content: string): string {
  if (/<\/?[a-z][\s\S]*>/i.test(content)) return content;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const h = p.match(/^(#{1,3})\s+(.*)$/);
      if (h) return `<h${h[1].length + 1}>${esc(h[2])}</h${h[1].length + 1}>`;
      return `<p>${esc(p).replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');
}

/**
 * Display-title overrides for already-published posts whose URL must not change.
 * Keyed by slug. The Harbor post's HTML source is left untouched.
 */
export const BLOG_TITLE_OVERRIDES: Record<string, string> = {
  'how-to-use-ai-betting-picks-for-consistent-profits-2026-guide':
    'How to Use AI Betting Picks Responsibly: A 2026 Guide',
};

export function displayTitle(slug: string, title: string): string {
  return BLOG_TITLE_OVERRIDES[slug] ?? title;
}

/** Neutral provenance line: never names a model we cannot verify. */
export const AI_ATTRIBUTION =
  'This article was written with AI assistance from consensus data and may contain errors. It is for entertainment and information only, not betting advice. Past results do not guarantee future results.';

export const BLOG_UPDATE_NOTE =
  'AI-assisted analysis, pick previews, and betting strategy articles. New articles are published as they are written.';
