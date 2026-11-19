-- Owner decision 2026-11-19: opposite sides of one game are never both fire picks.
-- When fire groups back opposite sides of the same game (different team for spread/moneyline,
-- over vs under for totals), only the side with MORE cappers stays fire; a tie leaves neither.
-- Same rule as src/lib/consensus/fire-conflicts.ts (today's board). Data is not changed:
-- hb_consensus_live keeps every row and its own is_fire; only this read view changes.
-- Rollback: 20261119_record_fire_conflicts_ROLLBACK.sql
-- hb_consensus_record is read only by DailyAI (checked 2026-11-19: no HiddenBag process uses it).
CREATE OR REPLACE VIEW public.hb_consensus_record WITH (security_invoker = true) AS
SELECT group_key AS id,
    et_date AS pick_date,
    upper(sport) AS sport,
        CASE market
            WHEN 'moneyline'::text THEN (team || ' ML'::text)
            WHEN 'spread'::text THEN (((team || ' '::text) ||
            CASE
                WHEN (consensus_line > (0)::numeric) THEN '+'::text
                ELSE ''::text
            END) || TRIM(BOTH FROM to_char(consensus_line, 'FM999990.0##'::text)))
            ELSE ((((((away_team || '/'::text) || home_team) || ' '::text) || initcap(side)) || ' '::text) || TRIM(BOTH FROM to_char(consensus_line, 'FM999990.0##'::text)))
        END AS bet,
        CASE market
            WHEN 'moneyline'::text THEN 'ML'::text
            WHEN 'spread'::text THEN 'SPREAD'::text
            ELSE upper(side)
        END AS bet_type,
    COALESCE(team, ((away_team || '/'::text) || home_team)) AS team,
    opponent,
        CASE
            WHEN (market = 'moneyline'::text) THEN 'ML'::text
            ELSE TRIM(BOTH FROM to_char(consensus_line, 'FM999990.0##'::text))
        END AS line,
    capper_count,
    (l.is_fire AND NOT EXISTS (
      SELECT 1 FROM hb_consensus_live o
      WHERE o.et_date = l.et_date AND o.game_id = l.game_id AND o.is_fire AND o.result <> 'void'
        AND (o.market = 'total') = (l.market = 'total')
        AND CASE WHEN l.market = 'total' THEN o.side IS DISTINCT FROM l.side ELSE o.team IS DISTINCT FROM l.team END
        AND o.capper_count >= l.capper_count)) AS is_fire,
    NULL::integer AS rank_position,
    upper(result) AS result,
    final_score,
    graded_at,
        CASE
            WHEN (result = 'pending'::text) THEN NULL::text
            ELSE 'hb-consensus'::text
        END AS graded_by,
    group_key AS dedup_key,
    market,
    side,
    agreement_pct,
    first_seen AS created_at,
    updated_at
   FROM hb_consensus_live l
  WHERE (result <> 'void'::text);
