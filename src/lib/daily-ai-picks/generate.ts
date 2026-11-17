/**
 * DailyAI Picks report cache reader.
 *
 * generateDailyReport() only reads today's cached report from Supabase.
 * generateFreshReport() (cron) collects the data, calls the model once, checks the
 * parlay arithmetic and the report's shape, then stores it.
 *
 * @created 2026-03-27
 * @updated 2026-03-28 — split cache-read vs generation
 * @updated 2026-11-17 — BallparkPal/Statcast removed (has_ballparkpal/has_statcast
 *   are still written, always false, so the shared daily_ai_report schema is
 *   unchanged); season-aware sports; parlay-math correction + report-sanity floor
 *   ported from hiddenbag-v2/scripts/daily-ai-report.mjs.
 */

import { collectAllData, type ReportContext } from './collect';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/service';
import { getTodayET } from '@/lib/utils/date';
import { callOpenRouter } from '@/lib/utils/openrouter';
import { validateParlayMath } from './parlay-math';
import { classifyReport } from './report-sanity';

/**
 * Output cap per run. A full in-season-MLB report measured 15–25k chars (~4–7k
 * tokens) on HB; without the MLB sections roughly half the sections remain.
 * The cap also sizes the OpenRouter budget guard's worst-case reservation.
 */
export function maxTokensFor(inSeasonSports: string[]): number {
  return inSeasonSports.includes('mlb') ? 12000 : 8000;
}

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (3x/day refresh via cron)

// ── Cache Layer (Supabase) ────────────────────────────────────────────────────

async function getCachedReport(allowStale = false): Promise<{ report: string; generatedAt: string } | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const today = getTodayET();

    const { data } = await supabase
      .from('daily_ai_report')
      .select('report_text, generated_at')
      .eq('report_date', today)
      .single();

    if (!data?.report_text) return null;

    // If allowStale, return any cached report from today regardless of age
    if (allowStale) return { report: data.report_text, generatedAt: data.generated_at };

    // Otherwise check freshness
    const age = Date.now() - new Date(data.generated_at).getTime();
    if (age > CACHE_TTL_MS) return null;

    return { report: data.report_text, generatedAt: data.generated_at };
  } catch {
    return null;
  }
}

/** Today's stored report via the service-role client. Throws when the check itself fails (unknown = do not pay). */
async function getTodaysStoredReport(): Promise<{ report: string; generatedAt: string } | null> {
  const { data, error } = await getServiceRoleClient()
    .from('daily_ai_report')
    .select('report_text, generated_at')
    .eq('report_date', getTodayET())
    .maybeSingle();
  if (error) throw new Error(`Could not check today's report: ${error.message}`);
  return data?.report_text ? { report: data.report_text, generatedAt: data.generated_at } : null;
}

async function cacheReport(report: string, context: ReportContext): Promise<void> {
  // daily_ai_report is written by service_role only; a cron has no user session.
  const { error } = await getServiceRoleClient().from('daily_ai_report').upsert({
      report_date: getTodayET(),
      report_text: report,
      expert_pick_count: context.expertPicks?.picks?.length || 0,
      mlb_game_count: context.mlbSchedule?.length || 0,
      // Columns kept for the shared schema; both sources were removed 2026-11-17.
      has_ballparkpal: false,
      has_statcast: false,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'report_date' });
  // A paid report that was not stored must fail loudly, not report success.
  if (error) throw new Error(`Failed to store report: ${error.message}`);
}

// ── Main Generator ────────────────────────────────────────────────────────────

export interface GenerateResult {
  report: string;
  cached: boolean;
  /** set when no paid call was made */
  skipReason?: 'already_generated' | 'no_expert_picks';
  generatedAt: string;
  dataStats: {
    expertPicks: number;
    cappers: number;
    mlbGames: number;
    prizePicksProps: number;
    /** always false since 2026-11-17; kept so API consumers do not break */
    hasBallparkPal: boolean;
    /** always false since 2026-11-17; kept so API consumers do not break */
    hasStatcast: boolean;
    sportCount: number;
    /** in-season sports the report covered */
    sports?: string[];
    /** parlay figures corrected before storing */
    parlayCorrections?: number;
  };
}

/**
 * Read today's cached report. Used by the page — never generates inline
 * because data collection + AI takes >60s (exceeds Vercel function timeout).
 * Returns null if no cached report exists yet (cron hasn't run).
 */
export async function generateDailyReport(): Promise<GenerateResult | null> {
  // Return any cached report from today (even stale) — page should never generate
  const cached = await getCachedReport(true);
  if (!cached) return null;

  return {
    report: cached.report,
    cached: true,
    generatedAt: cached.generatedAt,
    dataStats: {
      expertPicks: 0,
      cappers: 0,
      mlbGames: 0,
      prizePicksProps: 0,
      hasBallparkPal: false,
      hasStatcast: false,
      sportCount: 0,
    },
  };
}

/**
 * Generate a fresh report. Called ONLY by the cron API route —
 * collects data from 6 APIs + calls Claude, takes 60-120s.
 */
const NO_STATS: GenerateResult['dataStats'] = {
  expertPicks: 0, cappers: 0, mlbGames: 0, prizePicksProps: 0,
  hasBallparkPal: false, hasStatcast: false, sportCount: 0,
};

export async function generateFreshReport(): Promise<GenerateResult> {
  // One report per ET day: never pay to duplicate or overwrite today's report
  // (including one published by the local hiddenbag-v2 generator).
  const existing = await getTodaysStoredReport();
  if (existing) {
    return { report: existing.report, cached: true, skipReason: 'already_generated', generatedAt: existing.generatedAt, dataStats: NO_STATS };
  }

  // Only in-season sports are collected and prompted (see ./season.ts).
  const context = await collectAllData();
  if (context.expertPicks.picks.length === 0) {
    return { report: '', cached: false, skipReason: 'no_expert_picks', generatedAt: new Date().toISOString(), dataStats: NO_STATS };
  }

  const system = buildSystemPrompt();
  const user = buildUserPrompt(context);
  const rawReport = await callOpenRouter(system, user, { maxTokens: maxTokensFor(context.inSeasonSports) });

  // Never store wreckage: an empty reply, an error stub or a truncated tail.
  // The call was paid either way; failing loudly beats publishing it.
  const verdict = classifyReport(rawReport);
  if (!verdict.ok) throw new Error(`Model result is not a report: ${verdict.reason}`);

  // The model compounds parlay odds wrong intermittently (HB measured a 12-leg
  // parlay quoted at "+150 to +250" when it was +1099). Correct inline.
  const { issues, corrected: report } = validateParlayMath(rawReport);
  if (issues.length) {
    console.warn(`[daily-ai-picks] ${issues.length} parlay figure(s) corrected inline`);
  }

  await cacheReport(report, context);

  return {
    report,
    cached: false,
    generatedAt: new Date().toISOString(),
    dataStats: {
      expertPicks: context.expertPicks.picks.length,
      cappers: context.expertPicks.capperCount,
      mlbGames: context.mlbSchedule.length,
      prizePicksProps: context.prizePicks.length,
      hasBallparkPal: false,
      hasStatcast: false,
      sportCount: context.inSeasonSports.length,
      sports: context.inSeasonSports,
      parlayCorrections: issues.length,
    },
  };
}
