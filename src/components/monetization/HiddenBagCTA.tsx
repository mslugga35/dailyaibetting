'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Users, Award, Clock } from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/lib/context/subscription-context';
import { useOffer } from '@/lib/hooks/use-offer';

export function HiddenBagCTA() {
  const { isPro, loading } = useSubscription();
  const { copy } = useOffer();
  // Members don't see the pitch; neither does anyone whose plan is still loading or
  // could not be verified (they may be paying).
  if (isPro || loading) return null;

  return (
    <Card className="mt-8 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-200/20">
      <CardContent className="p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm mb-4">
            <Crown className="h-4 w-4" />
            DailyAI Pro
          </div>
          <h3 className="text-2xl font-bold mb-2">Unlock DailyAI Pro</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get individual capper pick detail, every consensus pick, and graded results for the latest fire picks.
            Join serious bettors who demand more than just consensus.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center">
            <div className="h-12 w-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-emerald-400" />
            </div>
            <h4 className="font-semibold mb-1">Every Tracked Capper</h4>
            <p className="text-sm text-muted-foreground">
              Individual picks from top cappers, not just consensus
            </p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Award className="h-6 w-6 text-blue-400" />
            </div>
            <h4 className="font-semibold mb-1">Capper Pick Detail</h4>
            <p className="text-sm text-muted-foreground">
              See the individual picks behind each capper&apos;s record
            </p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6 text-purple-400" />
            </div>
            <h4 className="font-semibold mb-1">Recent Pick History</h4>
            <p className="text-sm text-muted-foreground">
              Graded results for the latest 50 fire picks
            </p>
          </div>
        </div>

        <div className="text-center">
          <Button size="lg" className="bg-emerald-700 hover:bg-emerald-800 text-white mb-3" asChild>
            <Link href="/pro">
              <Crown className="h-5 w-5 mr-2" />
              {copy.ctaNew}
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            {copy.terms}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
