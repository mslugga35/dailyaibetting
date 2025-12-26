/**
 * DailyAI Betting - Telegram Fire Picks Bot
 *
 * Setup:
 * 1. Create a bot with @BotFather on Telegram
 * 2. Get the bot token and add to .env as TELEGRAM_BOT_TOKEN
 * 3. Get your chat/group ID and add as TELEGRAM_CHAT_ID
 * 4. Run: node telegram-bot.js
 *
 * To get chat ID:
 * - Add bot to group, send a message
 * - Visit: https://api.telegram.org/bot<TOKEN>/getUpdates
 * - Find "chat":{"id": YOUR_CHAT_ID}
 */

require('dotenv').config();
const fetch = require('node-fetch');
const cron = require('node-cron');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
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

// Format picks for Telegram HTML
function formatTelegramMessage(picks) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (picks.length === 0) {
    return "No fire picks available right now. Check back later! 🔍";
  }

  let message = `🔥 <b>Fire Picks - ${today}</b>\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;

  picks.forEach((pick) => {
    const fire = getFireEmoji(pick.capperCount);
    message += `${fire} <b>${pick.sport}</b>\n`;
    message += `📍 ${pick.matchup || 'Game'}\n`;
    message += `✅ <b>${pick.bet}</b>\n`;
    message += `👥 ${pick.capperCount} cappers agree\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `🌐 <a href="https://dailyaibetting.com">View All Picks</a>`;

  return message;
}

// Send to Telegram
async function sendToTelegram(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return false;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    const data = await response.json();
    if (data.ok) {
      console.log('Message sent to Telegram successfully');
      return true;
    } else {
      console.error('Telegram API error:', data.description);
      return false;
    }
  } catch (error) {
    console.error('Error sending to Telegram:', error);
    return false;
  }
}

// Main function
async function sendFirePicks() {
  console.log(`\n[${new Date().toISOString()}] Fetching fire picks...`);

  const picks = await fetchFirePicks();
  const message = formatTelegramMessage(picks);
  await sendToTelegram(message);
}

// Run immediately
sendFirePicks();

// Schedule: 10 AM and 5 PM ET daily
console.log('Scheduling fire picks notifications...');
console.log('- 10:00 AM ET (morning picks)');
console.log('- 5:00 PM ET (evening picks)');

cron.schedule('0 15 * * *', () => {
  console.log('Running morning picks notification...');
  sendFirePicks();
});

cron.schedule('0 22 * * *', () => {
  console.log('Running evening picks notification...');
  sendFirePicks();
});

console.log('\nBot running! Press Ctrl+C to stop.\n');
