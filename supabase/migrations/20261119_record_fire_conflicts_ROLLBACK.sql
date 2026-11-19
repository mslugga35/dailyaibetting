-- ROLLBACK: restore the pre-2026-11-19 record view (both sides of a game could be fire).
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
    is_fire,
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
   FROM hb_consensus_live
  WHERE (result <> 'void'::text);
