/**
 * Shared OpenRouter API client for Claude calls.
 * Used by both the AI pick engine (structured JSON) and the daily report (prose).
 */

export async function callOpenRouter(
  system: string,
  user: string,
  opts: { maxTokens?: number; temperature?: number; model?: string } = {},
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://dailyaibetting.com',
      },
      body: JSON.stringify({
        model: opts.model || 'anthropic/claude-sonnet-4-6',
        max_tokens: opts.maxTokens || 8000,
        ...(opts.temperature !== undefined && { temperature: opts.temperature }),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timeout);
  }
}
