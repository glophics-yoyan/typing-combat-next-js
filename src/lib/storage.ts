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
const DB_VERSION = 2;

const DEFAULT_STATS: LocalStats = {
  total_matches: 0,
  wins: 0,
  losses: 0,
  total_keystrokes: 0,
  total_time_ms: 0,
  best_wpm: 0,
  best_accuracy: 0,
  session_matches: 0,
  session_wins: 0,
  settings: {
    sound_enabled: true,
    particles_enabled: true,
    theme: 'system',
    quote_difficulty: 2,
  },
  recent_matches: [],
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
  return normalizeStats(stats);
}

export async function saveLocalStats(stats: LocalStats): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, stats, 'main');
}

export async function recordMatch(
  match_id: string,
  won: boolean,
  wpm: number,
  accuracy: number,
  duration_ms: number,
  opponent_name: string
): Promise<LocalStats> {
  const stats = await getLocalStats();

  if (stats.recent_matches.some((match) => match.id === match_id)) return stats;

  const match: MatchSummary = {
    id: match_id,
    won,
    wpm,
    accuracy,
    duration_ms,
    played_at: new Date().toISOString(),
    opponent_name,
  };

  stats.total_matches += 1;
  stats.session_matches += 1;
  stats.total_keystrokes += Math.round(wpm * (duration_ms / 60000) * 5);
  stats.total_time_ms += duration_ms;

  if (won) {
    stats.wins += 1;
    stats.session_wins += 1;
  } else {
    stats.losses += 1;
  }

  stats.best_wpm = Math.max(stats.best_wpm, wpm);
  stats.best_accuracy = Math.max(stats.best_accuracy, accuracy);

  stats.recent_matches.unshift(match);
  stats.recent_matches = stats.recent_matches.slice(0, 20);

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
  stats.session_matches = 0;
  stats.session_wins = 0;
  await saveLocalStats(stats);
  return stats;
}

export async function clearAllStats(): Promise<void> {
    const stats = await getLocalStats();
    await saveLocalStats({ ...DEFAULT_STATS, settings: { ...stats.settings }, recent_matches: [] });
}

function normalizeStats(value: unknown): LocalStats {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_STATS, settings: { ...DEFAULT_STATS.settings }, recent_matches: [] };
  }
  const legacy = value as Record<string, unknown>;
  const legacy_settings = (legacy.settings ?? {}) as Record<string, unknown>;
  const legacy_matches = (legacy.recent_matches ?? legacy.recentMatches ?? []) as Record<string, unknown>[];
  return {
    total_matches: Number(legacy.total_matches ?? legacy.totalMatches ?? 0),
    wins: Number(legacy.wins ?? 0),
    losses: Number(legacy.losses ?? 0),
    total_keystrokes: Number(legacy.total_keystrokes ?? legacy.totalKeystrokes ?? 0),
    total_time_ms: Number(legacy.total_time_ms ?? legacy.totalTimeMs ?? 0),
    best_wpm: Number(legacy.best_wpm ?? legacy.bestWpm ?? 0),
    best_accuracy: Number(legacy.best_accuracy ?? legacy.bestAccuracy ?? 0),
    session_matches: Number(legacy.session_matches ?? legacy.sessionMatches ?? 0),
    session_wins: Number(legacy.session_wins ?? legacy.sessionWins ?? 0),
    settings: {
      sound_enabled: Boolean(legacy_settings.sound_enabled ?? legacy_settings.soundEnabled ?? true),
      particles_enabled: Boolean(legacy_settings.particles_enabled ?? legacy_settings.particlesEnabled ?? true),
      theme: ['dark', 'light', 'system'].includes(String(legacy_settings.theme))
        ? legacy_settings.theme as LocalStats['settings']['theme'] : 'system',
      quote_difficulty: normalizeDifficulty(legacy_settings.quote_difficulty ?? legacy_settings.quoteDifficulty),
    },
    recent_matches: legacy_matches.map((match) => ({
      id: String(match.id ?? crypto.randomUUID()),
      won: Boolean(match.won),
      wpm: Number(match.wpm ?? 0),
      accuracy: Number(match.accuracy ?? 0),
      duration_ms: Number(match.duration_ms ?? match.durationMs ?? 0),
      played_at: String(match.played_at ?? match.playedAt ?? new Date().toISOString()),
      opponent_name: String(match.opponent_name ?? match.opponentName ?? 'Opponent'),
    })).slice(0, 20),
  };
}

function normalizeDifficulty(value: unknown): LocalStats['settings']['quote_difficulty'] {
  const difficulty = Number(value ?? 2);
  return difficulty >= 1 && difficulty <= 5 ? difficulty as LocalStats['settings']['quote_difficulty'] : 2;
}
