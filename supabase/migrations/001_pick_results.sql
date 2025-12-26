-- DailyAI Betting - Consensus Results Tracking
-- Tracks top consensus picks and their outcomes

-- Main results table
CREATE TABLE IF NOT EXISTS consensus_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_date DATE NOT NULL,

  -- Pick details
  sport VARCHAR(10) NOT NULL,
  team VARCHAR(100) NOT NULL,
  opponent VARCHAR(100),
  bet_type VARCHAR(20) NOT NULL, -- ML, SPREAD, OVER, UNDER
  line VARCHAR(30), -- e.g., "-7.5", "O 45.5", "ML"

  -- Consensus strength
  capper_count INT NOT NULL,
  is_fire BOOLEAN DEFAULT FALSE, -- 3+ cappers
  rank_position INT, -- 1, 2, or 3 for top picks

  -- Result tracking
  result VARCHAR(10) DEFAULT 'PENDING', -- WIN, LOSS, PUSH, PENDING
  final_score VARCHAR(50), -- e.g., "Chiefs 27 - Bills 24"
  graded_at TIMESTAMP,
  graded_by VARCHAR(50), -- 'auto' or 'manual'

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  UNIQUE(pick_date, team, bet_type, line)
);

-- Index for fast queries
CREATE INDEX idx_consensus_results_date ON consensus_results(pick_date DESC);
CREATE INDEX idx_consensus_results_sport ON consensus_results(sport);
CREATE INDEX idx_consensus_results_result ON consensus_results(result);
CREATE INDEX idx_consensus_results_fire ON consensus_results(is_fire) WHERE is_fire = TRUE;

-- Daily summary view
CREATE OR REPLACE VIEW daily_results_summary AS
SELECT
  pick_date,
  COUNT(*) as total_picks,
  COUNT(*) FILTER (WHERE result = 'WIN') as wins,
  COUNT(*) FILTER (WHERE result = 'LOSS') as losses,
  COUNT(*) FILTER (WHERE result = 'PUSH') as pushes,
  COUNT(*) FILTER (WHERE result = 'PENDING') as pending,
  ROUND(
    COUNT(*) FILTER (WHERE result = 'WIN')::DECIMAL /
    NULLIF(COUNT(*) FILTER (WHERE result IN ('WIN', 'LOSS')), 0) * 100,
    1
  ) as win_pct
FROM consensus_results
WHERE is_fire = TRUE
GROUP BY pick_date
ORDER BY pick_date DESC;

-- Fire picks performance view
CREATE OR REPLACE VIEW fire_picks_performance AS
SELECT
  sport,
  COUNT(*) as total_fire_picks,
  COUNT(*) FILTER (WHERE result = 'WIN') as wins,
  COUNT(*) FILTER (WHERE result = 'LOSS') as losses,
  ROUND(
    COUNT(*) FILTER (WHERE result = 'WIN')::DECIMAL /
    NULLIF(COUNT(*) FILTER (WHERE result IN ('WIN', 'LOSS')), 0) * 100,
    1
  ) as win_pct,
  -- Recent form (last 30 days)
  COUNT(*) FILTER (WHERE result = 'WIN' AND pick_date > CURRENT_DATE - 30) as recent_wins,
  COUNT(*) FILTER (WHERE result = 'LOSS' AND pick_date > CURRENT_DATE - 30) as recent_losses
FROM consensus_results
WHERE is_fire = TRUE
GROUP BY sport
ORDER BY win_pct DESC;

-- Monthly performance view
CREATE OR REPLACE VIEW monthly_performance AS
SELECT
  DATE_TRUNC('month', pick_date) as month,
  COUNT(*) FILTER (WHERE result = 'WIN') as wins,
  COUNT(*) FILTER (WHERE result = 'LOSS') as losses,
  ROUND(
    COUNT(*) FILTER (WHERE result = 'WIN')::DECIMAL /
    NULLIF(COUNT(*) FILTER (WHERE result IN ('WIN', 'LOSS')), 0) * 100,
    1
  ) as win_pct
FROM consensus_results
WHERE is_fire = TRUE
GROUP BY DATE_TRUNC('month', pick_date)
ORDER BY month DESC;

-- Function to save today's top picks
CREATE OR REPLACE FUNCTION save_daily_consensus(
  p_picks JSONB -- Array of {sport, team, opponent, bet_type, line, capper_count, rank_position}
) RETURNS INT AS $$
DECLARE
  pick JSONB;
  inserted_count INT := 0;
BEGIN
  FOR pick IN SELECT * FROM jsonb_array_elements(p_picks)
  LOOP
    INSERT INTO consensus_results (
      pick_date, sport, team, opponent, bet_type, line,
      capper_count, is_fire, rank_position
    ) VALUES (
      CURRENT_DATE,
      pick->>'sport',
      pick->>'team',
      pick->>'opponent',
      pick->>'bet_type',
      pick->>'line',
      (pick->>'capper_count')::INT,
      (pick->>'capper_count')::INT >= 3,
      (pick->>'rank_position')::INT
    )
    ON CONFLICT (pick_date, team, bet_type, line) DO UPDATE SET
      capper_count = EXCLUDED.capper_count,
      opponent = EXCLUDED.opponent,
      updated_at = NOW();

    inserted_count := inserted_count + 1;
  END LOOP;

  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to grade a pick
CREATE OR REPLACE FUNCTION grade_pick(
  p_id UUID,
  p_result VARCHAR(10),
  p_final_score VARCHAR(50) DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE consensus_results
  SET
    result = p_result,
    final_score = p_final_score,
    graded_at = NOW(),
    graded_by = 'manual',
    updated_at = NOW()
  WHERE id = p_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE consensus_results IS 'Tracks daily top consensus picks and their win/loss results';
COMMENT ON VIEW daily_results_summary IS 'Daily win/loss summary for fire picks';
COMMENT ON VIEW fire_picks_performance IS 'Performance breakdown by sport';
