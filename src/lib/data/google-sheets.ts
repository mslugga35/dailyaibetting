/**
 * Google Sheets Data Fetching
 * Connects to n8n workflow output for picks aggregation
 * @module lib/data/google-sheets
 */

import { RawPick } from '../consensus/consensus-builder';
import { getTodayET, getYesterdayET, getCurrentYearET } from '../utils/date';
import { logger } from '../utils/logger';
import { fetchPicksFromSupabase } from './supabase-picks';

// Google Sheets configuration
// Document ID from your n8n workflow: 1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI';

// Sheet names (tabs) - AllPicks + all source tabs
// Each tab has columns: Site, League, Date, Matchup, Service, Pick, RunDate
// Duplicates are handled by consensus builder (uses Set for cappers)
// Only website scraper tabs — Telegram/free capper picks now come from
// Supabase (HiddenBag Discord pipeline), not Google Sheets.
const SHEET_TABS = [
  // 'Picks',      // DISABLED - was TG-FreeCapper pipeline, now via Supabase
  'AllPicks',      // Main consolidated tab (website scrapers write here)
  'BoydBets',      // Boyd's Bets source
  'SportsLine',    // SportsLine source
  'Pickswise',     // Pickswise source
  'Dimers',        // Dimers source
  'Covers',        // Covers source
  'WagerTalk',     // WagerTalk source
  'SportsMemo',    // SportsMemo source
  'SportsCapping', // SportsCapping source
];

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
      next: { revalidate: 60 }, // Cache for 1 minute (reduced to catch stale data faster)
    });

    if (!response.ok) {
      logger.error('Sheets', `Failed to fetch sheet ${sheetName}: ${response.status}`);
      return [];
    }

    const text = await response.text();

    // Google returns JSONP-like response, need to parse it
    // Format: google.visualization.Query.setResponse({...});
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?$/);
    if (!jsonMatch) {
      logger.error('Sheets', `[${sheetName}] Could not parse Google response`);
      return [];
    }

    const json = JSON.parse(jsonMatch[1]);

    if (!json.table?.rows) {
      logger.debug('Sheets', `[${sheetName}] No rows found`);
      return [];
    }

    // Get column headers from first row
    const headers = json.table.cols.map((col: { label: string }) => col.label);
    logger.debug('Sheets', `[${sheetName}] Headers: ${headers.join(', ')}, Rows: ${json.table.rows.length}`);

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
      logger.debug('Sheets', `[${sheetName}] Has structured columns, processing as standard sheet`);
    }

    // Get today's and yesterday's date in Eastern timezone for filtering
    const todayStr = getTodayET();
    const yesterdayStr = getYesterdayET();
    const currentYear = getCurrentYearET();
    logger.debug('Sheets', `[${sheetName}] Today (ET): ${todayStr}`);

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

      // Handle our TG-FreeCapper "Picks" tab format which has different columns:
      // pick_id, date, time, capper, sport, game, pick, line, odds, units, ...
      const isPicksTab = sheetName === 'Picks' && headers.includes('capper');
      
      if (isPicksTab) {
        // Map our column names to expected format
        const capperName = values[headers.indexOf('capper')] || 'Unknown';
        const sportVal = values[headers.indexOf('sport')] || '';
        const pickVal = values[headers.indexOf('pick')] || '';
        const lineVal = values[headers.indexOf('line')] || '';
        const dateVal = values[headers.indexOf('date')] || '';
        const gameVal = values[headers.indexOf('game')] || '';
        const rawText = values[headers.indexOf('raw_text')] || '';
        
        // Construct pick string: combine pick, line if available
        let fullPick = pickVal || rawText?.slice(0, 200) || '';
        if (lineVal && !fullPick.includes(lineVal)) {
          fullPick = `${fullPick} ${lineVal}`.trim();
        }
        
        return {
          site: 'TG-FreeCapper',
          league: sportVal,
          date: dateVal,
          matchup: gameVal,
          service: capperName,
          pick: fullPick,
          runDate: dateVal,
        };
      }

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

      // Use the currentYear from shared utility (already extracted above)

      // Handle MM/DD/YYYY format
      const slashMatch = pickDateStr.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
      if (slashMatch) {
        const month = slashMatch[1].padStart(2, '0');
        const day = slashMatch[2].padStart(2, '0');
        const year = slashMatch[3] ? (slashMatch[3].length === 2 ? '20' + slashMatch[3] : slashMatch[3]) : currentYear;
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
          pickDateStr = `${currentYear}-${String(monthNum).padStart(2, '0')}-${day}`;
        }
      }

      // Strict TODAY check - must match today's date exactly
      const isToday = pickDateStr === todayStr;

      // Log rejections for debugging
      if (!isToday) {
        const isYesterday = pickDateStr === yesterdayStr;
        if (isYesterday) {
          logger.debug('Sheets', `[${sheetName}] REJECTED STALE: "${p.pick}" date=${pickDateStr} (yesterday)`);
        } else {
          logger.debug('Sheets', `[${sheetName}] REJECTED: "${p.pick?.slice(0,30)}" date=${pickDateStr}`);
        }
      }

      return isToday;
    });
  } catch (error) {
    logger.error('Sheets', `Error fetching sheet ${sheetName}:`, error);
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
  // Use Eastern timezone for today's date (reliable Intl.DateTimeFormat)
  const now = new Date();
  const todayParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const today = `${todayParts.find(p => p.type === 'year')?.value}-${todayParts.find(p => p.type === 'month')?.value}-${todayParts.find(p => p.type === 'day')?.value}`;

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
    logger.warn('Sheets', 'GOOGLE_DOC_ID not set, skipping Google Doc fetch');
    return [];
  }

  try {
    // Google Docs export as plain text
    const url = `https://docs.google.com/document/d/${docId}/export?format=txt`;

    const response = await fetch(url, {
      next: { revalidate: 60 }, // Cache for 1 minute (reduced to catch stale data faster)
    });

    if (!response.ok) {
      logger.error('Sheets', `Failed to fetch Google Doc: ${response.status}`);
      return [];
    }

    const text = await response.text();

    // Parse the document content
    // This will depend on the format of your Google Doc
    return parseGoogleDocContent(text);
  } catch (error) {
    logger.error('Sheets', 'Error fetching Google Doc:', error);
    return [];
  }
}

/**
 * Parse Google Doc content into RawPick objects
 * Format: [HH:MM AM/PM EST M/D] [OCR] CAPPER_NAME -> SPORT: -> • PICK (ODDS)
 * 
 * Updated to handle new cappers_free_live.py format:
 * [03:38 PM EST 2/3] [OCR] PorterPicks
 * NBA:
 * • GOLDEN STATE WARRIORS (-3) over Philadelphia 76ERS (3-UNITS)
 */
function parseGoogleDocContent(content: string): RawPick[] {
  const picks: RawPick[] = [];
  const lines = content.split('\n').filter(line => line.trim());

  let currentCapper = '';
  let currentSport = '';
  let currentPickDate = ''; // Track date from timestamp lines
  // Use Eastern timezone for today's date (reliable Intl.DateTimeFormat)
  const now = new Date();
  const todayParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const today = `${todayParts.find(p => p.type === 'year')?.value}-${todayParts.find(p => p.type === 'month')?.value}-${todayParts.find(p => p.type === 'day')?.value}`;
  const todayMonth = parseInt(todayParts.find(p => p.type === 'month')?.value || '0');
  const todayDay = parseInt(todayParts.find(p => p.type === 'day')?.value || '0');

  /** Extract M/D from timestamp and check if it's today */
  function extractDateFromTimestamp(line: string): boolean {
    const tsMatch = line.match(/\[[\d:]+\s*[AP]M(?:\s+EST)?\s*(\d{1,2})\/(\d{1,2})\]/i);
    if (tsMatch) {
      const month = parseInt(tsMatch[1]);
      const day = parseInt(tsMatch[2]);
      currentPickDate = `${month}/${day}`;
      if (month !== todayMonth || day !== todayDay) {
        return false; // Not today's pick
      }
    }
    return true; // No date found or matches today
  }

  // Sport name mapping - handle various formats
  const sportMap: Record<string, string> = {
    'ncaa basketball': 'NCAAB',
    'ncaab basketball': 'NCAAB',
    'ncaab': 'NCAAB',
    'cbb': 'NCAAB',
    'college basketball': 'NCAAB',
    'basketball': 'NCAAB',
    'nba basketball': 'NBA',
    'ncaa football': 'NCAAF',
    'ncaaf': 'NCAAF',
    'cfb': 'NCAAF',
    'college football': 'NCAAF',
    'football': 'NFL', // Default football to NFL
    'ncaa': 'NCAAB',
    'nfl': 'NFL',
    'nfl football': 'NFL',
    'nba': 'NBA',
    'nhl': 'NHL',
    'mlb': 'MLB',
    'wnba': 'WNBA',
    'euroleague': 'EURO',
    'euro': 'EURO',
    'tennis': 'TENNIS',
    'atp tennis': 'TENNIS',
    'wta tennis': 'TENNIS',
    'challenger': 'TENNIS',
    'soccer': 'SOCCER',
  };

  // Skip these lines - they're not cappers
  const skipPatterns = [
    /RESULT_SCREENSHOT/i,
    /^\[OCR\]\s*$/,
    /^Tab\s+\d+$/i,
    /^PICKS_DATE/i,
    /^FREE PICKS/i,
    /^Last updated/i,
    /^═+$/,
    /^─+$/,
    /^Total picks/i,
    /CAPPERS FREE/i,
  ];

  for (const line of lines) {
    // Skip known non-content lines
    if (skipPatterns.some(p => p.test(line))) {
      continue;
    }

    // Check for capper name in [OCR] format: [OCR] CapperName
    // This is the PRIMARY way to get capper names from the new format
    const ocrCapperMatch = line.match(/^\[OCR\]\s+([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)?)\s*$/);
    if (ocrCapperMatch) {
      const capperName = ocrCapperMatch[1].trim();
      // Skip if it looks like a sport name
      if (!sportMap[capperName.toLowerCase()]) {
        currentCapper = capperName;
        continue;
      }
    }

    // Check for timestamp + capper: [03:38 PM EST 2/3] [OCR] CapperName
    const timestampCapperMatch = line.match(/^\[[\d:]+\s*[AP]M(?:\s+EST)?\s*[\d\/]*\]\s*\[OCR\]\s+([A-Za-z0-9_]+(?:\s*[A-Za-z0-9_]*)*)\s*$/i);
    if (timestampCapperMatch) {
      const capperName = timestampCapperMatch[1].trim();
      if (!sportMap[capperName.toLowerCase()] && capperName.length > 1) {
        const isToday = extractDateFromTimestamp(line);
        if (!isToday) {
          logger.debug('GoogleDoc', `Skipping stale capper "${capperName}" (date: ${currentPickDate}, today: ${todayMonth}/${todayDay})`);
          currentCapper = ''; // Clear capper so their picks are skipped
          continue;
        }
        currentCapper = capperName;
        continue;
      }
    }

    // Check for timestamp + plain capper: [11:13 AM EST 2/3] CAPPER_NAME (no [OCR])
    const plainCapperMatch = line.match(/^\[[\d:]+\s*[AP]M(?:\s+EST)?\s*[\d\/]*\]\s+([A-Za-z][A-Za-z0-9_\s]+)$/i);
    if (plainCapperMatch && !line.includes('[OCR]')) {
      const capperName = plainCapperMatch[1].trim();
      // Skip collage lists (comma separated)
      if (!capperName.includes(',') && !capperName.includes('&') && !sportMap[capperName.toLowerCase()]) {
        const isToday = extractDateFromTimestamp(line);
        if (!isToday) {
          logger.debug('GoogleDoc', `Skipping stale capper "${capperName}" (date: ${currentPickDate}, today: ${todayMonth}/${todayDay})`);
          currentCapper = '';
          continue;
        }
        currentCapper = capperName;
        continue;
      }
    }

    // Check for sport header: NBA:, NHL:, NCAAB Basketball:, etc.
    // Also handle: [timestamp] [OCR] NFL Football:
    let lineToProcess = line;
    
    // First strip any timestamp prefix: [HH:MM AM/PM EST M/D]
    let strippedLine = line.replace(/^\[[\d:]+\s*[AP]M(?:\s+EST)?\s*[\d\/]*\]\s*/i, '');
    
    const sportMatch = strippedLine.match(/^(?:\[OCR\]\s*)?(?:NCAA\s*Basketball|College\s*Basketball|NCAAB\s*Basketball|NCAA\s*Football|College\s*Football|NFL\s*Football|NBA\s*Basketball|Basketball|Football|NCAA|CFB|CBB|NFL|NBA|NHL|MLB|WNBA|NCAAF|NCAAB|EUROLEAGUE|EURO|TENNIS|ATP|WTA|Challenger|Soccer)\s*:?\s*/i);
    if (sportMatch) {
      const sportText = sportMatch[0].replace(/^\[OCR\]\s*/i, '').replace(/:?\s*$/, '').toLowerCase().trim();
      const newSport = sportMap[sportText] || sportText.toUpperCase();
      logger.debug('Parser', `Sport header detected: "${sportText}" -> ${newSport}`);
      currentSport = newSport;
      
      // If this line ONLY has the sport header (no capper before it), mark capper as unknown
      // This handles orphaned picks like "[timestamp] [OCR] NFL Football:"
      if (!currentCapper) {
        currentCapper = 'Unknown';
      }

      // Check if there's a pick on the same line after the sport header
      const remainingLine = strippedLine.slice(sportMatch[0].length).trim();
      if (remainingLine && remainingLine.match(/^[•\-\*]/)) {
        lineToProcess = remainingLine;
      } else {
        continue;
      }
    }

    // Check for pick line: • Team +spread (odds) or Team -spread
    // Handle formats like: • GOLDEN STATE WARRIORS (-3) over Philadelphia 76ERS (3-UNITS)
    // Also handle lines with just leading whitespace (no bullet) - common in Google Doc exports
    // Match: bullet + content OR whitespace + capital letter starting content
    const pickMatch = lineToProcess.match(/^(?:[•\-\*]\s*|\s+)([A-Za-z].+?)\s+([+-]?\d+\.?\d*|ML|Over\s*[\d.]+|Under\s*[\d.]+|o[\d.]+|u[\d.]+)\s*(?:\(([^)]*)\))?\s*(?:over\s+.+)?(?:\s*\([^)]*\))?/i);
    if (pickMatch && currentCapper) {
      let team = pickMatch[1].trim();
      let betPart = pickMatch[2].trim();
      
      // Extract spread from team if it's like "WARRIORS (-3)"
      const spreadInTeam = team.match(/^(.+?)\s*\(([+-]?\d+\.?\d*)\)\s*$/);
      if (spreadInTeam) {
        team = spreadInTeam[1].trim();
        betPart = spreadInTeam[2];
      }
      
      const pick = `${team} ${betPart}`;
      const sport = currentSport || 'ALL';

      // Debug: Log Seattle picks to trace sport classification
      if (team.toLowerCase().includes('seattle') || team.toLowerCase().includes('england')) {
        logger.debug('Parser', `Seattle/England pick created: team="${team}", sport="${sport}", capper="${currentCapper}"`);
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

    // Alternative pick format without bullet: Team +spread or Team ML
    const altPickMatch = lineToProcess.match(/^([A-Z][A-Za-z\s.()]+)\s+([+-]\d+\.?\d*|ML)\s*(?:\(|$)/i);
    if (altPickMatch && currentCapper && !lineToProcess.includes('[') && !lineToProcess.match(/^\w+:/)) {
      const team = altPickMatch[1].trim();
      const betPart = altPickMatch[2].trim();
      const pick = `${team} ${betPart}`;
      const sport = currentSport || 'ALL';

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

  logger.info('GoogleDoc', `Parsed ${picks.length} picks from ${new Set(picks.map(p => p.service)).size} cappers`);
  return picks;
}

/**
 * Split parlay legs into individual picks
 * Detects patterns like "Bills + Chiefs ML" or "Bills ML + Chiefs -3"
 * Returns array of individual picks (1 for non-parlays, N for N-leg parlays)
 *
 * IMPORTANT: Must distinguish between:
 * - Parlays: "Bills + Chiefs ML" (space + space pattern between teams)
 * - Spreads: "Bills +3" (no space after +, this is NOT a parlay)
 */
function splitParlayLegs(pick: RawPick): RawPick[] {
  const pickText = pick.pick || '';

  // Pattern: Require space on BOTH sides of + to identify parlay separator
  // This prevents "Bills +3" from being split (no space after +)
  // Examples that SHOULD split: "Bills + Chiefs", "Bills ML + Chiefs ML"
  // Examples that should NOT split: "Bills +3", "Chiefs +7.5"
  const parlayPattern = /\s+\+\s+/;

  // Check if this looks like a parlay (has + separator with spaces on both sides)
  if (!parlayPattern.test(pickText)) {
    return [pick]; // Not a parlay, return as-is
  }

  // Split by " + " (space-plus-space)
  const legs = pickText.split(parlayPattern).map(leg => leg.trim()).filter(Boolean);

  // If only one leg after split, not a parlay
  if (legs.length < 2) {
    return [pick];
  }

  // Validate each leg looks like a bet (has team name + optional line/ML)
  // Skip if any leg doesn't look like a bet (might be odds like "+110")
  const validLegs = legs.filter(leg => {
    // Must start with a letter (team name)
    if (!/^[A-Za-z]/.test(leg)) return false;
    // Must have at least 2 characters
    if (leg.length < 2) return false;
    // Skip pure numbers/odds
    if (/^\d+$/.test(leg)) return false;
    return true;
  });

  if (validLegs.length < 2) {
    return [pick]; // Not enough valid legs, return as-is
  }

  // Create individual picks for each leg
  return validLegs.map(leg => ({
    ...pick,
    pick: leg,
    matchup: leg.replace(/\s+(ML|[+-]\d+\.?\d*|Over\s*[\d.]+|Under\s*[\d.]+).*$/i, '').trim(),
    // Keep original service/capper but note it was from a parlay
  }));
}

/**
 * Process all raw picks to split parlays into individual legs
 */
function processRawPicks(picks: RawPick[]): RawPick[] {
  const processed: RawPick[] = [];

  for (const pick of picks) {
    const splitLegs = splitParlayLegs(pick);
    processed.push(...splitLegs);
  }

  // Log if any parlays were split
  const originalCount = picks.length;
  const processedCount = processed.length;
  if (processedCount > originalCount) {
    logger.debug('Parlays', `Split ${processedCount - originalCount} parlay legs (${originalCount} -> ${processedCount} picks)`);
  }

  return processed;
}

/**
 * Get all picks from all sources
 */
export async function getAllPicksFromSources(): Promise<RawPick[]> {
  const [sheetPicks, supabasePicks] = await Promise.all([
    fetchAllPicks(),
    // fetchPicksFromGoogleDoc(), // DISABLED - TG free cappers now come via Supabase/Discord
    fetchPicksFromSupabase(), // HiddenBag Discord cappers via Supabase
  ]);
  const docPicks: RawPick[] = []; // Empty - doc source disabled

  // Debug: log pick counts by source and sport
  const sheetSports: Record<string, number> = {};
  for (const p of sheetPicks) {
    sheetSports[p.league] = (sheetSports[p.league] || 0) + 1;
  }
  const docSports: Record<string, number> = {};
  for (const p of docPicks) {
    docSports[p.league] = (docSports[p.league] || 0) + 1;
  }
  const supabaseSports: Record<string, number> = {};
  for (const p of supabasePicks) {
    supabaseSports[p.league] = (supabaseSports[p.league] || 0) + 1;
  }
  logger.debug('DataSources', `Sheet: ${sheetPicks.length} picks`, sheetSports);
  logger.debug('DataSources', `Doc: ${docPicks.length} picks`, docSports);
  logger.debug('DataSources', `Supabase (FreeCappers): ${supabasePicks.length} picks`, supabaseSports);

  // Combine all picks and split parlay legs into individual picks
  const combinedPicks = [...sheetPicks, ...docPicks, ...supabasePicks];
  const allPicks = processRawPicks(combinedPicks);

  // Fix sport misclassification for known college teams
  // Teams like Liberty, Gonzaga, etc. should always be NCAAB (basketball)
  const ncaabOnlyTeams = ['liberty', 'gonzaga', 'wazzu', 'colgate', 'seattle', 'pepperdine', 'ul-monroe', 'winthrop'];

  // College team names that might be confused with NFL (e.g., "Hurricanes" is college, not NFL)
  const collegeTeamNames = ['hurricanes', 'gators', 'seminoles', 'volunteers', 'bulldogs', 'crimson tide',
    'longhorns', 'wolverines', 'buckeyes', 'nittany lions', 'spartans', 'cornhuskers', 'tar heels',
    'blue devils', 'hokies', 'cavaliers', 'yellow jackets', 'fightin irish', 'fighting irish'];

  for (const pick of allPicks) {
    const pickText = (pick.pick || '').toLowerCase();
    const matchupText = (pick.matchup || '').toLowerCase();
    const leagueUpper = (pick.league || '').toUpperCase();

    // Fix NCAAB-only teams
    const isNCAABTeam = ncaabOnlyTeams.some(t => pickText.includes(t) || matchupText.includes(t));
    if (isNCAABTeam && pick.league !== 'NCAAB') {
      logger.debug('DataSources', `Reclassifying ${pick.pick} from ${pick.league} to NCAAB (basketball-only team)`);
      pick.league = 'NCAAB';
    }

    // Fix college teams incorrectly labeled as NFL
    if (leagueUpper === 'NFL') {
      const isCollegeTeam = collegeTeamNames.some(t => pickText.includes(t) || matchupText.includes(t));
      if (isCollegeTeam) {
        // Check if it's basketball season (Nov-Apr) or football (Aug-Jan)
        const month = new Date().getMonth() + 1;
        const isBasketballSeason = month >= 11 || month <= 4;
        const newLeague = isBasketballSeason ? 'NCAAB' : 'NCAAF';
        logger.debug('DataSources', `Reclassifying ${pick.pick} from NFL to ${newLeague} (college team name detected)`);
        pick.league = newLeague;
      }
    }
  }

  return allPicks;
}
