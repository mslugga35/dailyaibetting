#!/usr/bin/env node
/**
 * Manual runner for AI Pick Engine.
 * Collects all 8 data sources, calls Claude, saves picks to DB.
 * Run: node scripts/run-ai-picks.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Load env
const envPath = join(import.meta.dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');
for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx <= 0) continue;
  if (!process.env[trimmed.slice(0, eqIdx).trim()]) {
    process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const BPP_DIR = join(homedir(), '.cache', 'ballparkpal');
const STATCAST_CACHE = join(homedir(), '.cache', 'hiddenbag', 'mlb-statcast.json');

async function supabaseQuery(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  return res.json();
}

async function supabaseInsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(rows),
  });
  return res.json();
}

// ── Collect Data ─────────────────────────────────────────────────────────────

console.log('Collecting data from 8 sources...');

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

// Expert picks from Supabase
const expertPicks = await supabaseQuery('hb_picks',
  `posted_at=gte.${yesterday}T20:00:00&posted_at=lte.${today}T23:59:59&order=posted_at.desc&limit=500&select=sport,team,opponent,pick_type,line,odds,units,capper_id`
);
console.log(`  Expert picks: ${expertPicks.length}`);

// BallparkPal
let bppData = null;
const bppFile = join(BPP_DIR, today, 'combined.json');
const bppYesterday = join(BPP_DIR, yesterday, 'combined.json');
if (existsSync(bppFile)) {
  bppData = JSON.parse(readFileSync(bppFile, 'utf8'));
} else if (existsSync(bppYesterday)) {
  bppData = JSON.parse(readFileSync(bppYesterday, 'utf8'));
}
console.log(`  BallparkPal: ${bppData ? 'YES' : 'NO'}`);

// Statcast
let statcast = null;
if (existsSync(STATCAST_CACHE)) {
  statcast = JSON.parse(readFileSync(STATCAST_CACHE, 'utf8'));
}
console.log(`  Statcast: ${statcast ? `${statcast.alertCount} alerts, ${statcast.statcastPitchers} pitchers` : 'NO'}`);

// PrizePicks
let prizePicks = [];
try {
  const ppRes = await fetch('https://partner-api.prizepicks.com/projections?league_id=2&per_page=250');
  if (ppRes.ok) {
    const ppData = await ppRes.json();
    const playerMap = {};
    for (const inc of (ppData.included || [])) {
      if (inc.type === 'new_player') {
        playerMap[inc.id] = { name: inc.attributes?.display_name || inc.id, team: inc.attributes?.team || '' };
      }
    }
    for (const proj of (ppData.data || [])) {
      if (proj.attributes?.odds_type !== 'standard') continue;
      const player = playerMap[proj.relationships?.new_player?.data?.id] || { name: '?', team: '' };
      prizePicks.push({ player: player.name, team: player.team, stat: proj.attributes.stat_type, line: parseFloat(proj.attributes.line_score || 0) });
    }
  }
} catch {}
console.log(`  PrizePicks: ${prizePicks.length} props`);

// MLB Schedule
let mlbGames = [];
try {
  const mlbRes = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=probablePitcher,team`);
  if (mlbRes.ok) {
    const mlbData = await mlbRes.json();
    for (const date of (mlbData.dates || [])) {
      for (const game of (date.games || [])) {
        mlbGames.push({
          away: game.teams.away.team?.abbreviation,
          home: game.teams.home.team?.abbreviation,
          awayPitcher: game.teams.away.probablePitcher?.fullName || 'TBD',
          homePitcher: game.teams.home.probablePitcher?.fullName || 'TBD',
        });
      }
    }
  }
} catch {}
console.log(`  MLB games: ${mlbGames.length}`);

// Kalshi
let kalshiMarkets = [];
const kalshiSeries = ['KXMLBKS','KXMLBHR','KXMLBF5','KXMLBOU','KXMLBNRFI','KXMLBYRFI','KXNBAPTS','KXNBAGAME'];
const kalshiResults = await Promise.allSettled(
  kalshiSeries.map(async s => {
    const res = await fetch(`https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker=${s}&status=open&limit=50`, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.markets || []).map(m => ({ ticker: m.ticker, title: m.title || m.subtitle || '', yes_bid: (m.yes_bid || 0)/100, yes_ask: (m.yes_ask || 0)/100, volume: m.volume || 0, series: s }));
  })
);
for (const r of kalshiResults) if (r.status === 'fulfilled') kalshiMarkets.push(...r.value);
kalshiMarkets = kalshiMarkets.filter(m => m.volume > 0);
console.log(`  Kalshi: ${kalshiMarkets.length} markets`);

// ESPN
let espnGames = {};
for (const [key, path] of [['nba','basketball/nba'],['nhl','hockey/nhl'],['mlb','baseball/mlb']]) {
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`);
    if (res.ok) {
      const data = await res.json();
      espnGames[key] = (data.events || []).map(e => e.shortName).slice(0, 10);
    }
  } catch {}
}
console.log(`  ESPN: ${Object.values(espnGames).flat().length} games`);

console.log('\nBuilding AI prompt...');

// ── Build Prompt ─────────────────────────────────────────────────────────────

let prompt = `# DATA FOR ${today}\n\n`;

// Expert consensus
if (expertPicks.length > 0) {
  const bets = {};
  for (const p of expertPicks) {
    const key = `${p.sport}|${p.team}|${p.pick_type}|${p.line || ''}`.toLowerCase();
    if (!bets[key]) bets[key] = 0;
    bets[key]++;
  }
  prompt += `## EXPERT CONSENSUS (${expertPicks.length} picks)\n`;
  const sorted = Object.entries(bets).sort((a,b) => b[1] - a[1]);
  for (const [key, count] of sorted.slice(0, 30)) {
    const parts = key.split('|');
    prompt += `- ${parts[0].toUpperCase()} | ${parts[1]} ${parts[2]} ${parts[3]} | ${count} cappers\n`;
  }
}

// BallparkPal
if (bppData) {
  prompt += '\n## BALLPARKPAL SIMULATION DATA\n';
  for (const page of ['strikeouts', 'first-inning', 'first5', 'game-sims', 'positive-ev']) {
    const pd = bppData[page];
    if (pd?.tables?.[0]) {
      prompt += `### ${page}\nColumns: ${pd.tables[0].headers.join(' | ')}\n`;
      pd.tables[0].rows.slice(0, 12).forEach(r => prompt += `- ${r.join(' | ')}\n`);
    }
  }
}

// Statcast
if (statcast?.alerts && Array.isArray(statcast.alerts)) {
  const active = statcast.alerts.filter(a => a.signal !== 'neutral');
  if (active.length > 0) {
    prompt += '\n## STATCAST ALERTS\n';
    for (const a of active) {
      prompt += `- ${a.pitcher} (${a.team} vs ${a.opponent}): K-line ${a.kLine ?? '?'}, Expected ${a.expectedK ?? '?'} Ks, Edge ${a.edge}%, Whiff ${a.whiffPct}%, Chase ${a.chasePct}%, Signal: ${a.signal}\n`;
    }
  }
}

// PrizePicks K lines
const kProps = prizePicks.filter(p => p.stat?.toLowerCase().includes('strikeout'));
if (kProps.length > 0) {
  prompt += '\n## PRIZEPICKS K LINES\n';
  kProps.forEach(p => prompt += `- ${p.player} (${p.team}): ${p.line} Ks\n`);
}

// Kalshi
if (kalshiMarkets.length > 0) {
  const bySeries = {};
  for (const m of kalshiMarkets) {
    if (!bySeries[m.series]) bySeries[m.series] = [];
    bySeries[m.series].push(m);
  }
  prompt += '\n## KALSHI MARKETS\n';
  for (const [series, markets] of Object.entries(bySeries)) {
    prompt += `### ${series} (${markets.length} markets)\n`;
    for (const m of markets.slice(0, 8)) {
      const pct = Math.round(((m.yes_bid + m.yes_ask) / 2) * 100);
      prompt += `- ${m.title}: ${pct}% (vol:${m.volume})\n`;
    }
  }
}

// MLB schedule
if (mlbGames.length > 0) {
  prompt += '\n## MLB SCHEDULE\n';
  mlbGames.forEach(g => prompt += `- ${g.away} @ ${g.home} — ${g.awayPitcher} vs ${g.homePitcher}\n`);
}

// ESPN
for (const [sport, games] of Object.entries(espnGames)) {
  if (games.length > 0) prompt += `\n## ${sport.toUpperCase()} (${games.length} games)\n${games.map(g => `- ${g}`).join('\n')}\n`;
}

prompt += '\n---\nGenerate 8-15 structured picks as a JSON array. Output ONLY valid JSON, no markdown fences.';

console.log(`Prompt: ${prompt.length} chars`);
console.log('\nCalling Claude via OpenRouter...');

// ── Call Claude ──────────────────────────────────────────────────────────────

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 90000);

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENROUTER_KEY}`,
    'HTTP-Referer': 'https://dailyaibetting.com',
  },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4-6',
    max_tokens: 6000,
    temperature: 0.3,
    messages: [
      { role: 'system', content: `You are an AI sports betting analyst. Output ONLY a JSON array of picks. Each pick: {sport, team, opponent, bet_type (ML/SPREAD/OVER/UNDER/K_OVER/K_UNDER/NRFI/YRFI/PROP), line, confidence (1-10), reasoning, data_sources}. Generate 8-15 picks. Prioritize where multiple signals align.` },
      { role: 'user', content: prompt },
    ],
  }),
  signal: controller.signal,
});
clearTimeout(timeout);

if (!res.ok) {
  console.error('OpenRouter error:', res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
const raw = data.choices?.[0]?.message?.content || '';
console.log(`Response: ${raw.length} chars`);

// Parse
const cleaned = raw.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
let picks;
try {
  picks = JSON.parse(cleaned);
} catch {
  const match = cleaned.match(/\[[\s\S]*\]/);
  picks = match ? JSON.parse(match[0]) : [];
}

console.log(`\nParsed ${picks.length} picks:\n`);

const validBetTypes = ['ML', 'SPREAD', 'OVER', 'UNDER', 'K_OVER', 'K_UNDER', 'NRFI', 'YRFI', 'PROP'];

const rows = picks.map(p => ({
  pick_date: today,
  sport: String(p.sport || '').toUpperCase().slice(0, 10),
  team: String(p.team || '').slice(0, 100),
  opponent: String(p.opponent || '').slice(0, 100),
  bet_type: validBetTypes.includes(String(p.bet_type || '').toUpperCase()) ? String(p.bet_type).toUpperCase() : 'ML',
  line: p.line ? String(p.line).slice(0, 30) : null,
  confidence: Math.max(1, Math.min(10, Math.round(Number(p.confidence) || 5))),
  reasoning: String(p.reasoning || '').slice(0, 500),
  data_sources: typeof p.data_sources === 'object' ? p.data_sources : {},
  result: 'PENDING',
  locked_at: new Date().toISOString(),
})).filter(p => p.sport && p.team && p.reasoning);

for (const p of rows) {
  console.log(`[${p.confidence}/10] ${p.sport} | ${p.team} ${p.bet_type} ${p.line || ''} vs ${p.opponent}`);
  console.log(`         ${p.reasoning.slice(0, 120)}`);
  console.log();
}

// Save to Supabase
console.log(`Saving ${rows.length} picks to ai_picks table...`);
const saved = await supabaseInsert('ai_picks', rows);
if (saved.code) {
  console.error('Supabase error:', saved.message);
} else {
  console.log(`✅ Saved ${Array.isArray(saved) ? saved.length : 0} picks`);
}
