'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, LocalStats } from '@/types';
import { getQuote } from '@/lib/quotes';
import {
    advancePracticeCountdown,
    createPracticeGameState,
    finishPracticeIfComplete,
    processKeystroke,
} from '@/lib/game-engine';

export function usePracticeBattle(difficulty: LocalStats['settings']['quote_difficulty'], enabled = true) {
    const [game_state, setGameState] = useState<GameState | null>(null);
    const [countdown, setCountdown] = useState(0);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState('');
    const request_id_ref = useRef(0);

    const startPractice = useCallback(async () => {
        const request_id = ++request_id_ref.current;
        setLoading(true);
        setError('');
        setGameState(null);
        setCountdown(0);

        try {
            const loaded_quote = await getQuote(difficulty);
            if (request_id !== request_id_ref.current) return;
            const quote = { ...loaded_quote, charCount: loaded_quote.charCount ?? loaded_quote.text.length };
            const next_state = createPracticeGameState(quote);
            setGameState(next_state);
            setCountdown(3);
        } catch {
            if (request_id === request_id_ref.current) setError('Unable to prepare a practice quote. Please try again.');
        } finally {
            if (request_id === request_id_ref.current) setLoading(false);
        }
    }, [difficulty]);

    useEffect(() => {
        if (!enabled) return;
        const timer = setTimeout(() => void startPractice(), 0);
        return () => {
            clearTimeout(timer);
            request_id_ref.current += 1;
        };
    }, [enabled, startPractice]);

    useEffect(() => {
        if (game_state?.status !== 'countdown') return;

        function updateCountdown() {
            const now = Date.now();
            setGameState((current_state) => current_state ? advancePracticeCountdown(current_state, now) : current_state);
            setCountdown(Math.max(0, Math.ceil(((game_state?.startTime ?? now) - now) / 1000)));
        }

        updateCountdown();
        const timer = setInterval(updateCountdown, 100);
        return () => clearInterval(timer);
    }, [game_state?.startTime, game_state?.status]);

    const handleKeystroke = useCallback((character: string, is_correct: boolean) => {
        setGameState((current_state) => {
            if (!current_state) return current_state;
            const typed_state = processKeystroke(current_state, character, is_correct);
            return finishPracticeIfComplete(typed_state);
        });
    }, []);

    return { game_state, countdown, loading, error, startPractice, handleKeystroke };
}
