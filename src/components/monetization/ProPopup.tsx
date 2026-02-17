'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Crown, Users, Award, Clock } from 'lucide-react';
import Link from 'next/link';

export function ProPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    // Check if user has already seen the popup in the last 24h
    const lastShown = localStorage.getItem('hb-pro-popup-shown');
    const now = Date.now();
    
    if (lastShown && now - parseInt(lastShown) < 24 * 60 * 60 * 1000) {
      return; // Don't show if shown in last 24h
    }

    // Check if email popup has already been shown (avoid double popups)
    if (localStorage.getItem('email-popup-shown')) {
      return;
    }

    let scrollTriggered = false;
    let exitTriggered = false;

    // Exit intent handler
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !exitTriggered && !hasTriggered) {
        exitTriggered = true;
        setHasTriggered(true);
        setIsVisible(true);
      }
    };

    // Scroll trigger (70% of page)
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      
      if (scrollPercent > 70 && !scrollTriggered && !hasTriggered) {
        scrollTriggered = true;
        setHasTriggered(true);
        setIsVisible(true);
      }
    };

    // Add event listeners with a delay to avoid immediate triggers
    const timeout = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
      window.addEventListener('scroll', handleScroll);
    }, 5000); // 5 second delay before enabling triggers

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasTriggered]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('hb-pro-popup-shown', Date.now().toString());
  };

  const handleUpgrade = () => {
    localStorage.setItem('hb-pro-popup-shown', Date.now().toString());
    // Link will handle navigation
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-background border-emerald-200/20 shadow-2xl">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close popup"
          >
            <X className="h-5 w-5" />
          </button>
          
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm mb-4">
                <Crown className="h-4 w-4" />
                Limited Time Offer
              </div>
              <h3 className="text-2xl font-bold mb-2">Wait! Don&apos;t Miss Out</h3>
              <p className="text-lg font-semibold text-emerald-400 mb-2">
                Get 7 days of HiddenBag Pro for just $1
              </p>
              <p className="text-muted-foreground text-sm">
                See what you&apos;re missing with premium capper picks and grades
              </p>
            </div>

            {/* Features */}
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
                <span className="text-sm">Early access before lines move</span>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-3">
              <Button 
                size="lg" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleUpgrade}
                asChild
              >
                <Link href="https://thehiddenbag.com" target="_blank" rel="noopener noreferrer">
                  <Crown className="h-5 w-5 mr-2" />
                  Start $1 Trial Now
                </Link>
              </Button>
              
              <button 
                onClick={handleClose}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                No thanks, I&apos;ll stick with free picks
              </button>
            </div>

            {/* Trust signal */}
            <p className="text-xs text-muted-foreground text-center mt-4">
              Join 1,000+ serious bettors already using HiddenBag Pro
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}