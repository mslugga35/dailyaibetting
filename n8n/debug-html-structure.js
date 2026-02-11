/**
 * HTML Structure Inspector
 * Saves raw HTML and shows common patterns
 */

const https = require('https');
const fs = require('fs');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching SportsCapping.com...\n');

  const html = await fetchPage('https://www.sportscapping.com/free-picks.html');

  // Save full HTML
  fs.writeFileSync('sportscapping-full.html', html);
  console.log('✓ Saved full HTML to: sportscapping-full.html');

  // Find all unique div class names
  const classPattern = /<div[^>]*class="([^"]+)"/gi;
  const classes = new Set();
  let match;

  while ((match = classPattern.exec(html)) !== null) {
    match[1].split(/\s+/).forEach(c => classes.add(c));
  }

  console.log(`\nFound ${classes.size} unique CSS classes:\n`);
  Array.from(classes).sort().forEach(c => console.log(`  .${c}`));

  // Look for handicapper names we know from the page
  console.log('\n\nSearching for known handicapper name (Sal Michaels)...\n');
  const salIndex = html.indexOf('Sal Michaels');
  if (salIndex > -1) {
    // Show 500 chars before and after
    const snippet = html.substring(Math.max(0, salIndex - 500), salIndex + 500);
    console.log('Context around "Sal Michaels":');
    console.log('─'.repeat(80));
    console.log(snippet);
    console.log('─'.repeat(80));
  }

  // Look for pick patterns (spreads with odds)
  console.log('\n\nSearching for spread pattern (-110, +3, etc)...\n');
  const spreadPattern = /[+-]\d+\s*-?\d*/g;
  const spreads = [];
  let spreadMatch;
  let count = 0;

  while ((spreadMatch = spreadPattern.exec(html)) !== null && count < 5) {
    const index = spreadMatch.index;
    const snippet = html.substring(Math.max(0, index - 200), index + 200);
    spreads.push(snippet);
    count++;
  }

  spreads.forEach((snippet, i) => {
    console.log(`\nSpread context ${i + 1}:`);
    console.log('─'.repeat(80));
    console.log(snippet.replace(/\n/g, ' ').replace(/\s+/g, ' '));
    console.log('─'.repeat(80));
  });

  console.log('\n\n💡 Next steps:');
  console.log('1. Open sportscapping-full.html in a text editor');
  console.log('2. Search for "Sal Michaels" or another handicapper name');
  console.log('3. Look at the HTML structure around that name');
  console.log('4. Identify the container div class for pick cards');
  console.log('5. Update the parser with the correct class name\n');
}

main().catch(console.error);
