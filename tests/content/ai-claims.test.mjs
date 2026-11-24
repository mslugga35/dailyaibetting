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
