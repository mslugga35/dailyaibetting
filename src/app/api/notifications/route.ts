import { NextResponse } from 'next/server';
import { internalBaseUrl } from '@/lib/data/server-fetch';
import { rateLimitGuard, parseIntParam, cronAuthGuard, INTERNAL_SSR_HEADER, internalSsrToken } from '@/lib/api-helpers';

/** Our own server-to-server call: skip the per-IP limit (only that; no data unlocked). */
const internalHeaders = (): Record<string, string> => { const t = internalSsrToken(); return t ? { [INTERNAL_SSR_HEADER]: t } : {}; };

export const dynamic = 'force-dynamic';

// GET - Fetch fire picks formatted for notifications
export async function GET(request: Request) {
  try {
    const limited = rateLimitGuard(request);
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json, discord, telegram
    const minCappers = parseIntParam(searchParams.get('minCappers'), 3, 1, 100);

    // Fetch consensus data
    const baseUrl = internalBaseUrl();
    const res = await fetch(`${baseUrl}/api/consensus`, { cache: 'no-store', headers: internalHeaders() });
    const data = await res.json();

    if (!data.success) {
      return NextResponse.json({ success: false, error: 'Failed to fetch consensus' }, { status: 500 });
    }

    // Filter to fire picks only
    const firePicks = (data.topOverall || [])
      // isFire, not the raw count: an out-voted opposite side keeps 3+ cappers but is not fire (2026-11-19).
      .filter((pick: any) => pick.isFire === true && pick.capperCount >= minCappers)
      .slice(0, 10); // Max 10 picks

    if (firePicks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No fire picks available',
        picks: [],
        formatted: format === 'discord' ? formatForDiscord([]) :
                   format === 'telegram' ? formatForTelegram([]) : null
      });
    }

    const response: any = {
      success: true,
      pickCount: firePicks.length,
      picks: firePicks,
      timestamp: new Date().toISOString(),
    };

    // Add formatted message based on format parameter
    if (format === 'discord') {
      response.formatted = formatForDiscord(firePicks);
    } else if (format === 'telegram') {
      response.formatted = formatForTelegram(firePicks);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// Format picks for Discord embed
function formatForDiscord(picks: any[]): object {
  if (picks.length === 0) {
    return {
      content: "No fire picks available right now. Check back later!",
      embeds: []
    };
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const fields = picks.map((pick, index) => ({
    name: `${getFireEmoji(pick)} ${pick.sport} - ${pick.matchup || 'Game'}`,
    value: `**${pick.bet}**\n${pick.capperCount} cappers agree`,
    inline: true,
  }));

  return {
    content: "",
    embeds: [{
      title: `🔥 Fire Picks - ${today}`,
      description: `${picks.length} consensus picks where 3+ experts agree`,
      color: 0x10b981, // Emerald green
      fields: fields.slice(0, 25), // Discord limit
      footer: {
        text: "DailyAI Betting • dailyaibetting.com",
      },
      timestamp: new Date().toISOString(),
    }]
  };
}

// Format picks for Telegram HTML
function formatForTelegram(picks: any[]): string {
  if (picks.length === 0) {
    return "No fire picks available right now. Check back later!";
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  let message = `🔥 <b>Fire Picks - ${today}</b>\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;

  picks.forEach((pick, index) => {
    const fire = getFireEmoji(pick);
    message += `${fire} <b>${pick.sport}</b>\n`;
    message += `📍 ${pick.matchup || 'Game'}\n`;
    message += `✅ <b>${pick.bet}</b>\n`;
    message += `👥 ${pick.capperCount} cappers agree\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `🌐 <a href="https://dailyaibetting.com">dailyaibetting.com</a>`;

  return message;
}

function getFireEmoji(pick: { capperCount: number; isFire?: boolean }): string {
  if (pick.isFire === false) return '';
  const count = pick.capperCount;
  if (count >= 7) return '🔥🔥🔥';
  if (count >= 5) return '🔥🔥';
  if (count >= 3) return '🔥';
  return '';
}

// POST - Send notification to Discord/Telegram (webhook trigger)
export async function POST(request: Request) {
  try {
    // Auth check — require CRON_SECRET
    const denied = cronAuthGuard(request);
    if (denied) return denied;

    const body = await request.json();
    const { platform, webhookUrl } = body;

    if (!platform || !webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing platform or webhookUrl' },
        { status: 400 }
      );
    }

    // Validate webhook URL — only allow Discord and Telegram domains.
    // Exact host or true subdomain match only — endsWith() alone would let
    // "evildiscord.com" or "api.telegram.org.attacker.com" through.
    // Each platform is pinned to its own host AND webhook path: a CRON_SECRET holder
    // cannot point this at an arbitrary endpoint on those domains or elsewhere.
    const RULES: Record<string, { hosts: string[]; path: RegExp }> = {
      discord: { hosts: ['discord.com', 'discordapp.com'], path: /^\/api\/webhooks\/\d+\/[\w-]+\/?$/ },
      telegram: { hosts: ['api.telegram.org'], path: /^\/bot\d+:[\w-]+\/sendMessage$/ },
    };
    const rule = RULES[String(platform)];
    try {
      const url = new URL(webhookUrl);
      const ok = !!rule && url.protocol === 'https:' && url.port === '' && !url.username && !url.password
        && rule.hosts.includes(url.hostname) && rule.path.test(url.pathname);
      if (!ok) {
        return NextResponse.json(
          { success: false, error: 'Invalid webhook URL — only Discord and Telegram allowed' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid URL' }, { status: 400 });
    }

    // Get formatted picks
    const baseUrl = internalBaseUrl();
    const format = platform === 'discord' ? 'discord' : 'telegram';
    const res = await fetch(`${baseUrl}/api/notifications?format=${format}`, { cache: 'no-store', headers: internalHeaders() });
    const data = await res.json();

    if (!data.success || !data.formatted) {
      return NextResponse.json({ success: false, error: 'No picks to send' }, { status: 400 });
    }

    // Send to webhook
    if (platform === 'discord') {
      const discordRes = await fetch(webhookUrl, {
        method: 'POST',
        redirect: 'error', // never follow a redirect off the allow-listed endpoint
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.formatted),
      });

      if (!discordRes.ok) {
        throw new Error(`Discord webhook failed: ${discordRes.status}`);
      }
    } else if (platform === 'telegram') {
      // Telegram requires bot token and chat_id in webhook URL format:
      // https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>
      const telegramRes = await fetch(webhookUrl, {
        method: 'POST',
        redirect: 'error',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: data.formatted,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      });

      if (!telegramRes.ok) {
        throw new Error(`Telegram API failed: ${telegramRes.status}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${data.pickCount} picks to ${platform}`,
    });
  } catch (error) {
    console.error('Notification send error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
