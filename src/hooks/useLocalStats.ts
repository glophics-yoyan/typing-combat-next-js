'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LocalStats } from '@/types';
import { getLocalStats, recordMatch, updateSettings, resetSessionStats } from '@/lib/storage';

export function useLocalStats() {
  const [stats, setStats] = useState<LocalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getLocalStats();
        setStats(data);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addMatch = useCallback(
    async (match_id: string, won: boolean, wpm: number, accuracy: number, duration_ms: number, opponent_name: string) => {
      const newStats = await recordMatch(match_id, won, wpm, accuracy, duration_ms, opponent_name);
      setStats(newStats);
      return newStats;
    },
    []
  );

  const updateUserSettings = useCallback(
    async (settings: Partial<LocalStats['settings']>) => {
      const newStats = await updateSettings(settings);
      setStats(newStats);
      return newStats;
    },
    []
  );

  const resetSession = useCallback(async () => {
    const newStats = await resetSessionStats();
    setStats(newStats);
    return newStats;
  }, []);

  const refresh = useCallback(async () => {
    const data = await getLocalStats();
    setStats(data);
  }, []);

  return {
    stats,
    loading,
    addMatch,
    updateSettings: updateUserSettings,
    resetSession,
    refresh,
  };
}
