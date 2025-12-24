'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Zap,
  Target,
  TrendingUp,
  Flame,
  RefreshCw,
  Loader2,
  Trophy,
  Layers,
  Copy,
  Check,
  Twitter,
} from 'lucide-react';
import { useConsensus } from '@/lib/hooks/use-consensus';
import { useState } from 'react';

export default function DailyBetsPage() {
  const { topOverall, bySport, isLoading, error, refetch, data } = useConsensus();
  const [copied, setCopied] = useState(false);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Get all consensus picks sorted by capper count
  const allPicks = data?.consensus || topOverall;
  const sortedByConfidence = [...allPicks].sort((a, b) => b.capperCount - a.capperCount);

  // Top 5 highest confidence (most cappers agreeing)
  const top5Confidence = sortedByConfidence.slice(0, 5);

  // Fire picks (3+ cappers)
  const firePicks = allPicks.filter(p => p.capperCount >= 3);

  // Get unique sports that have picks today
  const activeSports = [...new Set(allPicks.map(p => p.sport))];

  // Best pick per sport
  const bestBySport = activeSports.map(sport => {
    const sportPicks = allPicks.filter(p => p.sport === sport);
    return sportPicks.sort((a, b) => b.capperCount - a.capperCount)[0];
  }).filter(Boolean);

  // Generate 2-leg parlay suggestions (picks from different sports/games)
  const generate2LegParlay = () => {
    if (firePicks.length < 2) return null;
    // Pick two uncorrelated bets (different sports or different games)
    const sorted = [...firePicks].sort((a, b) => b.capperCount - a.capperCount);
    const leg1 = sorted[0];
    const leg2 = sorted.find(p => p.sport !== leg1.sport || p.matchup !== leg1.matchup);
    if (!leg1 || !leg2) return null;
    return [leg1, leg2];
  };

  // Generate 3-leg parlay
  const generate3LegParlay = () => {
    if (firePicks.length < 3) return null;
    const sorted = [...firePicks].sort((a, b) => b.capperCount - a.capperCount);
    const legs: typeof firePicks = [];
    for (const pick of sorted) {
      if (legs.length >= 3) break;
      // Ensure uncorrelated (different game)
      const isDifferentGame = !legs.some(l => l.matchup === pick.matchup);
      if (isDifferentGame) {
        legs.push(pick);
      }
    }
    return legs.length >= 3 ? legs : null;
  };

  const parlay2 = generate2LegParlay();
  const parlay3 = generate3LegParlay();

  // Format for Discord copy
  const formatForDiscord = () => {
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    let text = `🎯 **DAILY BEST BETS — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${time})**\n\n`;

    if (top5Confidence.length > 0) {
      text += `🔝 **TOP 5 HIGHEST CONFIDENCE**\n`;
      top5Confidence.forEach((pick, i) => {
        const fire = pick.capperCount >= 10 ? '🔥🔥🔥' : pick.capperCount >= 3 ? '🔥' : '';
        text += `${i + 1}. **${pick.sport}** | ${pick.matchup} | ${pick.bet} (${pick.capperCount} cappers) ${fire}\n`;
      });
      text += `\n`;
    }

    if (parlay2) {
      text += `🎲 **2-LEG PARLAY**\n`;
      parlay2.forEach(pick => {
        text += `• ${pick.sport} | ${pick.bet} (${pick.capperCount} cappers)\n`;
      });
      text += `\n`;
    }

    if (parlay3) {
      text += `🎲 **3-LEG PARLAY**\n`;
      parlay3.forEach(pick => {
        text += `• ${pick.sport} | ${pick.bet} (${pick.capperCount} cappers)\n`;
      });
      text += `\n`;
    }

    if (bestBySport.length > 0) {
      text += `🏅 **BEST BY SPORT**\n`;
      bestBySport.forEach(pick => {
        const fire = pick.capperCount >= 3 ? '🔥' : '';
        text += `• **${pick.sport}**: ${pick.bet} (${pick.capperCount}) ${fire}\n`;
      });
    }

    text += `\n_${allPicks.length} consensus picks analyzed_`;
    return text;
  };

  const formatForTwitter = () => {
    if (top5Confidence.length === 0) return '';
    const topPick = top5Confidence[0];
    const fire = topPick.capperCount >= 3 ? '🔥' : '';
    return `Today's Top Consensus Pick:\n\n${fire} ${topPick.sport} | ${topPick.bet}\n${topPick.capperCount} cappers agree!\n\nMore free picks at https://dailyaibetting.com/daily-bets`;
  };

  const shareToTwitter = () => {
    const text = formatForTwitter();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=550,height=435');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formatForDiscord());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFireEmoji = (count: number) => {
    if (count >= 10) return '🔥🔥🔥';
    if (count >= 3) return '🔥';
    return '';
  };

  return (
    <div className="container px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Zap className="h-5 w-5" />
              <span className="text-sm font-medium">Daily Best Bets</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Today&apos;s Best Bets
            </h1>
            <p className="text-muted-foreground">
              {today} &middot; AI-analyzed picks from {data?.totalPicks || 0} total picks
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={shareToTwitter}
              disabled={isLoading || allPicks.length === 0}
            >
              <Twitter className="h-4 w-4" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleCopy}
              disabled={isLoading || allPicks.length === 0}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Discord'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading best bets...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Unable to load best bets. Please try refreshing.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      )}

      {/* Main Content */}
      {!isLoading && !error && (
        <div className="space-y-8">
          {/* Quick Stats */}
          {allPicks.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-primary">{data?.totalPicks?.toLocaleString() || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Picks Analyzed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-3xl font-bold">{allPicks.length}</div>
                  <div className="text-sm text-muted-foreground">Consensus Picks</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-orange-500">{firePicks.length}</div>
                  <div className="text-sm text-muted-foreground">Fire Picks (3+)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-3xl font-bold">{activeSports.length}</div>
                  <div className="text-sm text-muted-foreground">Active Sports</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top 5 Highest Confidence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top 5 Highest Confidence Picks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {top5Confidence.length > 0 ? (
                <div className="space-y-4">
                  {top5Confidence.map((pick, index) => (
                    <div key={`${pick.sport}-${pick.bet}-${index}`} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                        index === 0 ? 'bg-yellow-500 text-yellow-950' :
                        index === 1 ? 'bg-gray-400 text-gray-900' :
                        index === 2 ? 'bg-amber-600 text-amber-950' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{pick.sport}</Badge>
                          {pick.capperCount >= 3 && (
                            <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                          )}
                        </div>
                        <div className="font-semibold">{pick.matchup}</div>
                        <div className="text-primary font-medium">{pick.bet}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{pick.capperCount}</div>
                        <div className="text-xs text-muted-foreground">cappers</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No picks available yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Parlays */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* 2-Leg Parlay */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  2-Leg Parlay
                </CardTitle>
              </CardHeader>
              <CardContent>
                {parlay2 ? (
                  <div className="space-y-3">
                    {parlay2.map((pick, index) => (
                      <div key={index} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{pick.sport}</Badge>
                          <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">{pick.matchup}</div>
                        <div className="font-semibold text-primary">{pick.bet}</div>
                        <div className="text-xs text-muted-foreground mt-1">{pick.capperCount} cappers agree</div>
                      </div>
                    ))}
                    <Separator />
                    <p className="text-sm text-muted-foreground">
                      Low correlation parlay from different games for reduced risk.
                    </p>
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">
                    Need 2+ fire picks from different games to suggest a parlay.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 3-Leg Parlay */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  3-Leg Parlay
                </CardTitle>
              </CardHeader>
              <CardContent>
                {parlay3 ? (
                  <div className="space-y-3">
                    {parlay3.map((pick, index) => (
                      <div key={index} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{pick.sport}</Badge>
                          <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">{pick.matchup}</div>
                        <div className="font-semibold text-primary">{pick.bet}</div>
                        <div className="text-xs text-muted-foreground mt-1">{pick.capperCount} cappers agree</div>
                      </div>
                    ))}
                    <Separator />
                    <p className="text-sm text-muted-foreground">
                      Three uncorrelated picks for higher potential payout.
                    </p>
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">
                    Need 3+ fire picks from different games to suggest a parlay.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Best by Sport */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Best Pick by Sport
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bestBySport.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bestBySport.map((pick, index) => (
                    <div key={index} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-primary">{pick.sport}</Badge>
                        <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-1">{pick.matchup}</div>
                      <div className="font-semibold text-primary">{pick.bet}</div>
                      <div className="text-xs text-muted-foreground mt-2">{pick.capperCount} cappers agree</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No picks available yet.</p>
              )}
            </CardContent>
          </Card>

          {/* All Fire Picks */}
          {firePicks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  All Fire Picks (3+ Cappers)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sortedByConfidence.filter(p => p.capperCount >= 3).map((pick, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{pick.sport}</Badge>
                        <div>
                          <span className="font-medium">{pick.matchup}</span>
                          <span className="mx-2 text-muted-foreground">•</span>
                          <span className="text-primary font-semibold">{pick.bet}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                        <Badge className="bg-orange-500">{pick.capperCount}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                How Daily Best Bets Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-primary">1</div>
                  <h3 className="font-semibold">Aggregate Picks</h3>
                  <p className="text-sm text-muted-foreground">
                    We collect picks from top sources including BetFirm, Dimers, Covers, and SportsLine.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-primary">2</div>
                  <h3 className="font-semibold">Rank by Consensus</h3>
                  <p className="text-sm text-muted-foreground">
                    Picks are ranked by how many cappers agree. More agreement = higher confidence.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-primary">3</div>
                  <h3 className="font-semibold">Generate Parlays</h3>
                  <p className="text-sm text-muted-foreground">
                    We suggest uncorrelated parlays from different games to reduce risk.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
