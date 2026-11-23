/**
 * DAI-23: Supabase sits behind Cloudflare. When its firewall blocks a request, supabase-js surfaces the
 * whole "Attention Required! | Cloudflare … you have been blocked" HTML page as the error message. That
 * page used to be logged in full (~90 lines per hit) and returned to the client inside the JSON error.
 * This turns any upstream error into one short, safe line; the caller still fails (no masking).
 */
export interface UpstreamErrorSummary {
  /** true when the message contains ANY HTML (a block page, a bare 502 page, …): never show it to a client. */
  html: boolean;
  /** true when the HTML is Cloudflare's block/challenge page. */
  blocked: boolean;
  /** Cloudflare Ray ID from the block page, for a support ticket. */
  rayId: string | null;
  /** One line, no HTML, at most 300 characters. */
  summary: string;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return error == null ? 'Unknown error' : String(error);
}

export function describeUpstreamError(error: unknown): UpstreamErrorSummary {
  const raw = messageOf(error);
  const html = /<\s*(?:!doctype|html|head|body|title)\b/i.test(raw) || /<[a-z][a-z0-9]*[\s>/]/i.test(raw);
  const blocked = html && /Attention Required! \| Cloudflare|you have been blocked/i.test(raw);
  const ray = raw.match(/Ray ID:\s*(?:<[^>]*>\s*)*([0-9a-f]{16})/i);
  const rayId = ray ? ray[1] : null;
  const prefix = raw.split('<')[0].trim().replace(/[:\s]+$/, '') || 'Upstream request';
  let summary: string;
  if (blocked) summary = `${prefix}: blocked by the database provider's firewall (Cloudflare${rayId ? ` ray ${rayId}` : ''})`;
  else if (html) {
    const title = raw.match(/<title[^>]*>([^<]{0,80})<\/title>/i)?.[1]?.trim();
    summary = `${prefix}: upstream returned an HTML error page${title ? ` (${title})` : ''}`;
  } else summary = raw.replace(/\s+/g, ' ').slice(0, 300);
  return { html, blocked, rayId, summary: summary.slice(0, 300) };
}

/**
 * DAI-23: fetch with ONE bounded retry after a short pause, only for a network error or a 5xx.
 * A 4xx (including 404) is returned at once; a second failure is returned/thrown to the caller.
 */
export async function fetchWithOneRetry(
  url: string,
  init: RequestInit,
  opts: { fetchImpl?: typeof fetch; delayMs?: number } = {},
): Promise<Response> {
  const f = opts.fetchImpl ?? fetch;
  const delay = opts.delayMs ?? 300;
  try {
    const first = await f(url, init);
    if (first.status < 500) return first;
    await first.body?.cancel().catch(() => {}); // release the socket of the discarded 5xx response
  } catch {
    // network error: fall through to the single retry
  }
  await new Promise((r) => setTimeout(r, delay));
  return f(url, init);
}
