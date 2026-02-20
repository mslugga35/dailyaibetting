/**
 * Picks Aggregation — Routes Supabase data through consensus pipeline
 *
 * All picks now live in Supabase hb_picks (single source of truth).
 * This module fetches from supabase-picks.ts, splits parlays into
 * individual legs, and applies sport reclassification heuristics.
 *
 * Historical note: This file previously fetched from Google Sheets and
 * Google Docs. That code was removed when Supabase became the sole source.
 *
 * @module lib/data/google-sheets
 */

import { RawPick } from '../consensus/consensus-builder';
import { logger } from '../utils/logger';
import { fetchPicksFromSupabase, fetchYesterdayPicksFromSupabase } from './supabase-picks';

/**
 * Split parlay legs into individual picks.
 * "Bills + Chiefs ML" → two separate picks.
 *
 * IMPORTANT: Requires space on BOTH sides of + to avoid splitting spreads.
 * "Bills +3" is NOT a parlay — the + has no leading space.
 */
function splitParlayLegs(pick: RawPick): RawPick[] {
  const pickText = pick.pick || '';
  const parlayPattern = /\s+\+\s+/;

  if (!parlayPattern.test(pickText)) {
    return [pick];
  }

  const legs = pickText.split(parlayPattern).map(leg => leg.trim()).filter(Boolean);
  if (legs.length < 2) {
    return [pick];
  }

  const validLegs = legs.filter(leg => {
    if (!/^[A-Za-z]/.test(leg)) return false;
    if (leg.length < 2) return false;
    if (/^\d+$/.test(leg)) return false;
    return true;
  });

  if (validLegs.length < 2) {
    return [pick];
  }

  return validLegs.map(leg => ({
    ...pick,
    pick: leg,
    matchup: leg.replace(/\s+(ML|[+-]\d+\.?\d*|Over\s*[\d.]+|Under\s*[\d.]+).*$/i, '').trim(),
  }));
}

/** Split all parlays in a pick array into individual legs */
function processRawPicks(picks: RawPick[]): RawPick[] {
  const processed: RawPick[] = [];

  for (const pick of picks) {
    processed.push(...splitParlayLegs(pick));
  }

  if (processed.length > picks.length) {
    logger.debug('Parlays', `Split ${processed.length - picks.length} parlay legs (${picks.length} -> ${processed.length} picks)`);
  }

  return processed;
}

// Teams that are always NCAAB (prevents misclassification as NBA/OTHER)
const NCAAB_ONLY_TEAMS = ['liberty', 'gonzaga', 'wazzu', 'colgate', 'seattle', 'pepperdine', 'ul-monroe', 'winthrop'];

// College team names that could be confused with NFL
const COLLEGE_TEAM_NAMES = [
  'hurricanes', 'gators', 'seminoles', 'volunteers', 'bulldogs', 'crimson tide',
  'longhorns', 'wolverines', 'buckeyes', 'nittany lions', 'spartans', 'cornhuskers',
  'tar heels', 'blue devils', 'hokies', 'cavaliers', 'yellow jackets',
  'fightin irish', 'fighting irish',
];

/**
 * Get all picks from Supabase, split parlays, fix sport misclassification.
 * Called by /api/consensus, /api/picks, /api/daily-bets.
 */
export async function getAllPicksFromSources(): Promise<RawPick[]> {
  const supabasePicks = await fetchPicksFromSupabase();

  const supabaseSports: Record<string, number> = {};
  for (const p of supabasePicks) {
    supabaseSports[p.league] = (supabaseSports[p.league] || 0) + 1;
  }
  logger.debug('DataSources', `Supabase: ${supabasePicks.length} picks`, supabaseSports);

  const allPicks = processRawPicks(supabasePicks);

  // Fix sport misclassification for known college teams
  for (const pick of allPicks) {
    const pickText = (pick.pick || '').toLowerCase();
    const matchupText = (pick.matchup || '').toLowerCase();
    const leagueUpper = (pick.league || '').toUpperCase();

    if (NCAAB_ONLY_TEAMS.some(t => pickText.includes(t) || matchupText.includes(t)) && pick.league !== 'NCAAB') {
      logger.debug('DataSources', `Reclassifying ${pick.pick} from ${pick.league} to NCAAB (basketball-only team)`);
      pick.league = 'NCAAB';
    }

    if (leagueUpper === 'NFL' && COLLEGE_TEAM_NAMES.some(t => pickText.includes(t) || matchupText.includes(t))) {
      const month = new Date().getMonth() + 1;
      const newLeague = (month >= 11 || month <= 4) ? 'NCAAB' : 'NCAAF';
      logger.debug('DataSources', `Reclassifying ${pick.pick} from NFL to ${newLeague} (college team name detected)`);
      pick.league = newLeague;
    }
  }

  return allPicks;
}

/**
 * Get yesterday's picks from Supabase with parlay splitting.
 * Called by /api/consensus for yesterday comparison.
 */
export async function getAllYesterdayPicksFromSources(): Promise<RawPick[]> {
  const supabasePicks = await fetchYesterdayPicksFromSupabase();

  logger.debug('DataSources', `Yesterday — Supabase: ${supabasePicks.length}`);

  return processRawPicks(supabasePicks);
}
