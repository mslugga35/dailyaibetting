/**
 * The other side of a consensus pick, for "Fade The Public".
 *
 * A spread fade is the OPPONENT at the negated line ("Oregon State +1.5" in
 * "Oregon State @ Utah" fades to "Utah -1.5"), never the same team with the sign flipped.
 * Returns null when the opponent can't be identified, so the UI never shows a wrong side.
 */
export interface FadeInput {
  bet: string;
  matchup: string;
  betType: string;
  line?: string;
}

function negate(line: string): string | null {
  const m = line.trim().match(/^([+-]?)(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  if (Number(m[2]) === 0) return 'PK';
  return `${m[1] === '-' ? '+' : '-'}${m[2]}`;
}

function opponentOf(team: string, matchup: string): string | null {
  const sides = matchup.split(' @ ').map((s) => s.trim());
  if (sides.length !== 2 || !sides[0] || !sides[1]) return null;
  const t = team.trim().toLowerCase();
  if (sides[0].toLowerCase() === t) return sides[1];
  if (sides[1].toLowerCase() === t) return sides[0];
  return null;
}

export function fadeSide(pick: FadeInput): string | null {
  const type = pick.betType.toUpperCase();
  if (type === 'OVER') return /\bover\b/i.test(pick.bet) ? pick.bet.replace(/\bover\b/i, 'Under') : null;
  if (type === 'UNDER') return /\bunder\b/i.test(pick.bet) ? pick.bet.replace(/\bunder\b/i, 'Over') : null;
  if (type === 'ML') {
    const opp = opponentOf(pick.bet.replace(/\s+ML$/i, ''), pick.matchup);
    return opp ? `${opp} ML` : null;
  }
  if (type === 'SPREAD' && pick.line) {
    const team = pick.bet.endsWith(pick.line) ? pick.bet.slice(0, -pick.line.length) : pick.bet;
    const opp = opponentOf(team, pick.matchup);
    const neg = negate(pick.line);
    return opp && neg ? `${opp} ${neg}` : null;
  }
  return null;
}
