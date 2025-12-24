// Google Sheets Data Fetching
// Connects to your n8n workflow output

import { RawPick } from '../consensus/consensus-builder';

// Google Sheets configuration
// Document ID from your n8n workflow: 1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI';

// Sheet names (tabs) from your n8n workflow
// ManualPicks contains the complete dataset (43 rows vs AllPicks' 33 rows)
// Using only ManualPicks to avoid duplicate picks
// Both tabs now have structured columns (Site, League, Date, Matchup, Service, Pick, RunDate)
const SHEET_TABS = ['ManualPicks'];

/**
 * Fetch picks from Google Sheets (published as CSV)
 * This requires the sheet to be published to web as CSV
 */
export async function fetchPicksFromSheet(sheetName: string = 'BetFirm'): Promise<RawPick[]> {
  try {
    // Google Sheets public CSV URL format
    // Note: Sheet must be published to web for this to work
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`Failed to fetch sheet ${sheetName}: ${response.status}`);
      return [];
    }

    const text = await response.text();

    // Google returns JSONP-like response, need to parse it
    // Format: google.visualization.Query.setResponse({...});
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?$/);
    if (!jsonMatch) {
      console.error(`[${sheetName}] Could not parse Google response`);
      return [];
    }

    const json = JSON.parse(jsonMatch[1]);

    if (!json.table?.rows) {
      console.log(`[${sheetName}] No rows found`);
      return [];
    }

    // Get column headers from first row
    const headers = json.table.cols.map((col: { label: string }) => col.label);
    console.log(`[${sheetName}] Headers: ${headers.join(', ')}, Rows: ${json.table.rows.length}`);

    // Check if ManualPicks has structured columns (same as AllPicks)
    // Only use freeform parsing if it has a RawText/Text column
    if (sheetName === 'ManualPicks') {
      const hasRawTextColumn = headers.some((h: string) =>
        ['rawtext', 'text', 'picks'].includes(h.toLowerCase())
      );
      const hasStructuredColumns = headers.includes('Pick') && headers.includes('Service');

      // If it has structured columns (like AllPicks), process it normally
      // Only use freeform parsing for actual freeform text sheets
      if (hasRawTextColumn && !hasStructuredColumns) {
        return parseManualPicksSheet(json.table.rows, headers);
      }
      // Otherwise fall through to normal structured processing
      console.log(`[${sheetName}] Has structured columns, processing as standard sheet`);
    }

    // Get current time for 24-hour filter
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Map rows to RawPick objects
    const picks: RawPick[] = json.table.rows.map((row: { c: ({ v: string | number | null; f?: string } | null)[] }) => {
      // Extract values, handling formatted values for dates
      const values = row.c.map(cell => {
        if (!cell) return '';
        // Use formatted value (f) if available (for dates), otherwise use raw value (v)
        if (cell.f) return cell.f;
        if (cell.v === null || cell.v === undefined) return '';
        return String(cell.v);
      });

      // Use Date column first, then RunDate, otherwise empty (will be filtered out)
      const dateValue = values[headers.indexOf('Date')] || values[headers.indexOf('RunDate')] || '';

      return {
        site: values[headers.indexOf('Site')] || sheetName,
        league: values[headers.indexOf('League')] || '',
        date: dateValue,
        matchup: values[headers.indexOf('Matchup')] || '',
        service: values[headers.indexOf('Service')] || sheetName,
        pick: values[headers.indexOf('Pick')] || '',
        runDate: values[headers.indexOf('RunDate')] || '',
      };
    });

    // Filter: must have pick (matchup can be empty - team extracted from pick text)
    // RunDate within last 24 hours
    return picks.filter(p => {
      if (!p.pick) return false;

      // If no RunDate, use date field
      const dateToCheck = p.runDate || p.date;
      if (!dateToCheck) return false;

      // Try to parse the date
      const pickTime = new Date(dateToCheck);
      if (isNaN(pickTime.getTime())) {
        // If can't parse, check if it matches today's date string
        const todayStr = now.toISOString().split('T')[0];
        return dateToCheck.includes(todayStr) || dateToCheck === 'TODAY';
      }

      // Check if within last 24 hours
      return pickTime >= twentyFourHoursAgo;
    });
  } catch (error) {
    console.error(`Error fetching sheet ${sheetName}:`, error);
    return [];
  }
}

/**
 * Parse ManualPicks sheet with freeform text
 * Accepts various formats:
 * - "NFL: Bills +3" or "NFL Bills +3"
 * - "Chiefs vs Bills | Bills +3"
 * - "Bills +3 (-110)"
 * - Just "Bills +3" (will try to detect sport)
 */
function parseManualPicksSheet(rows: { c: ({ v: string } | null)[] }[], headers: string[]): RawPick[] {
  const picks: RawPick[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Sport detection patterns
  const sportTeams: Record<string, string[]> = {
    NFL: ['chiefs', 'bills', 'eagles', 'cowboys', 'ravens', 'bengals', 'dolphins', 'jets', 'patriots', 'steelers', 'browns', 'titans', 'colts', 'jaguars', 'texans', 'broncos', 'raiders', 'chargers', 'packers', 'vikings', 'bears', 'lions', 'saints', 'falcons', 'panthers', 'buccaneers', '49ers', 'seahawks', 'rams', 'cardinals', 'commanders', 'giants'],
    NBA: ['lakers', 'celtics', 'warriors', 'nets', 'bucks', 'heat', 'suns', 'mavericks', 'nuggets', 'clippers', 'grizzlies', 'cavaliers', 'knicks', 'sixers', '76ers', 'hawks', 'bulls', 'raptors', 'jazz', 'pelicans', 'timberwolves', 'thunder', 'blazers', 'kings', 'spurs', 'rockets', 'magic', 'pacers', 'hornets', 'pistons', 'wizards'],
    NHL: ['bruins', 'rangers', 'maple leafs', 'canadiens', 'blackhawks', 'penguins', 'capitals', 'flyers', 'red wings', 'blues', 'avalanche', 'lightning', 'panthers', 'hurricanes', 'devils', 'islanders', 'senators', 'sabres', 'jets', 'wild', 'stars', 'predators', 'flames', 'oilers', 'canucks', 'sharks', 'kings', 'ducks', 'coyotes', 'golden knights', 'kraken'],
    MLB: ['yankees', 'red sox', 'dodgers', 'giants', 'cubs', 'white sox', 'mets', 'phillies', 'braves', 'marlins', 'nationals', 'cardinals', 'brewers', 'reds', 'pirates', 'astros', 'rangers', 'athletics', 'angels', 'mariners', 'rays', 'blue jays', 'orioles', 'twins', 'royals', 'tigers', 'guardians', 'rockies', 'diamondbacks', 'padres'],
    NCAAF: ['alabama', 'georgia', 'ohio state', 'michigan', 'clemson', 'texas', 'oklahoma', 'lsu', 'usc', 'notre dame', 'penn state', 'florida', 'oregon', 'tennessee', 'auburn'],
    NCAAB: ['duke', 'north carolina', 'kentucky', 'kansas', 'ucla', 'villanova', 'gonzaga', 'baylor', 'purdue', 'houston', 'uconn', 'arizona', 'indiana', 'michigan state'],
  };

  const detectSport = (text: string): string => {
    const lower = text.toLowerCase();
    for (const [sport, teams] of Object.entries(sportTeams)) {
      if (teams.some(team => lower.includes(team))) {
        return sport;
      }
    }
    return 'ALL';
  };

  // Check for RawText column (single column with freeform text)
  const rawTextIdx = headers.findIndex(h => h.toLowerCase() === 'rawtext' || h.toLowerCase() === 'text' || h.toLowerCase() === 'picks');

  for (const row of rows) {
    const values = row.c.map(cell => cell?.v?.toString() || '');

    let textToParse = '';
    let capper = 'Manual';
    let sport = '';

    if (rawTextIdx >= 0) {
      // Single column format - just the pick text
      textToParse = values[rawTextIdx];
    } else {
      // Try to find text in first non-empty column, or use structured columns
      const capperIdx = headers.findIndex(h => h.toLowerCase() === 'capper' || h.toLowerCase() === 'service' || h.toLowerCase() === 'source');
      const sportIdx = headers.findIndex(h => h.toLowerCase() === 'sport' || h.toLowerCase() === 'league');
      const pickIdx = headers.findIndex(h => h.toLowerCase() === 'pick' || h.toLowerCase() === 'bet');
      const gameIdx = headers.findIndex(h => h.toLowerCase() === 'game' || h.toLowerCase() === 'matchup');

      if (capperIdx >= 0) capper = values[capperIdx] || 'Manual';
      if (sportIdx >= 0) sport = values[sportIdx] || '';
      if (pickIdx >= 0) {
        textToParse = values[pickIdx];
        if (gameIdx >= 0 && values[gameIdx]) {
          textToParse = `${values[gameIdx]} | ${textToParse}`;
        }
      } else {
        // Just grab first non-empty value
        textToParse = values.find(v => v.trim()) || '';
      }
    }

    if (!textToParse.trim()) continue;

    // Parse the text for picks
    const lines = textToParse.split(/[\n;]/).filter(l => l.trim());

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Try to extract sport prefix: "NFL: Bills +3" or "NFL Bills +3"
      const sportPrefixMatch = trimmed.match(/^(NFL|NBA|NHL|MLB|NCAAF|NCAAB|CFB|CBB)[:\s]+(.+)/i);
      if (sportPrefixMatch) {
        sport = sportPrefixMatch[1].toUpperCase();
        if (sport === 'CFB') sport = 'NCAAF';
        if (sport === 'CBB') sport = 'NCAAB';
      }

      // Extract the pick part
      // Patterns: "Team +/-spread", "Team ML", "Over/Under X"
      const pickMatch = trimmed.match(/([A-Za-z\s.]+(?:vs\.?\s+[A-Za-z\s.]+)?)\s*\|?\s*([A-Za-z\s.]+)\s*([+-]?\d+\.?\d*|ML|Over\s*[\d.]+|Under\s*[\d.]+|[OU]\s*[\d.]+)/i);

      if (pickMatch) {
        const gameOrTeam = pickMatch[1].trim();
        const team = pickMatch[2].trim();
        const line = pickMatch[3].trim();
        const pick = `${team} ${line}`;
        const matchup = gameOrTeam.includes('vs') ? gameOrTeam : team;

        picks.push({
          site: 'Manual',
          league: sport || detectSport(trimmed),
          date: today,
          matchup,
          service: capper,
          pick,
        });
      } else {
        // Simpler pattern: "Team +spread" or "Team ML"
        const simpleMatch = trimmed.match(/([A-Za-z\s.]+)\s+([+-]\d+\.?\d*|ML|Over\s*[\d.]+|Under\s*[\d.]+|[OU]\s*[\d.]+)/i);
        if (simpleMatch) {
          const team = simpleMatch[1].replace(/^(NFL|NBA|NHL|MLB|NCAAF|NCAAB|CFB|CBB)[:\s]*/i, '').trim();
          const line = simpleMatch[2].trim();
          const pick = `${team} ${line}`;

          picks.push({
            site: 'Manual',
            league: sport || detectSport(trimmed),
            date: today,
            matchup: team,
            service: capper,
            pick,
          });
        }
      }
    }
  }

  return picks;
}

/**
 * Fetch all picks from all sheet tabs
 */
export async function fetchAllPicks(): Promise<RawPick[]> {
  const allPicks: RawPick[] = [];

  // Fetch from all tabs in parallel
  const results = await Promise.all(
    SHEET_TABS.map(tab => fetchPicksFromSheet(tab))
  );

  for (const picks of results) {
    allPicks.push(...picks);
  }

  return allPicks;
}

/**
 * Fetch picks from Google Doc (parsed content)
 * This is the Google Doc that gets updated every 5 minutes
 */
export async function fetchPicksFromGoogleDoc(): Promise<RawPick[]> {
  const docId = process.env.GOOGLE_DOC_ID;

  if (!docId) {
    console.warn('GOOGLE_DOC_ID not set, skipping Google Doc fetch');
    return [];
  }

  try {
    // Google Docs export as plain text
    const url = `https://docs.google.com/document/d/${docId}/export?format=txt`;

    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`Failed to fetch Google Doc: ${response.status}`);
      return [];
    }

    const text = await response.text();

    // Parse the document content
    // This will depend on the format of your Google Doc
    return parseGoogleDocContent(text);
  } catch (error) {
    console.error('Error fetching Google Doc:', error);
    return [];
  }
}

/**
 * Parse Google Doc content into RawPick objects
 * Format: [TIME] CAPPER_NAME -> [OCR] -> SPORT: -> • PICK (ODDS)
 */
function parseGoogleDocContent(content: string): RawPick[] {
  const picks: RawPick[] = [];
  const lines = content.split('\n').filter(line => line.trim());

  let currentCapper = '';
  let currentSport = '';
  const today = new Date().toISOString().split('T')[0];

  // Sport name mapping
  const sportMap: Record<string, string> = {
    'ncaa': 'NCAAF',
    'ncaa basketball': 'NCAAB',
    'college basketball': 'NCAAB',
    'college football': 'NCAAF',
    'cfb': 'NCAAF',
    'cbb': 'NCAAB',
    'nfl': 'NFL',
    'nba': 'NBA',
    'nhl': 'NHL',
    'mlb': 'MLB',
    'wnba': 'WNBA',
  };

  for (const line of lines) {
    // Check for capper header: [11:13 AM] CAPPER_NAME
    const capperMatch = line.match(/^\[[\d:]+\s*[AP]M\]\s*(.+)/i);
    if (capperMatch && !line.includes('[OCR]')) {
      currentCapper = capperMatch[1].trim();
      continue;
    }

    // Check for sport header (various formats)
    const sportMatch = line.match(/^(?:\[OCR\]\s*)?(?:NCAA Basketball|College Basketball|College Football|NCAA|CFB|CBB|NFL|NBA|NHL|MLB|WNBA)\s*:?/i);
    if (sportMatch) {
      const sportText = sportMatch[0].replace(/^\[OCR\]\s*/i, '').replace(/:$/, '').toLowerCase().trim();
      currentSport = sportMap[sportText] || sportText.toUpperCase();
      continue;
    }

    // Check for pick line: • Team +spread (odds) or Team -spread
    // Pattern: bullet point or dash, team name, spread/ML/total
    const pickMatch = line.match(/^[•\-\*]\s*(.+?)\s*([+-]\d+\.?\d*|ML|Over\s*[\d.]+|Under\s*[\d.]+)\s*(?:\(([^)]+)\))?/i);
    if (pickMatch && currentCapper) {
      const team = pickMatch[1].trim();
      const betPart = pickMatch[2].trim();
      const pick = `${team} ${betPart}`;

      picks.push({
        site: 'GoogleDoc',
        league: currentSport || 'ALL',
        date: today,
        matchup: team,
        service: currentCapper,
        pick,
      });
      continue;
    }

    // Alternative pick format without bullet: Team +spread
    const altPickMatch = line.match(/^([A-Z][A-Za-z\s]+)\s+([+-]\d+\.?\d*|ML)\s*(?:\(|$)/i);
    if (altPickMatch && currentCapper && !line.includes('[') && !line.includes(':')) {
      const team = altPickMatch[1].trim();
      const betPart = altPickMatch[2].trim();
      const pick = `${team} ${betPart}`;

      picks.push({
        site: 'GoogleDoc',
        league: currentSport || 'ALL',
        date: today,
        matchup: team,
        service: currentCapper,
        pick,
      });
    }
  }

  return picks;
}

/**
 * Get all picks from all sources
 */
export async function getAllPicksFromSources(): Promise<RawPick[]> {
  const [sheetPicks, docPicks] = await Promise.all([
    fetchAllPicks(),
    fetchPicksFromGoogleDoc(),
  ]);

  return [...sheetPicks, ...docPicks];
}
