'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DailyBetsOutput } from '@/lib/daily-bets/daily-bets-builder';

export function useDailyBets(initialData?: DailyBetsOutput | null) {
  const [data, setData] = useState<DailyBetsOutput | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchDailyBets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/daily-bets', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch daily bets');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyBets();
  }, [fetchDailyBets]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchDailyBets,
  };
}
