'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { recordMatch } from '@/lib/storage';
import { useBattle } from '@/hooks/useBattle';
import { HealthBars } from '@/components/game/HealthBars';
import { TypingInterface } from '@/components/game/TypingInterface';
import { BattleScene } from '@/components/three/BattleScene';
import { ArenaArtwork, Button, Field, GameDialog, GameFooter, GameHeader, Metric, Panel, Status } from '@/components/game/GameUI';

interface BattleArenaProps {
    roomCode: string;
    isHost: boolean;
    userId: string;
    username: string;
    opponentUsername?: string;
}

export function BattleArena({ roomCode: room_code, isHost: is_host, userId: user_id, username, opponentUsername: opponent_username = 'Opponent' }: BattleArenaProps) {
    const [copy_message, setCopyMessage] = useState('');
    const [invite_url, setInviteUrl] = useState('');
    const [save_error, setSaveError] = useState('');
    const [results_visible, setResultsVisible] = useState(false);
    const {
        gameState: game_state, connected, error, countdown,
        handleKeystroke, handleReady, startCountdown, retryConnection,
        opponentUsername: live_opponent_name,
    } = useBattle({
        roomCode: room_code,
        isHost: is_host,
        userId: user_id,
        username,
        onGameEnd: (won, wpm, accuracy, duration) => {
            void recordMatch(won, wpm, accuracy, duration, live_opponent_name || opponent_username)
                .catch(() => setSaveError('This result could not be saved to your browser.'));
        },
    });
    const opponent_name = live_opponent_name || opponent_username;
    const opponent_state = game_state?.opponentState;
    const waiting = game_state?.status === 'waiting';

    useEffect(() => {
        if (game_state?.status !== 'finished') return;
        const motion_query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const timer = setTimeout(() => setResultsVisible(true), motion_query.matches ? 0 : 900);
        function showReducedResults() { if (motion_query.matches) setResultsVisible(true); }
        motion_query.addEventListener('change', showReducedResults);
        return () => {
            clearTimeout(timer);
            motion_query.removeEventListener('change', showReducedResults);
        };
    }, [game_state?.status]);

    useEffect(() => {
        const frame_id = requestAnimationFrame(() => setInviteUrl(window.location.origin + '/?join=' + room_code));
        return () => cancelAnimationFrame(frame_id);
    }, [room_code]);

    useEffect(() => {
        if (is_host && connected && game_state?.status === 'waiting' && game_state.myState.isReady && game_state.opponentState?.isReady) startCountdown();
    }, [game_state, is_host, connected, startCountdown]);

    async function copyInvite(value: string, label: string) {
        try {
            await navigator.clipboard.writeText(value);
            setCopyMessage(label + ' copied. Send it to your opponent.');
        } catch {
            setCopyMessage('Copy unavailable. Select the code or invitation link below and copy it manually.');
        }
    }

    return (
        <div className="app-shell">
            <GameHeader active="battle" />
            <main id="main" className="page-container battle-page">
                <div className="battle-topline">
                    <div><p className="eyebrow">PRIVATE DUEL / {room_code}</p><h1>{waiting ? 'Prepare for deployment.' : game_state?.status === 'finished' ? 'Battle complete.' : 'The arena is yours.'}</h1></div>
                    <Status tone={connected ? 'good' : error ? 'danger' : 'neutral'}>{connected ? 'Opponent connected' : error ? 'Connection interrupted' : 'Waiting for connection'}</Status>
                </div>
                {error && <div className="form-error" role="alert">{error} {!connected && <Button variant="secondary" onClick={retryConnection}>Retry connection</Button>}</div>}
                {!game_state ? (
                    <Panel className="empty-state"><div className="loading-line" /><h2>{error ? 'Unable to enter the arena' : 'Preparing your arena…'}</h2><p className="muted">Your battle will appear here once the room is ready.</p><Link href="/" className="button button-secondary">Back to lobby</Link></Panel>
                ) : waiting ? (
                    <>
                        <div className="lobby-grid">
                            <Panel className="lobby-preview">
                                <div className="panel-topline"><span className="eyebrow">COMBATANTS</span><span className="micro-label">1V1 ARENA</span></div>
                                <ArenaArtwork />
                                <div style={{ padding: '0 22px 14px' }}>
                                    <div className="player-slot"><div><strong>{username}</strong><small>YOU · {is_host ? 'ROOM HOST' : 'CHALLENGER'}</small></div><Status tone={game_state.myState.isReady ? 'good' : 'neutral'}>{game_state.myState.isReady ? 'Ready' : 'Not ready'}</Status></div>
                                    <div className="player-slot"><div><strong>{connected || opponent_state ? opponent_name : 'Opponent slot open'}</strong><small>{connected ? 'CONNECTED' : 'AWAITING CONNECTION'}</small></div><Status tone={opponent_state?.isReady ? 'good' : 'neutral'}>{opponent_state?.isReady ? 'Ready' : connected ? 'Not ready' : 'Waiting'}</Status></div>
                                </div>
                            </Panel>
                            <Panel className="lobby-controls">
                                <h2>Bring your rival.</h2><p className="muted">Share this invite with a friend. Your duel begins when you both select Ready.</p>
                                <div className="invite-row"><Field id="room-code" label="Battle code" value={room_code} readOnly onFocus={(event) => event.target.select()} /><Button variant="secondary" onClick={() => void copyInvite(room_code, 'Battle code')}>Copy code</Button></div>
                                <Button variant="secondary" className="full-width" onClick={() => void copyInvite(invite_url, 'Invitation link')} disabled={!invite_url}>Copy invitation link<span aria-hidden="true">↗</span></Button>
                                <p className="copy-note" role="status">{copy_message}</p>
                                <p className="invite-link">{invite_url}</p>
                                <div className="divider"><span>PRE-FLIGHT CHECK</span></div>
                                <Button className="full-width" onClick={handleReady} disabled={!connected || game_state.myState.isReady}>{game_state.myState.isReady ? 'Ready · Waiting for your rival' : 'Ready to battle'}<span aria-hidden="true">→</span></Button>
                                <p className="lobby-hint">Type fast, stay accurate. Finish the quote first or reduce your opponent’s health to zero. Wrong keys are marked and lower accuracy, but they will not stop your cursor.</p>
                            </Panel>
                        </div>
                        <Link href="/" className="text-link">← Leave room and return to lobby</Link>
                    </>
                ) : (
                    <>
                        <HealthBars myHp={game_state.myState.hp} opponentHp={opponent_state?.hp ?? 100} myName={username} opponentName={opponent_name} />
                        <BattleScene key={room_code} quote_text={game_state.quote?.text ?? ''} connected={connected} status={game_state.status} winner={game_state.winner} paused={results_visible}
                            my_position={game_state.myState.position} opponent_position={opponent_state?.position ?? 0}
                            my_mistakes={game_state.myState.totalKeystrokes - game_state.myState.correctKeystrokes}
                            opponent_mistakes={(opponent_state?.totalKeystrokes ?? 0) - (opponent_state?.correctKeystrokes ?? 0)}
                            my_hp={game_state.myState.hp} opponent_hp={opponent_state?.hp ?? 100} />
                        {game_state.status === 'finished' && !results_visible && <div className="finish-actions"><span>{game_state.winner === 'me' ? 'Victory is yours.' : 'Duel complete.'}</span><Button variant="secondary" onClick={() => setResultsVisible(true)}>View results</Button></div>}
                        {game_state.status === 'countdown' && <div className="countdown-banner" role="status"><strong>{countdown || 3}</strong><span>Hands on the keyboard. Your duel is about to begin.</span></div>}
                        <TypingInterface gameState={game_state} onKeystroke={handleKeystroke} disabled={!connected} />
                        {opponent_state && <div className="opponent-progress"><span>OPPONENT</span><strong>{opponent_name}</strong><progress aria-label="Opponent quote progress" value={opponent_state.position} max={game_state.quote?.text.length || 1} /><span>{Math.round(opponent_state.wpm)} WPM · {Math.round(opponent_state.accuracy * 100)}% accuracy</span></div>}
                    </>
                )}
                {game_state?.status === 'finished' && results_visible && (
                    <GameDialog title={game_state.winner === 'me' ? 'Victory is yours.' : 'A battle. Not the war.'}>
                        <p className={'result-mark' + (game_state.winner === 'me' ? '' : ' defeat')}>{game_state.winner === 'me' ? 'VICTORY' : 'DEFEAT'}</p>
                        <p className="muted">{game_state.winner === 'me' ? 'You defeated ' + opponent_name + '.' : opponent_name + ' won this duel. Your next battle awaits.'}</p>
                        <div className="result-metrics"><Metric label="Your WPM" value={Math.round(game_state.myState.wpm)} accent /><Metric label="Your accuracy" value={Math.round(game_state.myState.accuracy * 100) + '%'} /></div>
                        {save_error && <p role="alert" className="form-error">{save_error}</p>}
                        <div className="dialog-actions"><Link href="/" className="button button-primary">Back to lobby</Link><Link href="/stats" className="button button-secondary">Combat record</Link></div>
                    </GameDialog>
                )}
            </main>
            <GameFooter />
        </div>
    );
}
