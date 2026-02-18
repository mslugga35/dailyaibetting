'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ConsensusAPIResponse, ConsensusPick, NormalizedPick, YesterdayStats } from '@/types';

interface UseConsensusOptions {
  sport?: string;
  minCappers?: number;
  refreshInterval?: number;
  date?: 'today' | 'yesterday';
}

interface UseConsensusResult {
  data: ConsensusAPIResponse | null;
  consensus: ConsensusPick[];
  topOverall: ConsensusPick[];
  bySport: Record<string, ConsensusPick[]>;
  fadeThePublic: ConsensusPick[];
  picksByCapper: Record<string, NormalizedPick[]>;
  allPicks: NormalizedPick[];
  normalizedCount: number;
  capperCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  yesterdayStats: YesterdayStats | null;
}

export function useConsensus(options: UseConsensusOptions = {}): UseConsensusResult {
  const { sport, minCappers = 2, refreshInterval = 300000, date = 'today' } = options;

  const [data, setData] = useState<ConsensusAPIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef(true);
  const fetchIdRef = useRef(0);

  const fetchConsensus = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;

    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const params = new URLSearchParams();
      if (sport) params.set('sport', sport);
      if (minCappers) params.set('minCappers', minCappers.toString());
      if (date === 'yesterday') params.set('date', 'yesterday');

      const url = `/api/consensus?${params.toString()}&t=${Date.now()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!isMountedRef.current) return;

        if (!response.ok) {
          throw new Error(`Failed to fetch consensus: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();

        if (!json || typeof json !== 'object') {
          throw new Error('Invalid response format from API');
        }

        if (json.success === false) {
          throw new Error(json.error || 'API returned an error');
        }

        if (isMountedRef.current && currentFetchId === fetchIdRef.current) {
          setData(json);
          setError(null);
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        if (isMountedRef.current) {
          setError(new Error('Request timed out. Please try again.'));
        }
      } else {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error('Unknown error fetching consensus'));
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [sport, minCappers, date]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchConsensus();

    // Only poll for today's data (yesterday is static)
    let interval: NodeJS.Timeout | null = null;
    if (refreshInterval > 0 && date === 'today') {
      interval = setInterval(fetchConsensus, refreshInterval);
    }

    return () => {
      isMountedRef.current = false;
      if (interval) clearInterval(interval);
    };
  }, [fetchConsensus, refreshInterval, date]);

  return {
    data,
    consensus: data?.consensus || [],
    topOverall: data?.topOverall || [],
    bySport: data?.bySport || {},
    fadeThePublic: data?.fadeThePublic || [],
    picksByCapper: data?.picksByCapper || {},
    allPicks: data?.allPicks || [],
    normalizedCount: data?.normalizedCount || 0,
    capperCount: data?.capperCount || Object.keys(data?.picksByCapper || {}).length,
    isLoading,
    error,
    refetch: fetchConsensus,
    yesterdayStats: data?.stats || null,
  };
}
