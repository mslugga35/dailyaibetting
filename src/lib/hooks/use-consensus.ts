'use client';

import { useState, useEffect, useCallback } from 'react';
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
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useConsensus(options: UseConsensusOptions = {}): UseConsensusResult {
  const { sport, minCappers = 2, refreshInterval = 300000 } = options;

  const [data, setData] = useState<ConsensusAPIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConsensus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (sport) params.set('sport', sport);
      if (minCappers) params.set('minCappers', minCappers.toString());

      const response = await fetch(`/api/consensus?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch consensus: ${response.status}`);
      }

      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [sport, minCappers]);

  useEffect(() => {
    fetchConsensus();

    // Set up polling interval (default 5 minutes)
    if (refreshInterval > 0) {
      const interval = setInterval(fetchConsensus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchConsensus, refreshInterval]);

  return {
    data,
    consensus: data?.consensus || [],
    topOverall: data?.topOverall || [],
    bySport: data?.bySport || {},
    fadeThePublic: data?.fadeThePublic || [],
    picksByCapper: data?.picksByCapper || {},
    allPicks: data?.allPicks || [],
    isLoading,
    error,
    refetch: fetchConsensus,
  };
}
