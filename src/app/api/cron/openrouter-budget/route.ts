/**
 * Cron-only: this month's AI spend (Claude API ledger) against AI_MONTHLY_BUDGET_USD.
 * Path kept for the installed scheduler; it no longer talks to OpenRouter (2026-11-24).
 * The Hetzner scheduler calls it before every paid job (alerts at 50/80/100%).
 * Returns numbers only; never the key. 503 when spend cannot be confirmed (fail closed).
 */

import { NextResponse } from 'next/server';
import { cronAuthGuard } from '@/lib/api-helpers';
import { getBudgetStatus, AiBudgetError } from '@/lib/utils/ai-model';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = cronAuthGuard(request);
  if (denied) return denied;
  try {
    const s = await getBudgetStatus();
    return NextResponse.json({ success: true, allowed: s.usedMonthUsd < s.budgetUsd, ...s });
  } catch (err) {
    const message = err instanceof AiBudgetError ? err.message : 'Budget check failed';
    return NextResponse.json({ success: false, allowed: false, error: message }, { status: 503 });
  }
}
