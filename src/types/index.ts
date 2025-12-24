// Core betting types for Daily AI Betting

export type Sport = 'MLB' | 'NFL' | 'NBA' | 'NHL' | 'NCAAF' | 'NCAAB' | 'WNBA' | 'Soccer' | 'Tennis' | 'UFC';

export type PickType = 'ML' | 'spread' | 'over' | 'under' | 'prop' | 'parlay';

export type PickResult = 'win' | 'loss' | 'push' | 'pending';

export type ConfidenceLevel = 'high' | 'medium' | 'standard';

export interface Pick {
  id: string;
  date: string;
  sport: Sport;
  capper_id: string;
  capper_name?: string;
  game: string;
  pick_type: PickType;
  pick: string;
  odds: string;
  units?: number;
  confidence: ConfidenceLevel;
  result: PickResult;
  source: string;
  created_at: string;
}

export interface Capper {
  id: string;
  name: string;
  slug: string;
  source: string;
  avatar_url?: string;
  total_picks: number;
  wins: number;
  losses: number;
  pushes: number;
  win_rate: number;
  total_units: number;
  roi: number;
  specialties: Sport[];
  streak?: number;
  streak_type?: 'W' | 'L';
  created_at: string;
  updated_at: string;
}

export interface Consensus {
  id: string;
  date: string;
  sport: Sport;
  game: string;
  game_time?: string;
  pick: string;
  pick_type: PickType;
  capper_count: number;
  cappers: string[];
  avg_odds: string;
  confidence_score: number; // 0-1 scale
  ai_analysis?: string;
  result: PickResult;
  created_at: string;
}

export interface AIInsight {
  id: string;
  date: string;
  sport?: Sport;
  insight_type: 'consensus' | 'trend' | 'alert' | 'best_bet';
  title: string;
  content: string;
  picks_referenced?: string[];
  confidence?: number;
  created_at: string;
}

export interface DailyStats {
  date: string;
  total_picks: number;
  wins: number;
  losses: number;
  pushes: number;
  win_rate: number;
  units: number;
  consensus_picks: number;
  consensus_wins: number;
  sports_active: Sport[];
}

// Sport configuration
export const SPORTS_CONFIG: Record<Sport, { name: string; icon: string; color: string }> = {
  MLB: { name: 'Baseball', icon: 'baseball', color: '#CE1141' },
  NFL: { name: 'Football', icon: 'football', color: '#013369' },
  NBA: { name: 'Basketball', icon: 'basketball', color: '#1D428A' },
  NHL: { name: 'Hockey', icon: 'hockey', color: '#000000' },
  NCAAF: { name: 'College Football', icon: 'football', color: '#8B0000' },
  NCAAB: { name: 'College Basketball', icon: 'basketball', color: '#FF6B00' },
  WNBA: { name: 'Women\'s Basketball', icon: 'basketball', color: '#FF6B35' },
  Soccer: { name: 'Soccer', icon: 'soccer', color: '#00A651' },
  Tennis: { name: 'Tennis', icon: 'tennis', color: '#CFB53B' },
  UFC: { name: 'MMA', icon: 'boxing', color: '#D20A0A' },
};

// API Response types (from consensus builder)
export interface ConsensusPick {
  id: string;
  bet: string;
  sport: string;
  matchup: string;
  betType: 'ML' | 'SPREAD' | 'OVER' | 'UNDER' | 'F5_ML' | 'PROP';
  line?: string;
  capperCount: number;
  cappers: string[];
  isFire: boolean; // 3+ cappers = 🔥
  confidence: number;
}

export interface ConsensusAPIResponse {
  success: boolean;
  timestamp: string;
  date: string;
  totalPicks: number;
  consensus: ConsensusPick[];
  topOverall: ConsensusPick[];
  bySport: Record<string, ConsensusPick[]>;
  fadeThePublic: ConsensusPick[];
}

export interface NormalizedPick {
  id: string;
  capper: string;
  team: string;
  standardizedTeam: string;
  betType: string;
  line?: string;
  sport: string;
  matchup: string;
  originalPick: string;
  date: string;
}

export interface PicksAPIResponse {
  success: boolean;
  timestamp: string;
  date: string;
  total: number;
  limit: number;
  offset: number;
  picks: NormalizedPick[];
  filters: {
    cappers: string[];
    sports: string[];
  };
}

// Raw pick format from Google Sheets (n8n workflow output)
export interface RawPick {
  site: string;
  league: string;
  date: string;
  matchup: string;
  service: string; // Capper name
  pick: string;
  runDate?: string;
}

// Helper functions
export function formatOdds(odds: string): { display: string; isPositive: boolean } {
  const numOdds = parseInt(odds);
  if (isNaN(numOdds)) return { display: odds, isPositive: false };
  return {
    display: numOdds > 0 ? `+${numOdds}` : odds,
    isPositive: numOdds > 0,
  };
}

export function getConfidenceLabel(score: number): ConfidenceLevel {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'standard';
}

export function getResultColor(result: PickResult): string {
  switch (result) {
    case 'win': return 'text-primary';
    case 'loss': return 'text-destructive';
    case 'push': return 'text-yellow-500';
    default: return 'text-muted-foreground';
  }
}

// Adapter: Convert ConsensusPick (API) to Consensus (UI component)
export function consensusPickToConsensus(pick: ConsensusPick): Consensus {
  return {
    id: pick.id,
    date: new Date().toISOString().split('T')[0],
    sport: pick.sport as Sport,
    game: pick.matchup,
    pick: pick.bet,
    pick_type: pick.betType.toLowerCase() as PickType,
    capper_count: pick.capperCount,
    cappers: pick.cappers,
    avg_odds: pick.line || '-110',
    confidence_score: pick.confidence,
    ai_analysis: pick.isFire ? `🔥 Strong consensus with ${pick.capperCount} cappers agreeing on this pick.` : undefined,
    result: 'pending',
    created_at: new Date().toISOString(),
  };
}
