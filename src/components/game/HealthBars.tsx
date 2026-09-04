'use client';

import type { PlayerState } from '@/types';

interface HealthBarsProps {
  myHp: number;
  opponentHp: number;
  myName: string;
  opponentName: string;
}

export function HealthBars({ myHp, opponentHp, myName, opponentName }: HealthBarsProps) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 mb-6">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-[var(--background)] font-bold text-sm">
            {myName[0]?.toUpperCase()}
          </div>
          <span className="font-medium truncate">{myName}</span>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="font-medium truncate text-right">{opponentName}</span>
          <div className="w-8 h-8 rounded-full bg-[var(--danger)] flex items-center justify-center text-white font-bold text-sm">
            {opponentName[0]?.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="relative h-6 bg-[var(--muted)] rounded-full overflow-hidden border border-[var(--border)]">
        <div
          className="absolute top-0 left-0 h-full bg-[var(--primary)] transition-all duration-300 ease-out"
          style={{ width: `${Math.max(0, myHp)}%` }}
          role="progressbar"
          aria-valuenow={Math.max(0, Math.round(myHp))}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${myName} health`}
        />
        <div
          className="absolute top-0 right-0 h-full bg-[var(--danger)] transition-all duration-300 ease-out"
          style={{ width: `${Math.max(0, opponentHp)}%` }}
          role="progressbar"
          aria-valuenow={Math.max(0, Math.round(opponentHp))}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${opponentName} health`}
        />
        <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-bold text-white text-shadow">
          <span>{Math.max(0, Math.round(myHp))} HP</span>
          <span>{Math.max(0, Math.round(opponentHp))} HP</span>
        </div>
      </div>
    </div>
  );
}