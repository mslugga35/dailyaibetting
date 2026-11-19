/**
 * One capper, one row. The shared HiddenBag stats table holds the same capper under
 * spelling variants ("Tail To Win" / "TailToWin", "THIS GIRL BETZ" / "ThisGirlBetz"), each
 * with part of the record (QA 2026-11-19). DailyAI merges them when reading; the shared
 * database is not changed.
 */
export interface CapperStatsRow {
  capper_id: string;
  name: string;
  slug: string;
  wins?: number | null;
  losses?: number | null;
  pushes?: number | null;
  total_picks?: number | null;
  units_won?: number | null;
  current_streak?: number | null;
  sport_records?: Record<string, string> | null;
  [k: string]: unknown;
}

/** "Tail To Win", "TailToWin", "tail-to-win" → "tailtowin". */
export function identityKey(name: string): string {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Rows that are not a capper: placeholders and several cappers pasted into one name. */
export function isJunkCapperName(name: string): boolean {
  const n = String(name || '').trim();
  return n.length < 2 || n.startsWith('[') || n.includes(',') || /\s&\s/.test(n);
}

/**
 * Per-sport records are strings like "6-13 (31.6%)" or "6-13-1 (31.6%)". Merged variants sum
 * W-L-P per sport and recompute the percentage (W / (W+L)), the same rule as the overall record.
 */
export function sumSportRecords(list: (Record<string, string> | null | undefined)[]): Record<string, string> {
  const acc: Record<string, [number, number, number]> = {};
  for (const recs of list) {
    for (const [sport, v] of Object.entries(recs || {})) {
      const m = String(v).match(/(\d+)-(\d+)(?:-(\d+))?/);
      if (!m) continue;
      const a = (acc[sport] ||= [0, 0, 0]);
      a[0] += Number(m[1]); a[1] += Number(m[2]); a[2] += Number(m[3] || 0);
    }
  }
  return Object.fromEntries(Object.entries(acc).map(([s, [w, l, p]]) => {
    const pct = w + l > 0 ? (Math.round((w / (w + l)) * 1000) / 10).toFixed(1) : '0.0';
    return [s, `${w}-${l}${p ? `-${p}` : ''} (${pct}%)`];
  }));
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/**
 * Merge spelling variants. The variant with the most picks is the primary (its slug, name and
 * streak are kept); wins, losses, pushes, picks and units are summed and the win rate is
 * recomputed from the summed record. capper_ids lists every merged id (for pick queries).
 */
export function mergeCapperRows<T extends CapperStatsRow>(rows: T[]): (T & { capper_ids: string[] })[] {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    if (isJunkCapperName(r.name)) continue;
    const k = identityKey(r.name) || r.slug;
    groups.set(k, [...(groups.get(k) || []), r]);
  }
  return [...groups.values()].map((g) => {
    const sorted = [...g].sort((a, b) => num(b.total_picks) - num(a.total_picks) || String(a.slug).localeCompare(String(b.slug)));
    const primary = sorted[0];
    if (g.length === 1) return { ...primary, capper_ids: [primary.capper_id] };
    const wins = g.reduce((s, r) => s + num(r.wins), 0);
    const losses = g.reduce((s, r) => s + num(r.losses), 0);
    const pushes = g.reduce((s, r) => s + num(r.pushes), 0);
    const sport_records = sumSportRecords(sorted.map((r) => r.sport_records));
    return {
      ...primary,
      wins,
      losses,
      pushes,
      total_picks: g.reduce((s, r) => s + num(r.total_picks), 0),
      units_won: Math.round(g.reduce((s, r) => s + num(r.units_won), 0) * 100) / 100,
      win_rate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 10000) / 100 : 0,
      sport_records,
      capper_ids: sorted.map((r) => r.capper_id),
    };
  });
}
