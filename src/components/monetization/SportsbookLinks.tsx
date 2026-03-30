'use client';

import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Sportsbook {
  name: string;
  affiliateUrl: string;
  color: string;
  logo?: string;
}

const SPORTSBOOKS: Sportsbook[] = [
  {
    name: 'DraftKings',
    affiliateUrl: 'https://draftkings.com',
    color: 'bg-white/5 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/40',
  },
  {
    name: 'FanDuel',
    affiliateUrl: 'https://fanduel.com',
    color: 'bg-white/5 border-orange-500/20 hover:bg-orange-500/10 hover:border-orange-500/40',
  },
  {
    name: 'BetMGM',
    affiliateUrl: 'https://betmgm.com',
    color: 'bg-white/5 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/40',
  },
  {
    name: 'Caesars',
    affiliateUrl: 'https://caesars.com/sports-betting',
    color: 'bg-white/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40',
  },
];

interface SportsbookLinksProps {
  variant?: 'compact' | 'full' | 'inline';
  className?: string;
}

export function SportsbookLinks({ variant = 'compact', className = '' }: SportsbookLinksProps) {
  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {SPORTSBOOKS.map((book) => (
          <a
            key={book.name}
            href={book.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-muted hover:bg-muted/80 transition-colors"
          >
            <span className="font-medium">{book.name}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${className}`}>
        {SPORTSBOOKS.map((book) => (
          <a
            key={book.name}
            href={book.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-4 rounded-lg border text-white/90 font-semibold flex items-center justify-between transition-all duration-200 ${book.color}`}
          >
            <span>{book.name}</span>
            <ExternalLink className="h-4 w-4 opacity-50" />
          </a>
        ))}
      </div>
    );
  }

  // compact variant (default)
  return (
    <div className={`flex flex-wrap gap-2 justify-center ${className}`}>
      {SPORTSBOOKS.map((book) => (
        <a
          key={book.name}
          href={book.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium text-white/80 transition-all duration-200 ${book.color}`}
        >
          {book.name}
          <ExternalLink className="h-3 w-3 opacity-50" />
        </a>
      ))}
    </div>
  );
}

export { SPORTSBOOKS };
