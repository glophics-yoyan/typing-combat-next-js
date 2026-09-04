'use client';

import { useEffect, useState } from 'react';
import { recordMatch } from '@/lib/storage';
import { useBattle } from '@/hooks/useBattle';
import { HealthBars } from '@/components/game/HealthBars';
import { QuoteDisplay } from '@/components/game/QuoteDisplay';
import { TypingInterface } from '@/components/game/TypingInterface';
import { BattleScene } from '@/components/three/BattleScene';
import type { GameState } from '@/types';

interface BattleArenaProps {
  roomCode: string;
  isHost: boolean;
  userId: string;
  username: string;
  opponentUsername?: string;
}

function ResultModal({ gameState, oppName }: { gameState: GameState; oppName: string }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-8 w-full max-w-md text-center animate-in fade-in zoom-in-95">
        <div className={`text-6xl font-bold mb-4 ${gameState.winner === 'me' ? 'text-[var(--primary)]' : 'text-[var(--danger)]'}`}>
          {gameState.winner === 'me' ? 'VICTORY' : 'DEFEAT'}
        </div>
        <p className="text-xl mb-6">
          {gameState.winner === 'me'
            ? `You defeated ${oppName}!`
            : `${oppName} defeated you.`}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-[var(--muted)] rounded-xl">
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">Your WPM</p>
            <p className="text-3xl font-bold font-mono text-[var(--primary)]">
              {Math.round(gameState.myState.wpm)}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">Accuracy</p>
            <p className="text-3xl font-bold font-mono text-[var(--primary)]">
              {Math.round(gameState.myState.accuracy * 100)}%
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { window.location.href = '/'; }}
            className="flex-1 py-3 px-4 border border-[var(--border)] text-white rounded-lg hover:bg-[var(--muted)] transition-colors"
          >
            Main Menu
          </button>
          <button
            onClick={() => { window.location.reload(); }}
            className="flex-1 py-3 px-4 bg-[var(--primary)] text-[var(--background)] font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Rematch
          </button>
        </div>
      </div>
    </div>
  );
}

export function BattleArena({
  roomCode,
  isHost,
  userId,
  username,
  opponentUsername = 'Opponent',
}: BattleArenaProps) {
  const [showResult, setShowResult] = useState(false);

  const {
    gameState,
    connected,
    error,
    countdown,
    handleKeystroke,
    handleReady,
    startCountdown,
    opponentUsername: hookOpponentUsername,
  } = useBattle({
    roomCode,
    isHost,
    userId,
    username,
    onGameEnd: (won, wpm, accuracy, duration) => {
      void recordMatch(won, wpm, accuracy, duration, opponentUsername);
      setShowResult(true);
    },
  });

  const oppName = hookOpponentUsername || opponentUsername || 'Opponent';

  useEffect(() => {
    if (isHost && gameState?.status === 'waiting' && gameState.myState.isReady && gameState.opponentState?.isReady) {
      startCountdown();
    }
  }, [gameState, isHost, startCountdown]);

  if (!gameState) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--primary)] border-t-transparent mx-auto mb-4" />
          <p className="text-[var(--muted-foreground)]">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative min-h-0">
      <BattleScene
        myHp={gameState.myState.hp}
        opponentHp={gameState.opponentState?.hp || 100}
        myWpm={gameState.myState.wpm}
        isWinning={gameState.myState.hp > (gameState.opponentState?.hp || 100)}
        status={gameState.status}
      />

      <header className="border-b border-[var(--border)] px-6 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--muted-foreground)]">Battle Code:</span>
            <code className="font-mono text-lg bg-[var(--muted)] px-3 py-1 rounded border border-[var(--border)]">
              {roomCode}
            </code>
          </div>
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[var(--primary)]' : 'bg-[var(--danger)]'}`} />
            <span className="text-sm text-[var(--muted-foreground)]">
              {connected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-[var(--danger)]/20 border border-[var(--danger)]/50 rounded-lg text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
        <HealthBars
          myHp={gameState.myState.hp}
          opponentHp={gameState.opponentState?.hp || 100}
          myName={username}
          opponentName={oppName}
        />

        {countdown > 0 && (
          <div className="mb-8 text-center" role="status" aria-live="polite">
            <div className="text-8xl md:text-[120px] font-bold font-mono text-[var(--primary)] animate-pulse">
              {countdown}
            </div>
          </div>
        )}

        {gameState.quote && (
          <QuoteDisplay
            quote={gameState.quote}
            position={gameState.myState.position}
            opponentPosition={gameState.opponentState?.position}
          />
        )}

        <TypingInterface
          gameState={gameState}
          onKeystroke={handleKeystroke}
          onReady={handleReady}
          onStartCountdown={startCountdown}
          disabled={!connected}
        />

        {gameState.opponentState && (
          <div className="mt-6 p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] w-full max-w-3xl">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">{oppName}</span>
              <span className="text-sm text-[var(--muted-foreground)]">
                {Math.round(gameState.opponentState.wpm)} WPM · {Math.round(gameState.opponentState.accuracy * 100)}%
              </span>
            </div>
            <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--danger)] transition-all duration-300"
                style={{ width: `${Math.min(100, (gameState.opponentState.position / (gameState.quote?.text.length || 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </main>

      {gameState.status === 'finished' && <ResultModal gameState={gameState} oppName={oppName} />}
    </div>
  );
}
