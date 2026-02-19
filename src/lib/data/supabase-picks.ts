/**
 * Supabase Picks Data Fetching — Single Source of Truth
 *
 * Fetches today's picks from hb_picks (joined with hb_cappers for names)
 * and converts them to RawPick format for the consensus builder.
 *
 * All picks now flow through hb_picks regardless of origin:
 *   - Discord cappers: bot → parse-worker → hb_picks (source = 'discord')
 *   - Website scrapers: dailyai-picks-local → hb_picks (source = 'scrape')
 *   - Legacy sheets:   sheets-to-supabase → parse-worker → hb_picks (source = 'sheets')
 *
 * The `source` column on each pick determines the site label shown on the website.
 *
 * @module lib/data/supabase-picks
 */

import { RawPick } from '../consensus/consensus-builder';
import { identifySport } from '../consensus/team-mappings';
import { getTodayET, getYesterdayET } from '../utils/date';
import { logger } from '../utils/logger';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/** Map hb_picks sport values to consensus-builder standard format */
const HB_SPORT_MAP: Record<string, string> = {
  'nba': 'NBA', 'nfl': 'NFL', 'nhl': 'NHL', 'mlb': 'MLB',
  'ncaab': 'NCAAB', 'ncaaf': 'NCAAF', 'soccer': 'SOCCER',
  'tennis': 'TENNIS', 'other': 'OTHER',
};

/** Map hb_picks.source to display site label */
const SOURCE_SITE_MAP: Record<string, string> = {
  'scrape': 'Scraper',
  'discord': 'FreeCappers',
  'sheets': 'FreeCappers',
  'manual': 'Manual',
  'telegram': 'FreeCappers',
};

/** Convert an hb_picks row into a RawPick for the consensus builder */
function hbPickToRawPick(pick: any, dateStr: string): RawPick {
  const capperName = pick.capper?.name || 'Unknown';
  const teamName = pick.team || '';
  const opponentName = pick.opponent || '';

  // For over/under with "Total" as team, use opponent for game context
  const displayTeam = (teamName === 'Total' && opponentName) ? opponentName : teamName;

  let pickText = displayTeam;
  if (pick.line) {
    const line = parseFloat(pick.line);
    if (!isNaN(line)) {
      if (pick.pick_type === 'spread') {
        pickText = `${displayTeam} ${line > 0 ? '+' : ''}${line}`;
      } else if (pick.pick_type === 'over' || pick.pick_type === 'under') {
        pickText = `${displayTeam} ${pick.pick_type} ${Math.abs(line)}`;
      }
    }
  }
  if (pick.pick_type === 'moneyline' || pick.pick_type === 'ml') {
    pickText = `${displayTeam} ML`;
  }

  let sport = HB_SPORT_MAP[(pick.sport || '').toLowerCase()] || 'OTHER';
  if ((sport === 'NBA' || sport === 'OTHER') && displayTeam) {
    const detected = identifySport(displayTeam);
    if (detected && detected !== sport) sport = detected;
  }

  const site = SOURCE_SITE_MAP[pick.source] || 'FreeCappers';

  return {
    site,
    league: sport,
    date: dateStr,
    matchup: displayTeam,
    service: capperName,
    pick: pickText,
    runDate: dateStr,
  };
}

/**
 * Fetch picks from Supabase hb_picks table
 * Returns picks in RawPick format for consensus builder
 */
export async function fetchPicksFromSupabase(): Promise<RawPick[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    logger.warn('Supabase', 'Supabase credentials not configured, skipping');
    return [];
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const todayStr = getTodayET();
    
    // Calculate tomorrow for wide range
    const todayDate = new Date(todayStr + 'T12:00:00Z');
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
    
    // Wide range: midnight UTC today to 5am UTC tomorrow
    // Picks for today's games may be posted the night before (ET evening = UTC early morning)
    // The consensus builder handles dedup, so slightly wider is better than missing picks
    const utcStart = `${todayStr}T00:00:00Z`;
    const utcEnd = `${tomorrowStr}T04:59:59Z`;
    
    logger.debug('Supabase', `Fetching picks for ET day ${todayStr}: ${utcStart} to ${utcEnd}`);
    
    // Fetch today's picks with capper names
    const { data: picks, error } = await supabase
      .from('hb_picks')
      .select(`
        id,
        sport,
        team,
        opponent,
        pick_type,
        line,
        odds,
        units,
        source,
        posted_at,
        created_at,
        capper:hb_cappers(name)
      `)
      .gte('created_at', utcStart)
      .lte('created_at', utcEnd);

    if (error) {
      logger.error('Supabase', `Failed to fetch picks: ${error.message}`);
      return [];
    }

    if (!picks || picks.length === 0) {
      logger.debug('Supabase', 'No picks found for today');
      return [];
    }

    logger.info('Supabase', `Fetched ${picks.length} picks from hb_picks`);

    const rawPicks: RawPick[] = picks.map((pick: any) => hbPickToRawPick(pick, todayStr));

    // Log sport breakdown
    const sportCounts: Record<string, number> = {};
    for (const p of rawPicks) {
      sportCounts[p.league] = (sportCounts[p.league] || 0) + 1;
    }
    logger.debug('Supabase', 'Sport breakdown:', sportCounts);

    return rawPicks;
  } catch (error) {
    logger.error('Supabase', `Exception fetching picks: ${error}`);
    return [];
  }
}

/**
 * Fetch yesterday's picks from Supabase hb_picks table
 */
export async function fetchYesterdayPicksFromSupabase(): Promise<RawPick[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const yesterdayStr = getYesterdayET();

    const yesterdayDate = new Date(yesterdayStr + 'T12:00:00Z');
    const nextDay = new Date(yesterdayDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const utcStart = `${yesterdayStr}T00:00:00Z`;
    const utcEnd = `${nextDay.toISOString().split('T')[0]}T04:59:59Z`;

    const { data: picks, error } = await supabase
      .from('hb_picks')
      .select(`
        id, sport, team, opponent, pick_type, line, odds, units, source, posted_at, created_at,
        capper:hb_cappers(name)
      `)
      .gte('created_at', utcStart)
      .lte('created_at', utcEnd);

    if (error || !picks || picks.length === 0) return [];

    logger.info('Supabase', `Fetched ${picks.length} yesterday picks from hb_picks`);

    return picks.map((pick: any) => hbPickToRawPick(pick, yesterdayStr));
  } catch (error) {
    logger.error('Supabase', `Exception fetching yesterday picks: ${error}`);
    return [];
  }
}
