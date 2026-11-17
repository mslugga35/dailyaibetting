/**
 * Shared OpenRouter API client for Claude calls.
 * Used by the AI pick engine (structured JSON), the daily report (prose) and the blog recap.
 *
 * MONTHLY BUDGET (fail closed). Every paid call goes through callOpenRouter, which first
 * asks OpenRouter how much this key has spent in the current UTC month (GET /key,
 * `usage_monthly`, free) and refuses the call when that spend plus a WORST-CASE
 * reservation for this call would exceed OPENROUTER_MONTHLY_BUDGET_USD. Anything it
 * cannot confirm (budget unset, usage check failed, unknown model price) also refuses.
 * The key's own OpenRouter credit limit, when one is set, is honoured as a second stop.
 */

const OPENROUTER_API = 'https://openrouter.ai/api/v1';
export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-6';

/** Highest per-token price (USD) across OpenRouter endpoints, so a reservation never under-counts. */
const PRICES: Record<string, { input: number; output: number }> = {
  'anthropic/claude-sonnet-4-6': { input: 3.3e-6, output: 16.5e-6 },
  'anthropic/claude-haiku-4-5': { input: 1.1e-6, output: 5.5e-6 },
};

/** Sanity ceiling on the configured budget (a typo such as 2000 must not lift the cap). */
const MAX_CONFIGURED_BUDGET_USD = 100;
/** Spend from this process that OpenRouter's usage counter may not show yet. */
const RECENT_WINDOW_MS = 10 * 60_000;
const recentSpend: Array<{ at: number; usd: number }> = [];

export class OpenRouterBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenRouterBudgetError';
  }
}

export interface BudgetStatus {
  budgetUsd: number;
  /** usage_monthly from OpenRouter (current UTC month) plus this process's unconfirmed recent spend */
  usedMonthUsd: number;
  pct: number;
  keyLimitUsd: number | null;
  keyLimitRemainingUsd: number | null;
}

function apiBase(): string {
  const override = process.env.OPENROUTER_BASE_URL;
  if (!override) return OPENROUTER_API;
  // Local validation only: a mock on loopback. Never another remote host (the key is sent there),
  // and never in a production deployment.
  if (process.env.NODE_ENV === 'production') {
    throw new OpenRouterBudgetError('OPENROUTER_BASE_URL is not allowed in production');
  }
  let u: URL;
  try { u = new URL(override); } catch { throw new OpenRouterBudgetError('OPENROUTER_BASE_URL is not a URL'); }
  if (u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost')) {
    return override.replace(/\/+$/, '');
  }
  throw new OpenRouterBudgetError('OPENROUTER_BASE_URL may only point at a local mock');
}

function monthlyBudgetUsd(): number {
  const raw = (process.env.OPENROUTER_MONTHLY_BUDGET_USD ?? '').trim();
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || n <= 0 || n > MAX_CONFIGURED_BUDGET_USD) {
    throw new OpenRouterBudgetError('OPENROUTER_MONTHLY_BUDGET_USD is not configured (0 < budget <= 100): paid AI calls are disabled');
  }
  return n;
}

function unconfirmedRecentSpend(now = Date.now()): number {
  while (recentSpend.length && now - recentSpend[0].at > RECENT_WINDOW_MS) recentSpend.shift();
  return recentSpend.reduce((s, r) => s + r.usd, 0);
}

const finiteOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Current month's spend against the budget. Throws OpenRouterBudgetError when it cannot be confirmed. */
export async function getBudgetStatus(): Promise<BudgetStatus> {
  const budgetUsd = monthlyBudgetUsd();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new OpenRouterBudgetError('OPENROUTER_API_KEY not configured');

  let body: unknown;
  try {
    const res = await fetch(`${apiBase()}/key`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    body = await res.json();
  } catch (err) {
    if (err instanceof OpenRouterBudgetError) throw err;
    throw new OpenRouterBudgetError(`OpenRouter usage check failed (${err instanceof Error ? err.message : 'error'}): refusing paid call`);
  }

  const data = (body as { data?: Record<string, unknown> } | null)?.data;
  const used = finiteOrNull(data?.usage_monthly);
  if (used === null || used < 0) {
    throw new OpenRouterBudgetError('OpenRouter usage_monthly unavailable: refusing paid call');
  }
  const usedMonthUsd = used + unconfirmedRecentSpend();
  return {
    budgetUsd,
    usedMonthUsd,
    pct: Math.round((usedMonthUsd / budgetUsd) * 1000) / 10,
    keyLimitUsd: finiteOrNull(data?.limit),
    keyLimitRemainingUsd: finiteOrNull(data?.limit_remaining),
  };
}

/** Upper bound on one call's cost: ~3 chars/token (high for English/JSON) in, full max_tokens out. */
export function worstCaseCostUsd(model: string, inputChars: number, maxTokens: number): number {
  const p = PRICES[model];
  if (!p) throw new OpenRouterBudgetError(`No price on file for ${model}: refusing paid call`);
  return Math.ceil(inputChars / 3) * p.input + maxTokens * p.output;
}

async function assertWithinBudget(model: string, inputChars: number, maxTokens: number): Promise<number> {
  const reserve = worstCaseCostUsd(model, inputChars, maxTokens);
  const s = await getBudgetStatus();
  if (s.usedMonthUsd + reserve > s.budgetUsd) {
    throw new OpenRouterBudgetError(
      `Monthly AI budget reached: $${s.usedMonthUsd.toFixed(2)} of $${s.budgetUsd.toFixed(2)} used; this call could cost up to $${reserve.toFixed(3)}`,
    );
  }
  if (s.keyLimitRemainingUsd !== null && reserve > s.keyLimitRemainingUsd) {
    throw new OpenRouterBudgetError('OpenRouter key credit limit nearly exhausted: refusing paid call');
  }
  return reserve;
}

// Paid calls run one at a time in this process, so two can never both pass the same check.
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

export async function callOpenRouter(
  system: string,
  user: string,
  opts: { maxTokens?: number; temperature?: number; model?: string } = {},
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');
  const model = opts.model || DEFAULT_MODEL;
  const maxTokens = opts.maxTokens || 8000;

  return serialized(async () => {
    const reserve = await assertWithinBudget(model, system.length + user.length, maxTokens);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetch(`${apiBase()}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://dailyaibetting.com',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          ...(opts.temperature !== undefined && { temperature: opts.temperature }),
          usage: { include: true },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 300)}`);
      }

      const data = await res.json();
      const cost = finiteOrNull(data?.usage?.cost);
      recentSpend.push({ at: Date.now(), usd: cost ?? reserve });
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      // A request that may have reached the model counts at its worst case until OpenRouter's counter catches up.
      recentSpend.push({ at: Date.now(), usd: reserve });
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  });
}

/** Test hook: forget this process's unconfirmed spend. */
export function _resetBudgetStateForTests(): void {
  recentSpend.length = 0;
}
