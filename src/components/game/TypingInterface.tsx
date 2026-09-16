'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/types';
import { Metric, Panel } from '@/components/game/GameUI';
import { QuoteDisplay } from '@/components/game/QuoteDisplay';

interface TypingInterfaceProps {
    gameState: GameState;
    onKeystroke: (char: string, is_correct: boolean) => void;
    onDelete: (character_count: number) => void;
    disabled?: boolean;
}

export function TypingInterface({ gameState: game_state, onKeystroke, onDelete, disabled = false }: TypingInterfaceProps) {
    const input_ref = useRef<HTMLInputElement>(null);
    const input_value_ref = useRef('');
    const [mistake_positions, setMistakePositions] = useState<Set<number>>(() => new Set());
    const [focused, setFocused] = useState(false);
    const has_mistake = mistake_positions.size > 0;
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
    const feedback = !can_type
        ? disabled ? 'Waiting for the connection. Typing is temporarily unavailable.' : 'Get ready. Your typing field activates when the countdown ends.'
        : has_mistake ? 'Some characters are incorrect. Keep typing or use Backspace to revise them.'
        : focused ? 'Typing armed · Backspace can revise any typed character.' : 'Click the quote or press Tab to resume typing.';

    return (
        <Panel className={'typing-panel' + (has_mistake ? ' has-mistake' : '')}>
            <div className="panel-topline"><span className="eyebrow">TYPE TO ATTACK</span><span className="micro-label">PRECISION = POWER</span></div>
            <div className="typing-capture" onClick={() => input_ref.current?.focus({ preventScroll: true })}>
                <QuoteDisplay quote={quote} position={game_state.myState.position} mistake_positions={mistake_positions} />
                <input
                    ref={input_ref}
                    id="typing-input"
                    className="typing-input"
                    type="text"
                    disabled={!can_type}
                    onInput={(event) => {
                        if (!can_type) return;
                        const input_event = event.nativeEvent as InputEvent;
                        const value = event.currentTarget.value;
                        const previous_value = input_value_ref.current;

                        if (input_event.isComposing) return;
                        if (input_event.inputType.startsWith('delete')) {
                            const deleted_count = Math.max(0, previous_value.length - value.length);
                            input_value_ref.current = value;
                            if (deleted_count > 0) onDelete(deleted_count);
                            setMistakePositions((current_positions) => {
                                return new Set(
                                    [...current_positions].filter((position) => position < value.length),
                                );
                            });
                            return;
                        }

                        const inserted_value = input_event.data
                            ?? (value.startsWith(previous_value) ? value.slice(previous_value.length) : '');
                        if (!inserted_value) return;
                        const start_position = previous_value.length;
                        const inserted_characters = Array.from(inserted_value);
                        const accepted_characters: string[] = [];
                        const next_mistake_positions = new Set(mistake_positions);

                        for (const [index, char] of inserted_characters.entries()) {
                            const position = start_position + index;
                            const target_char = quote.text[position];
                            if (target_char === undefined) break;
                            const is_correct = char === target_char;
                            onKeystroke(char, is_correct);
                            accepted_characters.push(char);
                            if (is_correct) next_mistake_positions.delete(position);
                            else next_mistake_positions.add(position);
                        }

                        const accepted_value = previous_value + accepted_characters.join('');
                        event.currentTarget.value = accepted_value;
                        input_value_ref.current = accepted_value;
                        setMistakePositions(next_mistake_positions);
                    }}
                    onPaste={(event) => event.preventDefault()}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    maxLength={quote.text.length}
                    aria-label="Type the battle quote"
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
