'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ConsensusAPIResponse, ConsensusPick, NormalizedPick } from '@/types';

interface UseConsensusOptions {
  sport?: string;
  minCappers?: number;
  refreshInterval?: number;
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
}

export function useConsensus(options: UseConsensusOptions = {}): UseConsensusResult {
  const { sport, minCappers = 2, refreshInterval = 300000 } = options;

  const [data, setData] = useState<ConsensusAPIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  // Track current fetch to prevent race conditions
  const fetchIdRef = useRef(0);

  const fetchConsensus = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;

    // Always set loading at the start if we're mounted
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const params = new URLSearchParams();
      if (sport) params.set('sport', sport);
      if (minCappers) params.set('minCappers', minCappers.toString());

      const url = `/api/consensus?${params.toString()}`;

      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          cache: 'no-store',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // If this is a stale request, don't update state but still ensure loading ends
        if (!isMountedRef.current) {
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch consensus: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();

        // Validate that we got a proper response
        if (!json || typeof json !== 'object') {
          throw new Error('Invalid response format from API');
        }

        // Check for error response from API
        if (json.success === false) {
          throw new Error(json.error || 'API returned an error');
        }

        // Only update data if this is still the latest fetch
        if (isMountedRef.current && currentFetchId === fetchIdRef.current) {
          setData(json);
          setError(null);
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }
    } catch (err) {
      // Handle abort specially
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('[useConsensus] Request timed out');
        if (isMountedRef.current) {
          setError(new Error('Request timed out. Please try again.'));
        }
      } else {
        console.error('[useConsensus] Fetch error:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error('Unknown error fetching consensus'));
        }
      }
    } finally {
      // ALWAYS set loading to false when done, regardless of fetch ID
      // This ensures we never get stuck in loading state
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [sport, minCappers]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchConsensus();

    // Set up polling interval (default 5 minutes)
    let interval: NodeJS.Timeout | null = null;
    if (refreshInterval > 0) {
      interval = setInterval(fetchConsensus, refreshInterval);
    }

    return () => {
      isMountedRef.current = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [fetchConsensus, refreshInterval]);

  return {
    data,
    consensus: data?.consensus || [],
    topOverall: data?.topOverall || [],
    bySport: data?.bySport || {},
    fadeThePublic: data?.fadeThePublic || [],
    picksByCapper: data?.picksByCapper || {},
    allPicks: data?.allPicks || [],
    normalizedCount: (data as { normalizedCount?: number })?.normalizedCount || 0,
    capperCount: (data as { capperCount?: number })?.capperCount || Object.keys(data?.picksByCapper || {}).length,
    isLoading,
    error,
    refetch: fetchConsensus,
  };
}
