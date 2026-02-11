/**
 * Test WagerTalk Free Picks Parser
 *
 * Structure:
 * - Handicapper: href="/profile/NAME"
 * - Sport: href="/free-sports-picks/SPORT"
 * - Event: <div class="content-event">MATCHUP</div>
 * - Date: <div class="content-date">DATE</div>
 * - Pick: <div class="content-play">PICK</div>
 */

const fs = require('fs');

function normalizeSport(sport) {
  const sportMap = {
    'college-basketball': 'NCAAB',
    'college-football': 'NCAAF',
    'nba': 'NBA',
    'nfl': 'NFL',
    'nhl': 'NHL',
    'mlb': 'MLB',
    'china-cba': 'CBA',
    'korean-baseball': 'KBO'
  };
  return sportMap[sport] || sport.toUpperCase();
}

function clean(s) {
  return (s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDate(dateStr) {
  // Convert "December 30, 2025 9:00 PM EST" to "Dec 30, 2025"
  const match = dateStr.match(/(\w+)\s+(\d+),\s+(\d{4})/);
  if (match) {
    const months = {
      'January': 'Jan', 'February': 'Feb', 'March': 'Mar', 'April': 'Apr',
      'May': 'May', 'June': 'Jun', 'July': 'Jul', 'August': 'Aug',
      'September': 'Sep', 'October': 'Oct', 'November': 'Nov', 'December': 'Dec'
    };
    const month = months[match[1]] || match[1];
    return `${month} ${match[2]}, ${match[3]}`;
  }
  return dateStr;
}

function parseRunDate(dateStr) {
  // Convert to YYYY-MM-DD
  const match = dateStr.match(/(\w+)\s+(\d+),\s+(\d{4})/);
  if (match) {
    const months = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04',
      'May': '05', 'June': '06', 'July': '07', 'August': '08',
      'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    const month = months[match[1]];
    const day = match[2].padStart(2, '0');
    return `${match[3]}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

function parseWagerTalk(html) {
  const picks = [];

  // Match the pro-card container blocks
  const cardPattern = /<div class="pro-card d-flex[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/section>/g;
  const cards = html.match(cardPattern) || [];

  for (const card of cards) {
    // Extract handicapper name from profile link
    const capperMatch = card.match(/profile\/([^"]+)"/);
    if (!capperMatch) continue;
    const capperSlug = capperMatch[1];
    const capper = capperSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Extract sport from sport link
    const sportMatch = card.match(/free-sports-picks\/([^"]+)"/);
    if (!sportMatch) continue;
    const rawSport = sportMatch[1];
    const sport = normalizeSport(rawSport);

    // Extract event/matchup
    const eventMatch = card.match(/<div class="content-event"[^>]*>([^<]+)<\/div>/);
    if (!eventMatch) continue;
    const event = clean(eventMatch[1]);

    // Extract date
    const dateMatch = card.match(/<div class="content-date"[^>]*>([^<]+)<\/div>/);
    if (!dateMatch) continue;
    const rawDate = clean(dateMatch[1]);
    const date = parseDate(rawDate);
    const runDate = parseRunDate(rawDate);

    // Extract pick
    const pickMatch = card.match(/<div class="content-play"[^>]*>([^<]+)<\/div>/);
    if (!pickMatch) continue;
    const pick = clean(pickMatch[1]);

    // Create matchup from event (remove team IDs if present)
    const matchup = event.replace(/\(\d+\)\s*/g, '').trim();

    picks.push({
      Site: 'WagerTalk',
      League: sport,
      Date: date,
      Matchup: matchup,
      Service: capper,
      Pick: pick,
      RunDate: runDate
    });
  }

  return picks;
}

// Test the parser
const html = fs.readFileSync('wagertalk-free-picks.html', 'utf8');
const picks = parseWagerTalk(html);

console.log(`\n✅ Extracted ${picks.length} picks\n`);

picks.forEach((pick, i) => {
  console.log(`${i + 1}. ${pick.Service}`);
  console.log(`   Sport: ${pick.League}`);
  console.log(`   Matchup: ${pick.Matchup}`);
  console.log(`   Pick: ${pick.Pick}`);
  console.log(`   Date: ${pick.Date} (${pick.RunDate})`);
  console.log('');
});

console.log('\nSample JSON:');
console.log(JSON.stringify(picks[0], null, 2));
