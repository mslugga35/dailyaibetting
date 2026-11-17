/**
 * Which sports are in season today, for the DailyAI Picks report.
 *
 * Derived from real data first: the ESPN scoreboard the report already fetches
 * (games in a window around now, plus ESPN's own season type), and today's expert
 * picks. A hard-coded calendar is used ONLY for a sport whose ESPN fetch failed,
 * so an ESPN outage does not silently drop (or keep) a whole sport.
 *
 * Pure: no I/O, no clock. The caller passes `now`, which keeps this testable.
 *
 * @created 2026-11-17 — BallparkPal removed; off-season sports (e.g. MLB in
 *   November) no longer appear in the prompt or the report.
 */

/** Sports with an ESPN scoreboard the report reads. Keys match hb_sport_type. */
export const TRACKED_SPORTS = [
  { key: 'nfl', label: 'NFL', espnPath: 'football/nfl' },
  { key: 'ncaaf', label: 'NCAAF', espnPath: 'football/college-football' },
  { key: 'nba', label: 'NBA', espnPath: 'basketball/nba' },
  { key: 'ncaab', label: 'NCAAB', espnPath: 'basketball/mens-college-basketball' },
  { key: 'nhl', label: 'NHL', espnPath: 'hockey/nhl' },
  { key: 'mlb', label: 'MLB', espnPath: 'baseball/mlb' },
] as const;

export type TrackedSport = (typeof TRACKED_SPORTS)[number]['key'];

/**
 * Fallback calendar, used only when ESPN could not be read for that sport.
 * Inclusive [start, end] as MM-DD in ET; a range may wrap the new year.
 * Deliberately generous at both ends (postseason included): a wrong "in season"
 * costs a few prompt lines, a wrong "out" drops a sport people are betting.
 */
export const FALLBACK_SEASONS: Record<TrackedSport, [string, string]> = {
  nfl: ['08-01', '02-15'],
  ncaaf: ['08-20', '01-25'],
  nba: ['10-01', '06-25'],
  ncaab: ['11-01', '04-10'],
  nhl: ['10-01', '06-30'],
  mlb: ['03-15', '11-05'],
};

/** ESPN `leagues[0].season.type.type`: 1 pre, 2 regular, 3 post, 4 off-season. */
export const ESPN_OFF_SEASON = 4;

/** Games this far either side of `now` count as "today's slate". */
export const SLATE_WINDOW_MS = 36 * 60 * 60 * 1000;

export interface EspnSeasonSignal {
  /** false when the fetch failed, timed out or did not parse — unknown, not "no games" */
  fetched: boolean;
  /** event start times (ISO) the scoreboard returned */
  eventDates: string[];
  /** ESPN season type, when present */
  seasonType: number | null;
}

export interface SeasonDecision {
  /** in-season sport keys, tracked first in TRACKED_SPORTS order, then pick-only sports */
  inSeason: string[];
  /** sport key → one-line reason, for logs and tests */
  reasons: Record<string, string>;
}

/** Normalise a pick's sport string to an hb_sport_type key. */
export function normalizeSport(raw: string | null | undefined): string {
  const s = String(raw || '').trim().toLowerCase();
  const aliases: Record<string, string> = {
    cbb: 'ncaab', 'college basketball': 'ncaab', ncaam: 'ncaab',
    cfb: 'ncaaf', 'college football': 'ncaaf',
  };
  return aliases[s] || s || 'other';
}

function mmdd(now: Date): string {
  // en-CA gives YYYY-MM-DD; take MM-DD in ET.
  return now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).slice(5);
}

export function inFallbackSeason(sport: TrackedSport, now: Date): boolean {
  const [start, end] = FALLBACK_SEASONS[sport];
  const d = mmdd(now);
  return start <= end ? d >= start && d <= end : d >= start || d <= end;
}

/**
 * Decide which sports the report should cover.
 *
 * Per tracked sport:
 *   1. ESPN says off-season                      → out (picks do not override: in
 *      November an "MLB" pick is a misclassification, not a slate)
 *   2. ESPN has a game within ±36h of now        → in
 *   3. ESPN season active and experts picked it  → in (e.g. NFL picks on a Wednesday)
 *   4. ESPN answered with nothing                → out
 *   5. ESPN could not be read                    → fallback calendar
 * Untracked sports (soccer, MMA, tennis…) are in when today's picks include them.
 * "other" is never a section of its own.
 */
export function decideInSeasonSports(
  espn: Partial<Record<TrackedSport, EspnSeasonSignal>>,
  pickCounts: Record<string, number>,
  now: Date,
): SeasonDecision {
  const inSeason: string[] = [];
  const reasons: Record<string, string> = {};
  const t = now.getTime();

  for (const { key } of TRACKED_SPORTS) {
    const sig = espn[key];
    const picks = pickCounts[key] || 0;
    if (!sig || !sig.fetched) {
      const on = inFallbackSeason(key, now);
      reasons[key] = `espn unavailable; fallback calendar says ${on ? 'in' : 'out'}`;
      if (on) inSeason.push(key);
      continue;
    }
    if (sig.seasonType === ESPN_OFF_SEASON) {
      reasons[key] = 'espn: off-season';
      continue;
    }
    const near = sig.eventDates.filter((d) => {
      const ms = Date.parse(d);
      return Number.isFinite(ms) && Math.abs(ms - t) <= SLATE_WINDOW_MS;
    }).length;
    if (near > 0) {
      reasons[key] = `espn: ${near} game(s) on the slate`;
      inSeason.push(key);
    } else if (sig.seasonType !== null && sig.seasonType >= 1 && sig.seasonType <= 3 && picks > 0) {
      reasons[key] = `espn: season active, no game today, ${picks} expert pick(s)`;
      inSeason.push(key);
    } else {
      reasons[key] = 'espn: no games scheduled';
    }
  }

  const tracked = new Set<string>(TRACKED_SPORTS.map((s) => s.key));
  for (const [sport, n] of Object.entries(pickCounts)) {
    if (tracked.has(sport) || sport === 'other' || n <= 0) continue;
    reasons[sport] = `${n} expert pick(s) today (no schedule feed)`;
    inSeason.push(sport);
  }

  return { inSeason, reasons };
}
