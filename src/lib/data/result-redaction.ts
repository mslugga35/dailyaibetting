/**
 * Graded-pick rows for viewers without Pro: enough to count the public record
 * (sport, date, result) and nothing that identifies the pick (team, line, score, cappers).
 */
export const PUBLIC_RESULT_FIELDS = ['id', 'sport', 'result', 'pick_date'] as const;

export function redactResultRows(rows: unknown[]): Record<string, unknown>[] {
  return rows.map((r) => {
    const row = (r ?? {}) as Record<string, unknown>;
    return Object.fromEntries(PUBLIC_RESULT_FIELDS.map((k) => [k, row[k] ?? null]));
  });
}
