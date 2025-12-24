'use client';

import { Button } from '@/components/ui/button';
import { Twitter, Facebook, Link2, Check } from 'lucide-react';
import { useState } from 'react';

interface ShareButtonsProps {
  title: string;
  url?: string;
  pick?: string;
}

export function ShareButtons({ title, url, pick }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://dailyaibetting.com');
  const shareText = pick
    ? `${pick} - ${title} | Free picks at DailyAI Betting`
    : `${title} | Free AI Sports Picks`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground mr-1">Share:</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => window.open(twitterUrl, '_blank', 'width=550,height=435')}
        title="Share on X/Twitter"
      >
        <Twitter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => window.open(facebookUrl, '_blank', 'width=550,height=435')}
        title="Share on Facebook"
      >
        <Facebook className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={copyToClipboard}
        title="Copy link"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
      </Button>
    </div>
  );
}

// Compact version for pick cards
export function SharePickButton({ pick, game }: { pick: string; game: string }) {
  const [copied, setCopied] = useState(false);

  const shareText = `🔥 ${pick} - ${game}\n\nFree AI consensus picks at https://dailyaibetting.com`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => window.open(twitterUrl, '_blank', 'width=550,height=435')}
      >
        <Twitter className="h-3 w-3 mr-1" />
        Tweet
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={copyToClipboard}
      >
        {copied ? <Check className="h-3 w-3 mr-1 text-green-500" /> : <Link2 className="h-3 w-3 mr-1" />}
        {copied ? 'Copied!' : 'Copy'}
      </Button>
    </div>
  );
}
