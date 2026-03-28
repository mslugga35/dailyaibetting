import type { Metadata } from 'next';
import { generateDailyReport } from '@/lib/daily-ai-picks/generate';
import { DailyAIPicksContent } from './DailyAIPicksContent';

// Dynamic — data collection (6 APIs + AI generation) takes >60s, exceeds static build timeout.
// Cron refreshes cached report 3x/day; page reads from Supabase cache at request time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'DailyAI Picks — AI-Powered Best Bets Today',
  description: 'Free daily AI picks powered by BallparkPal, Statcast, PrizePicks, and expert consensus. Updated hourly with MLB strikeout props, YRFI/NRFI, parlays, and best bets across all sports.',
  keywords: [
    'daily AI picks', 'best bets today', 'AI sports picks',
    'MLB strikeout props', 'YRFI NRFI', 'parlays today',
    'BallparkPal picks', 'Statcast props', 'free sports picks',
  ],
};

export default async function DailyAIPicksPage() {
  let result;
  try {
    result = await generateDailyReport();
  } catch {
    result = null;
  }

  return <DailyAIPicksContent result={result} />;
}
