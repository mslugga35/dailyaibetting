'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ProSuccessPage() {
  return (
    <div className="container px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mx-auto mb-4">
            <Crown className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Pro!</h1>
          <p className="text-muted-foreground mb-6">
            You now have full access to all premium features. Your 7-day free trial has started.
          </p>
          <div className="space-y-3">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
              <Link href="/consensus">
                View All Consensus Picks
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/cappers">
                Browse Capper Stats
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
