'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DollarSign,
  BarChart3,
  Repeat,
  AlertCircle,
  Activity,
  CircleDot,
  LayoutGrid,
  List,
} from 'lucide-react';
import { formatMarkdown } from '@/lib/utils/format-markdown';
import { useDailyBets } from '@/lib/hooks/use-daily-bets';
import { useState, useMemo } from 'react';

function Section({ value, viewAll, className, children }: {
  value: string;
  viewAll: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (viewAll) return <div className={className}>{children}</div>;
  return <TabsContent value={value} className={className}>{children}</TabsContent>;
}

export function DailyBetsContent({ initialData }: { initialData: unknown }) {
  const { data, isLoading, error, refetch } = useDailyBets(initialData as never);
  const [copied, setCopied] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const formattedReport = useMemo(
    () => data?.aiReport ? formatMarkdown(data.aiReport, false) : '',
    [data?.aiReport],
  );

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getFireEmoji = (count: number) => {
    if (count >= 10) return '🔥🔥🔥';
    if (count >= 7) return '🔥🔥';
    if (count >= 3) return '🔥';
    return '';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.65) return 'text-green-500';
    if (confidence >= 0.55) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const formatForDiscord = () => {
    if (!data) return '';
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    let text = `🎯 **DAILY BEST BETS — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${time})**\n\n`;

    if (data.top5Confidence.length > 0) {
      text += `🏆 **TOP 5 HIGHEST CONFIDENCE**\n`;
      data.top5Confidence.forEach((pick, i) => {
        const fire = getFireEmoji(pick.capperCount);
        text += `${i + 1}. **${pick.sport}** | ${pick.matchup} | ${pick.bet} (${pick.capperCount} cappers, ${Math.round(pick.confidence.overall * 100)}% conf) ${fire}\n`;
      });
      text += `\n`;
    }

    if (data.top5MostCommon.length > 0) {
      text += `📊 **MOST COMMON PICKS**\n`;
      data.top5MostCommon.slice(0, 3).forEach((pick) => {
        text += `• ${pick.sport} | ${pick.bet} — ${pick.frequency}x picked ${pick.isFire ? '🔥' : ''}\n`;
      });
      text += `\n`;
    }

    if (data.twoLegParlays[0]) {
      text += `🎲 **2-LEG PARLAY**\n`;
      data.twoLegParlays[0].forEach(pick => {
        text += `• ${pick.sport} | ${pick.bet} (${pick.capperCount})\n`;
      });
      text += `\n`;
    }

    if (data.best20Bet) {
      text += `💰 **BEST $20 BET**\n`;
      text += `${data.best20Bet.pick.sport} | ${data.best20Bet.pick.bet}\n`;
      text += `Expected: ${data.best20Bet.expectedReturn}\n\n`;
    }

    text += `_${data.consensusCount} consensus picks from ${data.totalPicks} analyzed_\n`;
    text += `📱 https://dailyaibetting.com/daily-bets`;
    return text;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formatForDiscord());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTwitter = () => {
    if (!data || data.top5Confidence.length === 0) return;
    const topPick = data.top5Confidence[0];
    const fire = getFireEmoji(topPick.capperCount);
    const text = `Today's Top Consensus Pick:\n\n${fire} ${topPick.sport} | ${topPick.bet}\n${topPick.capperCount} cappers agree (${Math.round(topPick.confidence.overall * 100)}% confidence)\n\nMore free picks at https://dailyaibetting.com/daily-bets`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="container px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Zap className="h-5 w-5" />
              <span className="text-sm font-medium">Daily AI Analysis</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Today&apos;s Best Bets
            </h1>
            <p className="text-muted-foreground">
              {today} &middot; {data?.totalPicks || 0} picks analyzed
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={viewAll ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => setViewAll(!viewAll)}
              disabled={isLoading || !data}
            >
              {viewAll ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              {viewAll ? 'Tabs' : 'View All'}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={shareToTwitter} disabled={isLoading || !data}>
              <Twitter className="h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleCopy} disabled={isLoading || !data}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Discord'}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()} disabled={isLoading}>
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
          <span className="ml-2">Analyzing picks...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Unable to load daily bets. Please try refreshing.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      )}

      {/* Main Content */}
      {!isLoading && !error && data && (
        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-3xl font-bold text-primary">{data.totalPicks.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Picks Analyzed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-3xl font-bold">{data.consensusCount}</div>
                <div className="text-sm text-muted-foreground">Consensus Picks</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-3xl font-bold text-orange-500">
                  {data.top5Confidence.filter(p => p.capperCount >= 3).length}
                </div>
                <div className="text-sm text-muted-foreground">Fire Picks</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-3xl font-bold">{data.activeSports.length}</div>
                <div className="text-sm text-muted-foreground">Active Sports</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-3xl font-bold text-green-500">
                  {data.top5Confidence[0] ? Math.round(data.top5Confidence[0].confidence.overall * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Top Confidence</div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Navigation */}
          <Tabs defaultValue="overview" className="w-full">
            {!viewAll && (
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="parlays">Parlays</TabsTrigger>
                <TabsTrigger value="sports">By Sport</TabsTrigger>
                <TabsTrigger value="featured">Featured</TabsTrigger>
                {data.mlbAnalysis && <TabsTrigger value="mlb">MLB</TabsTrigger>}
                {data.aiReport && <TabsTrigger value="ai-picks">AI Picks</TabsTrigger>}
                <TabsTrigger value="trends">Trends</TabsTrigger>
              </TabsList>
            )}

            {/* Overview Tab */}
            <Section value="overview" viewAll={viewAll} className="space-y-6 mt-6">
              {/* Top 5 Highest Confidence */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Top 5 Highest Confidence Picks
                  </CardTitle>
                  <CardDescription>
                    Scored by: 40% implied probability + 40% expert win rate + 20% statistical support
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.top5Confidence.length > 0 ? (
                    <div className="space-y-4">
                      {data.top5Confidence.map((pick, index) => (
                        <div key={`${pick.sport}-${pick.bet}-${index}`} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
                          <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${
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
                              <Badge variant="secondary" className={getConfidenceColor(pick.confidence.overall)}>
                                {Math.round(pick.confidence.overall * 100)}%
                              </Badge>
                              {pick.capperCount >= 3 && (
                                <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                              )}
                            </div>
                            <div className="font-semibold">{pick.matchup}</div>
                            <div className="text-primary font-medium text-lg">{pick.bet}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {pick.confidence.reasoning}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold">{pick.capperCount}</div>
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

              {/* Most Common Bets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Top 5 Most Common Bets
                  </CardTitle>
                  <CardDescription>
                    Frequency analysis - how many times each bet appears
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.top5MostCommon.length > 0 ? (
                    <div className="space-y-3">
                      {data.top5MostCommon.map((pick, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{pick.sport}</Badge>
                            <div>
                              <span className="font-medium">{pick.bet}</span>
                              <span className="mx-2 text-muted-foreground">•</span>
                              <span className="text-sm text-muted-foreground">{pick.matchup}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-bold">{pick.frequency}x</div>
                              <div className="text-xs text-muted-foreground">{pick.capperCount} cappers</div>
                            </div>
                            {pick.isFire && <span className="text-lg">🔥</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-4 text-muted-foreground">No frequency data available.</p>
                  )}
                </CardContent>
              </Card>
            </Section>

            {/* Parlays Tab */}
            <Section value="parlays" viewAll={viewAll} className="space-y-6 mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* 2-Leg Parlays */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary" />
                      2-Leg Parlays
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.twoLegParlays.length > 0 ? (
                      <div className="space-y-4">
                        {data.twoLegParlays.map((parlay, parlayIndex) => (
                          <div key={parlayIndex} className="p-4 rounded-lg border bg-card">
                            <div className="text-xs text-muted-foreground mb-2">Parlay Option {parlayIndex + 1}</div>
                            {parlay.map((pick, index) => (
                              <div key={index} className="p-2 rounded bg-muted/50 mb-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">{pick.sport}</Badge>
                                  <span>{getFireEmoji(pick.capperCount)}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">{pick.matchup}</div>
                                <div className="font-semibold text-primary">{pick.bet}</div>
                              </div>
                            ))}
                            <div className="text-xs text-muted-foreground mt-2">
                              Low correlation for reduced risk
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-4 text-muted-foreground">
                        Need 2+ fire picks from different games.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* 3-Leg Parlays */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary" />
                      3-Leg Parlays
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.threeLegParlays.length > 0 ? (
                      <div className="space-y-4">
                        {data.threeLegParlays.map((parlay, parlayIndex) => (
                          <div key={parlayIndex} className="p-4 rounded-lg border bg-card">
                            {parlay.map((pick, index) => (
                              <div key={index} className="p-2 rounded bg-muted/50 mb-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">{pick.sport}</Badge>
                                  <span>{getFireEmoji(pick.capperCount)}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">{pick.matchup}</div>
                                <div className="font-semibold text-primary">{pick.bet}</div>
                              </div>
                            ))}
                            <div className="text-xs text-muted-foreground mt-2">
                              Higher payout potential
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-4 text-muted-foreground">
                        Need 3+ fire picks from different games.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Big Money Parlays */}
              {data.bigMoneyParlays.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      Big Money Parlays ($2 Builds)
                    </CardTitle>
                    <CardDescription>
                      Long-shot parlays for big potential payouts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {data.bigMoneyParlays.map((parlay, index) => (
                        <div key={index} className="p-4 rounded-lg border bg-gradient-to-br from-green-500/10 to-emerald-500/5">
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant={parlay.riskLevel === 'extreme' ? 'destructive' : 'secondary'}>
                              {parlay.riskLevel.toUpperCase()} RISK
                            </Badge>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Estimated Odds</div>
                              <div className="font-bold text-green-500">{parlay.estimatedOdds}</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {parlay.legs.map((leg, legIndex) => (
                              <div key={legIndex} className="flex items-center gap-2 text-sm">
                                <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                                  {legIndex + 1}
                                </span>
                                <span className="text-muted-foreground">{leg.sport}</span>
                                <span className="font-medium">{leg.bet}</span>
                              </div>
                            ))}
                          </div>
                          <Separator className="my-3" />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">$2 bet could return:</span>
                            <span className="font-bold text-green-500">{parlay.potentialPayout}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </Section>

            {/* By Sport Tab */}
            <Section value="sports" viewAll={viewAll} className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Best Pick by Sport
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(data.bestBySport).length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(data.bestBySport).map(([sport, pick]) => (
                        <div key={sport} className="p-4 rounded-lg border bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className="bg-primary">{sport}</Badge>
                            <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                          </div>
                          <div className="text-sm text-muted-foreground mb-1">{pick.matchup}</div>
                          <div className="font-semibold text-primary text-lg">{pick.bet}</div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {pick.capperCount} cappers agree
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No picks available yet.</p>
                  )}
                </CardContent>
              </Card>
            </Section>

            {/* Featured Tab */}
            <Section value="featured" viewAll={viewAll} className="space-y-6 mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Best $20 Bet */}
                <Card className="border-green-500/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      Best $20 Bet
                    </CardTitle>
                    <CardDescription>Today&apos;s recommended single bet</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.best20Bet ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{data.best20Bet.pick.sport}</Badge>
                            <span className="text-lg">{getFireEmoji(data.best20Bet.pick.capperCount)}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">{data.best20Bet.pick.matchup}</div>
                          <div className="font-bold text-xl text-primary mt-1">{data.best20Bet.pick.bet}</div>
                          <div className="text-sm text-muted-foreground mt-2">
                            {data.best20Bet.pick.capperCount} cappers agree
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Recommended: ${data.best20Bet.recommendedUnit}</span>
                          <span className="font-bold text-green-500">Expected: {data.best20Bet.expectedReturn}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{data.best20Bet.reasoning}</p>
                      </div>
                    ) : (
                      <p className="text-center py-4 text-muted-foreground">
                        Need a strong consensus pick to recommend.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Ladder Pick */}
                <Card className="border-purple-500/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Repeat className="h-5 w-5 text-purple-500" />
                      Ladder Pick
                    </CardTitle>
                    <CardDescription>Daily rollover starting point</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.ladderPick ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{data.ladderPick.pick.sport}</Badge>
                            <span className="text-lg">{getFireEmoji(data.ladderPick.pick.capperCount)}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">{data.ladderPick.pick.matchup}</div>
                          <div className="font-bold text-xl text-primary mt-1">{data.ladderPick.pick.bet}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Starting: ${data.ladderPick.startingBankroll}</span>
                          <span className="font-bold text-purple-500">Target: {data.ladderPick.targetMultiplier}x</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{data.ladderPick.strategy}</p>
                      </div>
                    ) : (
                      <p className="text-center py-4 text-muted-foreground">
                        Need a safe ML consensus pick for ladder.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </Section>

            {/* MLB Tab */}
            {data.mlbAnalysis && (
              <Section value="mlb" viewAll={viewAll} className="space-y-6 mt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Strikeout Props */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-red-500" />
                        Strikeout Props
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.mlbAnalysis.strikeoutProps.length > 0 ? (
                        <div className="space-y-2">
                          {data.mlbAnalysis.strikeoutProps.map((prop, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/50">
                              <div>
                                <span className="font-medium">{prop.player}</span>
                                <span className="text-sm text-muted-foreground ml-2">O/U {prop.line} Ks</span>
                              </div>
                              <Badge variant="outline">{prop.capperCount} cappers</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center py-4 text-muted-foreground">No K props today.</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* YRFI/NRFI */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CircleDot className="h-5 w-5 text-blue-500" />
                        YRFI / NRFI
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.mlbAnalysis.yrfiPicks.length > 0 || data.mlbAnalysis.nrfiPicks.length > 0 ? (
                        <div className="space-y-4">
                          {data.mlbAnalysis.yrfiPicks.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-green-500 mb-2">YRFI (Yes Run First Inning)</div>
                              {data.mlbAnalysis.yrfiPicks.map((pick, index) => (
                                <div key={index} className="p-2 rounded bg-green-500/10 mb-1">
                                  <span className="font-medium">{pick.matchup}</span>
                                  <span className="text-xs ml-2">({pick.capperCount} cappers)</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {data.mlbAnalysis.nrfiPicks.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-red-500 mb-2">NRFI (No Run First Inning)</div>
                              {data.mlbAnalysis.nrfiPicks.map((pick, index) => (
                                <div key={index} className="p-2 rounded bg-red-500/10 mb-1">
                                  <span className="font-medium">{pick.matchup}</span>
                                  <span className="text-xs ml-2">({pick.capperCount} cappers)</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-center py-4 text-muted-foreground">No YRFI/NRFI picks today.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </Section>
            )}

            {/* AI Picks Tab — BallparkPal + Statcast enriched report */}
            {data.aiReport && (
              <Section value="ai-picks" viewAll={viewAll} className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      AI Analysis — BallparkPal + Statcast
                    </CardTitle>
                    <CardDescription>
                      AI-generated picks powered by simulation data, K-prop scanner, and expert consensus
                      {data.aiReportGeneratedAt && (
                        <span className="ml-2 text-xs">
                          Updated {new Date(data.aiReportGeneratedAt).toLocaleTimeString('en-US', {
                            hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
                          })} ET
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-primary [&_li]:ml-4 [&_li]:mb-1 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:my-2 [&_strong]:text-foreground"
                      dangerouslySetInnerHTML={{ __html: formattedReport }}
                    />
                  </CardContent>
                </Card>
              </Section>
            )}

            {/* Trends Tab */}
            <Section value="trends" viewAll={viewAll} className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Trends & Angles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.trends.length > 0 ? (
                    <div className="space-y-4">
                      {data.trends.map((trend, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${
                          trend.type === 'hot' ? 'border-orange-500/50 bg-orange-500/5' :
                          trend.type === 'cold' ? 'border-blue-500/50 bg-blue-500/5' :
                          'border-primary/50 bg-primary/5'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            {trend.type === 'hot' && <Flame className="h-4 w-4 text-orange-500" />}
                            {trend.type === 'cold' && <AlertCircle className="h-4 w-4 text-blue-500" />}
                            {trend.type === 'interesting' && <TrendingUp className="h-4 w-4 text-primary" />}
                            <span className="font-semibold">{trend.title}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{trend.description}</p>
                          {trend.relevantPicks.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {trend.relevantPicks.map((pick, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{pick}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      No significant trends detected today.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* How It Works */}
              <Card>
                <CardHeader>
                  <CardTitle>How Daily Bets Analysis Works</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <div className="text-4xl font-bold text-primary">1</div>
                      <h3 className="font-semibold">Aggregate</h3>
                      <p className="text-sm text-muted-foreground">
                        Collect picks from top sources: BetFirm, Dimers, Covers, SportsLine.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-4xl font-bold text-primary">2</div>
                      <h3 className="font-semibold">Score</h3>
                      <p className="text-sm text-muted-foreground">
                        Calculate confidence: 40% implied probability, 40% expert rate, 20% stats.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-4xl font-bold text-primary">3</div>
                      <h3 className="font-semibold">Analyze</h3>
                      <p className="text-sm text-muted-foreground">
                        Find frequency patterns, trends, and sport-specific angles.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-4xl font-bold text-primary">4</div>
                      <h3 className="font-semibold">Present</h3>
                      <p className="text-sm text-muted-foreground">
                        Generate parlays, feature picks, and actionable recommendations.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Section>
          </Tabs>
        </div>
      )}
    </div>
  );
}
