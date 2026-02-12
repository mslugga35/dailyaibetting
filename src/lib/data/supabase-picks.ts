/**
 * Supabase Picks Data Fetching
 *
 * Fetches today's picks from hb_picks (joined with hb_cappers for names)
 * and converts them to RawPick format for the consensus builder.
 *
 * Data sources that feed hb_picks:
 *   - Discord bot → parse-worker (source_type = 'discord')
 *   - Google Sheets → sheets-to-supabase.py → parse-worker (source_type = 'sheets')
 *
 * Note: Picks from Google Sheets appear in BOTH this Supabase query AND the
 * Google Sheets fetch (via getAllPicksFromSources). The consensus builder
 * deduplicates by capper + team + bet_type, so consensus counts stay accurate.
 *
 * @module lib/data/supabase-picks
 */

import { RawPick } from '../consensus/consensus-builder';
import { identifySport } from '../consensus/team-mappings';
import { getTodayET } from '../utils/date';
import { logger } from '../utils/logger';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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
        pick_type,
        line,
        odds,
        units,
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

    // Convert to RawPick format
    const rawPicks: RawPick[] = picks.map((pick: any) => {
      // Get capper name from joined table
      const capperName = pick.capper?.name || 'Unknown';
      
      // Build pick text from team + line
      let pickText = pick.team || '';
      if (pick.line) {
        // Add line for spreads/totals
        const line = parseFloat(pick.line);
        if (!isNaN(line)) {
          if (pick.pick_type === 'spread') {
            pickText = `${pick.team} ${line > 0 ? '+' : ''}${line}`;
          } else if (pick.pick_type === 'over' || pick.pick_type === 'under') {
            pickText = `${pick.team} ${pick.pick_type} ${Math.abs(line)}`;
          }
        }
      }
      if (pick.pick_type === 'moneyline' || pick.pick_type === 'ml') {
        pickText = `${pick.team} ML`;
      }

      // Map sport to standard format
      const sportMap: Record<string, string> = {
        'nba': 'NBA',
        'nfl': 'NFL',
        'nhl': 'NHL',
        'mlb': 'MLB',
        'ncaab': 'NCAAB',
        'ncaaf': 'NCAAF',
        'soccer': 'SOCCER',
        'tennis': 'TENNIS',
        'other': 'OTHER',
      };
      let sport = sportMap[(pick.sport || '').toLowerCase()] || 'OTHER';

      // Cross-check: if sport is NBA but team is a college team, fix it
      if ((sport === 'NBA' || sport === 'OTHER') && pick.team) {
        const detected = identifySport(pick.team);
        if (detected && detected !== sport) {
          sport = detected;
        }
      }

      return {
        site: 'FreeCappers',
        league: sport,
        date: todayStr,
        matchup: pick.team || '',
        service: capperName,
        pick: pickText,
        runDate: todayStr,
      };
    });

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
