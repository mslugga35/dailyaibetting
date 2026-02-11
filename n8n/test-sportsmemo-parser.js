/**
 * Test SportsMemo Free Picks Parser
 *
 * Structure:
 * - Container: <div class="plays-column-inner sports-picks-inner-text-column">
 * - Capper: <h3><a href="...">NAME</a></h3> in plays-two
 * - Event: <p><strong>Event:</strong> MATCHUP</p>
 * - Sport: <p><strong>Sport/League:</strong> SPORT (...)</p>
 * - Date: <p><strong>Date/Time:</strong> DATE</p>
 * - Pick: <h3 class="orange"><strong>Free ... Pick Today:</strong> PICK</h3>
 */

const fs = require('fs');

function normalizeSport(sport) {
  const sportMap = {
    'CBB': 'NCAAB',
    'CFB': 'NCAAF',
    'NBA': 'NBA',
    'NFL': 'NFL',
    'NHL': 'NHL',
    'MLB': 'MLB'
  };
  return sportMap[sport] || sport;
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
  // Convert "December 29, 2025 7:00 PM EST" to "Dec 29, 2025"
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

function parseSportsMemo(html) {
  const picks = [];

  // Match each pick container
  const containerPattern = /<div class="plays-column-inner sports-picks-inner-text-column[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*(?=<div class="plays-column-inner|<div class="plays-main-content">|$)/gi;

  let match;
  while ((match = containerPattern.exec(html)) !== null) {
    const container = match[1];

    // Extract capper name from h3 link
    const capperMatch = container.match(/<h3><a[^>]*>([^<]+)<\/a><\/h3>/);
    if (!capperMatch) continue;
    const capper = clean(capperMatch[1]);

    // Extract event/matchup
    const eventMatch = container.match(/<p><strong>Event:<\/strong>\s*([^<]+)</);
    if (!eventMatch) continue;
    const event = clean(eventMatch[1]);

    // Extract sport
    const sportMatch = container.match(/<p><strong>Sport\/League:\s*<\/strong>\s*(\w+)/);
    if (!sportMatch) continue;
    const rawSport = clean(sportMatch[1]);
    const sport = normalizeSport(rawSport);

    // Extract date
    const dateMatch = container.match(/<p><strong>Date\/Time:\s*<\/strong>\s*([^<]+)</);
    if (!dateMatch) continue;
    const rawDate = clean(dateMatch[1]);
    const date = parseDate(rawDate);
    const runDate = parseRunDate(rawDate);

    // Extract pick from orange h3
    const pickMatch = container.match(/<h3 class="orange"><strong>Free[^:]*:\s*<\/strong>\s*([^<]+)<\/h3>/);
    if (!pickMatch) continue;
    const pick = clean(pickMatch[1]);

    // Create matchup from event (remove team IDs if present)
    const matchup = event.replace(/\(\d+\)\s*/g, '').trim();

    picks.push({
      Site: 'SportsMemo',
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
const html = fs.readFileSync('sportsmemo-free-picks.html', 'utf8');
const picks = parseSportsMemo(html);

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
