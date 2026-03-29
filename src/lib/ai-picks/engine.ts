/**
 * AI Pick Engine — generates structured, trackable picks from all data sources.
 *
 * Unlike the daily-ai-picks report (prose), this produces machine-readable picks
 * that get saved to `ai_picks` table and auto-graded against ESPN results.
 *
 * Data sources: BallparkPal sims, Statcast K%/whiff%, expert consensus,
 * PrizePicks lines, MLB Stats API, ESPN schedule.
 *
 * @created 2026-03-29
 */

import { collectAllData, type ReportContext } from '@/lib/daily-ai-picks/collect';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getTodayET } from '@/lib/utils/date';
import { callOpenRouter } from '@/lib/utils/openrouter';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AIPick {
  sport: string;
  team: string;
  opponent: string;
  bet_type: string;
  line: string | null;
  confidence: number;       // 1-10
  reasoning: string;
  data_sources: Record<string, unknown>;
}

interface EngineResult {
  picks: AIPick[];
  generated: boolean;
  pickCount: number;
  dataStats: {
    expertPicks: number;
    mlbGames: number;
    hasBallparkPal: boolean;
    hasStatcast: boolean;
    espnSports: number;
  };
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPickSystemPrompt(): string {
  return `You are an AI sports betting analyst. Your job is to analyze data and output STRUCTURED PICKS as JSON.

RULES:
- Use ONLY the data provided. Never invent stats, odds, or games.
- Output ONLY a JSON array. No markdown, no prose, no explanation outside the JSON.
- Each pick must have a clear, specific bet (team + line or prop + line).
- Confidence 1-10: 10 = near-lock (5+ cappers agree + sim data confirms), 1 = speculative.
- Generate 8-15 picks total across all available sports and bet types.
- Prioritize picks where MULTIPLE signals align (consensus + sims + stats).
- Include a mix: 3-5 high confidence (7-10), 3-5 medium (5-6), 2-3 value plays (3-4).
- For MLB: include K props, NRFI/YRFI, and game totals when data supports them.
- bet_type must be one of: ML, SPREAD, OVER, UNDER, K_OVER, K_UNDER, NRFI, YRFI, PROP
- data_sources must list which signals fired (e.g. {"consensus": 5, "ballparkPal": true, "statcast": {"whiffPct": 35.2}})

OUTPUT FORMAT (JSON array only):
[
  {
    "sport": "MLB",
    "team": "Yankees",
    "opponent": "Red Sox",
    "bet_type": "K_OVER",
    "line": "O 6.5 Ks",
    "confidence": 8,
    "reasoning": "Gerrit Cole K% 28.5, whiff 32%, facing bottom-5 K% lineup. BallparkPal sim: 7.2 expected Ks. 4 cappers on Over.",
    "data_sources": {"consensus": 4, "ballparkPal": true, "statcast": {"kPct": 28.5, "whiffPct": 32}}
  }
]`;
}

function buildPickUserPrompt(data: ReportContext): string {
  const sections: string[] = [];
  sections.push(`# DATA FOR ${data.date}\n`);

  // Expert picks with consensus counts
  if (data.expertPicks?.picks?.length > 0) {
    const picks = data.expertPicks.picks;
    // Group and count consensus
    const bets: Record<string, { count: number; cappers: string[]; sport: string; line: string | null; odds: string | null }> = {};
    for (const p of picks) {
      const key = `${p.sport}|${p.team}|${p.pick_type}|${p.line || ''}`.toLowerCase();
      if (!bets[key]) bets[key] = { count: 0, cappers: [], sport: p.sport, line: p.line, odds: p.odds };
      bets[key].count++;
      if (!bets[key].cappers.includes(p.capper_name)) bets[key].cappers.push(p.capper_name);
    }

    sections.push(`## EXPERT CONSENSUS (${picks.length} picks, ${data.expertPicks.capperCount} cappers)`);
    const sorted = Object.entries(bets).sort((a, b) => b[1].count - a[1].count);
    for (const [key, bet] of sorted.slice(0, 40)) {
      const parts = key.split('|');
      sections.push(`- ${parts[0].toUpperCase()} | ${parts[1]} ${parts[2]} ${parts[3]} | ${bet.count} cappers (${bet.cappers.slice(0, 5).join(', ')})`);
    }
  }

  // BallparkPal
  if (data.ballparkPal) {
    const bpp = data.ballparkPal as Record<string, { tables?: Array<{ headers: string[]; rows: string[][] }> }>;
    const pages = ['strikeouts', 'first-inning', 'first5', 'game-sims', 'positive-ev', 'homeruns'];
    for (const page of pages) {
      const pd = bpp[page];
      if (pd?.tables?.[0]) {
        sections.push(`\n### BPP: ${page}`);
        sections.push(`Columns: ${pd.tables[0].headers.join(' | ')}`);
        pd.tables[0].rows.slice(0, 15).forEach(r => sections.push(`- ${r.join(' | ')}`));
      }
    }
  }

  // Statcast alerts
  if (data.statcast?.alerts && Array.isArray(data.statcast.alerts)) {
    const active = data.statcast.alerts.filter((a: Record<string, unknown>) => a.signal !== 'neutral');
    if (active.length > 0) {
      sections.push('\n## STATCAST ALERTS');
      for (const a of active) {
        sections.push(`- ${a.pitcher} (${a.team} vs ${a.opponent}): K-line ${a.kLine ?? '?'}, Expected ${a.expectedK ?? '?'} Ks, Edge ${a.edge ?? '?'}%, Whiff ${a.whiffPct ?? '?'}%, Chase ${a.chasePct ?? '?'}%, Signal: ${a.signal}`);
      }
    }
  }

  // PrizePicks K props
  if (data.prizePicks?.length > 0) {
    const kProps = data.prizePicks.filter(p => p.stat.toLowerCase().includes('strikeout'));
    if (kProps.length > 0) {
      sections.push('\n## PRIZEPICKS K LINES');
      kProps.forEach(p => sections.push(`- ${p.player} (${p.team}): ${p.line} Ks`));
    }
  }

  // MLB schedule
  if (data.mlbSchedule?.length > 0) {
    sections.push('\n## MLB SCHEDULE');
    data.mlbSchedule.forEach(g => {
      sections.push(`- ${g.awayAbbr} (${g.awayRecord}) @ ${g.homeAbbr} (${g.homeRecord}) — ${g.awayPitcher} vs ${g.homePitcher}`);
    });
  }

  // ESPN multi-sport
  if (data.espnSchedule) {
    for (const [sport, games] of Object.entries(data.espnSchedule)) {
      if (games.length === 0) continue;
      sections.push(`\n## ${sport.toUpperCase()} (${games.length} games)`);
      games.forEach(g => sections.push(`- ${g.awayTeam} @ ${g.homeTeam}`));
    }
  }

  // Kalshi prediction market prices (player props, K's, NRFI, spreads, O/U)
  if (data.kalshi?.length > 0) {
    const bySeries: Record<string, typeof data.kalshi> = {};
    for (const m of data.kalshi) {
      if (!bySeries[m.series]) bySeries[m.series] = [];
      bySeries[m.series].push(m);
    }

    sections.push('\n## KALSHI MARKETS (real-money prediction market prices)');
    const seriesLabels: Record<string, string> = {
      KXMLBKS: 'MLB Strikeouts', KXMLBHR: 'MLB Home Runs', KXMLBF5: 'MLB First 5',
      KXMLBOU: 'MLB Over/Under', KXMLBNRFI: 'NRFI', KXMLBYRFI: 'YRFI',
      KXMLBRUNS: 'MLB Team Runs', KXNBAPTS: 'NBA Points', KXNBAAST: 'NBA Assists',
      KXNBAREB: 'NBA Rebounds', KXNBA3PT: 'NBA Threes', KXNBAGAME: 'NBA Game Winner',
      KXNBASPREAD: 'NBA Spread', KXNHLGAME: 'NHL Game Winner',
    };

    for (const [series, markets] of Object.entries(bySeries)) {
      const label = seriesLabels[series] || series;
      sections.push(`\n### ${label} (${markets.length} markets)`);
      for (const m of markets.slice(0, 10)) {
        const yesPct = Math.round(((m.yes_bid + m.yes_ask) / 2) * 100);
        sections.push(`- ${m.title}: ${yesPct}% (bid ${Math.round(m.yes_bid*100)}¢ / ask ${Math.round(m.yes_ask*100)}¢) vol:${m.volume}`);
      }
    }
    sections.push('Note: Kalshi prices reflect real-money prediction market odds. Compare against your model for edge detection.');
  }

  // Polymarket real-money odds (crowd-sourced probabilities)
  if (data.polymarket?.length > 0) {
    sections.push('\n## POLYMARKET ODDS (real-money markets)');
    for (const m of data.polymarket.slice(0, 20)) {
      const pct = Math.round(m.probability * 100);
      sections.push(`- ${m.question}: ${pct}% YES ($${Math.round(m.volume24hr).toLocaleString()} 24h vol)`);
    }
    sections.push('Note: Polymarket odds reflect where real money is placed. Use as confirmation/contradiction of other signals.');
  }

  sections.push('\n---\nGenerate 8-15 structured picks as a JSON array. Output ONLY valid JSON, no markdown fences.');

  return sections.join('\n');
}

// ── Parse + Validate ─────────────────────────────────────────────────────────

function parsePicks(raw: string): AIPick[] {
  // Strip markdown fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();

  let parsed: unknown[];
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON array from response
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found in response');
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed)) throw new Error('Response is not an array');

  const validBetTypes = ['ML', 'SPREAD', 'OVER', 'UNDER', 'K_OVER', 'K_UNDER', 'NRFI', 'YRFI', 'PROP'];

  return parsed
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map(p => ({
      sport: String(p.sport || '').toUpperCase().slice(0, 10),
      team: String(p.team || '').slice(0, 100),
      opponent: String(p.opponent || '').slice(0, 100),
      bet_type: validBetTypes.includes(String(p.bet_type || '').toUpperCase())
        ? String(p.bet_type).toUpperCase()
        : 'ML',
      line: p.line ? String(p.line).slice(0, 30) : null,
      confidence: Math.max(1, Math.min(10, Math.round(Number(p.confidence) || 5))),
      reasoning: String(p.reasoning || '').slice(0, 500),
      data_sources: (typeof p.data_sources === 'object' && p.data_sources !== null)
        ? p.data_sources as Record<string, unknown>
        : {},
    }))
    .filter(p => p.sport && p.team && p.reasoning);
}

// ── Save to Supabase ─────────────────────────────────────────────────────────

async function savePicks(picks: AIPick[]): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const today = getTodayET();

  const rows = picks.map(p => ({
    pick_date: today,
    sport: p.sport,
    team: p.team,
    opponent: p.opponent,
    bet_type: p.bet_type,
    line: p.line,
    confidence: p.confidence,
    reasoning: p.reasoning,
    data_sources: p.data_sources,
    result: 'PENDING',
    locked_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('ai_picks')
    .insert(rows)
    .select('id');

  if (error) throw new Error(`Failed to save picks: ${error.message}`);
  return data?.length || 0;
}

// ── Check if already generated today ─────────────────────────────────────────

async function alreadyGenerated(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const today = getTodayET();

  const { count } = await supabase
    .from('ai_picks')
    .select('id', { count: 'exact', head: true })
    .eq('pick_date', today);

  return (count ?? 0) > 0;
}

// ── Discord Posting (Agent-OS server) ────────────────────────────────────────

const DISCORD_WEBHOOK = process.env.AI_PICKS_DISCORD_WEBHOOK || '';
const MOCK_BANKROLL = 1000; // $1000 starting bankroll, $10 flat bets

async function postToDiscord(picks: AIPick[]): Promise<void> {
  if (!DISCORD_WEBHOOK) return;

  // Fetch current record from DB
  let record = { wins: 0, losses: 0, pushes: 0, winPct: 0 };
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from('ai_picks_overall').select('*').single();
    if (data) record = { wins: data.wins, losses: data.losses, pushes: data.pushes, winPct: data.win_pct || 0 };
  } catch { /* first run */ }

  const bankroll = MOCK_BANKROLL + (record.wins * 9.09) - (record.losses * 10);
  const today = getTodayET();

  const highConf = picks.filter(p => p.confidence >= 7);
  const medConf = picks.filter(p => p.confidence >= 5 && p.confidence < 7);
  const lowConf = picks.filter(p => p.confidence < 5);

  let msg = `## 🤖 AI Pick Engine — ${today}\n`;
  msg += `**Bankroll:** $${bankroll.toFixed(2)} | **Record:** ${record.wins}W-${record.losses}L | **Win%:** ${record.winPct}%\n`;
  msg += `**Picks today:** ${picks.length} (${highConf.length} high, ${medConf.length} med, ${lowConf.length} value)\n\n`;

  if (highConf.length > 0) {
    msg += `### 🔥 High Confidence (7-10)\n`;
    for (const p of highConf) {
      msg += `**[${p.confidence}/10]** ${p.sport} | ${p.team} ${p.bet_type} ${p.line || ''} vs ${p.opponent}\n`;
      msg += `> ${p.reasoning.slice(0, 150)}\n`;
    }
    msg += '\n';
  }

  if (medConf.length > 0) {
    msg += `### 📊 Medium Confidence (5-6)\n`;
    for (const p of medConf) {
      msg += `**[${p.confidence}/10]** ${p.sport} | ${p.team} ${p.bet_type} ${p.line || ''} vs ${p.opponent}\n`;
    }
    msg += '\n';
  }

  if (lowConf.length > 0) {
    msg += `### 🎯 Value Plays (1-4)\n`;
    for (const p of lowConf) {
      msg += `**[${p.confidence}/10]** ${p.sport} | ${p.team} ${p.bet_type} ${p.line || ''}\n`;
    }
  }

  msg += `\n*$10 flat bets | Graded daily via ESPN | Locked at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })} ET*`;

  try {
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: msg.slice(0, 2000) }),
    });
  } catch { /* non-fatal */ }
}

// ── Main Entry Point ─────────────────────────────────────────────────────────

export async function generateAIPicks(force = false): Promise<EngineResult> {
  // Don't double-generate
  if (!force && await alreadyGenerated()) {
    return { picks: [], generated: false, pickCount: 0, dataStats: { expertPicks: 0, mlbGames: 0, hasBallparkPal: false, hasStatcast: false, espnSports: 0 } };
  }

  // Collect all data
  const context = await collectAllData();

  // Build prompts and call Claude
  const system = buildPickSystemPrompt();
  const user = buildPickUserPrompt(context);
  const raw = await callOpenRouter(system, user, { maxTokens: 6000, temperature: 0.3 });

  // Parse and validate
  const picks = parsePicks(raw);

  // Save to DB + post to Discord in parallel (Discord is fire-and-forget)
  const [saved] = await Promise.all([
    savePicks(picks),
    postToDiscord(picks),
  ]);

  return {
    picks,
    generated: true,
    pickCount: saved,
    dataStats: {
      expertPicks: context.expertPicks.picks.length,
      mlbGames: context.mlbSchedule.length,
      hasBallparkPal: !!context.ballparkPal,
      hasStatcast: !!context.statcast,
      espnSports: Object.keys(context.espnSchedule).length,
    },
  };
}

/**
 * Fetch today's AI picks from DB (for display on the daily-bets page).
 */
export async function getTodayAIPicks(): Promise<AIPick[]> {
  const supabase = await createServerSupabaseClient();
  const today = getTodayET();

  const { data } = await supabase
    .from('ai_picks')
    .select('sport, team, opponent, bet_type, line, confidence, reasoning, data_sources, result')
    .eq('pick_date', today)
    .order('confidence', { ascending: false });

  return (data || []) as AIPick[];
}
