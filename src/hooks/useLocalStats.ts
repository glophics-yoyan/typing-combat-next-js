'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LocalStats } from '@/types';
import { getLocalStats, saveLocalStats, recordMatch, updateSettings, resetSessionStats } from '@/lib/storage';

export function useLocalStats() {
  const [stats, setStats] = useState<LocalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getLocalStats();
      setStats(data);
      setLoading(false);
    };
    load();
  }, []);

  const addMatch = useCallback(
    async (won: boolean, wpm: number, accuracy: number, durationMs: number, opponentName: string) => {
      const newStats = await recordMatch(won, wpm, accuracy, durationMs, opponentName);
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