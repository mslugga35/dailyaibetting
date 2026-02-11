/**
 * Fetch SportsMemo FREE picks page
 */

const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'www.sportsmemo.com',
  port: 443,
  path: '/free-sports-picks',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  }
};

https.get(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}\n`);

  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Received ${data.length} bytes`);

    if (data.length > 0) {
      fs.writeFileSync('sportsmemo-free-picks.html', data);
      console.log('✓ Saved to sportsmemo-free-picks.html');

      // Quick analysis
      console.log('\nQuick analysis:');
      console.log(`- Contains "pick": ${data.includes('pick')}`);
      console.log(`- Contains "expert": ${data.includes('expert')}`);
      console.log(`- Contains "handicap": ${data.includes('handicap')}`);
      console.log(`- Contains <div: ${data.includes('<div')}`);

      // Show first 500 chars
      console.log('\nFirst 500 characters:');
      console.log(data.substring(0, 500));
    } else {
      console.log('❌ No data received');
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
