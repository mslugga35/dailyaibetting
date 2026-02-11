'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingDown, Users } from 'lucide-react';
import { ConsensusPick } from '@/types';

interface FadeThePublicProps {
  picks: ConsensusPick[];
}

/**
 * Fade the Public - Contrarian Betting Indicator
 * 
 * When too many cappers agree (5+), public money piles on one side.
 * Sharp bettors often fade heavy public action.
 * 
 * Thresholds:
 * - 5-7 cappers: ⚠️ Watch for fade opportunity
 * - 8-9 cappers: 🔶 Strong fade signal  
 * - 10+ cappers: 🚨 Heavy public action - prime fade candidate
 */
export function FadeThePublic({ picks }: FadeThePublicProps) {
  // Filter picks with 5+ cappers (potential fade candidates)
  const fadeCandidates = picks
    .filter(p => p.capperCount >= 5)
    .sort((a, b) => b.capperCount - a.capperCount);

  if (fadeCandidates.length === 0) {
    return null; // Don't show if no fade candidates
  }

  const getFadeLevel = (count: number) => {
    if (count >= 10) return { emoji: '🚨', label: 'HEAVY PUBLIC', color: 'text-red-500', bg: 'bg-red-500/10' };
    if (count >= 8) return { emoji: '🔶', label: 'Strong Fade', color: 'text-orange-500', bg: 'bg-orange-500/10' };
    return { emoji: '⚠️', label: 'Watch', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
  };

  const getContrarian = (bet: string): string => {
    // Try to identify the contrarian play
    const lower = bet.toLowerCase();
    
    // Spread contrarian
    if (lower.includes('+')) {
      return bet.replace(/\+/g, '-').replace('–', '+');
    }
    if (lower.includes('-') && !lower.includes('ml')) {
      const match = bet.match(/-(\d+\.?\d*)/);
      if (match) {
        return bet.replace(`-${match[1]}`, `+${match[1]}`);
      }
    }
    
    // Over/Under contrarian
    if (lower.includes('over')) {
      return bet.replace(/over/i, 'Under');
    }
    if (lower.includes('under')) {
      return bet.replace(/under/i, 'Over');
    }
    
    // ML - can't easily determine contrarian without knowing opponent
    return 'Opponent ML';
  };

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingDown className="h-5 w-5 text-yellow-500" />
          Fade The Public
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Heavy consensus may indicate public bias. Consider the other side.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {fadeCandidates.slice(0, 5).map((pick, i) => {
          const fade = getFadeLevel(pick.capperCount);
          const contrarian = getContrarian(pick.bet);
          
          return (
            <div 
              key={pick.id || i} 
              className={`p-3 rounded-lg ${fade.bg} border border-current/10`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{fade.emoji}</span>
                    <span className={`text-xs font-medium ${fade.color}`}>{fade.label}</span>
                    <span className="text-xs text-muted-foreground">
                      ({pick.capperCount} cappers)
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground line-through">{pick.bet}</span>
                  </div>
                  <div className="text-sm font-medium mt-1">
                    <span className="text-green-500">→ Fade: {contrarian}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {pick.sport}
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              This is not betting advice. Heavy consensus doesn&apos;t guarantee the fade wins. 
              Use as one data point in your analysis.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
