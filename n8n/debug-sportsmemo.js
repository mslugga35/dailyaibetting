/**
 * SportsMemo.com HTML Structure Inspector
 */

const http = require('http');
const fs = require('fs');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching SportsMemo.com...\n');

  const html = await fetchPage('http://www.sportsmemo.com/picks');

  // Save full HTML
  fs.writeFileSync('sportsmemo-full.html', html);
  console.log('✓ Saved full HTML to: sportsmemo-full.html\n');

  // Find all unique div class names
  const classPattern = /<div[^>]*class="([^"]+)"/gi;
  const classes = new Set();
  let match;

  while ((match = classPattern.exec(html)) !== null) {
    match[1].split(/\s+/).forEach(c => classes.add(c));
  }

  console.log(`Found ${classes.size} unique CSS classes:\n`);
  const sortedClasses = Array.from(classes).sort();
  sortedClasses.forEach(c => console.log(`  .${c}`));

  // Look for expert names (similar to SportsCapping handicappers)
  console.log('\n\nSearching for expert/handicapper patterns...\n');

  // Try to find h2, h3, h4 tags with names
  const headerPattern = /<h[2-4][^>]*>([^<]+)<\/h[2-4]>/gi;
  const headers = [];
  let headerMatch;
  let count = 0;

  while ((headerMatch = headerPattern.exec(html)) !== null && count < 20) {
    const text = headerMatch[1].trim();
    if (text.length > 5 && text.length < 100) {
      headers.push(text);
      count++;
    }
  }

  console.log('Sample headers found:');
  headers.slice(0, 10).forEach((h, i) => console.log(`  ${i + 1}. ${h}`));

  // Look for pick-related patterns
  console.log('\n\nSearching for pick-related content...\n');
  const pickKeywords = ['pick', 'expert', 'handicap', 'bet', 'odds', 'spread'];

  for (const keyword of pickKeywords) {
    const regex = new RegExp(`<div[^>]*class="[^"]*${keyword}[^"]*"`, 'gi');
    const matches = html.match(regex) || [];
    if (matches.length > 0) {
      console.log(`  Found ${matches.length} divs with class containing "${keyword}"`);
      console.log(`    Example: ${matches[0]}`);
    }
  }

  console.log('\n\n💡 Next steps:');
  console.log('1. Open sportsmemo-full.html in a text editor');
  console.log('2. Search for recognizable patterns (expert names, picks, etc.)');
  console.log('3. Identify the container div class for picks');
  console.log('4. Build the parser based on actual structure\n');
}

main().catch(console.error);
