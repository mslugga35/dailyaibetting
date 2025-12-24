'use client';

import { useState, useEffect, useCallback } from 'react';
import { PicksAPIResponse, NormalizedPick } from '@/types';

interface UsePicksOptions {
  sport?: string;
  capper?: string;
  date?: string;
  limit?: number;
  offset?: number;
  refreshInterval?: number;
}

interface UsePicksResult {
  data: PicksAPIResponse | null;
  picks: NormalizedPick[];
  total: number;
  filters: {
    cappers: string[];
    sports: string[];
  };
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePicks(options: UsePicksOptions = {}): UsePicksResult {
  const {
    sport,
    capper,
    date,
    limit = 100,
    offset = 0,
    refreshInterval = 300000,
  } = options;

  const [data, setData] = useState<PicksAPIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPicks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (sport) params.set('sport', sport);
      if (capper) params.set('capper', capper);
      if (date) params.set('date', date);
      params.set('limit', limit.toString());
      params.set('offset', offset.toString());

      const response = await fetch(`/api/picks?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch picks: ${response.status}`);
      }

      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [sport, capper, date, limit, offset]);

  useEffect(() => {
    fetchPicks();

    // Set up polling interval (default 5 minutes)
    if (refreshInterval > 0) {
      const interval = setInterval(fetchPicks, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPicks, refreshInterval]);

  return {
    data,
    picks: data?.picks || [],
    total: data?.total || 0,
    filters: data?.filters || { cappers: [], sports: [] },
    isLoading,
    error,
    refetch: fetchPicks,
  };
}
