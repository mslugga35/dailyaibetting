-- DailyAI Betting Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CAPPERS TABLE
-- Tracks all cappers/tipsters and their performance
-- =====================================================
CREATE TABLE IF NOT EXISTS cappers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,                    -- 'betfirm', 'dimers', 'covers', etc.
  avatar_url TEXT,

  -- Performance Stats
  total_picks INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  pushes INTEGER DEFAULT 0,
  win_rate DECIMAL(5,4) DEFAULT 0,         -- 0.0000 to 1.0000
  total_units DECIMAL(10,2) DEFAULT 0,
  roi DECIMAL(5,4) DEFAULT 0,              -- Return on investment

  -- Specialties
  specialties TEXT[] DEFAULT '{}',         -- ['MLB', 'NFL', 'NBA']

  -- Streak tracking
  streak INTEGER DEFAULT 0,
  streak_type CHAR(1),                     -- 'W' or 'L'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PICKS TABLE
-- Individual picks from cappers
-- =====================================================
CREATE TABLE IF NOT EXISTS picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  sport TEXT NOT NULL,                     -- 'MLB', 'NFL', 'NBA', etc.
  capper_id UUID REFERENCES cappers(id) ON DELETE SET NULL,

  -- Game Info
  game TEXT NOT NULL,                      -- 'Yankees vs Red Sox'
  game_time TEXT,                          -- '7:10 PM ET'

  -- Pick Details
  pick_type TEXT NOT NULL,                 -- 'ML', 'spread', 'over', 'under', 'prop'
  pick TEXT NOT NULL,                      -- 'Yankees -1.5', 'Over 8.5'
  odds TEXT,                               -- '-135', '+110'
  units DECIMAL(4,2),                      -- 1.00 to 10.00
  confidence TEXT DEFAULT 'standard',      -- 'high', 'medium', 'standard'

  -- Result
  result TEXT DEFAULT 'pending',           -- 'win', 'loss', 'push', 'pending'

  -- Source
  source TEXT,                             -- Original source URL or name
  raw_text TEXT,                           -- Original pick text

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONSENSUS TABLE
-- Multi-capper agreement on same pick
-- =====================================================
CREATE TABLE IF NOT EXISTS consensus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  sport TEXT NOT NULL,

  -- Game Info
  game TEXT NOT NULL,
  game_time TEXT,

  -- Pick Details
  pick TEXT NOT NULL,
  pick_type TEXT NOT NULL,

  -- Consensus Info
  capper_count INTEGER NOT NULL,           -- Number of cappers agreeing
  cappers TEXT[] NOT NULL,                 -- List of capper names
  pick_ids UUID[],                         -- References to individual picks

  -- Odds
  avg_odds TEXT,                           -- Average odds across cappers

  -- AI Analysis
  confidence_score DECIMAL(3,2) DEFAULT 0, -- 0.00 to 1.00
  ai_analysis TEXT,                        -- AI-generated reasoning

  -- Result
  result TEXT DEFAULT 'pending',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AI_INSIGHTS TABLE
-- AI-generated betting insights and trends
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  sport TEXT,                              -- NULL for general insights

  -- Insight Details
  insight_type TEXT NOT NULL,              -- 'consensus', 'trend', 'alert', 'best_bet'
  title TEXT NOT NULL,
  content TEXT NOT NULL,

  -- References
  picks_referenced UUID[],                 -- Related pick IDs
  consensus_referenced UUID[],             -- Related consensus IDs

  -- Scoring
  confidence DECIMAL(3,2),                 -- 0.00 to 1.00
  priority INTEGER DEFAULT 5,              -- 1-10, higher = more important

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DAILY_STATS TABLE
-- Aggregated daily performance stats
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,

  -- Pick Stats
  total_picks INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  pushes INTEGER DEFAULT 0,
  win_rate DECIMAL(5,4) DEFAULT 0,

  -- Units
  units DECIMAL(10,2) DEFAULT 0,

  -- Consensus Stats
  consensus_picks INTEGER DEFAULT 0,
  consensus_wins INTEGER DEFAULT 0,
  consensus_win_rate DECIMAL(5,4) DEFAULT 0,

  -- Active Sports
  sports_active TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_picks_date ON picks(date);
CREATE INDEX IF NOT EXISTS idx_picks_sport ON picks(sport);
CREATE INDEX IF NOT EXISTS idx_picks_capper ON picks(capper_id);
CREATE INDEX IF NOT EXISTS idx_picks_result ON picks(result);
CREATE INDEX IF NOT EXISTS idx_consensus_date ON consensus(date);
CREATE INDEX IF NOT EXISTS idx_consensus_sport ON consensus(sport);
CREATE INDEX IF NOT EXISTS idx_consensus_score ON consensus(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_cappers_slug ON cappers(slug);
CREATE INDEX IF NOT EXISTS idx_cappers_win_rate ON cappers(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_date ON ai_insights(date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE cappers ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE consensus ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view)
CREATE POLICY "Public read access on cappers" ON cappers FOR SELECT USING (true);
CREATE POLICY "Public read access on picks" ON picks FOR SELECT USING (true);
CREATE POLICY "Public read access on consensus" ON consensus FOR SELECT USING (true);
CREATE POLICY "Public read access on ai_insights" ON ai_insights FOR SELECT USING (true);
CREATE POLICY "Public read access on daily_stats" ON daily_stats FOR SELECT USING (true);

-- Service role write access (for automation)
CREATE POLICY "Service role write access on cappers" ON cappers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access on picks" ON picks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access on consensus" ON consensus FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access on ai_insights" ON ai_insights FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access on daily_stats" ON daily_stats FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update capper stats after a pick result
CREATE OR REPLACE FUNCTION update_capper_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.result != OLD.result AND NEW.capper_id IS NOT NULL THEN
    UPDATE cappers SET
      wins = (SELECT COUNT(*) FROM picks WHERE capper_id = NEW.capper_id AND result = 'win'),
      losses = (SELECT COUNT(*) FROM picks WHERE capper_id = NEW.capper_id AND result = 'loss'),
      pushes = (SELECT COUNT(*) FROM picks WHERE capper_id = NEW.capper_id AND result = 'push'),
      total_picks = (SELECT COUNT(*) FROM picks WHERE capper_id = NEW.capper_id AND result != 'pending'),
      win_rate = CASE
        WHEN (SELECT COUNT(*) FROM picks WHERE capper_id = NEW.capper_id AND result IN ('win', 'loss')) > 0
        THEN (SELECT COUNT(*)::DECIMAL FROM picks WHERE capper_id = NEW.capper_id AND result = 'win') /
             (SELECT COUNT(*)::DECIMAL FROM picks WHERE capper_id = NEW.capper_id AND result IN ('win', 'loss'))
        ELSE 0
      END,
      updated_at = NOW()
    WHERE id = NEW.capper_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update capper stats
DROP TRIGGER IF EXISTS trigger_update_capper_stats ON picks;
CREATE TRIGGER trigger_update_capper_stats
  AFTER UPDATE OF result ON picks
  FOR EACH ROW
  EXECUTE FUNCTION update_capper_stats();

-- Function to update daily stats
CREATE OR REPLACE FUNCTION update_daily_stats(target_date DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_stats (date, total_picks, wins, losses, pushes, win_rate, consensus_picks, consensus_wins, sports_active)
  SELECT
    target_date,
    COUNT(*) FILTER (WHERE result != 'pending'),
    COUNT(*) FILTER (WHERE result = 'win'),
    COUNT(*) FILTER (WHERE result = 'loss'),
    COUNT(*) FILTER (WHERE result = 'push'),
    CASE
      WHEN COUNT(*) FILTER (WHERE result IN ('win', 'loss')) > 0
      THEN COUNT(*) FILTER (WHERE result = 'win')::DECIMAL / COUNT(*) FILTER (WHERE result IN ('win', 'loss'))::DECIMAL
      ELSE 0
    END,
    (SELECT COUNT(*) FROM consensus WHERE date = target_date),
    (SELECT COUNT(*) FROM consensus WHERE date = target_date AND result = 'win'),
    ARRAY(SELECT DISTINCT sport FROM picks WHERE date = target_date)
  FROM picks
  WHERE date = target_date
  ON CONFLICT (date) DO UPDATE SET
    total_picks = EXCLUDED.total_picks,
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    pushes = EXCLUDED.pushes,
    win_rate = EXCLUDED.win_rate,
    consensus_picks = EXCLUDED.consensus_picks,
    consensus_wins = EXCLUDED.consensus_wins,
    sports_active = EXCLUDED.sports_active,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- BLOG_POSTS TABLE
-- AI-generated daily sports betting blog posts
-- =====================================================
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,                              -- Short description for listings
  content TEXT NOT NULL,                     -- Full markdown/HTML content

  -- Categorization
  category TEXT DEFAULT 'daily-picks',       -- 'daily-picks', 'preview', 'recap', 'analysis'
  sport TEXT,                                -- NULL for multi-sport, or specific sport
  tags TEXT[] DEFAULT '{}',                  -- ['NFL', 'fire-picks', 'consensus']

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- Featured image
  featured_image TEXT,

  -- Status
  status TEXT DEFAULT 'published',           -- 'draft', 'published', 'archived'

  -- Stats
  view_count INTEGER DEFAULT 0,

  -- AI metadata
  ai_model TEXT,                             -- 'gpt-4', 'gpt-3.5-turbo'
  generation_prompt TEXT,                    -- Prompt used to generate

  -- Timestamps
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);

-- Blog RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access on blog_posts" ON blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Service role write access on blog_posts" ON blog_posts FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- SAMPLE DATA (for testing)
-- =====================================================

-- Insert sample cappers
INSERT INTO cappers (name, slug, source, total_picks, wins, losses, pushes, win_rate, total_units, roi, specialties, streak, streak_type) VALUES
  ('Dave Price', 'dave-price', 'BetFirm', 245, 142, 95, 8, 0.599, 34.5, 0.141, ARRAY['MLB', 'NFL'], 5, 'W'),
  ('Jack Jones', 'jack-jones', 'BetFirm', 198, 112, 82, 4, 0.577, 28.2, 0.142, ARRAY['MLB', 'NBA'], 3, 'W'),
  ('Dimers', 'dimers', 'Dimers', 512, 280, 220, 12, 0.560, 42.1, 0.082, ARRAY['MLB', 'NFL', 'NBA'], 0, NULL),
  ('Chris Vasile', 'chris-vasile', 'Covers', 167, 95, 68, 4, 0.583, 22.8, 0.137, ARRAY['NFL', 'NCAAF'], 4, 'W'),
  ('Pure Lock', 'pure-lock', 'BetFirm', 134, 72, 58, 4, 0.554, 15.6, 0.116, ARRAY['MLB'], 0, NULL)
ON CONFLICT (slug) DO NOTHING;
