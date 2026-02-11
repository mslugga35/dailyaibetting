'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, Snowflake, Users, TrendingUp } from 'lucide-react';
import { ConsensusPick } from '@/types';

interface MatchupViewProps {
  picks: ConsensusPick[];
  allPicks?: any[]; // Raw picks with capper details
}

interface CapperCard {
  capper: string;
  pick: string;
  side: 'away' | 'home';
  units?: number;
  odds?: string;
  record?: string;
  isHot?: boolean;
  isCold?: boolean;
}

interface GameMatchup {
  id: string;
  sport: string;
  awayTeam: string;
  homeTeam: string;
  gameTime?: string;
  spread?: string;
  total?: string;
  awayCappers: CapperCard[];
  homeCappers: CapperCard[];
  awayUnits: number;
  homeUnits: number;
}

/**
 * Extract game matchups from consensus picks
 * Groups picks by game and splits by side
 */
function extractMatchups(picks: ConsensusPick[]): GameMatchup[] {
  const matchupMap = new Map<string, GameMatchup>();

  for (const pick of picks) {
    // Try to extract matchup info from the bet string
    const matchupKey = pick.matchup || pick.sport + '-' + (pick.bet.split(' ')[0]);
    
    if (!matchupMap.has(matchupKey)) {
      // Parse teams from matchup string (e.g., "Team A @ Team B" or "Team A vs Team B")
      const teams = parseTeams(pick.matchup || pick.bet);
      
      matchupMap.set(matchupKey, {
        id: matchupKey,
        sport: pick.sport,
        awayTeam: teams.away || 'Away',
        homeTeam: teams.home || 'Home',
        awayCappers: [],
        homeCappers: [],
        awayUnits: 0,
        homeUnits: 0,
      });
    }

    const matchup = matchupMap.get(matchupKey)!;
    
    // Determine which side this pick is on
    const side = determineSide(pick.bet, matchup.awayTeam, matchup.homeTeam);
    
    // Create capper cards from the cappers array
    for (const capperName of pick.cappers || []) {
      const card: CapperCard = {
        capper: capperName,
        pick: pick.bet,
        side,
        units: 1, // Default to 1u if not specified
      };

      if (side === 'away') {
        matchup.awayCappers.push(card);
        matchup.awayUnits += card.units || 1;
      } else {
        matchup.homeCappers.push(card);
        matchup.homeUnits += card.units || 1;
      }
    }
  }

  return Array.from(matchupMap.values())
    .filter(m => m.awayCappers.length > 0 || m.homeCappers.length > 0)
    .sort((a, b) => {
      // Sort by total cappers (most action first)
      const aTotal = a.awayCappers.length + a.homeCappers.length;
      const bTotal = b.awayCappers.length + b.homeCappers.length;
      return bTotal - aTotal;
    });
}

function parseTeams(matchup: string): { away: string; home: string } {
  // Try different separators
  const separators = [' @ ', ' vs ', ' at ', ' VS ', ' v '];
  
  for (const sep of separators) {
    if (matchup.includes(sep)) {
      const [away, home] = matchup.split(sep);
      return { away: away.trim(), home: home.trim() };
    }
  }

  // If no separator found, use the first word as team
  const words = matchup.split(' ');
  return { away: words[0], home: words[words.length - 1] };
}

function determineSide(bet: string, awayTeam: string, homeTeam: string): 'away' | 'home' {
  const betLower = bet.toLowerCase();
  const awayLower = awayTeam.toLowerCase();
  const homeLower = homeTeam.toLowerCase();

  // Check if bet contains team name
  if (betLower.includes(awayLower.slice(0, 4))) return 'away';
  if (betLower.includes(homeLower.slice(0, 4))) return 'home';

  // Check for spread direction (positive = dog, usually away)
  if (bet.includes('+')) return 'away';
  if (bet.includes('-') && !bet.toLowerCase().includes('ml')) return 'home';

  // Default to away for unders, home for overs (arbitrary)
  if (betLower.includes('under')) return 'away';
  if (betLower.includes('over')) return 'home';

  return 'home';
}

function CapperCardComponent({ card, teamColor }: { card: CapperCard; teamColor: string }) {
  return (
    <div className={`p-3 rounded-lg bg-card border-l-4 ${teamColor}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {card.isHot && <Flame className="h-4 w-4 text-orange-500" />}
          {card.isCold && <Snowflake className="h-4 w-4 text-blue-400" />}
          <span className="font-medium text-sm">{card.capper}</span>
        </div>
        {card.units && (
          <span className="text-xs text-muted-foreground">{card.units}u</span>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {card.pick}
        {card.odds && <span className="ml-2 text-primary">{card.odds}</span>}
      </div>
      {card.record && (
        <div className="text-xs text-muted-foreground mt-1">{card.record}</div>
      )}
    </div>
  );
}

function ConsensusBar({ awayPct, homePct, awayTeam, homeTeam }: { 
  awayPct: number; 
  homePct: number; 
  awayTeam: string;
  homeTeam: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{awayTeam} {awayPct}%</span>
        <span>UNIT DISTRIBUTION</span>
        <span>{homePct}% {homeTeam}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex">
        <div 
          className="bg-blue-500 transition-all" 
          style={{ width: `${awayPct}%` }} 
        />
        <div 
          className="bg-red-500 transition-all" 
          style={{ width: `${homePct}%` }} 
        />
      </div>
    </div>
  );
}

export function MatchupView({ picks }: MatchupViewProps) {
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [selectedBetType, setSelectedBetType] = useState<'SPREAD' | 'TOTAL' | 'ML'>('SPREAD');

  const matchups = useMemo(() => extractMatchups(picks), [picks]);

  const sports = useMemo(() => {
    const sportSet = new Set(matchups.map(m => m.sport));
    return ['ALL', ...Array.from(sportSet)];
  }, [matchups]);

  const filteredMatchups = useMemo(() => {
    if (selectedSport === 'ALL') return matchups;
    return matchups.filter(m => m.sport === selectedSport);
  }, [matchups, selectedSport]);

  if (matchups.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No matchup data available yet.</p>
          <p className="text-sm mt-2">Picks will appear once cappers make selections.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {sports.map(sport => (
          <Button
            key={sport}
            variant={selectedSport === sport ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSport(sport)}
          >
            {sport}
          </Button>
        ))}
      </div>

      {/* Bet Type Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(['SPREAD', 'TOTAL', 'ML'] as const).map(type => (
          <Button
            key={type}
            variant={selectedBetType === type ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedBetType(type)}
            className="text-xs"
          >
            {type === 'ML' ? 'MONEYLINE' : type}
          </Button>
        ))}
      </div>

      {/* Matchup Cards */}
      <div className="space-y-6">
        {filteredMatchups.map(matchup => {
          const totalUnits = matchup.awayUnits + matchup.homeUnits;
          const awayPct = totalUnits > 0 ? Math.round((matchup.awayUnits / totalUnits) * 100) : 50;
          const homePct = 100 - awayPct;
          const totalCappers = matchup.awayCappers.length + matchup.homeCappers.length;

          return (
            <Card key={matchup.id} className="overflow-hidden">
              {/* Game Header */}
              <CardHeader className="bg-gradient-to-r from-blue-900/20 to-red-900/20 pb-4">
                <div className="flex items-center justify-between">
                  {/* Away Team */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center font-bold text-blue-400">
                      {matchup.awayTeam.slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold">{matchup.awayTeam}</div>
                      <div className="text-xs text-muted-foreground">Away</div>
                    </div>
                  </div>

                  {/* Center Info */}
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">{matchup.sport}</div>
                    <div className="font-bold text-lg">VS</div>
                    <div className="text-xs text-muted-foreground">{matchup.gameTime || 'Today'}</div>
                  </div>

                  {/* Home Team */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold">{matchup.homeTeam}</div>
                      <div className="text-xs text-muted-foreground">Home</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center font-bold text-red-400">
                      {matchup.homeTeam.slice(0, 3).toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{matchup.awayCappers.length}</div>
                    <div className="text-xs text-muted-foreground">CAPPERS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{matchup.awayUnits}</div>
                    <div className="text-xs text-muted-foreground">UNITS</div>
                  </div>

                  {/* Consensus Circle */}
                  <div className="relative w-16 h-16">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-muted"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeDasharray={`${awayPct * 1.76} 176`}
                        className="text-primary"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-muted-foreground">PICKS</span>
                      <span className="font-bold">{awayPct}%</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold">{matchup.homeCappers.length}</div>
                    <div className="text-xs text-muted-foreground">CAPPERS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{matchup.homeUnits}</div>
                    <div className="text-xs text-muted-foreground">UNITS</div>
                  </div>
                </div>

                {/* Unit Distribution Bar */}
                <div className="mt-4">
                  <ConsensusBar 
                    awayPct={awayPct} 
                    homePct={homePct}
                    awayTeam={matchup.awayTeam}
                    homeTeam={matchup.homeTeam}
                  />
                </div>
              </CardHeader>

              {/* Capper Grid */}
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Away Side */}
                  <div className="space-y-3">
                    <div className="text-center font-bold text-blue-400 mb-3">
                      {matchup.awayTeam}
                    </div>
                    {matchup.awayCappers.length > 0 ? (
                      matchup.awayCappers.map((card, i) => (
                        <CapperCardComponent 
                          key={i} 
                          card={card} 
                          teamColor="border-l-blue-500"
                        />
                      ))
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        No picks yet
                      </div>
                    )}
                  </div>

                  {/* Home Side */}
                  <div className="space-y-3">
                    <div className="text-center font-bold text-red-400 mb-3">
                      {matchup.homeTeam}
                    </div>
                    {matchup.homeCappers.length > 0 ? (
                      matchup.homeCappers.map((card, i) => (
                        <CapperCardComponent 
                          key={i} 
                          card={card} 
                          teamColor="border-l-red-500"
                        />
                      ))
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        No picks yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" /> Hot Streak
                    </span>
                    <span className="flex items-center gap-1">
                      <Snowflake className="h-3 w-3 text-blue-400" /> Cold Streak
                    </span>
                  </div>
                  <span>{totalCappers} total picks</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
