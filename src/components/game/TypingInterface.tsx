'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/types';
import { Metric, Panel } from '@/components/game/GameUI';
import { QuoteDisplay } from '@/components/game/QuoteDisplay';

interface TypingInterfaceProps {
    gameState: GameState;
    onKeystroke: (char: string, is_correct: boolean) => void;
    disabled?: boolean;
}

export function TypingInterface({ gameState: game_state, onKeystroke, disabled = false }: TypingInterfaceProps) {
    const input_ref = useRef<HTMLInputElement>(null);
    const [has_mistake, setHasMistake] = useState(false);
    const [mistake_positions, setMistakePositions] = useState<Set<number>>(() => new Set());
    const [focused, setFocused] = useState(false);
    const can_type = game_state.status === 'active' && !disabled;
    const quote = game_state.quote;

    useEffect(() => {
        if (can_type) input_ref.current?.focus({ preventScroll: true });
    }, [can_type]);

    useEffect(() => {
        const viewport = window.visualViewport;
        function revealInput() {
            if (document.activeElement === input_ref.current) input_ref.current?.scrollIntoView({ block: 'nearest' });
        }
        viewport?.addEventListener('resize', revealInput);
        return () => viewport?.removeEventListener('resize', revealInput);
    }, []);

    if (!quote) return null;
    const expected_char = quote.text[game_state.myState.position];
    const feedback = !can_type
        ? disabled ? 'Waiting for the connection. Typing is temporarily unavailable.' : 'Get ready. Your typing field activates when the countdown ends.'
        : has_mistake ? 'Incorrect letter marked. Keep typing—the cursor has moved on.'
        : focused ? 'Typing armed · Match the highlighted character. No backspace needed.' : 'Click the typing field or press Tab to resume.';

    return (
        <Panel className={'typing-panel' + (has_mistake ? ' has-mistake' : '')}>
            <div className="panel-topline"><span className="eyebrow">TYPE TO ATTACK</span><span className="micro-label">PRECISION = POWER</span></div>
            <QuoteDisplay quote={quote} position={game_state.myState.position} mistake_positions={mistake_positions} />
            <div className="field typing-entry">
                <label htmlFor="typing-input">Your typing field</label>
                <input
                    ref={input_ref}
                    id="typing-input"
                    type="text"
                    disabled={!can_type}
                    onInput={(event) => {
                        if (!can_type || (event.nativeEvent as InputEvent).isComposing) return;
                        const value = event.currentTarget.value;
                        event.currentTarget.value = '';
                        if (!value || expected_char === undefined) return;
                        const start_position = game_state.myState.position;
                        const new_mistake_positions: number[] = [];
                        let last_is_correct = true;

                        Array.from(value).forEach((char, index) => {
                            const position = start_position + index;
                            const target_char = quote.text[position];
                            if (target_char === undefined) return;
                            const is_correct = char === target_char;
                            if (!is_correct) new_mistake_positions.push(position);
                            last_is_correct = is_correct;
                            onKeystroke(char, is_correct);
                        });

                        if (new_mistake_positions.length > 0) {
                            setMistakePositions((current_positions) => new Set([...current_positions, ...new_mistake_positions]));
                        }
                        setHasMistake(!last_is_correct);
                    }}
                    onPaste={(event) => event.preventDefault()}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder={can_type ? 'Type the highlighted character…' : 'Stand by…'}
                    aria-describedby="typing-feedback"
                />
            </div>
            <p id="typing-feedback" className="typing-feedback" role="status">{feedback}</p>
            <div className="combat-metrics">
                <Metric label="Words per minute" value={Math.round(game_state.myState.wpm)} accent />
                <Metric label="Accuracy" value={Math.round(game_state.myState.accuracy * 100) + '%'} />
                <Metric label="Quote completed" value={Math.round(game_state.myState.position / Math.max(1, quote.text.length) * 100) + '%'} />
            </div>
        </Panel>
    );
}
