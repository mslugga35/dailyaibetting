-- AI Picks: Bot-generated picks tracked for performance
-- The bot analyzes BallparkPal sims, Statcast K%/whiff%, expert consensus,
-- PrizePicks lines, and ESPN schedule to make its own picks.
-- Picks are locked (timestamped) before games start for transparency.

CREATE TABLE IF NOT EXISTS ai_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sport VARCHAR(10) NOT NULL,
  team VARCHAR(100) NOT NULL,
  opponent VARCHAR(100),
  bet_type VARCHAR(20) NOT NULL,        -- ML, SPREAD, OVER, UNDER, K_OVER, K_UNDER, NRFI, YRFI
  line VARCHAR(30),                      -- e.g. "-7.5", "O 45.5", "O 6.5 Ks"
  confidence INT NOT NULL CHECK (confidence BETWEEN 1 AND 10),
  reasoning TEXT NOT NULL,
  data_sources JSONB NOT NULL DEFAULT '{}',  -- which signals fired: {ballparkPal: true, statcast: {...}, consensus: 5}
  result VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (result IN ('PENDING','WIN','LOSS','PUSH','VOID')),
  final_score VARCHAR(50),               -- e.g. "Chiefs 27 - Bills 24"
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- proof pick was made before game
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_picks_date ON ai_picks(pick_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_picks_result ON ai_picks(result);
CREATE INDEX IF NOT EXISTS idx_ai_picks_sport ON ai_picks(sport);
CREATE INDEX IF NOT EXISTS idx_ai_picks_confidence ON ai_picks(confidence DESC);

-- Performance views

CREATE OR REPLACE VIEW ai_picks_daily_summary AS
SELECT
  pick_date,
  COUNT(*) FILTER (WHERE result = 'WIN') AS wins,
  COUNT(*) FILTER (WHERE result = 'LOSS') AS losses,
  COUNT(*) FILTER (WHERE result = 'PUSH') AS pushes,
  COUNT(*) FILTER (WHERE result = 'PENDING') AS pending,
  COUNT(*) FILTER (WHERE result IN ('WIN','LOSS')) AS decided,
  ROUND(
    COUNT(*) FILTER (WHERE result = 'WIN')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE result IN ('WIN','LOSS')), 0) * 100, 1
  ) AS win_pct
FROM ai_picks
GROUP BY pick_date
ORDER BY pick_date DESC;

CREATE OR REPLACE VIEW ai_picks_by_sport AS
SELECT
  sport,
  COUNT(*) FILTER (WHERE result = 'WIN') AS wins,
  COUNT(*) FILTER (WHERE result = 'LOSS') AS losses,
  COUNT(*) FILTER (WHERE result = 'PUSH') AS pushes,
  ROUND(
    COUNT(*) FILTER (WHERE result = 'WIN')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE result IN ('WIN','LOSS')), 0) * 100, 1
  ) AS win_pct
FROM ai_picks
GROUP BY sport
ORDER BY win_pct DESC NULLS LAST;

CREATE OR REPLACE VIEW ai_picks_by_confidence AS
SELECT
  confidence,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE result = 'WIN') AS wins,
  COUNT(*) FILTER (WHERE result = 'LOSS') AS losses,
  ROUND(
    COUNT(*) FILTER (WHERE result = 'WIN')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE result IN ('WIN','LOSS')), 0) * 100, 1
  ) AS win_pct
FROM ai_picks
GROUP BY confidence
ORDER BY confidence DESC;

CREATE OR REPLACE VIEW ai_picks_overall AS
SELECT
  COUNT(*) AS total_picks,
  COUNT(*) FILTER (WHERE result = 'WIN') AS wins,
  COUNT(*) FILTER (WHERE result = 'LOSS') AS losses,
  COUNT(*) FILTER (WHERE result = 'PUSH') AS pushes,
  COUNT(*) FILTER (WHERE result = 'PENDING') AS pending,
  ROUND(
    COUNT(*) FILTER (WHERE result = 'WIN')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE result IN ('WIN','LOSS')), 0) * 100, 1
  ) AS win_pct,
  MIN(pick_date) AS first_pick_date,
  MAX(pick_date) AS last_pick_date
FROM ai_picks;

-- RLS: public read, service role write
ALTER TABLE ai_picks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_picks_public_read ON ai_picks;
CREATE POLICY ai_picks_public_read ON ai_picks FOR SELECT USING (true);

DROP POLICY IF EXISTS ai_picks_service_write ON ai_picks;
CREATE POLICY ai_picks_service_write ON ai_picks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
