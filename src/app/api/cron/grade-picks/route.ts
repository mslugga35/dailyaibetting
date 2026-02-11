// Cron Endpoint: Auto-Grade Picks
// Triggered by Vercel Cron or external scheduler.
// Grades pending consensus picks using ESPN scores.
// Schedule: Every 3 hours (see vercel.json)

import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max for Vercel

// ============ CONFIG ============

const ESPN_ENDPOINTS: Record<string, string> = {
  NFL: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  NBA: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  MLB: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  NHL: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  NCAAF: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
  NCAAB: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard',
};

// ============ TYPES ============

interface PendingPick {
  id: string;
  date: string;
  sport: string;
  pick: string;        // The pick text (e.g., "Lakers -5.5")
  game: string;        // Matchup (e.g., "Lakers vs Celtics")
  pick_type: string;   // ML, spread, over, under
  capper_count: number;
  avg_odds?: string;
}

interface GameScore {
  homeTeam: string;
  homeScore: number;
  awayTeam: string;
  awayScore: number;
  completed: boolean;
  total: number;
}

type GradeResult = 'WIN' | 'LOSS' | 'PUSH' | 'PENDING';

// ============ SUPABASE ============

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('Supabase not configured');
    return null;
  }

  supabase = createClient(url, key);
  return supabase;
}

// ============ TEAM STANDARDIZATION (simplified) ============

function standardizeTeamName(team: string, sport: string): string {
  // Basic standardization - strip common prefixes/suffixes
  return team
    .replace(/^(The|Los|La)\s+/i, '')
    .replace(/\s+(FC|SC)$/i, '')
    .trim()
    .toLowerCase();
}

// Extract team name from pick text like "Lakers -5.5" or "Over 220.5"
function extractTeamFromPick(pickText: string): string {
  if (!pickText) return '';
  
  // Handle Over/Under picks - extract from matchup instead
  if (/^(over|under|o|u)\s/i.test(pickText)) {
    return '';
  }
  
  // Remove spread/ML indicators to get team name
  // "Lakers -5.5" -> "Lakers"
  // "Celtics +3" -> "Celtics"
  // "Yankees ML" -> "Yankees"
  const cleaned = pickText
    .replace(/\s*[+-]?\d+\.?\d*\s*$/i, '') // Remove spread numbers
    .replace(/\s*(ML|PK)\s*$/i, '')         // Remove ML/PK
    .replace(/\s*\([^)]+\)\s*/g, '')        // Remove parentheses content
    .trim();
  
  return cleaned;
}

// Extract line from pick text
function extractLineFromPick(pickText: string): string | undefined {
  if (!pickText) return undefined;
  
  // Match spread: "-5.5", "+3"
  const spreadMatch = pickText.match(/([+-]\d+\.?\d*)\s*$/);
  if (spreadMatch) return spreadMatch[1];
  
  // Match O/U: "Over 220.5", "o220.5"
  const ouMatch = pickText.match(/(over|under|o|u)\s*(\d+\.?\d*)/i);
  if (ouMatch) return `${ouMatch[1].toLowerCase().startsWith('o') ? 'o' : 'u'}${ouMatch[2]}`;
  
  return undefined;
}

// ============ ESPN API ============

async function fetchCompletedGames(sport: string, date?: string): Promise<Map<string, GameScore>> {
  const endpoint = ESPN_ENDPOINTS[sport];
  if (!endpoint) return new Map();

  try {
    const dateParam = date ? date.replace(/-/g, '') : undefined;
    const url = dateParam ? `${endpoint}?dates=${dateParam}` : endpoint;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return new Map();

    const data = await response.json();
    const games = new Map<string, GameScore>();

    for (const event of data.events || []) {
      const competition = event.competitions?.[0];
      if (!competition || !event.status?.type?.completed) continue;

      const homeComp = competition.competitors.find((c: any) => c.homeAway === 'home');
      const awayComp = competition.competitors.find((c: any) => c.homeAway === 'away');

      if (!homeComp || !awayComp) continue;

      const homeScore = parseInt(homeComp.score) || 0;
      const awayScore = parseInt(awayComp.score) || 0;

      const gameScore: GameScore = {
        homeTeam: homeComp.team.displayName,
        homeScore,
        awayTeam: awayComp.team.displayName,
        awayScore,
        completed: true,
        total: homeScore + awayScore,
      };

      // Store by multiple keys
      games.set(standardizeTeamName(homeComp.team.displayName, sport), gameScore);
      games.set(standardizeTeamName(awayComp.team.displayName, sport), gameScore);
      games.set(homeComp.team.abbreviation.toLowerCase(), gameScore);
      games.set(awayComp.team.abbreviation.toLowerCase(), gameScore);
    }

    return games;
  } catch (error) {
    console.error(`ESPN ${sport} fetch error:`, error);
    return new Map();
  }
}

// ============ GRADING LOGIC ============

function parseLine(line: string | undefined): { value: number; isOver: boolean } | null {
  if (!line) return null;
  
  const ouMatch = line.match(/^[ou](\d+\.?\d*)/i) || line.match(/O\/U\s*(\d+\.?\d*)/i);
  if (ouMatch) {
    return { value: parseFloat(ouMatch[1]), isOver: line.toLowerCase().startsWith('o') };
  }
  
  if (line === 'PK' || line === 'pk') return { value: 0, isOver: false };
  
  const spreadMatch = line.match(/^([+-]?\d+\.?\d*)$/);
  if (spreadMatch) {
    return { value: parseFloat(spreadMatch[1]), isOver: false };
  }
  
  return null;
}

function gradeMoneyline(pickTeam: string, sport: string, game: GameScore): GradeResult {
  const teamStd = standardizeTeamName(pickTeam, sport);
  const homeStd = standardizeTeamName(game.homeTeam, sport);
  const awayStd = standardizeTeamName(game.awayTeam, sport);
  
  const isPickHome = teamStd === homeStd || pickTeam.toLowerCase().includes(game.homeTeam.toLowerCase().slice(0, 4));
  const isPickAway = teamStd === awayStd || pickTeam.toLowerCase().includes(game.awayTeam.toLowerCase().slice(0, 4));
  
  if (!isPickHome && !isPickAway) return 'PENDING';
  
  const pickedTeamWon = isPickHome ? (game.homeScore > game.awayScore) : (game.awayScore > game.homeScore);
  const isTie = game.homeScore === game.awayScore;
  
  if (isTie) return 'PUSH';
  return pickedTeamWon ? 'WIN' : 'LOSS';
}

function gradeSpread(pickTeam: string, line: string | undefined, sport: string, game: GameScore): GradeResult {
  const parsed = parseLine(line);
  if (!parsed) return 'PENDING';
  
  const spread = parsed.value;
  const teamStd = standardizeTeamName(pickTeam, sport);
  const homeStd = standardizeTeamName(game.homeTeam, sport);
  
  const isPickHome = teamStd === homeStd || pickTeam.toLowerCase().includes(game.homeTeam.toLowerCase().slice(0, 4));
  
  const pickedScore = isPickHome ? game.homeScore : game.awayScore;
  const opponentScore = isPickHome ? game.awayScore : game.homeScore;
  const margin = pickedScore - opponentScore;
  const adjustedMargin = margin + spread;
  
  if (adjustedMargin === 0) return 'PUSH';
  return adjustedMargin > 0 ? 'WIN' : 'LOSS';
}

function gradeOverUnder(line: string | undefined, betType: string, game: GameScore): GradeResult {
  const parsed = parseLine(line);
  if (!parsed) return 'PENDING';
  
  const total = game.total;
  const lineValue = parsed.value;
  const isOver = betType.toUpperCase() === 'OVER' || parsed.isOver;
  
  if (total === lineValue) return 'PUSH';
  
  const wentOver = total > lineValue;
  return (isOver && wentOver) || (!isOver && !wentOver) ? 'WIN' : 'LOSS';
}

function gradePick(pick: PendingPick, game: GameScore): GradeResult {
  const betType = (pick.pick_type || '').toUpperCase();
  const pickTeam = extractTeamFromPick(pick.pick);
  const line = extractLineFromPick(pick.pick);
  
  switch (betType) {
    case 'ML':
    case 'MONEYLINE':
    case 'F5_ML':
      return gradeMoneyline(pickTeam, pick.sport, game);
    case 'SPREAD':
    case 'ATS':
      return gradeSpread(pickTeam, line, pick.sport, game);
    case 'OVER':
    case 'UNDER':
    case 'TOTAL':
    case 'O/U':
      return gradeOverUnder(line, betType, game);
    default:
      // Try to infer from pick text
      if (/^(over|under|o|u)\s/i.test(pick.pick)) {
        return gradeOverUnder(line, pick.pick.toLowerCase().startsWith('o') ? 'OVER' : 'UNDER', game);
      }
      if (/[+-]\d/.test(pick.pick)) {
        return gradeSpread(pickTeam, line, pick.sport, game);
      }
      return gradeMoneyline(pickTeam, pick.sport, game);
  }
}

// ============ MAIN HANDLER ============

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow manual triggers without auth for now
      console.log('No auth header, allowing anyway');
    }
    
    const db = getSupabase();
    if (!db) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database not configured' 
      }, { status: 503 });
    }
    
    // 1. Fetch pending picks (last 7 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    
    const { data: pendingPicks, error: fetchError } = await db
      .from('consensus')
      .select('*')
      .eq('result', 'pending')
      .gte('date', cutoffDate.toISOString().split('T')[0])
      .order('date', { ascending: false });
    
    if (fetchError) {
      throw new Error(`Failed to fetch picks: ${fetchError.message}`);
    }
    
    if (!pendingPicks || pendingPicks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending picks to grade',
        graded: 0,
        duration: Date.now() - startTime,
      });
    }
    
    // 2. Group by sport/date and fetch games
    const uniqueKeys = new Set(pendingPicks.map(p => `${p.sport}:${p.date}`));
    const gamesByKey = new Map<string, Map<string, GameScore>>();
    
    for (const key of uniqueKeys) {
      const [sport, date] = key.split(':');
      const games = await fetchCompletedGames(sport, date);
      gamesByKey.set(key, games);
    }
    
    // 3. Grade picks
    let graded = 0;
    let wins = 0;
    let losses = 0;
    let pushes = 0;
    const gradedPicks: any[] = [];
    
    for (const pick of pendingPicks) {
      const key = `${pick.sport}:${pick.date}`;
      const games = gamesByKey.get(key) || new Map();
      
      // Extract team from pick text (e.g., "Lakers -5.5" -> "Lakers")
      const pickTeam = extractTeamFromPick(pick.pick);
      const teamStd = standardizeTeamName(pickTeam, pick.sport);
      const game = games.get(teamStd) || games.get(pickTeam.toLowerCase());
      
      if (!game) continue;
      
      const result = gradePick(pick, game);
      if (result === 'PENDING') continue;
      
      const finalScore = `${game.awayTeam} ${game.awayScore} @ ${game.homeTeam} ${game.homeScore}`;
      
      // Update database (use lowercase result to match schema)
      const resultLower = result.toLowerCase();
      const { error: updateError } = await db
        .from('consensus')
        .update({
          result: resultLower,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pick.id);
      
      if (!updateError) {
        graded++;
        if (result === 'WIN') wins++;
        else if (result === 'LOSS') losses++;
        else pushes++;
        
        gradedPicks.push({
          id: pick.id,
          pick: pick.pick,
          result,
          score: finalScore,
        });
      }
    }
    
    const winPct = wins + losses > 0 
      ? Math.round((wins / (wins + losses)) * 1000) / 10 
      : 0;
    
    return NextResponse.json({
      success: true,
      message: `Graded ${graded} picks`,
      stats: {
        pending: pendingPicks.length,
        graded,
        wins,
        losses,
        pushes,
        winPct,
      },
      picks: gradedPicks,
      duration: Date.now() - startTime,
    });
    
  } catch (error) {
    console.error('Auto-grader error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}
