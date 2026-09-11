'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthoritativeWebSocket, type AuthoritativeEvent } from '@/lib/authoritative-websocket';
import type { ApiEnvelope, BattlePlayer, GameState, MatchResult, PlayerState, Quote, RoomSessionData, RoomSnapshot } from '@/types';

interface UseAuthoritativeBattleOptions {
    room_code: string;
    user_id: string;
    join_token: string;
    on_game_end?: (result: MatchResult) => void;
}

interface JournalEntry {
    sequence: number;
    character: string;
    client_timestamp: number;
}

interface InputJournal {
    match_id: string;
    entries: JournalEntry[];
}

export function useAuthoritativeBattle({ room_code, user_id, join_token, on_game_end }: UseAuthoritativeBattleOptions) {
    const [game_state, setGameState] = useState<GameState | null>(null);
    const [connected, setConnected] = useState(false);
    const [opponent_connected, setOpponentConnected] = useState(false);
    const [opponent_username, setOpponentUsername] = useState('Opponent');
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(0);
    const [connection_attempt, setConnectionAttempt] = useState(0);
    const [rematch_votes, setRematchVotes] = useState<Record<string, boolean>>({});
    const [active_join_token, setActiveJoinToken] = useState(join_token);
    const websocket_ref = useRef<AuthoritativeWebSocket | null>(null);
    const sequence_ref = useRef(0);
    const acknowledged_sequence_ref = useRef(0);
    const match_id_ref = useRef<string | null>(null);
    const journal_ref = useRef<InputJournal | null>(null);
    const replay_on_snapshot_ref = useRef(true);
    const reported_match_ref = useRef<string | null>(null);
    const end_handler_ref = useRef(on_game_end);
    const reconnect_timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        end_handler_ref.current = on_game_end;
    }, [on_game_end]);

    const saveJournal = useCallback(() => {
        try {
            if (journal_ref.current) sessionStorage.setItem(journalKey(room_code), JSON.stringify(journal_ref.current));
            else sessionStorage.removeItem(journalKey(room_code));
        } catch {
            // Recovery is best effort when browser storage is unavailable.
        }
    }, [room_code]);

    const handleSnapshot = useCallback((snapshot: RoomSnapshot) => {
        const own_player = snapshot.players.find((player) => player.user_id === user_id);
        if (!own_player) return;
        const opponent = snapshot.players.find((player) => player.user_id !== user_id) ?? null;
        setOpponentConnected(Boolean(opponent?.connected));
        if (opponent) setOpponentUsername(opponent.username);

        if (match_id_ref.current !== snapshot.match_id) {
            match_id_ref.current = snapshot.match_id;
            sequence_ref.current = own_player.last_processed_sequence;
            acknowledged_sequence_ref.current = own_player.last_processed_sequence;
            reported_match_ref.current = null;
            setRematchVotes({});
            const stored_journal = loadJournal(room_code);
            journal_ref.current = snapshot.match_id && stored_journal?.match_id === snapshot.match_id
                ? stored_journal : snapshot.match_id ? { match_id: snapshot.match_id, entries: [] } : null;
            sequence_ref.current = Math.max(
                sequence_ref.current,
                ...(journal_ref.current?.entries.map((entry) => entry.sequence) ?? [0]),
            );
        }

        acknowledged_sequence_ref.current = own_player.last_processed_sequence;
        sequence_ref.current = Math.max(sequence_ref.current, own_player.last_processed_sequence);
        const checkpointed_sequence = snapshot.checkpointed_sequences[user_id] ?? 0;
        if (journal_ref.current) {
            journal_ref.current.entries = journal_ref.current.entries.filter((entry) => entry.sequence > checkpointed_sequence);
            saveJournal();
        }

        const pending_entries = journal_ref.current?.entries.filter(
            (entry) => entry.sequence > own_player.last_processed_sequence,
        ) ?? [];
        if (replay_on_snapshot_ref.current && snapshot.match_id && snapshot.phase === 'active') {
            pending_entries.forEach((entry) => websocket_ref.current?.sendInput(entry.sequence, entry.character, entry.client_timestamp));
            replay_on_snapshot_ref.current = false;
        }

        const quote = toQuote(snapshot.quote);
        const own_state = toPlayerState(own_player);
        pending_entries.forEach((entry) => applyOptimisticInput(own_state, quote, entry));
        setGameState({
            quote,
            myState: own_state,
            opponentState: opponent ? toPlayerState(opponent) : null,
            status: snapshot.phase,
            winner: snapshot.winner_user_id ? snapshot.winner_user_id === user_id ? 'me' : 'opponent' : null,
            startTime: snapshot.phase === 'countdown' ? snapshot.countdown_ends_at : snapshot.started_at,
            endTime: snapshot.finished_at,
        });
    }, [room_code, saveJournal, user_id]);

    const handleEvent = useCallback((message: AuthoritativeEvent) => {
        if (message.type === 'room_snapshot') {
            handleSnapshot(message.payload);
            return;
        }
        if (message.type === 'rematch_status') {
            setRematchVotes(message.payload.votes);
            return;
        }
        if (message.type === 'match_cancelled') {
            setGameState((current_state) => current_state ? { ...current_state, status: 'cancelled', winner: null, endTime: Date.now() } : current_state);
            return;
        }
        if (message.type === 'match_finished') {
            const result = message.payload;
            setGameState((current_state) => current_state ? {
                ...current_state,
                status: 'finished',
                winner: result.winner_user_id === user_id ? 'me' : 'opponent',
                endTime: Date.now(),
            } : current_state);
            if (reported_match_ref.current !== result.match_id) {
                reported_match_ref.current = result.match_id;
                journal_ref.current = null;
                saveJournal();
                end_handler_ref.current?.(result);
            }
        }
    }, [handleSnapshot, saveJournal, user_id]);

    useEffect(() => {
        const websocket = new AuthoritativeWebSocket(active_join_token);
        websocket_ref.current = websocket;
        replay_on_snapshot_ref.current = true;
        const unsubscribe_message = websocket.onMessage(handleEvent);
        const unsubscribe_connection = websocket.onConnectionChange((is_connected) => {
            setConnected(is_connected);
            if (is_connected) {
                if (reconnect_timer_ref.current) {
                    clearTimeout(reconnect_timer_ref.current);
                    reconnect_timer_ref.current = null;
                }
                setError(null);
            }
            else {
                replay_on_snapshot_ref.current = true;
                setError((current_error) => current_error ?? 'Connection lost. Restoring your battle…');
                if (!reconnect_timer_ref.current) {
                    reconnect_timer_ref.current = setTimeout(() => {
                        reconnect_timer_ref.current = null;
                        setConnectionAttempt((attempt) => attempt + 1);
                    }, 1500);
                }
            }
        });
        const unsubscribe_error = websocket.onError((caught_error) => {
            setError(caught_error.message);
            const error_code = (caught_error as Error & { code?: string }).code;
            if (error_code === 'INVALID_JOIN_TOKEN') {
                void fetch(`/api/v2/rooms/${room_code}/token`, { method: 'POST' })
                    .then(async (response) => ({ response, envelope: await response.json() as ApiEnvelope<RoomSessionData> }))
                    .then(({ response, envelope }) => {
                        if (!response.ok || !envelope.data) throw new Error(envelope.message);
                        sessionStorage.setItem(`typeracer-room-session-${room_code}`, JSON.stringify(envelope.data));
                        setActiveJoinToken(envelope.data.join_token);
                    })
                    .catch(() => setError('Your battle session expired. Return to the lobby and rejoin.'));
                return;
            }
            if (error_code?.startsWith('INPUT_') || error_code === 'INVALID_SEQUENCE') {
                sequence_ref.current = acknowledged_sequence_ref.current;
                if (journal_ref.current) {
                    journal_ref.current.entries = journal_ref.current.entries.filter(
                        (entry) => entry.sequence <= acknowledged_sequence_ref.current,
                    );
                    saveJournal();
                }
            }
        });
        websocket.initialize();
        return () => {
            unsubscribe_message();
            unsubscribe_connection();
            unsubscribe_error();
            websocket.destroy();
            if (reconnect_timer_ref.current) {
                clearTimeout(reconnect_timer_ref.current);
                reconnect_timer_ref.current = null;
            }
        };
    }, [active_join_token, connection_attempt, handleEvent, room_code, saveJournal]);

    useEffect(() => {
        if (game_state?.status !== 'countdown' || !game_state.startTime) {
            return;
        }
        const update = () => setCountdown(Math.max(0, Math.ceil((game_state.startTime! - Date.now()) / 1000)));
        update();
        const timer = setInterval(update, 100);
        return () => clearInterval(timer);
    }, [game_state?.startTime, game_state?.status]);

    const handleKeystroke = useCallback((character: string) => {
        if (game_state?.status !== 'active' || !match_id_ref.current) return;
        const sequence = sequence_ref.current + 1;
        sequence_ref.current = sequence;
        const entry = { sequence, character, client_timestamp: Date.now() };
        journal_ref.current ??= { match_id: match_id_ref.current, entries: [] };
        journal_ref.current.entries.push(entry);
        saveJournal();
        websocket_ref.current?.sendInput(sequence, character, entry.client_timestamp);
        setGameState((current_state) => {
            if (!current_state || current_state.status !== 'active') return current_state;
            const my_state = { ...current_state.myState };
            applyOptimisticInput(my_state, current_state.quote, entry);
            return { ...current_state, myState: my_state };
        });
    }, [game_state?.status, saveJournal]);

    return {
        gameState: game_state,
        connected,
        opponentConnected: opponent_connected,
        error,
        countdown,
        opponentUsername: opponent_username,
        rematchVotes: rematch_votes,
        handleKeystroke,
        handleReady: () => websocket_ref.current?.sendReady(),
        requestRematch: () => websocket_ref.current?.sendRematch(true),
        retryConnection: () => setConnectionAttempt((attempt) => attempt + 1),
    };
}

function toQuote(quote: RoomSnapshot['quote']): Quote | null {
    return quote ? { ...quote, charCount: quote.char_count } : null;
}

function toPlayerState(player: BattlePlayer): PlayerState {
    return {
        hp: player.hp,
        position: player.position,
        wpm: player.wpm,
        accuracy: player.accuracy,
        lastKeystroke: Date.now(),
        isReady: player.is_ready,
        totalKeystrokes: player.total_keystrokes,
        correctKeystrokes: player.correct_keystrokes,
    };
}

function applyOptimisticInput(player: PlayerState, quote: Quote | null, entry: JournalEntry) {
    if (!quote || player.position >= quote.text.length) return;
    const is_correct = entry.character === quote.text[player.position];
    player.position = Math.min(player.position + 1, quote.text.length);
    player.totalKeystrokes += 1;
    player.correctKeystrokes += is_correct ? 1 : 0;
    player.accuracy = player.totalKeystrokes > 0 ? player.correctKeystrokes / player.totalKeystrokes : 1;
    player.lastKeystroke = entry.client_timestamp;
}

function journalKey(room_code: string) {
    return `typeracer-input-journal-${room_code}`;
}

function loadJournal(room_code: string): InputJournal | null {
    try {
        const value = sessionStorage.getItem(journalKey(room_code));
        return value ? JSON.parse(value) as InputJournal : null;
    } catch {
        return null;
    }
}
