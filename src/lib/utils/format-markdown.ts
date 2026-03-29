import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = ['h1', 'h2', 'h3', 'strong', 'br', 'li', 'ul', 'p'];
const ALLOWED_ATTR = ['class'];

/**
 * Convert markdown to sanitized HTML.
 * When `styled` is true (default), headings and lists include Tailwind classes.
 */
export function formatMarkdown(text: string, styled = true): string {
  let html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, styled
      ? '<h3 class="text-lg font-bold mt-6 mb-2 text-primary">$1</h3>'
      : '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, styled
      ? '<h2 class="text-xl font-bold mt-8 mb-3 text-foreground border-b border-border pb-2">$1</h2>'
      : '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, styled
      ? '<h1 class="text-2xl font-bold mt-4 mb-4 text-foreground">$1</h1>'
      : '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, styled
      ? '<li class="ml-4 mb-1">$1</li>'
      : '<li>$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  html = html.replace(
    styled
      ? /((?:<li[^>]*>.*?<\/li>\s*<br\/>?\s*)+)/g
      : /((?:<li>.*?<\/li>\s*(?:<br\/>)?\s*)+)/g,
    styled
      ? '<ul class="list-disc space-y-1 my-2">$1</ul>'
      : '<ul>$1</ul>',
  );

  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
