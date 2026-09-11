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
    const input_value_ref = useRef('');
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
        : has_mistake ? 'Incorrect text. Use Backspace to erase it, then type the highlighted character.'
        : focused ? 'Typing armed · Match the highlighted character.' : 'Click the typing field or press Tab to resume.';

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
                        if (!can_type) return;
                        const input_event = event.nativeEvent as InputEvent;
                        const value = event.currentTarget.value;
                        const previous_value = input_value_ref.current;

                        if (input_event.isComposing) return;
                        input_value_ref.current = value;

                        if (input_event.inputType.startsWith('delete')) {
                            const has_remaining_mistake = value.length > 0;
                            setHasMistake(has_remaining_mistake);
                            if (!has_remaining_mistake) {
                                setMistakePositions((current_positions) => {
                                    const next_positions = new Set(current_positions);
                                    next_positions.delete(game_state.myState.position);
                                    return next_positions;
                                });
                            }
                            return;
                        }

                        if (previous_value) {
                            setHasMistake(true);
                            return;
                        }

                        const inserted_value = input_event.data
                            ?? (value.startsWith(previous_value) ? value.slice(previous_value.length) : '');
                        if (!inserted_value || expected_char === undefined) return;
                        const start_position = game_state.myState.position;
                        const inserted_characters = Array.from(inserted_value);
                        let rejected_value = '';

                        for (const [index, char] of inserted_characters.entries()) {
                            const position = start_position + index;
                            const target_char = quote.text[position];
                            if (target_char === undefined) break;
                            const is_correct = char === target_char;
                            onKeystroke(char, is_correct);

                            if (!is_correct) {
                                rejected_value = inserted_characters.slice(index).join('');
                                setMistakePositions((current_positions) => new Set([...current_positions, position]));
                                break;
                            }
                        }

                        event.currentTarget.value = rejected_value;
                        input_value_ref.current = rejected_value;
                        setHasMistake(Boolean(rejected_value));
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
