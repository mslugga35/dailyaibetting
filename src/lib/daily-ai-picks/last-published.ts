/** DAI-22: light read for the report pages/API (kept out of generate.ts, which loads the generator). */
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getTodayET } from '@/lib/utils/date';

/**
 * DAI-22: newest report date before today (YYYY-MM-DD), so an empty page can say how long the
 * report has been down. null = no earlier report; undefined = the lookup failed (claim nothing).
 */
export async function getLastPublishedReportDate(): Promise<string | null | undefined> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('daily_ai_report')
      .select('report_date')
      .lt('report_date', getTodayET())
      .order('report_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return undefined;
    return (data?.report_date as string | undefined) ?? null;
  } catch {
    return undefined;
  }
}
