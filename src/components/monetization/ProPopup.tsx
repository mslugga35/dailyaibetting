'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Crown, Users, Award, Clock } from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/lib/hooks/use-subscription';
import { TRIAL_DAYS, PRO_PRICE_DISPLAY } from '@/lib/constants/subscription';

export function ProPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const hasTriggeredRef = useRef(false);
  const { isPro, loading } = useSubscription();

  useEffect(() => {
    if (loading || isPro) return;
    const path = window.location.pathname;
    if (path.startsWith('/login') || path.startsWith('/auth') || path.startsWith('/pro') || path.startsWith('/pricing')) return;

    // Check if user has already seen the popup in the last 24h
    const lastShown = localStorage.getItem('dailyai-pro-popup-shown');
    const now = Date.now();

    if (lastShown && now - parseInt(lastShown) < 24 * 60 * 60 * 1000) {
      return;
    }

    let scrollTriggered = false;
    let exitTriggered = false;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !exitTriggered && !hasTriggeredRef.current) {
        exitTriggered = true;
        hasTriggeredRef.current = true;
        setIsVisible(true);
      }
    };

    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent > 70 && !scrollTriggered && !hasTriggeredRef.current) {
        scrollTriggered = true;
        hasTriggeredRef.current = true;
        setIsVisible(true);
      }
    };

    const timeout = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
      window.addEventListener('scroll', handleScroll);
    }, 30000);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isPro, loading]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('dailyai-pro-popup-shown', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-background border-emerald-200/20 shadow-2xl relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close popup"
        >
          <X className="h-5 w-5" />
        </button>

        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm mb-4">
              <Crown className="h-4 w-4" />
              Limited Time Offer
            </div>
            <h3 className="text-2xl font-bold mb-2">Wait! Don&apos;t Miss Out</h3>
            <p className="text-lg font-semibold text-emerald-400 mb-2">
              Try DailyAI Pro free for {TRIAL_DAYS} days
            </p>
            <p className="text-muted-foreground text-sm">
              Then just {PRO_PRICE_DISPLAY}. Cancel anytime.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              <span className="text-sm">200+ individual capper picks daily</span>
            </div>
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-blue-400 flex-shrink-0" />
              <span className="text-sm">Full win rates, ROI & streak data</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-purple-400 flex-shrink-0" />
              <span className="text-sm">Real-time picks — no 5-min delay</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleClose}
              asChild
            >
              <Link href="/pro">
                <Crown className="h-5 w-5 mr-2" />
                Start Free {TRIAL_DAYS}-Day Trial
              </Link>
            </Button>

            <button
              onClick={handleClose}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              No thanks, I&apos;ll stick with free picks
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Join serious bettors using DailyAI Pro
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
