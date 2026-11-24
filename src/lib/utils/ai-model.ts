/**
 * DailyAI's only paid model client: the Claude API with a dedicated DailyAI key (ANTHROPIC_API_KEY)
 * from a Claude Console organization that is funded ONLY by the monthly API credit included with the
 * owner's Max plan (no purchased credits, no auto-reload). Replaces OpenRouter (2026-11-24).
 *
 * Cost protection, all fail closed:
 * 1. Monthly cap in the app (AI_MONTHLY_BUDGET_USD, 0 < cap <= 100). Before every call the worst-case
 *    cost of that call is reserved against this UTC month's ledger; the call is refused if it could
 *    exceed the cap. After the call the reservation is replaced by the real cost from `usage`.
 *    The ledger is a JSON file (AI_SPEND_LEDGER_PATH) so restarts and deploys keep the month's spend.
 *    Unset cap, unset ledger path, unreadable ledger or unknown model price = no call.
 * 2. The Console organization itself: with no payment method and no auto-reload, Anthropic stops
 *    serving requests when the included credit runs out. That answer is treated as a budget stop.
 * 3. No fallback to any other provider, ever. A refused or failed call simply produces no content.
 */
import Anthropic from '@anthropic-ai/sdk';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const DEFAULT_MODEL = 'claude-sonnet-4-6';

/** First-party Claude API prices, USD per token. */
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3e-6, output: 15e-6 },
  'claude-haiku-4-5': { input: 1e-6, output: 5e-6 },
};

/** Sanity ceiling on the configured cap (a typo such as 2000 must not lift it). */
const MAX_CONFIGURED_BUDGET_USD = 100;

export class AiBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiBudgetError';
  }
}

export interface BudgetStatus {
  budgetUsd: number;
  /** This UTC month's recorded spend, including open reservations */
  usedMonthUsd: number;
  pct: number;
  month: string;
}

interface Ledger { month: string; spentUsd: number; calls: number }

const monthUtc = (now = new Date()) => now.toISOString().slice(0, 7);

function monthlyBudgetUsd(): number {
  const raw = (process.env.AI_MONTHLY_BUDGET_USD ?? '').trim();
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || n <= 0 || n > MAX_CONFIGURED_BUDGET_USD) {
    throw new AiBudgetError('AI_MONTHLY_BUDGET_USD is not configured (0 < budget <= 100): paid AI calls are disabled');
  }
  return n;
}

function ledgerPath(): string {
  const p = (process.env.AI_SPEND_LEDGER_PATH ?? '').trim();
  if (!p) throw new AiBudgetError('AI_SPEND_LEDGER_PATH is not configured: paid AI calls are disabled');
  return p;
}

/** Reads this month's ledger. A missing file is a fresh month; an unreadable one refuses the call. */
function readLedger(now = new Date()): Ledger {
  const month = monthUtc(now);
  let raw: string;
  try {
    raw = readFileSync(ledgerPath(), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { month, spentUsd: 0, calls: 0 };
    if (e instanceof AiBudgetError) throw e;
    throw new AiBudgetError('AI spend ledger unreadable: refusing paid call');
  }
  let j: Partial<Ledger>;
  try { j = JSON.parse(raw); } catch { throw new AiBudgetError('AI spend ledger corrupt: refusing paid call'); }
  if (typeof j.month !== 'string' || typeof j.spentUsd !== 'number' || !Number.isFinite(j.spentUsd) || j.spentUsd < 0) {
    throw new AiBudgetError('AI spend ledger corrupt: refusing paid call');
  }
  if (j.month !== month) return { month, spentUsd: 0, calls: 0 };
  return { month, spentUsd: j.spentUsd, calls: typeof j.calls === 'number' ? j.calls : 0 };
}

/** Atomic write (temp file + rename) so a crash never leaves a half-written ledger. */
function writeLedger(l: Ledger): void {
  const p = ledgerPath();
  mkdirSync(dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(l), { mode: 0o600 });
  renameSync(tmp, p);
}

export async function getBudgetStatus(now = new Date()): Promise<BudgetStatus> {
  const budgetUsd = monthlyBudgetUsd();
  const l = readLedger(now);
  return { budgetUsd, usedMonthUsd: l.spentUsd, pct: Math.round((l.spentUsd / budgetUsd) * 1000) / 10, month: l.month };
}

/** Upper bound on one call's cost: ~3 chars/token (high for English/JSON) in, full max_tokens out. */
export function worstCaseCostUsd(model: string, inputChars: number, maxTokens: number): number {
  const p = PRICES[model];
  if (!p) throw new AiBudgetError(`No price on file for ${model}: refusing paid call`);
  return Math.ceil(inputChars / 3) * p.input + maxTokens * p.output;
}

export function actualCostUsd(model: string, usage: { input_tokens?: number | null; output_tokens?: number | null; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null }): number {
  const p = PRICES[model];
  if (!p) throw new AiBudgetError(`No price on file for ${model}`);
  const n = (v: number | null | undefined) => (typeof v === 'number' && v > 0 ? v : 0);
  return n(usage.input_tokens) * p.input + n(usage.cache_creation_input_tokens) * p.input * 1.25
    + n(usage.cache_read_input_tokens) * p.input * 0.1 + n(usage.output_tokens) * p.output;
}

// Paid calls run one at a time in this process, so two can never both pass the same check.
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

/** Anthropic's answer when the organization has no credit left (included credit used up). */
function isCreditExhausted(err: unknown): boolean {
  if (!(err instanceof Anthropic.APIError)) return false;
  const msg = String((err as { message?: string }).message ?? '').toLowerCase();
  return (err.status === 400 || err.status === 402 || err.status === 403) && /credit|billing|balance/.test(msg);
}

let client: Anthropic | null = null;
/** Test hook: inject a client (fake transport) or reset. */
export function _setClientForTests(c: Anthropic | null): void { client = c; }

export interface CallOptions { maxTokens?: number; model?: string }

/**
 * One single-turn call. Returns the text of the reply. Throws AiBudgetError when the call is refused
 * by the cap or the credit ran out; throws Error for anything else. Never retries on another provider.
 */
export async function callModel(system: string, user: string, opts: CallOptions = {}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiBudgetError('ANTHROPIC_API_KEY not configured: paid AI calls are disabled');
  const model = opts.model || DEFAULT_MODEL;
  const maxTokens = opts.maxTokens || 8000;

  return serialized(async () => {
    const budget = monthlyBudgetUsd();
    const reserve = worstCaseCostUsd(model, system.length + user.length, maxTokens);
    const before = readLedger();
    if (before.spentUsd + reserve > budget) {
      throw new AiBudgetError(
        `Monthly AI budget reached: $${before.spentUsd.toFixed(2)} of $${budget.toFixed(2)} used; this call could cost up to $${reserve.toFixed(3)}`,
      );
    }
    // Reserve first: if the process dies mid-call, the worst case stays counted.
    writeLedger({ ...before, spentUsd: before.spentUsd + reserve, calls: before.calls + 1 });

    const c = client ?? (client = new Anthropic({ apiKey, timeout: 240_000, maxRetries: 1 }));
    let charged = reserve;
    try {
      // Non-streaming: max_tokens here is at most ~8k, well inside the request timeout.
      const msg = await c.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      });
      charged = actualCostUsd(model, msg.usage);
      if (msg.stop_reason === 'refusal') throw new Error('Model declined the request');
      return msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    } catch (err) {
      if (isCreditExhausted(err)) {
        throw new AiBudgetError('Included API credit exhausted for this billing cycle: paid AI calls stop until it refreshes');
      }
      throw err;
    } finally {
      // Replace the reservation by the real cost (or keep the worst case when it is unknown).
      const now = readLedger();
      writeLedger({ ...now, spentUsd: Math.max(0, now.spentUsd - reserve + charged) });
    }
  });
}
