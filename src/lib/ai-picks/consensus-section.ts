/**
 * "EXPERT CONSENSUS" section of the AI-picks prompt.
 *
 * With CONSENSUS_SOURCE=hb the counts come from the SHARED consensus
 * (hb_consensus_live via fetchHbConsensus): the same numbers both websites show,
 * one vote per independent capper per market, ML / spread / total separate.
 * The legacy fallback (raw hb_picks grouped by sport|team|type|line) is kept only
 * for CONSENSUS_SOURCE=legacy.
 */
export interface SharedConsensusLite {
  sport: string;
  bet: string;
  capperCount: number;
  cappers: string[];
  opposingCount?: number;
  tier?: string;
}

interface RawExpertPick {
  sport: string;
  team: string;
  pick_type: string;
  line: string | null;
  odds: string | number | null;
  capper_name: string;
}

export function consensusSection(
  shared: SharedConsensusLite[] | null | undefined,
  raw: { picks: RawExpertPick[]; capperCount: number } | null | undefined,
): string[] {
  const out: string[] = [];
  // hb mode passes an array (possibly empty when the shared consensus is stale/unavailable):
  // never rebuild a competing consensus from raw picks in that case.
  if (Array.isArray(shared) && shared.length === 0) {
    out.push('## EXPERT CONSENSUS: unavailable right now. Do not state or estimate capper-agreement counts.');
    return out;
  }
  if (shared && shared.length > 0) {
    out.push(`## EXPERT CONSENSUS (shared HiddenBag/DailyAI consensus, ${shared.length} groups; independent cappers only)`);
    for (const c of shared.slice(0, 40)) {
      const opp = c.opposingCount ? `, ${c.opposingCount} opposing` : '';
      out.push(`- ${c.sport.toUpperCase()} | ${c.bet} | ${c.capperCount} cappers${opp}${c.tier ? ` [${c.tier}]` : ''} (${c.cappers.slice(0, 5).join(', ')})`);
    }
    return out;
  }
  if (!raw || !raw.picks?.length) return out;
  const bets: Record<string, { count: number; cappers: string[] }> = {};
  for (const p of raw.picks) {
    const key = `${p.sport}|${p.team}|${p.pick_type}|${p.line || ''}`.toLowerCase();
    if (!bets[key]) bets[key] = { count: 0, cappers: [] };
    bets[key].count++;
    if (!bets[key].cappers.includes(p.capper_name)) bets[key].cappers.push(p.capper_name);
  }
  out.push(`## EXPERT CONSENSUS (${raw.picks.length} picks, ${raw.capperCount} cappers)`);
  const sorted = Object.entries(bets).sort((a, b) => b[1].count - a[1].count);
  for (const [key, bet] of sorted.slice(0, 40)) {
    const parts = key.split('|');
    out.push(`- ${parts[0].toUpperCase()} | ${parts[1]} ${parts[2]} ${parts[3]} | ${bet.count} cappers (${bet.cappers.slice(0, 5).join(', ')})`);
  }
  return out;
}
