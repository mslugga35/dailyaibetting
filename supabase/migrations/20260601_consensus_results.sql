-- ============================================================================
-- consensus_results — persisted track record for DailyAI consensus fire picks
-- ============================================================================
-- The /api/results route + /results page + (future) homepage win-rate bar all
-- read from this table + its views/RPC. They were scaffolded in code but the DB
-- objects were never created, so /results showed "not yet configured".
--
-- Flow: a daily PM2 cron (scripts/grade-and-persist.mjs) snapshots today's
-- consensus fire picks as PENDING (save_daily_consensus), then grades prior-day
-- PENDING rows against ESPN final scores. Honest "logged before, graded after"
-- track record — no fabricated numbers.
--
-- Shared Supabase project (aeeykasmymitzbuhdlfe). Table is DailyAI-specific
-- (unprefixed name is what the existing code references). Additive + RLS-guarded.
-- ============================================================================

CREATE TABLE IF NOT EXISTS consensus_results (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_date    date NOT NULL,
  sport        text NOT NULL DEFAULT 'OTHER',
  team         text,
  line         text,
  bet          text,
  capper_count integer NOT NULL DEFAULT 0,
  is_fire      boolean NOT NULL DEFAULT false,
  result       text NOT NULL DEFAULT 'PENDING'
               CHECK (result IN ('PENDING','WIN','LOSS','PUSH','CANCELLED')),
  final_score  text,
  dedup_key    text NOT NULL UNIQUE,
  graded_at    timestamptz,
  graded_by    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consensus_results_date   ON consensus_results(pick_date DESC);
CREATE INDEX IF NOT EXISTS idx_consensus_results_result ON consensus_results(result);

-- RLS: track record is public (read), only the service role writes.
ALTER TABLE consensus_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consensus_results_public_read ON consensus_results;
CREATE POLICY consensus_results_public_read
  ON consensus_results FOR SELECT USING (true);

DROP POLICY IF EXISTS consensus_results_service_write ON consensus_results;
CREATE POLICY consensus_results_service_write
  ON consensus_results FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---- Views consumed by /api/results ----------------------------------------

-- view=daily  -> { pick_date, total_picks, wins, losses, pushes, win_pct }
CREATE OR REPLACE VIEW daily_results_summary AS
SELECT
  pick_date,
  COUNT(*)                                   AS total_picks,
  COUNT(*) FILTER (WHERE result = 'WIN')      AS wins,
  COUNT(*) FILTER (WHERE result = 'LOSS')     AS losses,
  COUNT(*) FILTER (WHERE result = 'PUSH')     AS pushes,
  ROUND(
    (COUNT(*) FILTER (WHERE result = 'WIN'))::numeric
    / NULLIF(COUNT(*) FILTER (WHERE result IN ('WIN','LOSS')), 0) * 100, 1
  )                                           AS win_pct
FROM consensus_results
WHERE result <> 'PENDING'
GROUP BY pick_date
ORDER BY pick_date DESC;

-- view=monthly -> { month, wins, losses, pushes, win_pct }
CREATE OR REPLACE VIEW monthly_performance AS
SELECT
  to_char(pick_date, 'YYYY-MM')               AS month,
  COUNT(*) FILTER (WHERE result = 'WIN')      AS wins,
  COUNT(*) FILTER (WHERE result = 'LOSS')     AS losses,
  COUNT(*) FILTER (WHERE result = 'PUSH')     AS pushes,
  ROUND(
    (COUNT(*) FILTER (WHERE result = 'WIN'))::numeric
    / NULLIF(COUNT(*) FILTER (WHERE result IN ('WIN','LOSS')), 0) * 100, 1
  )                                           AS win_pct
FROM consensus_results
WHERE result <> 'PENDING'
GROUP BY 1
ORDER BY 1 DESC;

-- view=sport -> { sport, wins, losses, pushes, win_pct }  (fire picks only)
CREATE OR REPLACE VIEW fire_picks_performance AS
SELECT
  sport,
  COUNT(*) FILTER (WHERE result = 'WIN')      AS wins,
  COUNT(*) FILTER (WHERE result = 'LOSS')     AS losses,
  COUNT(*) FILTER (WHERE result = 'PUSH')     AS pushes,
  ROUND(
    (COUNT(*) FILTER (WHERE result = 'WIN'))::numeric
    / NULLIF(COUNT(*) FILTER (WHERE result IN ('WIN','LOSS')), 0) * 100, 1
  )                                           AS win_pct
FROM consensus_results
WHERE is_fire = true AND result <> 'PENDING'
GROUP BY sport
ORDER BY wins DESC;

-- ---- save_daily_consensus RPC (insert today's picks as PENDING, idempotent) -
CREATE OR REPLACE FUNCTION save_daily_consensus(p_picks jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- pin search_path (SECURITY DEFINER hardening)
AS $$
DECLARE
  inserted integer := 0;
  pick     jsonb;
BEGIN
  FOR pick IN SELECT * FROM jsonb_array_elements(p_picks) LOOP
    INSERT INTO consensus_results
      (pick_date, sport, team, line, bet, capper_count, is_fire, dedup_key)
    VALUES (
      COALESCE((pick->>'pick_date')::date, CURRENT_DATE),
      COALESCE(pick->>'sport', 'OTHER'),
      pick->>'team',
      pick->>'line',
      pick->>'bet',
      COALESCE((pick->>'capper_count')::int, 0),
      COALESCE((pick->>'capper_count')::int, 0) >= 3,
      pick->>'dedup_key'
    )
    ON CONFLICT (dedup_key) DO NOTHING;
    IF FOUND THEN inserted := inserted + 1; END IF;
  END LOOP;
  RETURN inserted;
END;
$$;
