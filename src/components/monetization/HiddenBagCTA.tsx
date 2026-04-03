import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Users, Award, Clock } from 'lucide-react';
import Link from 'next/link';
import { TRIAL_DAYS, PRO_PRICE_DISPLAY } from '@/lib/constants/subscription';

export function HiddenBagCTA() {
  return (
    <Card className="mt-8 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-200/20">
      <CardContent className="p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm mb-4">
            <Crown className="h-4 w-4" />
            Premium Upgrade
          </div>
          <h3 className="text-2xl font-bold mb-2">Unlock Premium Picks</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get access to individual capper grades, win rates, and 200+ premium picks.
            Join serious bettors who demand more than just consensus.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center">
            <div className="h-12 w-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-emerald-400" />
            </div>
            <h4 className="font-semibold mb-1">200+ Cappers</h4>
            <p className="text-sm text-muted-foreground">
              Individual picks from top cappers, not just consensus
            </p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Award className="h-6 w-6 text-blue-400" />
            </div>
            <h4 className="font-semibold mb-1">Win Rate Grades</h4>
            <p className="text-sm text-muted-foreground">
              See each capper&apos;s performance, ROI, and streak data
            </p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6 text-purple-400" />
            </div>
            <h4 className="font-semibold mb-1">Real-Time Access</h4>
            <p className="text-sm text-muted-foreground">
              Get picks instantly, before lines move
            </p>
          </div>
        </div>

        <div className="text-center">
          <Button size="lg" className="bg-emerald-700 hover:bg-emerald-800 text-white mb-3" asChild>
            <Link href="/pro">
              <Crown className="h-5 w-5 mr-2" />
              Try Pro Free for {TRIAL_DAYS} Days
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            {PRO_PRICE_DISPLAY} after trial. Cancel anytime.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
