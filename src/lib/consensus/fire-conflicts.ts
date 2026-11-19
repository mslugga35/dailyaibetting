/**
 * Owner decision 2026-11-19: opposite sides of one game are never both fire picks.
 *
 * Fire groups conflict when they are in the same game and back opposite sides: a different
 * team for spread/moneyline, over vs under for totals. Only the side with MORE cappers stays
 * fire; on a tie neither does. Same rule as the record view
 * (supabase/migrations/20261119_record_fire_conflicts.sql).
 */
export interface FireRow {
  et_date: string;
  game_id: string | null;
  market: string;
  side: string | null;
  team: string | null;
  capper_count: number;
  is_fire: boolean;
}

export function resolveFireConflicts<T extends FireRow>(rows: T[]): (T & { fire_conflict: boolean })[] {
  const fire = rows.filter((r) => r.is_fire && r.game_id);
  return rows.map((r) => {
    if (!r.is_fire || !r.game_id) return { ...r, fire_conflict: false };
    const isTotal = r.market === 'total';
    const beaten = fire.some((o) =>
      o !== r &&
      o.et_date === r.et_date &&
      o.game_id === r.game_id &&
      (o.market === 'total') === isTotal &&
      (isTotal ? o.side !== r.side : o.team !== r.team) &&
      o.capper_count >= r.capper_count);
    return beaten ? { ...r, is_fire: false, fire_conflict: true } : { ...r, fire_conflict: false };
  });
}
