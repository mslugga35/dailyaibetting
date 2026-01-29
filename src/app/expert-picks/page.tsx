'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, RefreshCw, Loader2, Flame, Users, Star } from 'lucide-react';
import { useConsensus } from '@/lib/hooks/use-consensus';
import { EmailCaptureBanner } from '@/components/monetization/EmailCapture';
import Link from 'next/link';

export default function ExpertPicksPage() {
  const { topOverall, isLoading, error, refetch, data } = useConsensus();

  // Expert picks = highest capper agreement
  const expertPicks = topOverall.filter(p => p.capperCount >= 2).sort((a, b) => b.capperCount - a.capperCount);
  const premiumPicks = expertPicks.filter(p => p.capperCount >= 4);
  const firePicks = expertPicks.filter(p => p.capperCount >= 3);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const getFireEmoji = (count: number) => {
    if (count >= 10) return '🔥🔥🔥';
    if (count >= 5) return '🔥🔥';
    if (count >= 3) return '🔥';
    return '';
  };

  const getConfidenceLabel = (count: number) => {
    if (count >= 5) return { label: 'Very High', color: 'bg-green-500' };
    if (count >= 4) return { label: 'High', color: 'bg-emerald-500' };
    if (count >= 3) return { label: 'Strong', color: 'bg-yellow-500' };
    return { label: 'Moderate', color: 'bg-blue-500' };
  };

  const sportColors: Record<string, string> = {
    NFL: 'bg-green-500/10 text-green-500 border-green-500/30',
    NBA: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    MLB: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    NHL: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
    NCAAF: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    NCAAB: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
  };

  return (
    <div className="container px-4 py-8">
      {/* SEO Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Award className="h-5 w-5" />
              <span className="text-sm font-medium">Expert Analysis</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Expert Sports Picks Today
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {today} &middot; Curated picks from professional handicappers with proven track records.
              Ranked by expert consensus agreement.
            </p>
          </div>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary">{expertPicks.length}</div>
            <div className="text-sm text-muted-foreground">Expert Consensus</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold text-yellow-500">{premiumPicks.length}</div>
            <div className="text-sm text-muted-foreground">Premium (4+)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-orange-500">{firePicks.length}</div>
            <div className="text-sm text-muted-foreground">Fire Picks (3+)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold">{data?.capperCount || 0}</div>
            <div className="text-sm text-muted-foreground">Experts Tracked</div>
          </CardContent>
        </Card>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading expert picks...</span>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Unable to load picks. Please try refreshing.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      )}

      {/* Premium Picks (4+) */}
      {!isLoading && !error && premiumPicks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Premium Expert Picks (4+ Agree)
          </h2>
          <div className="space-y-3">
            {premiumPicks.map((pick, index) => {
              const confidence = getConfidenceLabel(pick.capperCount);
              return (
                <Card key={index} className="border-yellow-500/50 bg-yellow-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={sportColors[pick.sport] || ''}>{pick.sport}</Badge>
                          <Badge className={`${confidence.color} text-white text-xs`}>{confidence.label}</Badge>
                          <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                        </div>
                        <div className="font-medium">{pick.matchup}</div>
                        <div className="text-lg font-bold text-primary">{pick.bet}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{pick.capperCount}</div>
                        <div className="text-xs text-muted-foreground">experts agree</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Fire Picks (3) */}
      {!isLoading && !error && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Fire Expert Picks (3 Agree)
          </h2>
          {firePicks.filter(p => p.capperCount === 3).length > 0 ? (
            <div className="space-y-3">
              {firePicks
                .filter(p => p.capperCount === 3)
                .map((pick, index) => {
                  const confidence = getConfidenceLabel(pick.capperCount);
                  return (
                    <Card key={index} className="border-orange-500/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={sportColors[pick.sport] || ''}>{pick.sport}</Badge>
                              <Badge className={`${confidence.color} text-white text-xs`}>{confidence.label}</Badge>
                              <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                            </div>
                            <div className="font-medium">{pick.matchup}</div>
                            <div className="text-lg font-bold text-primary">{pick.bet}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{pick.capperCount}</div>
                            <div className="text-xs text-muted-foreground">experts agree</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No 3-expert consensus picks available right now.</p>
            </Card>
          )}
        </div>
      )}

      {/* 2 Expert Agreement */}
      {!isLoading && !error && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Standard Expert Picks (2 Agree)</h2>
          {expertPicks.filter(p => p.capperCount === 2).length > 0 ? (
            <div className="space-y-3">
              {expertPicks
                .filter(p => p.capperCount === 2)
                .slice(0, 10)
                .map((pick, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={sportColors[pick.sport] || ''}>{pick.sport}</Badge>
                          </div>
                          <div className="font-medium">{pick.matchup}</div>
                          <div className="text-lg font-bold text-primary">{pick.bet}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{pick.capperCount}</div>
                          <div className="text-xs text-muted-foreground">experts agree</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No expert picks available yet today.</p>
              <p className="text-sm text-muted-foreground mt-2">Check back closer to game time!</p>
            </Card>
          )}
        </div>
      )}

      {/* Email Capture */}
      <div className="mb-8">
        <EmailCaptureBanner />
      </div>

      {/* SEO Content */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>About Our Expert Picks</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            Our expert picks are curated from <strong>professional handicappers</strong> with
            documented winning records. We track picks from services like BetFirm, Dimers,
            Covers, and SportsLine to find consensus plays.
          </p>
          <h4>Confidence Ratings:</h4>
          <ul>
            <li><strong>Premium (4+ experts)</strong> &ndash; Highest confidence, rare opportunities</li>
            <li><strong>Fire (3 experts)</strong> &ndash; Strong consensus, reliable plays</li>
            <li><strong>Standard (2 experts)</strong> &ndash; Moderate agreement, good value</li>
          </ul>
          <p>
            Expert consensus reduces variance by combining multiple professional opinions.
            When the best in the business agree, it&apos;s worth paying attention.
          </p>
        </CardContent>
      </Card>

      {/* Cross-links */}
      <Card>
        <CardHeader>
          <CardTitle>More Picks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/free-sports-picks">Free Picks</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/parlay-picks">Parlay Picks</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/best-bets">Best Bets</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/consensus">Full Consensus</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/daily-bets">Daily Bets</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
