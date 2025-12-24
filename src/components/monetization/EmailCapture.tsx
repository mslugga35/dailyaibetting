'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { X, Zap, Bell, Gift } from 'lucide-react';

// Simple popup that appears after 10 seconds or on scroll
export function EmailCapturePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem('emailPopupDismissed');
    const subscribed = localStorage.getItem('emailSubscribed');

    if (dismissed || subscribed) return;

    // Show after 10 seconds
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 10000);

    // Or show on scroll past 50%
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent > 50) {
        setIsOpen(true);
        window.removeEventListener('scroll', handleScroll);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('emailPopupDismissed', Date.now().toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // TODO: Replace with actual email service (ConvertKit, Beehiiv, etc.)
    // For now, just log and show success
    console.log('Email submitted:', email);

    localStorage.setItem('emailSubscribed', 'true');
    setSubmitted(true);

    // Close after 3 seconds
    setTimeout(() => setIsOpen(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="relative w-full max-w-md animate-in fade-in zoom-in duration-300">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>

        <CardContent className="pt-8 pb-6">
          {submitted ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
                <Gift className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">You&apos;re In!</h3>
              <p className="text-muted-foreground">
                Check your inbox for today&apos;s top picks.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/20 mb-4">
                  <Bell className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  Get Today&apos;s Best Bets Free
                </h3>
                <p className="text-muted-foreground">
                  Join 1,000+ bettors who get our top consensus picks delivered daily.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  required
                />
                <Button type="submit" className="w-full h-12 gap-2">
                  <Zap className="h-5 w-5" />
                  Get Free Picks
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground mt-4">
                No spam, ever. Unsubscribe anytime.
              </p>

              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  1,000+ subscribers
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Daily picks
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Inline banner version for embedding in pages
export function EmailCaptureBanner() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    console.log('Email submitted:', email);
    localStorage.setItem('emailSubscribed', 'true');
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card className="bg-primary/10 border-primary/30">
        <CardContent className="py-4 text-center">
          <p className="font-medium text-primary">You&apos;re subscribed! Check your inbox.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-primary/10 border-primary/30">
      <CardContent className="py-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-bold text-lg mb-1">Get Free Daily Picks</h3>
            <p className="text-sm text-muted-foreground">
              Top consensus picks delivered to your inbox every morning.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 w-full md:w-auto">
            <Input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full md:w-64"
              required
            />
            <Button type="submit">Subscribe</Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
