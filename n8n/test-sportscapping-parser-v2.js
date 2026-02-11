/**
 * SportsCapping.com HTML Parser V2 - CORRECT STRUCTURE
 *
 * Based on actual HTML structure analysis:
 * - Container: .free-pick-col
 * - Handicapper: h3 tag
 * - Sport: .free-pick-sport
 * - Matchup: .free-pick-game (after pipe)
 * - Pick: .free-pick-green > b tag
 * - Date: .free-pick-time
 */

const https = require('https');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function todayNY() {
  const opts = { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-CA', opts).formatToParts(new Date());
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
}

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

function parseDate(dateStr) {
  if (!dateStr) return 'TODAY';
  const dateMatch = dateStr.match(/([A-Z][a-z]{2})\s+(\d{1,2})\s+'(\d{2})/i);
  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    return `${month} ${day}, 20${year}`;
  }
  return 'TODAY';
}

async function parseSportsCapping(html, pageNum = 1) {
  const runDate = todayNY();
  const picks = [];

  console.log(`\n📄 Parsing page ${pageNum}...`);
  console.log(`HTML length: ${html.length} characters\n`);

  // Find all pick containers
  const pickPattern = /<div class="free-pick-col">([\s\S]*?)<\/div><!--end free pick -->/gi;
  let match;
  let count = 0;

  while ((match = pickPattern.exec(html)) !== null) {
    count++;
    const pickHtml = match[1];

    // Extract handicapper name from <h3> tag
    const handicapperMatch = pickHtml.match(/<h3>([^<]+)<\/h3>/);
    const handicapper = handicapperMatch ? clean(handicapperMatch[1]) : 'SportsCapping';

    // Extract sport from .free-pick-sport span
    const sportMatch = pickHtml.match(/<span class="free-pick-sport">([^<]+)<\/span>/);
    const sport = sportMatch ? clean(sportMatch[1]) : 'ALL';

    // Extract matchup from .free-pick-game (after the pipe |)
    const matchupMatch = pickHtml.match(/<div class="free-pick-game">[\s\S]*?\|\s*([^<]+)<\/div>/);
    const matchup = matchupMatch ? clean(matchupMatch[1]) : '';

    // Extract pick from .free-pick-green alert box > <b> tag
    const pickMatch = pickHtml.match(/<div class="alert alert-success free-pick-green">[\s\S]*?<b>([^<]+)<\/b>/);
    const pick = pickMatch ? clean(pickMatch[1]) : '';

    // Extract date/time from .free-pick-time
    const dateMatch = pickHtml.match(/<div class="free-pick-time">([^<]+)<\/div>/);
    const dateStr = dateMatch ? clean(dateMatch[1]) : '';
    const date = parseDate(dateStr);

    // Extract analysis text (optional)
    const analysisMatch = pickHtml.match(/<div>\s*<p>([\s\S]*?)<\/p>/);
    const analysis = analysisMatch ? clean(analysisMatch[1]).substring(0, 200) : '';

    // Only add if we have a valid pick
    if (pick && handicapper) {
      picks.push({
        Site: 'SportsCapping',
        League: sport,
        Date: date,
        Matchup: matchup,
        Service: handicapper,
        Pick: pick,
        Analysis: analysis,
        RunDate: runDate,
        PageNum: pageNum
      });
    }

    console.log(`✓ Pick ${count}: ${handicapper} - ${sport} - ${pick.substring(0, 30)}...`);
  }

  console.log(`\n✅ Total valid picks extracted: ${picks.length}`);
  return picks;
}

async function main() {
  console.log('🔍 SportsCapping.com Parser V2 (Correct Structure)\n');
  console.log('Fetching: https://www.sportscapping.com/free-picks.html');

  try {
    const html = await fetchPage('https://www.sportscapping.com/free-picks.html');
    const picks = await parseSportsCapping(html, 1);

    if (picks.length > 0) {
      console.log('\n📊 Sample picks:\n');
      picks.slice(0, 5).forEach((pick, i) => {
        console.log(`${i + 1}. ${pick.Service} (${pick.League})`);
        console.log(`   Matchup: ${pick.Matchup}`);
        console.log(`   Pick: ${pick.Pick}`);
        console.log(`   Date: ${pick.Date}`);
        if (pick.Analysis) {
          console.log(`   Analysis: ${pick.Analysis.substring(0, 60)}...`);
        }
        console.log('');
      });

      // Stats
      const byService = picks.reduce((acc, p) => {
        acc[p.Service] = (acc[p.Service] || 0) + 1;
        return acc;
      }, {});

      console.log('📈 Picks by Handicapper:');
      Object.entries(byService)
        .sort((a, b) => b[1] - a[1])
        .forEach(([service, count]) => {
          console.log(`   ${service}: ${count}`);
        });

      const bySport = picks.reduce((acc, p) => {
        acc[p.League] = (acc[p.League] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📈 Picks by Sport:');
      Object.entries(bySport)
        .sort((a, b) => b[1] - a[1])
        .forEach(([sport, count]) => {
          console.log(`   ${sport}: ${count}`);
        });

      // Save
      const fs = require('fs');
      fs.writeFileSync('sportscapping-picks-v2.json', JSON.stringify(picks, null, 2));
      console.log('\n💾 Full results saved to: sportscapping-picks-v2.json');

    } else {
      console.log('❌ No picks found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
