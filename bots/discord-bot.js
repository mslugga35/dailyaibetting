/**
 * DailyAI Betting - Discord Fire Picks Bot
 *
 * A simple Discord bot that posts fire picks to a channel.
 *
 * Setup:
 * 1. Create a Discord bot at https://discord.com/developers/applications
 * 2. Get the bot token and add it to .env as DISCORD_BOT_TOKEN
 * 3. Create a webhook in your Discord channel and add as DISCORD_WEBHOOK_URL
 * 4. Run: node discord-bot.js
 *
 * Or use the webhook-only mode (no bot needed):
 * - Just set DISCORD_WEBHOOK_URL and run with --webhook-only flag
 */

require('dotenv').config();
const fetch = require('node-fetch');
const cron = require('node-cron');

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const API_URL = process.env.API_URL || 'https://dailyaibetting.com/api/consensus';

// Emoji based on capper count
function getFireEmoji(count) {
  if (count >= 7) return '🔥🔥🔥';
  if (count >= 5) return '🔥🔥';
  if (count >= 3) return '🔥';
  return '';
}

// Fetch fire picks from API
async function fetchFirePicks() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!data.success || !data.topOverall) {
      console.log('No data available');
      return [];
    }

    // Filter to fire picks (3+ cappers)
    const firePicks = data.topOverall
      .filter(pick => pick.capperCount >= 3)
      .slice(0, 10);

    console.log(`Found ${firePicks.length} fire picks`);
    return firePicks;
  } catch (error) {
    console.error('Error fetching picks:', error);
    return [];
  }
}

// Format picks for Discord embed
function formatDiscordEmbed(picks) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (picks.length === 0) {
    return {
      content: "No fire picks available right now. Check back later! 🔍",
      embeds: []
    };
  }

  const fields = picks.map((pick) => ({
    name: `${getFireEmoji(pick.capperCount)} ${pick.sport}`,
    value: `**${pick.bet}**\n${pick.matchup || 'Game'}\n${pick.capperCount} cappers agree`,
    inline: true
  }));

  return {
    content: "",
    embeds: [{
      title: `🔥 Fire Picks - ${today}`,
      description: `${picks.length} consensus picks where 3+ experts agree\n\n[View All Picks](https://dailyaibetting.com)`,
      color: 0x10b981, // Emerald green
      fields: fields,
      footer: {
        text: "DailyAI Betting • dailyaibetting.com"
      },
      timestamp: new Date().toISOString()
    }]
  };
}

// Send to Discord webhook
async function sendToDiscord(message) {
  if (!WEBHOOK_URL) {
    console.error('DISCORD_WEBHOOK_URL not set');
    return false;
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (response.ok) {
      console.log('Message sent to Discord successfully');
      return true;
    } else {
      console.error('Discord webhook error:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error sending to Discord:', error);
    return false;
  }
}

// Main function to fetch and send picks
async function sendFirePicks() {
  console.log(`\n[${new Date().toISOString()}] Fetching fire picks...`);

  const picks = await fetchFirePicks();
  const message = formatDiscordEmbed(picks);
  await sendToDiscord(message);
}

// Run immediately on start
sendFirePicks();

// Schedule: 10 AM and 5 PM ET daily
// Note: Adjust cron expressions for your server's timezone
console.log('Scheduling fire picks notifications...');
console.log('- 10:00 AM ET (morning picks)');
console.log('- 5:00 PM ET (evening picks)');

// 10 AM ET = 15:00 UTC (or 14:00 during DST)
cron.schedule('0 15 * * *', () => {
  console.log('Running morning picks notification...');
  sendFirePicks();
});

// 5 PM ET = 22:00 UTC (or 21:00 during DST)
cron.schedule('0 22 * * *', () => {
  console.log('Running evening picks notification...');
  sendFirePicks();
});

console.log('\nBot running! Press Ctrl+C to stop.\n');
