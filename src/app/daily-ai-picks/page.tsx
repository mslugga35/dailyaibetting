import type { Metadata } from 'next';
import { generateDailyReport } from '@/lib/daily-ai-picks/generate';
import { getLastPublishedReportDate } from '@/lib/daily-ai-picks/last-published';
import { getAiReportStatus } from '@/lib/daily-ai-picks/report-status';
import { DailyAIPicksContent } from './DailyAIPicksContent';

// Dynamic — data collection (6 APIs + AI generation) takes >60s, exceeds static build timeout.
// Cron refreshes cached report 3x/day; page reads from Supabase cache at request time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'DailyAI Picks — AI Best Bets Today',
  description: 'Free daily AI picks from expert consensus, PrizePicks lines and live schedules. Parlays and best bets for the sports in season today.',
  keywords: [
    'daily AI picks', 'best bets today', 'AI sports picks',
    'parlays today', 'free sports picks',
  ],
};

export default async function DailyAIPicksPage() {
  let result;
  try {
    result = await generateDailyReport();
  } catch {
    result = null;
  }

  // DAI-22: only look up the last report when today's is missing (says how long it has been down).
  const lastPublished = result ? undefined : await getLastPublishedReportDate();
  const reportStatus = getAiReportStatus(new Date(), !!result, lastPublished);
  return <DailyAIPicksContent result={result} reportStatus={reportStatus} />;
}
