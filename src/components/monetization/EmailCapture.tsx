'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

/** Inline email capture banner for embedding in pages */
export function EmailCaptureBanner() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Email capture demo - stores in localStorage only
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
