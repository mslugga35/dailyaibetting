// Google Sheets Data Fetching
// Connects to your n8n workflow output

import { RawPick } from '../consensus/consensus-builder';

// Google Sheets configuration
// Document ID from your n8n workflow: 1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI';

// Sheet names (tabs) from your n8n workflow
// The new simple workflow outputs to "AllPicks" tab
// Legacy tabs are kept for backward compatibility
const SHEET_TABS = ['AllPicks', 'BetFirm', 'BoydsBets', 'Dimers', 'Covers', 'SportsLine'];

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
    const json = JSON.parse(text.substring(47).slice(0, -2));

    if (!json.table?.rows) {
      return [];
    }

    // Get column headers from first row
    const headers = json.table.cols.map((col: { label: string }) => col.label);

    // Map rows to RawPick objects
    const picks: RawPick[] = json.table.rows.map((row: { c: ({ v: string } | null)[] }) => {
      const values = row.c.map(cell => cell?.v || '');

      return {
        site: values[headers.indexOf('Site')] || sheetName,
        league: values[headers.indexOf('League')] || '',
        date: values[headers.indexOf('Date')] || new Date().toISOString().split('T')[0],
        matchup: values[headers.indexOf('Matchup')] || '',
        service: values[headers.indexOf('Service')] || sheetName,
        pick: values[headers.indexOf('Pick')] || '',
        runDate: values[headers.indexOf('RunDate')] || '',
      };
    });

    return picks.filter(p => p.pick && p.matchup);
  } catch (error) {
    console.error(`Error fetching sheet ${sheetName}:`, error);
    return [];
  }
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
