/**
 * Pro picks feed (/api/picks) clean-up (QA 2026-11-19 found raw text like
 * "Avalanche +100 at Novig", "Utah State -28.5 -102 at Novig", "Live bet OKC", "CASH Buffalo",
 * spreads typed as ML, and a "capper" that is four cappers pasted together).
 *
 * Only removes text that is not part of the pick (prices, sportsbook names, status words) and
 * fixes the bet type when the text itself carries a spread. A row with nothing left is dropped.
 * Nothing is invented: no team, line or result is guessed.
 */
import type { NormalizedPick } from '@/types';
import { isJunkCapperName } from '@/lib/data/capper-identity';

const BOOKS = ['novig', 'fanduel', 'draftkings', 'betmgm', 'playmgm', 'mgm', 'caesars', 'espn bet', 'espnbet', 'fanatics', 'betrivers', 'hard rock', 'hardrock', 'bet365', 'prizepicks', 'underdog', 'fliff', 'kalshi', 'polymarket', 'bovada', 'pinnacle', 'circa', 'betonline', 'mybookie', 'thescore', 'bally bet'];
const BOOK_RE = new RegExp(`\\s*(?:\\bat\\b|@)\\s*(?:${BOOKS.map((b) => b.replace(/ /g, '\\s+')).join('|')})\\b.*$`, 'i');
// Status words are stripped only when they can't be part of a name: "Live bet …" in any case,
// otherwise ALL-CAPS ("CASH Buffalo", "LOCK Lakers") or followed by ":"/"-" ("Lock: Lakers").
// "Max Fried", "Lock Haven", "Live Oak", "Cash Money" are left alone.
const LEAD_CAPS_RE = /^(?:LIVE BET|LIVE|CASHED|CASH|LOCK|POTD|MAX BET|MAX)\s*[:\-–]?\s+/; // case-sensitive
const LEAD_ANY_RE = /^(?:live\s+bet\s*[:\-–]?\s+|(?:live|cashed|cash|lock|potd|max\s+bet)\s*[:\-–]\s*)/i;
const LEAD_RE = { test: (t: string) => LEAD_CAPS_RE.test(t) || LEAD_ANY_RE.test(t) };
const stripLead = (t: string) => t.replace(LEAD_CAPS_RE, '').replace(LEAD_ANY_RE, '');
const PRICE_RE = /\s+[+-]\d{3,4}\s*$/;            // trailing American odds: "+100", "-102"
const SPREAD_RE = /\s+([+-]\d{1,2}(?:\.5|\.0)?)\s*$/; // trailing spread: "-28.5", "+3"

export function cleanTeamText(raw: string): { team: string; spread: string | null } {
  let t = String(raw || '').replace(/½/g, '.5').trim();
  t = t.replace(BOOK_RE, '').trim();
  for (let i = 0; i < 2 && LEAD_RE.test(t); i++) t = stripLead(t).trim();
  t = t.replace(PRICE_RE, '').trim();
  const m = t.match(SPREAD_RE);
  const spread = m ? m[1] : null;
  if (m) t = t.slice(0, m.index).trim();
  t = t.replace(PRICE_RE, '').trim();
  return { team: t, spread };
}

export function cleanFeedPicks(picks: NormalizedPick[]): NormalizedPick[] {
  const out: NormalizedPick[] = [];
  for (const p of picks) {
    if (isJunkCapperName(p.capper)) continue;
    const { team, spread } = cleanTeamText(p.team);
    if (team.length < 2 || !/[a-z]/i.test(team)) continue;
    const next: NormalizedPick = { ...p, team };
    if (spread && !p.line) next.line = spread;
    if (spread && /^(ml|moneyline)$/i.test(p.betType)) next.betType = 'SPREAD';
    if (p.standardizedTeam === p.team) next.standardizedTeam = team;
    out.push(next);
  }
  return out;
}
