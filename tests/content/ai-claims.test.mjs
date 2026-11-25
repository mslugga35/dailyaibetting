/**
 * Launch 2026-11-24: AI generation is paused (no paid model provider active). Always-visible labels must not
 * present AI picks or AI analysis as an active feature. Content that is AI-generated is shown only when it exists.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('always-visible badges do not advertise AI picks or AI analysis as active', () => {
  assert.doesNotMatch(src('src/app/page.tsx'), />AI-Powered Picks</);
  assert.match(src('src/app/page.tsx'), />Expert Consensus Picks</);
  assert.doesNotMatch(src('src/app/daily-bets/DailyBetsContent.tsx'), />Daily AI Analysis</);
});

test('AI report and bot-pick tabs render only when that content exists', () => {
  const s = src('src/app/daily-bets/DailyBetsContent.tsx');
  assert.match(s, /\{data\.aiReport && \(\s*<Section value="ai-picks"/);
  assert.match(s, /\{data\.botPicks\?\.length > 0 && \(\s*<Section value="bot"/);
});

// Launch acceptance 2026-11-25 (F1/F2): claims must match what the product does today, including metadata
// (title, description, Open Graph, Twitter, JSON-LD), not just visible copy.
const { readdirSync, statSync } = await import('node:fs');
const { join } = await import('node:path');
const ROOT = new URL('../../', import.meta.url);
const walk = (p, out = []) => {
  if (statSync(p).isDirectory()) for (const n of readdirSync(p)) walk(join(p, n), out);
  else if (/\.(tsx|ts)$/.test(p) && !/\.test\./.test(p)) out.push(p);
  return out;
};
const rootPath = decodeURIComponent(ROOT.pathname).replace(/^\/([A-Za-z]:)/, '$1');
const SURFACES = ['src/app', 'src/components'].flatMap((d) => walk(join(rootPath, d)));

test('no page or metadata presents the paused AI features as active', () => {
  const BAD = [/AI-powered/i, /AI-analyzed/i, /AI-assisted/i, /written with the help of language models/i, /PrizePicks lines/i,
    /AI[- ](consensus|system|collects)/i, /Our AI/, /Free AI /, /AI (Sports Betting|Sports Picks|Consensus Sports Picks|Best Bets)/];
  // Report-only surfaces render AI text only when an AI report exists (historical/accurate).
  const REPORT_ONLY = /daily-ai-picks[\\/]DailyAIPicksContent\.tsx$/;
  const hits = [];
  for (const f of SURFACES.filter((x) => !REPORT_ONLY.test(x))) {
    const s = readFileSync(f, 'utf8');
    for (const re of BAD) if (re.test(s)) hits.push(`${f.slice(rootPath.length)}: ${re}`);
  }
  assert.deepEqual(hits, []);
});

test('pricing trial rule matches the approved Terms (no automatic-cancellation promise)', () => {
  const plans = src('src/lib/pricing/plans.ts');
  const policies = src('src/lib/legal/policies.ts');
  assert.doesNotMatch(plans, /cancelled right away/);
  const promise = 'We may deny or cancel duplicate or ineligible trials.';
  assert.ok(plans.includes(promise), 'pricing states the Terms wording');
  assert.ok(policies.includes(promise.replace('.', '')), 'Terms still contain the same wording');
});
