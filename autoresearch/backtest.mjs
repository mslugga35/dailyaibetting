#!/usr/bin/env node
/**
 * Backtest engine for autoresearch pick optimization.
 * DO NOT MODIFY — this is the fixed evaluation harness.
 *
 * Reads model.json params, fetches graded ai_picks from Supabase,
 * evaluates how well the current params predict wins, and outputs metrics.
 *
 * Usage:
 *   node backtest.mjs              # full backtest
 *   node backtest.mjs --check      # just check if enough data exists
 *   node backtest.mjs --verbose    # show per-pick breakdown
 *
 * @created 2026-03-29
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = join(__dirname, 'model.json');

// Load env from .env.local BEFORE anything uses env vars
try {
  const envPath = join(__dirname, '..', '.env.local');
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* .env.local not found */ }

// ── Supabase via REST API ────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function querySupabase(table, params = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL or SUPABASE_KEY not set. Source .env.local first.');
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Load Model Params ────────────────────────────────────────────────────────

function loadModel() {
  return JSON.parse(readFileSync(MODEL_PATH, 'utf8'));
}

// ── Fetch Graded Picks ───────────────────────────────────────────────────────

async function fetchGradedPicks() {
  // Only graded picks (WIN, LOSS, PUSH) — not PENDING or VOID
  const picks = await querySupabase(
    'ai_picks',
    'result=in.(WIN,LOSS,PUSH)&order=pick_date.desc&select=id,pick_date,sport,team,opponent,bet_type,line,confidence,reasoning,data_sources,result'
  );
  return picks;
}

// ── Score a Pick Against Model Params ────────────────────────────────────────

function scorePick(pick, model) {
  const ds = pick.data_sources || {};

  // Would this pick have passed the current filters?
  const filters = model.filters;

  // Check consensus filter
  const consensusCount = ds.consensus || 0;
  if (consensusCount < filters.min_consensus_cappers) return null; // filtered out

  // Check statcast filters (if statcast data exists)
  if (ds.statcast) {
    const sc = ds.statcast;
    if (sc.kPct && sc.kPct < filters.min_k_pct) return null;
    if (sc.whiffPct && sc.whiffPct < filters.min_whiff_pct) return null;
    if (sc.chasePct && sc.chasePct < filters.min_chase_pct) return null;
  }

  // Check confidence against risk controls
  if (pick.confidence < model.risk_controls.min_confidence_to_pick) return null;

  // Calculate model confidence score using weights
  const w = model.confidence_weights;
  let score = 0;
  let totalWeight = 0;

  if (consensusCount > 0) {
    score += w.consensus_weight * Math.min(consensusCount / 7, 1.0); // normalize to 0-1
    totalWeight += w.consensus_weight;
  }

  if (ds.statcast) {
    const sc = ds.statcast;
    const statScore = ((sc.whiffPct || 0) / 50 + (sc.kPct || 0) / 40) / 2; // normalize
    score += w.statcast_weight * Math.min(statScore, 1.0);
    totalWeight += w.statcast_weight;
  }

  if (ds.ballparkPal) {
    score += w.bpp_sim_weight * (filters.min_bpp_confidence || 0.55);
    totalWeight += w.bpp_sim_weight;
  }

  // Line value (edge)
  if (ds.edge) {
    score += w.line_value_weight * Math.min(Math.abs(ds.edge) / 30, 1.0);
    totalWeight += w.line_value_weight;
  }

  const modelConfidence = totalWeight > 0 ? Math.round((score / totalWeight) * 10) : pick.confidence;

  // Apply bet type weight
  const btw = model.bet_type_weights;
  const btKey = pick.bet_type.toLowerCase().replace('k_over', 'k_props').replace('k_under', 'k_props');
  const betWeight = btw[btKey] ?? 1.0;

  return {
    ...pick,
    modelConfidence,
    betWeight,
    wouldPick: betWeight >= 0.5 && modelConfidence >= model.risk_controls.min_confidence_to_pick,
  };
}

// ── Run Backtest ─────────────────────────────────────────────────────────────

async function runBacktest(verbose = false) {
  const model = loadModel();
  const allPicks = await fetchGradedPicks();

  if (allPicks.length === 0) {
    console.log('No graded picks found. Need picks to flow + get graded first.');
    process.exit(1);
  }

  // Score each pick
  const scored = allPicks
    .map(p => scorePick(p, model))
    .filter(p => p !== null && p.wouldPick);

  // Overall stats
  const wins = scored.filter(p => p.result === 'WIN').length;
  const losses = scored.filter(p => p.result === 'LOSS').length;
  const pushes = scored.filter(p => p.result === 'PUSH').length;
  const total = wins + losses;
  const winPct = total > 0 ? Math.round((wins / total) * 1000) / 10 : 0;

  // High confidence (7+)
  const highConf = scored.filter(p => p.confidence >= 7);
  const highWins = highConf.filter(p => p.result === 'WIN').length;
  const highLosses = highConf.filter(p => p.result === 'LOSS').length;
  const highTotal = highWins + highLosses;
  const highConfPct = highTotal > 0 ? Math.round((highWins / highTotal) * 1000) / 10 : 0;

  // ROI (flat $10 per pick, -110 odds = win $9.09, lose $10)
  const roi = total > 0
    ? Math.round(((wins * 9.09 - losses * 10) / (total * 10)) * 1000) / 10
    : 0;

  // By sport
  const bySport = {};
  for (const p of scored) {
    if (!bySport[p.sport]) bySport[p.sport] = { w: 0, l: 0 };
    if (p.result === 'WIN') bySport[p.sport].w++;
    else if (p.result === 'LOSS') bySport[p.sport].l++;
  }
  const sportStr = Object.entries(bySport)
    .map(([s, v]) => `${s}:${v.w + v.l > 0 ? Math.round((v.w / (v.w + v.l)) * 1000) / 10 : 0}`)
    .join(' ');

  // By bet type
  const byBet = {};
  for (const p of scored) {
    if (!byBet[p.bet_type]) byBet[p.bet_type] = { w: 0, l: 0 };
    if (p.result === 'WIN') byBet[p.bet_type].w++;
    else if (p.result === 'LOSS') byBet[p.bet_type].l++;
  }
  const betStr = Object.entries(byBet)
    .map(([b, v]) => `${b}:${v.w + v.l > 0 ? Math.round((v.w / (v.w + v.l)) * 1000) / 10 : 0}`)
    .join(' ');

  // By confidence level
  const byConf = {};
  for (const p of scored) {
    if (!byConf[p.confidence]) byConf[p.confidence] = { w: 0, l: 0 };
    if (p.result === 'WIN') byConf[p.confidence].w++;
    else if (p.result === 'LOSS') byConf[p.confidence].l++;
  }
  const confStr = Object.keys(byConf)
    .sort((a, b) => b - a)
    .map(c => `${c}:${byConf[c].w + byConf[c].l > 0 ? Math.round((byConf[c].w / (byConf[c].w + byConf[c].l)) * 1000) / 10 : 0}`)
    .join(' ');

  // Output (matches program.md format)
  console.log('---');
  console.log(`win_pct:        ${winPct}`);
  console.log(`total_graded:   ${scored.length}`);
  console.log(`wins:           ${wins}`);
  console.log(`losses:         ${losses}`);
  console.log(`pushes:         ${pushes}`);
  console.log(`high_conf_pct:  ${highConfPct}`);
  console.log(`roi:            ${roi >= 0 ? '+' : ''}${roi}`);
  console.log(`by_sport:       ${sportStr || 'none'}`);
  console.log(`by_bet_type:    ${betStr || 'none'}`);
  console.log(`by_confidence:  ${confStr || 'none'}`);
  console.log(`filtered_out:   ${allPicks.length - scored.length}`);
  console.log(`model_params:   filters.min_k_pct=${model.filters.min_k_pct} filters.min_whiff_pct=${model.filters.min_whiff_pct} weights.consensus=${model.confidence_weights.consensus_weight} weights.statcast=${model.confidence_weights.statcast_weight}`);

  if (verbose) {
    console.log('\n--- Per-Pick Breakdown ---');
    for (const p of scored) {
      console.log(`${p.pick_date} | ${p.sport} ${p.team} ${p.bet_type} ${p.line || ''} | conf:${p.confidence} model:${p.modelConfidence} | ${p.result}`);
    }
  }
}

// ── Check Mode ───────────────────────────────────────────────────────────────

async function checkData() {
  const picks = await fetchGradedPicks();
  const pending = await querySupabase('ai_picks', 'result=eq.PENDING&select=id');

  console.log(`Graded picks:  ${picks.length}`);
  console.log(`Pending picks: ${pending.length}`);
  console.log(`Total:         ${picks.length + pending.length}`);
  console.log(`Ready:         ${picks.length >= 30 ? 'YES — enough data for autoresearch' : `NO — need ${30 - picks.length} more graded picks`}`);

  if (picks.length > 0) {
    const sports = [...new Set(picks.map(p => p.sport))];
    const betTypes = [...new Set(picks.map(p => p.bet_type))];
    const dateRange = `${picks[picks.length - 1].pick_date} to ${picks[0].pick_date}`;
    console.log(`Sports:        ${sports.join(', ')}`);
    console.log(`Bet types:     ${betTypes.join(', ')}`);
    console.log(`Date range:    ${dateRange}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--check')) {
  await checkData();
} else {
  await runBacktest(args.includes('--verbose'));
}
