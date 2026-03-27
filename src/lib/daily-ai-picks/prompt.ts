/**
 * AI prompt template for DailyAI Picks report.
 * Injects real data into structured sections for Claude to analyze.
 *
 * @created 2026-03-27
 */

import type { ReportContext } from './collect';

export function buildSystemPrompt(): string {
  return `You are DailyAIPicks — an expert sports betting analyst generating a daily report for dailyaibetting.com.

RULES:
- Use ONLY the data provided below. Never invent picks, odds, or statistics.
- Format with markdown: **bold headers**, bullet lists. NO tables.
- Short, punchy answers. No fluff, no disclaimers, no "I think".
- Skip any section that has no data (don't write "N/A" or "No data available").
- Group MLB content by game when possible.
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

  // ── Expert Picks ──────────────────────────────────────────────────────────
  if (data.expertPicks?.picks?.length > 0) {
    const picks = data.expertPicks.picks;
    const bySport: Record<string, typeof picks> = {};
    picks.forEach(p => {
      const sport = (p.sport || 'other').toUpperCase();
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

  // ── BallparkPal ───────────────────────────────────────────────────────────
  if (data.ballparkPal) {
    sections.push('\n## BALLPARKPAL SIMULATION DATA\n');
    const bpp = data.ballparkPal as Record<string, { tables?: Array<{ headers: string[]; rows: string[][] }> }>;

    const bppPages = [
      { key: 'strikeouts', label: 'Strikeout Center' },
      { key: 'homeruns', label: 'Home Run Zone' },
      { key: 'first-inning', label: 'YRFI / NRFI Projections' },
      { key: 'first5', label: 'First 5 Innings' },
      { key: 'hits', label: 'Hits Projections' },
      { key: 'bases', label: 'Total Bases Projections' },
      { key: 'positive-ev', label: 'Positive EV Bets' },
      { key: 'park-factors', label: 'Park Factors' },
      { key: 'game-sims', label: 'Game Simulation O/U Odds' },
      { key: 'most-likely', label: 'Most Likely Outcomes' },
    ];

    for (const page of bppPages) {
      const pageData = bpp[page.key];
      if (pageData?.tables?.[0]) {
        const t = pageData.tables[0];
        sections.push(`### ${page.label}`);
        sections.push(`Columns: ${t.headers.join(' | ')}`);
        t.rows.slice(0, 25).forEach(r => sections.push(`- ${r.join(' | ')}`));
        sections.push('');
      }
    }
  }

  // ── Statcast Alerts ───────────────────────────────────────────────────────
  if (data.statcast?.alerts?.length) {
    const active = data.statcast.alerts.filter(a => a.signal !== 'neutral');
    if (active.length > 0) {
      sections.push('\n## STATCAST K-PROP SCANNER ALERTS\n');
      active.forEach(a => {
        sections.push(`- ${a.pitcher} (${a.team} vs ${a.opponent}): Line ${a.kLine ?? 'N/A'}, Expected ${a.expectedK ?? '?'} K, Edge ${a.edge ?? '?'}%, Whiff ${a.whiffPct ?? '?'}%, Signal: ${a.signal}`);
      });
    }
  }

  // ── PrizePicks Props ──────────────────────────────────────────────────────
  if (data.prizePicks?.length > 0) {
    sections.push('\n## PRIZEPICKS CURRENT LINES\n');
    const byType: Record<string, typeof data.prizePicks> = {};
    data.prizePicks.forEach(p => {
      if (!byType[p.stat]) byType[p.stat] = [];
      byType[p.stat].push(p);
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
      sections.push(`\n## ${sport.toUpperCase()} SCHEDULE (${games.length} games)\n`);
      games.forEach(g => {
        sections.push(`- ${g.awayTeam} (${g.awayRecord || '?'}) @ ${g.homeTeam} (${g.homeRecord || '?'}) — ${g.status}`);
      });
    }
  }

  // ── REPORT INSTRUCTIONS ───────────────────────────────────────────────────
  sections.push(`
---
USING ALL DATA ABOVE, generate the complete DailyAIPicks report. Answer EVERY section below.

**TOP 5 HIGHEST CONFIDENCE SINGLE BETS** (any sport, confidence 0-100%)
**TOP 5 MOST MENTIONED BETS** (count unique cappers per bet)
**TOP 5 STRONGEST CONSENSUS PICKS** (frequency + confidence + stats)
**BEST 2-LEG PARLAY** (combined odds calculated)
**BEST 3-LEG PARLAY** (combined odds calculated)
**BEST PLAYER PROP PARLAY** (2+ legs)
**BEST PICKS BY SPORT** (top 3 per sport with data)
**TOP 3 STRAIGHT BETS** ($60 each from $2000 bankroll)
**MAX CONFIDENCE BET** ($200 from $2000 bankroll)

**MLB STRIKEOUT PROPS:**
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

**TEAM BETS:**
- Top 5 most likely to win
- Top 3 spread bets, 8+ runs, 10+ hits
- Top 3 overs and unders
- Top 3 first 5 inning winners

**UNDER HITS & HR PARLAYS:**
- Top 12 under-hits picks (1 per game)
- Top 5 aggressive under parlay (+5000 to +10000)

**5-LEG LONG-SHOT PARLAY** ($2 stake, +150 to +400 per leg)
**10-15 LEG HIGH-PROBABILITY PARLAY** ($2 stake, -150 to -110 per leg)
**BEST $20 PICK** (expected return calculated)
**LADDER PICK** ($10 start, high confidence)
**TRENDS & ANGLES** (3-5 stat-based bullets)
`);

  return sections.join('\n');
}
