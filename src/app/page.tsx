'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocalStats } from '@/hooks/useLocalStats';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [join_code, setJoinCode] = useState<string | null>(null);
  const { stats, loading } = useLocalStats();

  useEffect(() => {
    const frame_id = requestAnimationFrame(() => {
      const saved = localStorage.getItem('typeracer-username');
      if (saved) setUsername(saved);

      const requested_code = new URLSearchParams(window.location.search).get('join')?.trim().toUpperCase();
      if (!requested_code) return;

      setJoinCode(requested_code);
      if (saved?.trim()) {
        router.replace(`/battle/${requested_code}`);
        return;
      }

      setShowUsernameModal(true);
    });

    return () => cancelAnimationFrame(frame_id);
  }, [router]);

  const handleCreateBattle = async () => {
    if (!username.trim()) {
      setShowUsernameModal(true);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('typeracer-username', username.trim());
        localStorage.setItem(`typeracer-room-user-${data.code}`, data.userId);
        window.location.href = data.url;
      } else {
        alert('Failed to create battle');
      }
    } catch {
      alert('Failed to create battle');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinBattle = () => {
    const code = prompt('Enter battle code:');
    if (code) {
      if (!username.trim()) {
        setShowUsernameModal(true);
        return;
      }
      localStorage.setItem('typeracer-username', username.trim());
      router.push(`/battle/${code.toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--primary)] font-mono">TypeRacer Combat</h1>
          <Link href="/stats" className="text-sm text-[var(--muted-foreground)] hover:text-white transition-colors">
            Stats
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-bold mb-4 font-mono tracking-tight">
              1v1 Typing Battle
            </h2>
            <p className="text-lg text-[var(--muted-foreground)] max-w-md mx-auto">
              Challenge a friend. Type quotes. Fastest and most accurate wins.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleCreateBattle}
              disabled={creating}
              className="w-full py-4 px-6 bg-[var(--primary)] text-[var(--background)] font-bold text-lg rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              {creating ? 'Creating...' : 'Create Battle'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[var(--border)]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[var(--background)] text-[var(--muted-foreground)]">OR</span>
              </div>
            </div>

            <button
              onClick={handleJoinBattle}
              className="w-full py-4 px-6 border-2 border-[var(--border)] text-white font-bold text-lg rounded-lg hover:border-[var(--primary)] hover:bg-[var(--muted)] transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              Join Battle
            </button>
          </div>

          {stats && !loading && (
            <div className="mt-12 p-6 bg-[var(--card)] rounded-xl border border-[var(--border)]">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Your Stats
              </h3>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-[var(--primary)]">{stats.wins}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Wins</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--danger)]">{stats.losses}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Losses</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.bestWpm}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Best WPM</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{Math.round(stats.bestAccuracy * 100)}%</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Best Acc.</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 text-center text-sm text-[var(--muted-foreground)]">
            <p>Powered by WebRTC P2P • Next.js • Three.js</p>
          </div>
        </div>
      </main>

      {showUsernameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Enter Username</h3>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username (2-32 chars)"
              className="w-full px-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none mb-4"
              maxLength={32}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowUsernameModal(false)}
                className="flex-1 py-3 px-4 border border-[var(--border)] text-white rounded-lg hover:bg-[var(--muted)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const normalized_username = username.trim();
                  localStorage.setItem('typeracer-username', normalized_username);
                  setShowUsernameModal(false);
                  if (join_code) {
                    router.replace(`/battle/${join_code}`);
                  }
                }}
                disabled={username.trim().length < 2}
                className="flex-1 py-3 px-4 bg-[var(--primary)] text-[var(--background)] font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
