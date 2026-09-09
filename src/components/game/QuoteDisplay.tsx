'use client';

import { useEffect, useRef } from 'react';
import type { Quote } from '@/types';

interface QuoteDisplayProps {
    quote: Quote;
    position: number;
}

export function QuoteDisplay({ quote, position }: QuoteDisplayProps) {
    const viewport_ref = useRef<HTMLDivElement>(null);
    const current_ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        function keepCurrentVisible() {
            const viewport = viewport_ref.current;
            const current = current_ref.current;
            if (!viewport || !current) return;
            const target_top = current.offsetTop;
            if (target_top < viewport.scrollTop || target_top + current.offsetHeight > viewport.scrollTop + viewport.clientHeight - 16) {
                viewport.scrollTop = Math.max(0, target_top - 16);
            }
        }
        keepCurrentVisible();
        const observer = new ResizeObserver(keepCurrentVisible);
        if (viewport_ref.current) observer.observe(viewport_ref.current);
        return () => observer.disconnect();
    }, [position, quote.text]);

    return (
        <div ref={viewport_ref} className="quote-window" tabIndex={0} role="region" aria-label="Battle quote">
            <p className="quote-text">
                {quote.text.split('').map((char, index) => (
                    <span key={index} ref={index === position ? current_ref : undefined} className={'quote-char ' + (index < position ? 'correct' : index === position ? 'current' : 'pending')}>{char}</span>
                ))}
            </p>
        </div>
    );
}
