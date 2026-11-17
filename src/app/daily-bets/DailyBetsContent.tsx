'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import Link from 'next/link';
import { EntitlementUnknownNotice } from '@/components/subscription/EntitlementUnknownNotice';
import { useOffer } from '@/lib/hooks/use-offer';

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
  const { copy: priceCopy } = useOffer();
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

  const formatForDiscord = () => {
    if (!data) return '';
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    let text = `🎯 **DAILY BEST BETS — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${time})**\n\n`;

    if (data.topPicks.length > 0) {
      text += `🏆 **TOP 5 BY CAPPER AGREEMENT**\n`;
      data.topPicks.forEach((pick, i) => {
        const fire = getFireEmoji(pick.capperCount);
        text += `${i + 1}. **${pick.sport}** | ${pick.matchup} | ${pick.bet} (${pick.capperCount} cappers agree) ${fire}\n`;
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
    if (!data || data.topPicks.length === 0) return;
    const topPick = data.topPicks[0];
    const fire = getFireEmoji(topPick.capperCount);
    const text = `Today's Top Consensus Pick:\n\n${fire} ${topPick.sport} | ${topPick.bet}\n${topPick.capperCount} cappers agree\n\nMore free picks at https://dailyaibetting.com/daily-bets`;
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
                  {data.firePickCount}
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
                  {data.topPicks[0]?.capperCount ?? 0}
                </div>
                <div className="text-sm text-muted-foreground">Most Cappers on One Pick</div>
              </CardContent>
            </Card>
          </div>

          {/* Free view: the server sent only the free picks (see /api/daily-bets). */}
          {(data as { entitlement?: string }).entitlement === 'unknown' ? (
            <EntitlementUnknownNotice />
          ) : (data as { isLimited?: boolean }).isLimited ? (
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm">
                <span className="font-semibold">Free view:</span> today&apos;s top {(data as { freeTierLimit?: number }).freeTierLimit ?? 5} consensus picks.
                Pro unlocks every pick, parlays built from the full slate, player props and MLB analysis.
              </p>
              <Link href="/pricing" className="shrink-0 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                {priceCopy.ctaReturning}
              </Link>
            </div>
          ) : null}

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
                {data.botPicks?.length > 0 && <TabsTrigger value="bot">Bot Picks</TabsTrigger>}
                <TabsTrigger value="trends">Trends</TabsTrigger>
              </TabsList>
            )}

            {/* Overview Tab */}
            <Section value="overview" viewAll={viewAll} className="space-y-6 mt-6">
              {/* Top 5 by Capper Agreement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Top 5 Picks by Capper Agreement
                  </CardTitle>
                  <CardDescription>
                    Ranked by how many cappers made the same pick today
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.topPicks.length > 0 ? (
                    <div className="space-y-4">
                      {data.topPicks.map((pick, index) => (
                        <div key={pick.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
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
                              {pick.capperCount >= 3 && (
                                <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                              )}
                            </div>
                            <div className="font-semibold">{pick.matchup}</div>
                            <div className="text-primary font-medium text-lg">{pick.bet}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold">{pick.capperCount}</div>
                            <div className="text-xs text-muted-foreground">cappers agree</div>
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
                            {parlay.map((pick) => (
                              <div key={pick.id} className="p-2 rounded bg-muted/50 mb-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">{pick.sport}</Badge>
                                  <span>{getFireEmoji(pick.capperCount)}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">{pick.matchup}</div>
                                <div className="font-semibold text-primary">{pick.bet}</div>
                                <div className="text-xs text-muted-foreground">{pick.capperCount} cappers agree</div>
                              </div>
                            ))}
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
                            {parlay.map((pick) => (
                              <div key={pick.id} className="p-2 rounded bg-muted/50 mb-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">{pick.sport}</Badge>
                                  <span>{getFireEmoji(pick.capperCount)}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">{pick.matchup}</div>
                                <div className="font-semibold text-primary">{pick.bet}</div>
                                <div className="text-xs text-muted-foreground">{pick.capperCount} cappers agree</div>
                              </div>
                            ))}
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
                      Long-Shot Parlays
                    </CardTitle>
                    <CardDescription>
                      4- and 5-leg builds from the picks with the most capper agreement, one leg per game
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {data.bigMoneyParlays.map((parlay, index) => (
                        <div key={index} className="p-4 rounded-lg border bg-gradient-to-br from-green-500/10 to-emerald-500/5">
                          <div className="mb-3">
                            <Badge variant="secondary">{parlay.legs.length}-Leg Parlay</Badge>
                          </div>
                          <div className="space-y-2">
                            {parlay.legs.map((leg, legIndex) => (
                              <div key={leg.id} className="flex items-center gap-2 text-sm">
                                <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                                  {legIndex + 1}
                                </span>
                                <span className="text-muted-foreground">{leg.sport}</span>
                                <span className="font-medium">{leg.bet}</span>
                                <span className="text-xs text-muted-foreground">({leg.capperCount} cappers)</span>
                              </div>
                            ))}
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
                {/* Ladder Pick */}
                <Card className="border-purple-500/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Repeat className="h-5 w-5 text-purple-500" />
                      Ladder Pick
                    </CardTitle>
                    <CardDescription>Today&apos;s moneyline pick with the most capper agreement</CardDescription>
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
                          <div className="text-sm text-muted-foreground mt-2">
                            {data.ladderPick.pick.capperCount} cappers agree
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center py-4 text-muted-foreground">
                        Need a moneyline pick with 3+ cappers for the ladder.
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

            {/* AI Picks Tab — daily AI report (in-season sports only) */}
            {data.aiReport && (
              <Section value="ai-picks" viewAll={viewAll} className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      AI Analysis
                    </CardTitle>
                    <CardDescription>
                      AI-generated picks from expert consensus, market prices and today&apos;s schedule
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

            {/* Bot Picks Tab — AI-generated tracked picks */}
            {data.botPicks?.length > 0 && (
              <Section value="bot" viewAll={viewAll} className="space-y-6 mt-6">
                {/* Bot Record Banner */}
                {data.botRecord && data.botRecord.wins + data.botRecord.losses > 0 && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <Zap className="h-5 w-5 text-primary" />
                          <div>
                            <div className="text-sm font-medium text-muted-foreground">Bot Record</div>
                            <div className="text-2xl font-bold">
                              {data.botRecord.wins}W - {data.botRecord.losses}L
                              {data.botRecord.pushes > 0 && ` - ${data.botRecord.pushes}P`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-primary">{data.botRecord.winPct ?? 0}%</div>
                          <div className="text-xs text-muted-foreground">Win Rate</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Today's Bot Picks */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Bot Picks — Today
                    </CardTitle>
                    <CardDescription>
                      AI-generated picks locked before games start. Graded automatically.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.botPicks.map((pick, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{pick.sport}</Badge>
                              <Badge variant="secondary">{pick.bet_type}</Badge>
                              {pick.result !== 'PENDING' && (
                                <Badge variant={pick.result === 'WIN' ? 'default' : pick.result === 'LOSS' ? 'destructive' : 'secondary'}>
                                  {pick.result}
                                </Badge>
                              )}
                            </div>
                            <div className="font-semibold">
                              {pick.team} {pick.line && <span className="text-primary">{pick.line}</span>}
                            </div>
                            {pick.opponent && (
                              <div className="text-sm text-muted-foreground">vs {pick.opponent}</div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">{pick.reasoning}</div>
                          </div>
                        </div>
                      ))}
                    </div>
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
                        Count how many cappers made the same pick and rank picks by that agreement.
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
                        List parlay builds and featured picks with their capper counts.
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
