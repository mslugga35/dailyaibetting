/** Replaces src/lib/daily-ai-picks/generate.ts: records the call; no model spend. */
import { harness } from '../state.mjs';

const fakeResult = () => ({ report: { date: '2026-11-09', picks: [], fake: true }, cached: false });

export async function generateDailyReport() {
  harness().moduleCalls.push({ name: 'generateDailyReport', args: [] });
  return fakeResult();
}

export async function generateFreshReport() {
  harness().moduleCalls.push({ name: 'generateFreshReport', args: [] });
  return fakeResult();
}
