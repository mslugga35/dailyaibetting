/** Replaces src/lib/ai-picks/engine.ts: records the call instead of paying for a model call / posting to Discord. */
import { harness } from '../state.mjs';

export async function generateAIPicks(force) {
  harness().moduleCalls.push({ name: 'generateAIPicks', args: [force] });
  return { success: true, skipped: false, picks: [], fake: true };
}

export async function getTodayAIPicks() {
  harness().moduleCalls.push({ name: 'getTodayAIPicks', args: [] });
  return [];
}
