/**
 * AI prompt template for DailyAI Picks report.
 * Injects real data into structured sections for Claude to analyze.
 *
 * Season-aware since 2026-11-17: only sports in `data.inSeasonSports` get data
 * sections or report sections, and the MLB-only sections (strikeouts, YRFI/NRFI,
 * home runs, hitting props) are asked for only while MLB is in season. Fewer
 * sports = a smaller prompt and a shorter, cheaper report.
 *
 * @created 2026-03-27
 */

import type { ReportContext } from './collect';
import { TRACKED_SPORTS } from './season';

/** Display label for an hb_sport_type key. */
export function sportLabel(key: string): string {
  return TRACKED_SPORTS.find((s) => s.key === key)?.label ?? key.toUpperCase();
}

/** Schedule lines per sport. A college slate can list 50+ games; the report needs the shape, not all of them. */
export const MAX_SCHEDULE_LINES = 25;

export function buildSystemPrompt(): string {
  return `You are DailyAIPicks — an expert sports betting analyst generating a daily report for dailyaibetting.com.

RULES:
- Use ONLY the data provided below. Never invent picks, odds, or statistics.
- Format with markdown: **bold headers**, bullet lists. NO tables.
- Short, punchy answers. No fluff, no disclaimers, no "I think".
- Skip any section that has no data (don't write "N/A" or "No data available").
- Group content by game when possible.
- For parlays, calculate combined decimal odds and convert to American.
- Confidence scores: 40% implied probability + 40% expert consensus + 20% statistical support.
- One vote per capper per bet (dedup by capper name).
- Use fire emoji for 3+ cappers agreeing OR 3+ unit plays.
- Include team names with all player props.
- Every pick must include odds when available.`;
}

export function buildUserPrompt(data: ReportContext): string {
  const sections: string[] = [];

  sections.push(`# DAILY AI PICKS — ${data.date}\n`);
  const sports = data.inSeasonSports ?? [];
  sections.push(`SPORTS IN SEASON TODAY: ${sports.length ? sports.map(sportLabel).join(', ') : 'none detected'}\n`);

  // ── Expert Picks ──────────────────────────────────────────────────────────
  if (data.expertPicks?.picks?.length > 0) {
    const picks = data.expertPicks.picks;
    const bySport: Record<string, typeof picks> = {};
    picks.forEach(p => {
      const sport = sportLabel(p.sport || 'other');
      if (!bySport[sport]) bySport[sport] = [];
      bySport[sport].push(p);
    });

    sections.push(`## EXPERT PICKS (${picks.length} picks from ${data.expertPicks.capperCount} cappers)\n`);
    for (const [sport, sportPicks] of Object.entries(bySport)) {
      sections.push(`### ${sport} (${sportPicks.length} picks)`);
      sportPicks.slice(0, 30).forEach(p => {
        sections.push(`- ${p.capper_name}: ${p.team} ${p.pick_type || ''} ${p.line || ''} (${p.odds || 'no odds'}) ${p.units ? p.units + 'u' : ''}`);
      });
    }
  }

  // ── PrizePicks Props ──────────────────────────────────────────────────────
  if (data.prizePicks?.length > 0) {
    sections.push('\n## PRIZEPICKS CURRENT LINES\n');
    const byType: Record<string, typeof data.prizePicks> = {};
    data.prizePicks.forEach(p => {
      const k = `${sportLabel(p.sport)} ${p.stat}`;
      if (!byType[k]) byType[k] = [];
      byType[k].push(p);
    });
    for (const [stat, props] of Object.entries(byType)) {
      sections.push(`### ${stat}`);
      props.slice(0, 15).forEach(p => {
        sections.push(`- ${p.player} (${p.team}): ${p.line}`);
      });
    }
  }

  // ── MLB Schedule ──────────────────────────────────────────────────────────
  if (data.mlbSchedule?.length > 0) {
    sections.push('\n## MLB SCHEDULE & PITCHERS\n');
    data.mlbSchedule.forEach(g => {
      sections.push(`- ${g.awayAbbr} (${g.awayRecord}) @ ${g.homeAbbr} (${g.homeRecord}) — ${g.awayPitcher} vs ${g.homePitcher} — ${g.venue}`);
    });
  }

  // ── ESPN Schedule ─────────────────────────────────────────────────────────
  if (data.espnSchedule) {
    for (const [sport, games] of Object.entries(data.espnSchedule)) {
      if (games.length === 0) continue;
      sections.push(`\n## ${sportLabel(sport)} SCHEDULE (${games.length} games)\n`);
      games.slice(0, MAX_SCHEDULE_LINES).forEach(g => {
        sections.push(`- ${g.awayTeam} (${g.awayRecord || '?'}) @ ${g.homeTeam} (${g.homeRecord || '?'}) — ${g.status}`);
      });
      if (games.length > MAX_SCHEDULE_LINES) sections.push(`- (+${games.length - MAX_SCHEDULE_LINES} more games)`);
    }
  }

  // ── Polymarket Odds ───────────────────────────────────────────────────────
  if (data.polymarket?.length > 0) {
    sections.push('\n## POLYMARKET ODDS (real money)\n');
    data.polymarket.slice(0, 20).forEach(m => {
      const pct = Math.round(m.probability * 100);
      sections.push(`- ${m.question}: ${pct}% YES ($${Math.round(m.volume24hr).toLocaleString()} vol)`);
    });
  }

  sections.push(buildReportInstructions(data));

  return sections.join('\n');
}

const MLB_SECTIONS = `**MLB STRIKEOUT PROPS:**
- Top 3 K Over/Under value bets
- Top 3 pitchers for 8+ Ks
- Top 3 pitchers likely to walk 3+ batters
- Top 3 for quality starts
- Top 3 best K value bets with justification

**YRFI/NRFI:**
- Top 5 NRFI pitchers
- Top 5 games least likely to score in 1st
- Top 3 YRFI targets

**HOME RUNS:**
- Top 3 HR candidates
- Top 5 stadiums LEAST likely for HRs
- Top 3 under HR plays

**PLAYER HITTING PROPS:**
- Top 3 to get a hit, over total bases, under total bases
- Top 3 RBI, runs scored, stolen bases

**MLB TEAM BETS:**
- Top 3 8+ runs, 10+ hits
- Top 3 first 5 inning winners

**UNDER HITS & HR PARLAYS:**
- Top 12 under-hits picks (1 per game)
- Top 5 aggressive under parlay (+5000 to +10000)`;

/**
 * The report's section list, built from what is in season. Sports that are out of
 * season are named as excluded so the model does not fill a section from memory.
 */
export function buildReportInstructions(data: Pick<ReportContext, 'inSeasonSports' | 'prizePicks'>): string {
  const sports = data.inSeasonSports ?? [];
  const labels = sports.map(sportLabel);
  const outOfSeason = TRACKED_SPORTS.filter((s) => !sports.includes(s.key)).map((s) => s.label);
  const parts: string[] = [];

  parts.push(`
---
USING ALL DATA ABOVE, generate the complete DailyAIPicks report. Answer EVERY section below.
Cover ONLY these sports: ${labels.length ? labels.join(', ') : 'whatever the expert picks above contain'}.${
    outOfSeason.length ? `\nThese sports are OUT OF SEASON today — do not mention them or recommend bets on them: ${outOfSeason.join(', ')}.` : ''}

**TOP 5 HIGHEST CONFIDENCE SINGLE BETS** (confidence 0-100%)
**TOP 5 MOST MENTIONED BETS** (count unique cappers per bet)
**TOP 5 STRONGEST CONSENSUS PICKS** (frequency + confidence + stats)
**BEST 2-LEG PARLAY** (combined odds calculated)
**BEST 3-LEG PARLAY** (combined odds calculated)`);

  if (data.prizePicks?.length > 0) parts.push('**BEST PLAYER PROP PARLAY** (2+ legs, from the PrizePicks lines above)');

  parts.push(`**BEST PICKS BY SPORT** (top 3 for each of: ${labels.length ? labels.join(', ') : 'each sport with picks'})
**TOP 3 STRAIGHT BETS** ($60 each from $2000 bankroll)
**MAX CONFIDENCE BET** ($200 from $2000 bankroll)

**TEAM BETS:**
- Top 5 most likely to win
- Top 3 spread bets
- Top 3 overs and unders`);

  if (sports.includes('mlb')) parts.push(`\n${MLB_SECTIONS}`);

  parts.push(`
**5-LEG LONG-SHOT PARLAY** ($2 stake, +150 to +400 per leg)
**10-15 LEG HIGH-PROBABILITY PARLAY** ($2 stake, -150 to -110 per leg)
**BEST $20 PICK** (expected return calculated)
**LADDER PICK** ($10 start, high confidence)
**TRENDS & ANGLES** (3-5 stat-based bullets)
`);

  return parts.join('\n');
}
