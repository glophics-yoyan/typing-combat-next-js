'use client';

import { useLocalStats } from '@/hooks/useLocalStats';
import { clearAllStats } from '@/lib/storage';
import Link from 'next/link';
import type { LocalStats } from '@/types';

export default function StatsPage() {
  const { stats, loading, updateSettings } = useLocalStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">No stats yet</h1>
          <p className="text-[var(--muted-foreground)] mb-6">Play some battles to see your stats!</p>
          <Link href="/" className="text-[var(--primary)] hover:underline">
            Play Now
          </Link>
        </div>
      </div>
    );
  }

  const winRate = stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0;
  const avgWpm = stats.totalMatches > 0 ? Math.round(stats.totalKeystrokes / 5 / (stats.totalTimeMs / 60000)) : 0;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--primary)] font-mono">TypeRacer Combat</h1>
          <Link href="/" className="text-sm text-[var(--muted-foreground)] hover:text-white transition-colors">
            Play
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">Your Statistics</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Matches" value={stats.totalMatches} icon="🎮" />
          <StatCard label="Wins" value={stats.wins} color="text-[var(--primary)]" icon="🏆" />
          <StatCard label="Losses" value={stats.losses} color="text-[var(--danger)]" icon="💀" />
          <StatCard label="Win Rate" value={`${winRate}%`} icon="📊" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Best WPM" value={stats.bestWpm} icon="⚡" />
          <StatCard label="Best Accuracy" value={`${Math.round(stats.bestAccuracy * 100)}%`} icon="🎯" />
          <StatCard label="Avg WPM" value={avgWpm} icon="📈" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <StatCard label="Session Matches" value={stats.sessionMatches} icon="🔄" />
          <StatCard label="Session Wins" value={stats.sessionWins} color="text-[var(--primary)]" icon="✨" />
        </div>

        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Recent Matches
          </h3>

          {stats.recentMatches.length === 0 ? (
            <p className="text-[var(--muted-foreground)] text-center py-8">No matches played yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        match.won ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'bg-[var(--danger)]/20 text-[var(--danger)]'
                      }`}
                    >
                      {match.won ? 'W' : 'L'}
                    </div>
                    <div>
                      <p className="font-medium">{match.opponentName}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {new Date(match.playedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-lg">
                      {Math.round(match.wpm)} WPM
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {Math.round(match.accuracy * 100)}% • {formatDuration(match.durationMs)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </h3>

          <div className="space-y-4">
            <SettingToggle
              label="Sound Effects"
              checked={stats.settings.soundEnabled}
              onChange={(soundEnabled) => void updateSettings({ soundEnabled })}
            />
            <SettingToggle
              label="Particle Effects"
              checked={stats.settings.particlesEnabled}
              onChange={(particlesEnabled) => void updateSettings({ particlesEnabled })}
            />
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-2">Theme</label>
              <select
                defaultValue={stats.settings.theme}
                className="w-full px-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-white focus:border-[var(--primary)] focus:outline-none"
                onChange={(event) => void updateSettings({ theme: event.target.value as LocalStats['settings']['theme'] })}
              >
                <option value="system">System</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-2">Quote Difficulty</label>
              <select
                defaultValue={stats.settings.quoteDifficulty}
                className="w-full px-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-white focus:border-[var(--primary)] focus:outline-none"
                onChange={(event) => void updateSettings({ quoteDifficulty: Number(event.target.value) as LocalStats['settings']['quoteDifficulty'] })}
              >
                <option value="1">Easy</option>
                <option value="2">Medium</option>
                <option value="3">Hard</option>
                <option value="4">Expert</option>
                <option value="5">Insane</option>
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (confirm('Reset all stats? This cannot be undone.')) {
              void clearAllStats().then(() => window.location.reload());
            }
          }}
          className="w-full mt-6 py-3 px-4 border border-[var(--danger)] text-[var(--danger)] rounded-lg hover:bg-[var(--danger)]/10 transition-colors"
        >
          Reset All Stats
        </button>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = 'text-white',
  icon,
}: {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
}) {
  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 text-center">
      {icon && <span className="text-3xl mb-2 block">{icon}</span>}
      <p className={`text-3xl font-bold font-mono ${color}`}>{value}</p>
      <p className="text-sm text-[var(--muted-foreground)] mt-1">{label}</p>
    </div>
  );
}

function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="font-medium">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-full' : ''
          }`}
        />
      </button>
    </label>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  return `${remainingSeconds}s`;
}
