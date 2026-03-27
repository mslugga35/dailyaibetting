/**
 * Cron route for DailyAI Picks — force-refreshes the report + posts to Discord.
 * Runs 3x/day via Vercel cron: 10 AM, 2 PM, 6 PM ET.
 *
 * Posts the full report to #consensus Discord channel in chunked messages.
 * No site links — just pure picks data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDailyReport } from '@/lib/daily-ai-picks/generate';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const DISCORD_WEBHOOK = process.env.DISCORD_CONSENSUS_WEBHOOK_URL;

// ── Discord Posting ─────────────────────────────────────────────────────────

async function postToDiscord(report: string) {
  if (!DISCORD_WEBHOOK) return;

  const now = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
  });
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
    timeZone: 'America/New_York',
  });

  // Build header
  const header = `## 🧠 DailyAI Picks — ${today} (${now} ET)\n\n`;

  // Full content = header + report
  const fullContent = header + report;

  // Discord limit is 2000 chars per message — split into chunks
  const chunks = splitIntoChunks(fullContent, 1950);

  for (const chunk of chunks) {
    try {
      const res = await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: chunk }),
      });

      if (!res.ok) {
        console.error(`[Discord] Failed (${res.status})`);
        break;
      }

      // Rate limit: wait 1s between messages
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) {
      console.error(`[Discord] Error: ${e instanceof Error ? e.message : e}`);
      break;
    }
  }
}

/**
 * Split text into chunks at line boundaries, respecting Discord's char limit.
 */
function splitIntoChunks(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  const lines = text.split('\n');
  let current = '';

  for (const line of lines) {
    if (current.length + line.length + 1 > maxLen) {
      if (current) chunks.push(current.trim());
      current = line + '\n';
    } else {
      current += line + '\n';
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

// ── Cron Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await generateDailyReport(true);

    // Post to Discord consensus channel
    await postToDiscord(result.report);

    return NextResponse.json({
      success: true,
      generatedAt: result.generatedAt,
      reportLength: result.report.length,
      discordPosted: !!DISCORD_WEBHOOK,
      stats: result.dataStats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
