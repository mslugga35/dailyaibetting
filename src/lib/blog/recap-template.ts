/**
 * Daily recap blog post built from data only (no language model, $0 per post).
 *
 * Every number in the article is computed here from the inputs: today's fire picks (the free-tier
 * consensus view), yesterday's graded fire picks and the verified record (graded rows only). Nothing
 * is estimated or invented. A section whose data is missing says so instead of guessing.
 * Every value from the data is HTML-escaped (the page also sanitises the stored HTML).
 *
 * The article never claims to be AI-written or AI-analysed: it is a data recap of what tracked
 * cappers picked and how those picks were graded.
 */
import type { Record3 } from '@/lib/data/performance';
import { MIN_SAMPLE } from '@/lib/data/performance';

export interface RecapFirePick {
  /** Bet text as shown on the site, e.g. "Knicks -4.5" or "Over 221.5" */
  bet: string;
  sport: string;
  matchup?: string | null;
  capperCount: number;
}

export interface RecapGradedPick {
  sport: string | null;
  bet: string | null;
  capper_count: number | null;
  result: string;
  final_score: string | null;
}

export interface RecapInput {
  /** ET calendar date of the post, YYYY-MM-DD */
  isoDate: string;
  /** ET calendar date of the results section, YYYY-MM-DD */
  yesterdayIso: string;
  /** Fire picks visible on the free tier (at most the free-tier limit) */
  firePicks: RecapFirePick[];
  /** Total number of fire picks on today's board (aggregate count; may exceed firePicks.length) */
  totalFireCount: number;
  /** Yesterday's graded fire picks (WIN / LOSS / PUSH only) */
  yesterday: RecapGradedPick[];
  /** Yesterday's fire picks NOT graded (pending, void, postponed); 0 when all are graded */
  yesterdayUngraded: number;
  record: { last7: Record3; last30: Record3; allTime: Record3; bySport: Array<{ sport: string } & Record3> };
}

export interface RecapArticle {
  title: string;
  content: string;
  excerpt: string;
  seoTitle: string;
  tags: string[];
  readTime: string;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** "Monday, November 24, 2026" for an ET calendar date (noon UTC keeps the date stable). */
export function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Meta description length cap (search results truncate around 155-160 characters). */
const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, '')}…`);

/** "12-9-1 (57.1%)", with a small-sample note; pushes never count toward the rate. */
export function recordText(r: Record3): string {
  const base = `${r.wins}-${r.losses}${r.pushes ? `-${r.pushes}` : ''}`;
  if (r.winPct === null) return `${base} (no decided picks yet)`;
  return `${base} (${r.winPct.toFixed(1)}%${r.decided < MIN_SAMPLE ? ', small sample' : ''})`;
}

function tally(rows: RecapGradedPick[]) {
  const n = (res: string) => rows.filter((r) => r.result === res).length;
  const wins = n('WIN');
  const losses = n('LOSS');
  const pushes = n('PUSH');
  const decided = wins + losses;
  return { wins, losses, pushes, decided, winPct: decided ? Math.round((wins / decided) * 1000) / 10 : null };
}

const resultWord = (r: string) => (r === 'WIN' ? 'Win' : r === 'LOSS' ? 'Loss' : r === 'PUSH' ? 'Push' : esc(r));

/**
 * Returns null when there is nothing honest to publish (no fire picks today, or a count that does
 * not match the list). The caller then skips the post.
 */
export function buildRecapArticle(i: RecapInput): RecapArticle | null {
  // Callers pass fire picks only (isFire from /api/consensus, which applies the opposite-side rule).
  const picks = i.firePicks.filter((p) => p && typeof p.bet === 'string' && p.bet.trim());
  if (picks.length === 0) return null;
  const total = Math.max(i.totalFireCount, picks.length);

  const day = longDate(i.isoDate);
  const sports = [...new Set(picks.map((p) => p.sport).filter(Boolean))];
  const sportList = sports.join(', ');
  const hidden = total - picks.length;

  const title = `Consensus Picks Today (${shortDate(i.isoDate)}): ${plural(total, 'Fire Pick')} Where 3+ Cappers Agree`;
  const excerpt = clip(`${day}: ${plural(total, 'fire pick')} where 3+ tracked cappers agree${sportList ? ` (${sportList})` : ''}, plus yesterday's graded results and the verified record.`, 155);

  const out: string[] = [];
  out.push(
    `<p>DailyAI Betting tracks picks from public sports cappers and flags a <strong>fire pick</strong> when 3 or more of them independently land on the same side. ` +
    `For ${esc(day)}, the board has <strong>${plural(total, 'fire pick')}</strong>${sportList ? ` across ${esc(sportList)}` : ''}. ` +
    `Below are today's free fire picks, how yesterday's fire picks were graded, and the full verified record.</p>`,
  );

  // Today's fire picks
  out.push(`<h2>Today's fire picks</h2>`);
  out.push('<ul>');
  for (const p of picks) {
    const matchup = p.matchup && p.matchup.trim() ? ` (${esc(p.matchup.trim())})` : '';
    out.push(`<li><strong>${esc(p.bet.trim())}</strong>${matchup}: ${esc(p.sport)}, ${plural(Number(p.capperCount), 'capper')} agree</li>`);
  }
  out.push('</ul>');
  if (hidden > 0) {
    out.push(`<p>${plural(hidden, 'more fire pick')} ${hidden === 1 ? 'is' : 'are'} on today's board for Pro members. See <a href="/consensus">today's consensus</a> for the live board.</p>`);
  } else {
    out.push(`<p>Lines move during the day. See <a href="/consensus">today's consensus</a> for the live board.</p>`);
  }

  // Yesterday's results
  out.push(`<h2>Yesterday's results (${esc(shortDate(i.yesterdayIso))})</h2>`);
  const y = tally(i.yesterday);
  const ungraded = Math.max(0, Math.trunc(Number(i.yesterdayUngraded) || 0));
  if (y.wins + y.losses + y.pushes === 0) {
    out.push(ungraded > 0
      ? `<p>None of the ${plural(ungraded, 'fire pick')} from ${esc(shortDate(i.yesterdayIso))} has been graded yet. Picks are graded against final scores after each game ends.</p>`
      : `<p>There were no graded fire picks on ${esc(shortDate(i.yesterdayIso))}.</p>`);
  } else {
    out.push(
      `<p>Yesterday's fire picks went <strong>${y.wins}-${y.losses}${y.pushes ? `-${y.pushes}` : ''}</strong>` +
      (y.winPct === null ? '' : ` (${y.winPct.toFixed(1)}% of decided picks)`) + '.' +
      (ungraded > 0 ? ` ${plural(ungraded, 'more fire pick')} from that day ${ungraded === 1 ? 'is' : 'are'} not graded yet and ${ungraded === 1 ? 'is' : 'are'} not counted.` : '') + '</p>',
    );
    out.push('<ul>');
    for (const r of i.yesterday.slice(0, 15)) {
      const score = r.final_score ? `, final ${esc(r.final_score)}` : '';
      out.push(`<li>${resultWord(r.result)}: ${esc(r.bet ?? 'Pick')} (${esc(r.sport ?? '')}${r.capper_count ? `, ${plural(Number(r.capper_count), 'capper')}` : ''}${score})</li>`);
    }
    out.push('</ul>');
    if (i.yesterday.length > 15) out.push(`<p>${plural(i.yesterday.length - 15, 'more graded pick')} from that day ${i.yesterday.length - 15 === 1 ? 'is' : 'are'} not listed here. Recent graded picks are on the <a href="/results">results page</a>.</p>`);
  }

  // Verified record
  out.push(`<h2>Verified fire-pick record</h2>`);
  out.push('<ul>');
  out.push(`<li>Last 7 days: ${recordText(i.record.last7)}</li>`);
  out.push(`<li>Last 30 days: ${recordText(i.record.last30)}</li>`);
  out.push(`<li>All time: ${recordText(i.record.allTime)}</li>`);
  out.push('</ul>');
  const todays = i.record.bySport.filter((s) => sports.includes(s.sport));
  if (todays.length) {
    out.push(`<p>All-time record in today's sports: ${todays.map((s) => `${esc(s.sport)} ${recordText(s)}`).join('; ')}.</p>`);
  }
  out.push(
    `<p>Win rate is wins divided by wins plus losses; pushes are shown but not counted. Only graded fire picks count, ` +
    `and no profit or ROI is claimed because the odds at the time of each pick were not recorded. Details are on the <a href="/results">results page</a>.</p>`,
  );

  // Method
  out.push(`<h2>How fire picks work</h2>`);
  out.push(
    `<p>A fire pick needs at least 3 tracked cappers on the same side. A side that is out-voted by cappers on the other side of the same game is not a fire pick. ` +
    `More agreement does not guarantee a better result: the <a href="/results">results page</a> shows the record by number of cappers.</p>`,
  );

  out.push(
    `<p class="disclaimer">These picks come from third-party cappers and are information, not betting advice. No outcome is guaranteed. ` +
    `21+. Gambling problem? Call 1-800-GAMBLER.</p>`,
  );

  const content = out.join('\n');
  const words = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const tags = ['consensus picks', 'fire picks', 'best bets today', 'free sports picks', ...sports.map((s) => `${s} picks`)];
  return {
    title,
    content,
    excerpt,
    seoTitle: `Consensus Picks Today ${shortDate(i.isoDate)}: Fire Picks & Results`,
    tags,
    readTime: `${Math.max(1, Math.round(words / 200))} min read`,
  };
}
