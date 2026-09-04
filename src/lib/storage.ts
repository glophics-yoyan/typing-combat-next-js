import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { LocalStats, MatchSummary } from '@/types';

interface StatsDB extends DBSchema {
  stats: {
    key: string;
    value: LocalStats;
  };
}

const DB_NAME = 'typeracer-stats';
const STORE_NAME = 'stats';
const DB_VERSION = 1;

const DEFAULT_STATS: LocalStats = {
  totalMatches: 0,
  wins: 0,
  losses: 0,
  totalKeystrokes: 0,
  totalTimeMs: 0,
  bestWpm: 0,
  bestAccuracy: 0,
  sessionMatches: 0,
  sessionWins: 0,
  settings: {
    soundEnabled: true,
    particlesEnabled: true,
    theme: 'system',
    quoteDifficulty: 2,
  },
  recentMatches: [],
};

let dbPromise: Promise<IDBPDatabase<StatsDB>> | null = null;

function getDB(): Promise<IDBPDatabase<StatsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<StatsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export async function getLocalStats(): Promise<LocalStats> {
  const db = await getDB();
  const stats = await db.get(STORE_NAME, 'main');
  return stats || DEFAULT_STATS;
}

export async function saveLocalStats(stats: LocalStats): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, stats, 'main');
}

export async function recordMatch(
  won: boolean,
  wpm: number,
  accuracy: number,
  durationMs: number,
  opponentName: string
): Promise<LocalStats> {
  const stats = await getLocalStats();

  const match: MatchSummary = {
    id: crypto.randomUUID(),
    won,
    wpm,
    accuracy,
    durationMs,
    playedAt: new Date().toISOString(),
    opponentName,
  };

  stats.totalMatches += 1;
  stats.sessionMatches += 1;
  stats.totalKeystrokes += Math.round(wpm * (durationMs / 60000) * 5);
  stats.totalTimeMs += durationMs;

  if (won) {
    stats.wins += 1;
    stats.sessionWins += 1;
  } else {
    stats.losses += 1;
  }

  stats.bestWpm = Math.max(stats.bestWpm, wpm);
  stats.bestAccuracy = Math.max(stats.bestAccuracy, accuracy);

  stats.recentMatches.unshift(match);
  stats.recentMatches = stats.recentMatches.slice(0, 20);

  await saveLocalStats(stats);
  return stats;
}

export async function updateSettings(
  settings: Partial<LocalStats['settings']>
): Promise<LocalStats> {
  const stats = await getLocalStats();
  stats.settings = { ...stats.settings, ...settings };
  await saveLocalStats(stats);
  return stats;
}

export async function resetSessionStats(): Promise<LocalStats> {
  const stats = await getLocalStats();
  stats.sessionMatches = 0;
  stats.sessionWins = 0;
  await saveLocalStats(stats);
  return stats;
}

export async function clearAllStats(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}