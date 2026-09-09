'use client';

import type { Quote } from '@/types';

interface QuoteDisplayProps {
  quote: Quote;
  position: number;
  opponentPosition?: number;
}

export function QuoteDisplay({ quote, position, opponentPosition }: QuoteDisplayProps) {
  const chars = quote.text.split('');
  const visible_start = Math.max(0, position - 32);
  const visible_chars = chars.slice(visible_start, visible_start + 180);

  return (
    <div className="font-mono text-lg md:text-xl leading-relaxed max-w-3xl h-14 md:h-16 overflow-hidden mx-auto px-4">
      {visible_start > 0 && <span className="text-[var(--muted-foreground)]">… </span>}
      {visible_chars.map((char, visible_index) => {
        const index = visible_start + visible_index;
        let className = 'quote-char px-0.5';
        if (index < position) {
          className += ' correct';
        } else if (index === position) {
          className += ' current';
        } else {
          className += ' pending';
        }

        const opponentHere = opponentPosition !== undefined && opponentPosition > index;
        if (opponentHere) {
          className += ' relative';
        }

        return (
          <span key={index} className={className}>
            {char === ' ' ? ' ' : char}
            {opponentHere && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[var(--danger)] rounded-full animate-pulse" />
            )}
          </span>
        );
      })}
    </div>
  );
}
