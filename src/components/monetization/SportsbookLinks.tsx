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
    color: 'bg-blue-900 hover:bg-blue-800',
  },
  {
    name: 'FanDuel',
    affiliateUrl: 'https://fanduel.com',
    color: 'bg-orange-600 hover:bg-orange-500',
  },
  {
    name: 'BetMGM',
    affiliateUrl: 'https://betmgm.com',
    color: 'bg-amber-700 hover:bg-amber-600',
  },
  {
    name: 'Caesars',
    affiliateUrl: 'https://caesars.com/sports-betting',
    color: 'bg-red-700 hover:bg-red-600',
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
            className={`p-4 rounded-lg text-white font-semibold flex items-center justify-between ${book.color} transition-colors`}
          >
            <span>{book.name}</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        ))}
      </div>
    );
  }

  // compact variant (default)
  return (
    <div className={`flex gap-2 ${className}`}>
      {SPORTSBOOKS.map((book) => (
        <a
          key={book.name}
          href={book.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-white ${book.color} transition-colors`}
        >
          {book.name}
          <ExternalLink className="h-3 w-3" />
        </a>
      ))}
    </div>
  );
}

export { SPORTSBOOKS };
