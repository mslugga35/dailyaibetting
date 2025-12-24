'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { Consensus, formatOdds, getConfidenceLabel } from '@/types';
import Link from 'next/link';

interface ConsensusCardProps {
  consensus: Consensus;
  showAnalysis?: boolean;
}

export function ConsensusCard({ consensus, showAnalysis = true }: ConsensusCardProps) {
  const { display: oddsDisplay, isPositive } = formatOdds(consensus.avg_odds);
  const confidenceLevel = getConfidenceLabel(consensus.confidence_score);
  const confidencePercent = Math.round(consensus.confidence_score * 100);

  return (
    <Card className={`transition-all hover:shadow-lg ${
      confidenceLevel === 'high'
        ? 'border-primary/40 bg-primary/5'
        : confidenceLevel === 'medium'
        ? 'border-accent/40 bg-accent/5'
        : ''
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {consensus.sport}
              </Badge>
              {consensus.game_time && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {consensus.game_time}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-lg">{consensus.game}</h3>
          </div>

          {/* Confidence Score */}
          <div className="flex flex-col items-end">
            <div className={`text-2xl font-bold ${
              confidenceLevel === 'high' ? 'text-primary' :
              confidenceLevel === 'medium' ? 'text-accent' :
              'text-muted-foreground'
            }`}>
              {confidencePercent}%
            </div>
            <span className="text-xs text-muted-foreground">AI Confidence</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pick & Odds */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="space-y-0.5">
            <div className="text-sm text-muted-foreground">Pick</div>
            <div className="text-xl font-bold">{consensus.pick}</div>
          </div>
          <div className="text-right space-y-0.5">
            <div className="text-sm text-muted-foreground">Avg Odds</div>
            <div className={`text-xl font-bold ${isPositive ? 'text-primary' : ''}`}>
              {oddsDisplay}
            </div>
          </div>
        </div>

        {/* Capper Agreement */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            <span className="font-semibold text-primary">{consensus.capper_count}</span>
            {' '}cappers agree
          </span>
          <div className="flex -space-x-1 ml-auto">
            {consensus.cappers.slice(0, 4).map((capper, i) => (
              <div
                key={i}
                className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium"
                title={capper}
              >
                {capper.charAt(0)}
              </div>
            ))}
            {consensus.cappers.length > 4 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
                +{consensus.cappers.length - 4}
              </div>
            )}
          </div>
        </div>

        {/* AI Analysis */}
        {showAnalysis && consensus.ai_analysis && (
          <div className="p-3 rounded-lg bg-muted/30 border border-dashed">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">AI Analysis</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {consensus.ai_analysis}
            </p>
          </div>
        )}

        {/* Result (if available) */}
        {consensus.result !== 'pending' && (
          <div className={`text-center py-2 rounded-lg font-semibold ${
            consensus.result === 'win' ? 'bg-primary/20 text-primary' :
            consensus.result === 'loss' ? 'bg-destructive/20 text-destructive' :
            'bg-yellow-500/20 text-yellow-600'
          }`}>
            {consensus.result.toUpperCase()}
          </div>
        )}

        {/* View More Link */}
        <Link
          href={`/consensus/${consensus.id}`}
          className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
        >
          View Details
          <ChevronRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
