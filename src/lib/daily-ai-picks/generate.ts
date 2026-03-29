/**
 * DailyAI Picks report cache reader.
 *
 * Reports are generated locally by `hiddenbag-v2/scripts/daily-ai-report.mjs`
 * (PM2 cron, 3x/day) because BallparkPal + Statcast data lives on the local
 * filesystem. This module only reads the cached report from Supabase.
 *
 * generateFreshReport() is kept for the POST /api/daily-ai-picks fallback
 * but produces an inferior report (no BallparkPal/Statcast data on Vercel).
 *
 * @created 2026-03-27
 * @updated 2026-03-28 — split cache-read vs generation, local script is primary
 */

import { collectAllData, type ReportContext } from './collect';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getTodayET } from '@/lib/utils/date';
import { callOpenRouter } from '@/lib/utils/openrouter';

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

async function cacheReport(report: string, context: ReportContext): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    const today = getTodayET();

    // Upsert — update if today's row exists, insert if not
    await supabase.from('daily_ai_report').upsert({
      report_date: today,
      report_text: report,
      expert_pick_count: context.expertPicks?.picks?.length || 0,
      mlb_game_count: context.mlbSchedule?.length || 0,
      has_ballparkpal: !!context.ballparkPal,
      has_statcast: !!context.statcast,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'report_date' });
  } catch {
    // Non-fatal — page still works without cache
  }
}

// ── Main Generator ────────────────────────────────────────────────────────────

export interface GenerateResult {
  report: string;
  cached: boolean;
  generatedAt: string;
  dataStats: {
    expertPicks: number;
    cappers: number;
    mlbGames: number;
    prizePicksProps: number;
    hasBallparkPal: boolean;
    hasStatcast: boolean;
    sportCount: number;
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
export async function generateFreshReport(): Promise<GenerateResult> {
  const context = await collectAllData();
  const system = buildSystemPrompt();
  const user = buildUserPrompt(context);
  const report = await callOpenRouter(system, user, { maxTokens: 12000 });

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
      hasBallparkPal: !!context.ballparkPal,
      hasStatcast: !!context.statcast,
      sportCount: Object.keys(context.espnSchedule).length,
    },
  };
}
