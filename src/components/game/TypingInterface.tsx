'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { GameState } from '@/types';

interface TypingInterfaceProps {
  gameState: GameState | null;
  onKeystroke: (char: string, isCorrect: boolean) => void;
  onReady: () => void;
  onStartCountdown: () => void;
  disabled?: boolean;
}

export function TypingInterface({
  gameState,
  onKeystroke,
  onReady,
  onStartCountdown,
  disabled = false,
}: TypingInterfaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      if (disabled || !gameState || !gameState.quote) return;

      const value = e.currentTarget.value;
      const quote = gameState.quote.text;

      if (value.length > 0) {
        const newChar = value[value.length - 1];
        const expectedChar = quote[gameState.myState.position];
        const isCorrect = newChar === expectedChar;
        onKeystroke(newChar, isCorrect);
      }

      e.currentTarget.value = '';
    },
    [gameState, onKeystroke, disabled]
  );

  useEffect(() => {
    if (gameState?.status === 'active') {
      inputRef.current?.focus();
    }
  }, [gameState?.status]);

  if (!gameState || !gameState.quote) return null;

  const canType = gameState.status === 'active';
  const showReady = gameState.status === 'waiting' && !gameState.myState.isReady;

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {showReady && (
        <div className="mb-6 text-center">
          <button
            onClick={onReady}
            className="px-8 py-3 bg-[var(--primary)] text-[var(--background)] font-bold rounded-lg hover:opacity-90 transition-opacity text-lg"
          >
            Ready
          </button>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Waiting for opponent...
          </p>
        </div>
      )}

      {gameState.status === 'countdown' && (
        <div className="mb-6 text-center" role="status" aria-live="polite">
          <div className="text-6xl font-bold font-mono text-[var(--primary)] animate-pulse">
            {gameState.quote.text.slice(0, 3)}...
          </div>
        </div>
      )}

      {canType && (
        <div className="mb-6">
          <label htmlFor="typing-input" className="sr-only">
            Type the quote above
          </label>
          <input
            ref={inputRef}
            id="typing-input"
            type="text"
            onInput={handleInput}
            autoComplete="off"
            spellCheck={false}
            className="w-full px-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none text-lg font-mono"
            placeholder="Start typing..."
            aria-label="Type the quote"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 text-center text-sm">
        <div className="p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
          <p className="text-[var(--muted-foreground)]">WPM</p>
          <p className="text-2xl font-bold font-mono text-[var(--primary)]">
            {Math.round(gameState.myState.wpm)}
          </p>
        </div>
        <div className="p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
          <p className="text-[var(--muted-foreground)]">Accuracy</p>
          <p className="text-2xl font-bold font-mono text-[var(--primary)]">
            {Math.round(gameState.myState.accuracy * 100)}%
          </p>
        </div>
        <div className="p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
          <p className="text-[var(--muted-foreground)]">Progress</p>
          <p className="text-2xl font-bold font-mono text-[var(--primary)]">
            {Math.round((gameState.myState.position / gameState.quote.text.length) * 100)}%
          </p>
        </div>
      </div>
    </div>
  );
}
