'use client';

import type { Quote } from '@/types';

interface QuoteDisplayProps {
  quote: Quote;
  position: number;
  opponentPosition?: number;
}

export function QuoteDisplay({ quote, position, opponentPosition }: QuoteDisplayProps) {
  const chars = quote.text.split('');

  return (
    <div className="font-mono text-lg md:text-xl leading-relaxed max-w-3xl mx-auto px-4">
      {chars.map((char, index) => {
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
            {char === ' ' ? '\u00A0' : char}
            {opponentHere && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[var(--danger)] rounded-full animate-pulse" />
            )}
          </span>
        );
      })}
    </div>
  );
}