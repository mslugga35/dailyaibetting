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

    // Get today's date in Eastern timezone for strict TODAY filter
    const now = new Date();
    const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const todayStr = todayET.toISOString().split('T')[0]; // YYYY-MM-DD format

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

    // Filter: must have pick and be from TODAY only (not yesterday)
    return picks.filter(p => {
      if (!p.pick) return false;

      // If no date, reject
      const dateToCheck = p.runDate || p.date;
      if (!dateToCheck) return false;

      // Handle "TODAY" literal
      if (dateToCheck.toUpperCase() === 'TODAY') return true;

      // Try to parse and compare to today
      let pickDateStr = dateToCheck.split('T')[0];

      // Handle MM/DD/YYYY format
      const slashMatch = pickDateStr.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
      if (slashMatch) {
        const month = slashMatch[1].padStart(2, '0');
        const day = slashMatch[2].padStart(2, '0');
        const year = slashMatch[3] ? (slashMatch[3].length === 2 ? '20' + slashMatch[3] : slashMatch[3]) : todayET.getFullYear();
        pickDateStr = `${year}-${month}-${day}`;
      }

      // Handle "Dec 26" format
      const monthNameMatch = pickDateStr.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
      if (monthNameMatch) {
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthAbbr = pickDateStr.slice(0, 3).toLowerCase();
        const monthNum = monthNames.indexOf(monthAbbr) + 1;
        if (monthNum > 0) {
          const day = monthNameMatch[1].padStart(2, '0');
          pickDateStr = `${todayET.getFullYear()}-${String(monthNum).padStart(2, '0')}-${day}`;
        }
      }

      // Strict TODAY check - must match today's date exactly
      return pickDateStr === todayStr;
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
  // Use Eastern timezone for today's date
  const now = new Date();
  const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const today = todayET.toISOString().split('T')[0];

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
  // Use Eastern timezone for today's date
  const now = new Date();
  const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const today = todayET.toISOString().split('T')[0];

  // Known college basketball teams (for fallback sport detection)
  const ncaabTeams = [
    'liberty', 'gonzaga', 'duke', 'kentucky', 'kansas', 'ucla', 'villanova',
    'purdue', 'houston', 'uconn', 'arizona', 'michigan state', 'unc', 'north carolina',
    'baylor', 'indiana', 'oregon', 'tennessee', 'auburn', 'arkansas', 'iowa',
    'texas tech', 'san francisco', 'sf', 'wazzu', 'washington state', 'seattle',
    'colgate', 'winthrop', 'ul-monroe', 'ul lafayette', 'ull', 'pepperdine',
  ];

  // Check if team name suggests NCAAB (college basketball)
  const isLikelyNCAAB = (team: string): boolean => {
    const lower = team.toLowerCase();
    return ncaabTeams.some(t => lower.includes(t) || t.includes(lower.slice(0, 4)));
  };

  // Sport name mapping - handle various formats
  const sportMap: Record<string, string> = {
    'ncaa basketball': 'NCAAB',
    'ncaab': 'NCAAB',
    'cbb': 'NCAAB',
    'college basketball': 'NCAAB',
    'basketball': 'NCAAB', // Generic "Basketball:" means college in this context
    'ncaa football': 'NCAAF',
    'ncaaf': 'NCAAF',
    'cfb': 'NCAAF',
    'college football': 'NCAAF',
    'football': 'NCAAF', // Generic "Football:" means college
    'ncaa': 'NCAAF', // Ambiguous, but usually means football in this context
    'nfl': 'NFL',
    'nfl football': 'NFL',
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

    // Skip [OCR] lines that just repeat the capper name
    if (line.match(/^\[OCR\]\s*[\w\s]+\s*(Picks)?$/i)) {
      continue;
    }

    // Check for sport header (various formats)
    // Order matters: check longer patterns first to avoid partial matches
    const sportMatch = line.match(/^(?:\[OCR\]\s*)?(?:NCAA Basketball|College Basketball|NCAA Football|College Football|NFL Football|Basketball|Football|NCAA|CFB|CBB|NFL|NBA|NHL|MLB|WNBA|NCAAF|NCAAB)\s*:?/i);
    if (sportMatch) {
      const sportText = sportMatch[0].replace(/^\[OCR\]\s*/i, '').replace(/:$/, '').toLowerCase().trim();
      currentSport = sportMap[sportText] || sportText.toUpperCase();
      console.log(`[DocParser] Sport header detected: "${sportText}" -> ${currentSport}`);
      continue;
    }

    // Check for pick line: • Team +spread (odds) or Team -spread
    // Pattern: bullet point or dash, team name, spread/ML/total
    const pickMatch = line.match(/^[•\-\*]\s*(.+?)\s*([+-]\d+\.?\d*|ML|Over\s*[\d.]+|Under\s*[\d.]+)\s*(?:\(([^)]+)\))?/i);
    if (pickMatch && currentCapper) {
      const team = pickMatch[1].trim();
      const betPart = pickMatch[2].trim();
      const pick = `${team} ${betPart}`;

      // Fallback sport detection: if current sport is NCAAF but team is a known NCAAB team
      let sport = currentSport || 'ALL';
      if (isLikelyNCAAB(team) && (sport === 'NCAAF' || sport === 'ALL' || sport === '')) {
        sport = 'NCAAB';
        console.log(`[DocParser] Overriding sport for ${team}: ${currentSport} -> NCAAB`);
      }

      picks.push({
        site: 'GoogleDoc',
        league: sport,
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

      // Fallback sport detection for NCAAB teams
      let sport = currentSport || 'ALL';
      if (isLikelyNCAAB(team) && (sport === 'NCAAF' || sport === 'ALL' || sport === '')) {
        sport = 'NCAAB';
        console.log(`[DocParser] Overriding sport for ${team}: ${currentSport} -> NCAAB`);
      }

      picks.push({
        site: 'GoogleDoc',
        league: sport,
        date: today,
        matchup: team,
        service: currentCapper,
        pick,
      });
    }
  }

  console.log(`[DocParser] Parsed ${picks.length} picks from Google Doc`);
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

  // Debug: log pick counts by source and sport
  const sheetSports: Record<string, number> = {};
  for (const p of sheetPicks) {
    sheetSports[p.league] = (sheetSports[p.league] || 0) + 1;
  }
  const docSports: Record<string, number> = {};
  for (const p of docPicks) {
    docSports[p.league] = (docSports[p.league] || 0) + 1;
  }
  console.log(`[DataSources] Sheet: ${sheetPicks.length} picks`, sheetSports);
  console.log(`[DataSources] Doc: ${docPicks.length} picks`, docSports);

  return [...sheetPicks, ...docPicks];
}
