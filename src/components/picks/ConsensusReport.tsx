'use client';

import { useState } from 'react';
import { ConsensusPick } from '@/types';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

interface ConsensusReportProps {
  topOverall: ConsensusPick[];
  bySport: Record<string, ConsensusPick[]>;
  timestamp?: string;
}

/**
 * Get fire emoji based on capper count
 * Based on consensusinstructions.txt:
 * - 10+ cappers = 🔥🔥🔥
 * - 3+ cappers = 🔥
 * - <3 cappers = no fire
 */
function getFireEmoji(capperCount: number): string {
  if (capperCount >= 10) return ' 🔥🔥🔥';
  if (capperCount >= 3) return ' 🔥';
  return '';
}

/**
 * Format a consensus pick for display
 */
function formatPick(pick: ConsensusPick): string {
  const fire = getFireEmoji(pick.capperCount);
  return `${pick.bet} – ${pick.capperCount} cappers${fire}`;
}

/**
 * Format date for header
 */
function formatDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  };
  const formatted = now.toLocaleString('en-US', options);
  return formatted.replace(',', '');
}

// Sports display order (by season relevance)
const SPORT_ORDER = ['NCAAF', 'NCAAB', 'NFL', 'NBA', 'NHL', 'MLB', 'WNBA', 'SOCCER', 'TENNIS', 'MMA', 'GOLF', 'BOXING'];

export function ConsensusReport({ topOverall, bySport, timestamp }: ConsensusReportProps) {
  const [copied, setCopied] = useState(false);
  const displayTime = timestamp || formatDate();

  // Sort sports by predefined order
  const sortedSports = Object.keys(bySport)
    .filter(sport => bySport[sport]?.length > 0)
    .sort((a, b) => {
      const aIndex = SPORT_ORDER.indexOf(a);
      const bIndex = SPORT_ORDER.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

  // Generate Discord-ready text
  const discordText = generateConsensusText(topOverall, bySport);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(discordText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="font-mono text-sm space-y-4">
      {/* Header with Copy Button */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-lg font-bold">
          🎯 CONSENSUS REPORT — {displayTime}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-2"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy for Discord'}
        </Button>
      </div>

      {/* TOP 5 OVERALL */}
      {topOverall.length > 0 && (
        <section>
          <h3 className="font-bold text-primary mb-2">TOP 5 OVERALL CONSENSUS</h3>
          <div className="space-y-1">
            {topOverall.slice(0, 5).map((pick, i) => (
              <div key={pick.id || i}>
                <span className={pick.capperCount >= 3 ? 'text-primary font-medium' : ''}>
                  {formatPick(pick)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* BY SPORT - Top 3 per sport, skip empty */}
      {sortedSports.map((sport) => {
        const picks = bySport[sport] || [];

        return (
          <section key={sport}>
            <h3 className="font-bold text-accent mb-2">{sport}</h3>
            <div className="space-y-1">
              {picks.slice(0, 3).map((pick, i) => (
                <div key={pick.id || i}>
                  <span className={pick.capperCount >= 3 ? 'text-primary font-medium' : 'text-muted-foreground'}>
                    {formatPick(pick)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Empty State */}
      {topOverall.length === 0 && sortedSports.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No consensus picks available yet. Check back soon!
        </div>
      )}
    </div>
  );
}

/**
 * Plain text version for Discord (no blank sections)
 */
export function generateConsensusText(
  topOverall: ConsensusPick[],
  bySport: Record<string, ConsensusPick[]>
): string {
  const lines: string[] = [];

  // Header
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York'
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  });

  lines.push(`🎯 CONSENSUS REPORT — ${dateStr} (${timeStr})`);

  // TOP 5 OVERALL (skip if empty)
  if (topOverall.length > 0) {
    lines.push('');
    lines.push('TOP 5 OVERALL CONSENSUS');
    lines.push('');
    topOverall.slice(0, 5).forEach(pick => {
      lines.push(formatPick(pick));
    });
  }

  // By Sport (TOP 3 per sport, skip empty)
  const sortedSports = Object.keys(bySport)
    .filter(sport => bySport[sport]?.length > 0)
    .sort((a, b) => {
      const order = ['NCAAF', 'NCAAB', 'NFL', 'NBA', 'NHL', 'MLB', 'WNBA', 'SOCCER', 'TENNIS', 'MMA', 'GOLF', 'BOXING'];
      const aIdx = order.indexOf(a);
      const bIdx = order.indexOf(b);
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

  sortedSports.forEach(sport => {
    const picks = bySport[sport];
    if (picks && picks.length > 0) {
      lines.push('');
      lines.push(sport);
      lines.push('');
      picks.slice(0, 3).forEach(pick => {
        lines.push(formatPick(pick));
      });
    }
  });

  return lines.join('\n');
}
