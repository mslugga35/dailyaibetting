/**
 * SportsCapping.com HTML Parser - Local Test Script
 *
 * Run this to test the parser before deploying to n8n:
 * node test-sportscapping-parser.js
 */

const https = require('https');

// Fetch the page
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Get today's date in NY timezone
function todayNY() {
  const opts = { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-CA', opts).formatToParts(new Date());
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
}

// Clean text helper
function clean(s) {
  return (s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract handicapper name
function extractHandicapper(text) {
  const patterns = [
    /(?:by|from|expert)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:-|\||$)/,
    /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length > 3) {
      return match[1].trim();
    }
  }
  return 'SportsCapping';
}

// Extract sport/league
function extractSport(text) {
  const sportMap = {
    'NBA': /\bNBA\b/i,
    'NFL': /\bNFL\b/i,
    'NCAAF': /\b(?:NCAAF|College Football)\b/i,
    'NCAAB': /\b(?:NCAA-B|NCAAB|College Basketball)\b/i,
    'NHL': /\bNHL\b/i,
    'MLB': /\bMLB\b/i,
    'CFB': /\bCFB\b/i,
    'CBB': /\bCBB\b/i
  };

  for (const [sport, pattern] of Object.entries(sportMap)) {
    if (pattern.test(text)) return sport;
  }
  return 'ALL';
}

// Extract matchup
function extractMatchup(text) {
  const vsMatch = text.match(/([A-Z][A-Za-z\s.'-]+)\s+(?:vs|@|at)\s+([A-Z][A-Za-z\s.'-]+)/i);
  if (vsMatch) {
    return `${vsMatch[1].trim()} vs ${vsMatch[2].trim()}`;
  }
  return '';
}

// Extract pick
function extractPick(text) {
  const patterns = [
    /([A-Z][A-Za-z\s.'-]+)\s+([+-]\d+\.?\d*)\s*(?:\([+-]\d+\))?/,
    /(Over|Under)\s+(\d+\.?\d*)/i,
    /([A-Z][A-Za-z\s.'-]+)\s+(?:ML|\([+-]\d+\))/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  const words = text.split(/\s+/);
  if (words.length >= 2 && words.length <= 8) {
    return text;
  }

  return '';
}

// Parse date
function parseDate(dateStr) {
  if (!dateStr) return 'TODAY';

  const dateMatch = dateStr.match(/([A-Z][a-z]{2})\s+(\d{1,2})\s+'(\d{2})/i);
  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    return `${month} ${day}, 20${year}`;
  }

  return 'TODAY';
}

// Main parser
async function parseSportsCapping(html, pageNum = 1) {
  const runDate = todayNY();
  const picks = [];

  console.log(`\n📄 Parsing page ${pageNum}...`);
  console.log(`HTML length: ${html.length} characters`);

  // Try structured block parsing first
  const pickBlockPattern = /<div[^>]*class="[^"]*(?:pick|free-pick|item-card|expert-pick)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let blockMatch;
  let blockCount = 0;

  while ((blockMatch = pickBlockPattern.exec(html)) !== null && blockCount < 100) {
    blockCount++;
    const block = blockMatch[1];
    const blockText = clean(block);

    if (blockText.length < 20) continue;

    const handicapper = extractHandicapper(blockText);
    const sport = extractSport(blockText);
    const matchup = extractMatchup(blockText);
    const pick = extractPick(blockText);

    const dateMatch = blockText.match(/(?:Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov)\s+\d{1,2}\s+'\d{2},\s+\d{1,2}:\d{2}\s+[AP]M/i);
    const date = dateMatch ? parseDate(dateMatch[0]) : 'TODAY';

    if (pick && pick.length > 3) {
      picks.push({
        Site: 'SportsCapping',
        League: sport,
        Date: date,
        Matchup: matchup,
        Service: handicapper,
        Pick: pick,
        RunDate: runDate,
        PageNum: pageNum
      });
    }
  }

  console.log(`✓ Structured parsing: ${picks.length} picks found`);

  // Fallback to line-by-line if no picks found
  if (picks.length === 0) {
    console.log('⚠️  Structured parsing failed, trying line-by-line...');

    const lines = html.split(/\n/);
    let currentHandicapper = 'SportsCapping';
    let currentSport = 'ALL';
    let currentMatchup = '';

    for (const line of lines) {
      const text = clean(line);
      if (text.length < 5) continue;

      const handicapper = extractHandicapper(text);
      if (handicapper !== 'SportsCapping' && handicapper.split(' ').length >= 2) {
        currentHandicapper = handicapper;
      }

      const sport = extractSport(text);
      if (sport !== 'ALL') {
        currentSport = sport;
      }

      const matchup = extractMatchup(text);
      if (matchup) {
        currentMatchup = matchup;
      }

      const pick = extractPick(text);
      if (pick && pick.length > 3) {
        picks.push({
          Site: 'SportsCapping',
          League: currentSport,
          Date: 'TODAY',
          Matchup: currentMatchup,
          Service: currentHandicapper,
          Pick: pick,
          RunDate: runDate,
          PageNum: pageNum
        });
      }
    }

    console.log(`✓ Line-by-line parsing: ${picks.length} picks found`);
  }

  return picks;
}

// Run the test
async function main() {
  console.log('🔍 SportsCapping.com Parser Test\n');
  console.log('Fetching: https://www.sportscapping.com/free-picks.html');

  try {
    const html = await fetchPage('https://www.sportscapping.com/free-picks.html');
    const picks = await parseSportsCapping(html, 1);

    console.log(`\n✅ Total picks extracted: ${picks.length}\n`);

    if (picks.length > 0) {
      console.log('📊 Sample picks:\n');
      picks.slice(0, 5).forEach((pick, i) => {
        console.log(`${i + 1}. ${pick.Service}`);
        console.log(`   League: ${pick.League}`);
        console.log(`   Matchup: ${pick.Matchup || 'N/A'}`);
        console.log(`   Pick: ${pick.Pick}`);
        console.log(`   Date: ${pick.Date}`);
        console.log('');
      });

      // Show stats
      const byService = picks.reduce((acc, p) => {
        acc[p.Service] = (acc[p.Service] || 0) + 1;
        return acc;
      }, {});

      console.log('📈 Picks by Service:');
      Object.entries(byService)
        .sort((a, b) => b[1] - a[1])
        .forEach(([service, count]) => {
          console.log(`   ${service}: ${count}`);
        });

      // Save to file for inspection
      const fs = require('fs');
      fs.writeFileSync('sportscapping-picks.json', JSON.stringify(picks, null, 2));
      console.log('\n💾 Full results saved to: sportscapping-picks.json');

    } else {
      console.log('❌ No picks found - parser needs debugging');
      console.log('\n💡 Debug tips:');
      console.log('   1. Check if site structure has changed');
      console.log('   2. Save HTML to file and inspect manually');
      console.log('   3. Look for CSS classes or IDs that identify pick containers');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run it
main();
