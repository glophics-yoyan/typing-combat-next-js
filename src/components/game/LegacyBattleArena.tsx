'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useBattle } from '@/hooks/useBattle';
import { useSettings } from '@/hooks/useSettings';
import { recordMatch } from '@/lib/storage';
import { BattleScene } from '@/components/three/BattleScene';
import { HealthBars } from '@/components/game/HealthBars';
import { TypingInterface } from '@/components/game/TypingInterface';
import { Button, GameDialog, GameFooter, GameHeader, Metric, Panel, Status } from '@/components/game/GameUI';

interface LegacyBattleArenaProps {
    room_code: string;
    is_host: boolean;
    user_id: string;
    username: string;
    opponent_username: string;
}

export function LegacyBattleArena({ room_code, is_host, user_id, username, opponent_username }: LegacyBattleArenaProps) {
    const [results_visible, setResultsVisible] = useState(false);
    const { settings } = useSettings();
    const { gameState: game_state, connected, error, countdown, handleKeystroke, handleReady, startCountdown, retryConnection, opponentUsername } = useBattle({
        roomCode: room_code,
        isHost: is_host,
        userId: user_id,
        username,
        onGameEnd: (won, wpm, accuracy, duration_ms) => {
            void recordMatch(`legacy-${crypto.randomUUID()}`, won, wpm, accuracy, duration_ms, opponentUsername || opponent_username);
            setResultsVisible(true);
        },
    });
    const opponent_name = opponentUsername || opponent_username;
    const opponent_state = game_state?.opponentState;

    useEffect(() => {
        if (is_host && connected && game_state?.status === 'waiting' && game_state.myState.isReady && game_state.opponentState?.isReady) startCountdown();
    }, [connected, game_state, is_host, startCountdown]);

    return (
        <div className="app-shell">
            <GameHeader active="battle" />
            <main id="main" className="page-container battle-page">
                <div className="battle-topline"><div><p className="eyebrow">PRIVATE DUEL / {room_code} / V1</p><h1>{game_state?.status === 'finished' ? 'Battle complete.' : 'Relay battle.'}</h1></div><Status tone={connected ? 'good' : error ? 'danger' : 'neutral'}>{connected ? 'Opponent connected' : 'Waiting for connection'}</Status></div>
                {error && <div className="form-error">{error} <Button variant="secondary" onClick={retryConnection}>Retry</Button></div>}
                {!game_state ? <Panel className="empty-state"><div className="loading-line" /><h2>Preparing the legacy arena…</h2></Panel> : game_state.status === 'waiting' ? (
                    <Panel className="lobby-controls"><h2>Prepare for battle.</h2><p className="muted">Share code <strong>{room_code}</strong>. Both players must be ready.</p><Button onClick={handleReady} disabled={!connected || game_state.myState.isReady}>{game_state.myState.isReady ? 'Ready' : 'Ready to battle'}</Button></Panel>
                ) : (
                    <>
                        <HealthBars myHp={game_state.myState.hp} opponentHp={opponent_state?.hp ?? 100} myName={username} opponentName={opponent_name} />
                        <BattleScene quote_text={game_state.quote?.text ?? ''} connected={connected} status={game_state.status} winner={game_state.winner} paused={results_visible} particles_enabled={settings.particles_enabled} my_position={game_state.myState.position} opponent_position={opponent_state?.position ?? 0} my_mistakes={game_state.myState.totalKeystrokes - game_state.myState.correctKeystrokes} opponent_mistakes={(opponent_state?.totalKeystrokes ?? 0) - (opponent_state?.correctKeystrokes ?? 0)} my_hp={game_state.myState.hp} opponent_hp={opponent_state?.hp ?? 100} />
                        {game_state.status === 'countdown' && <div className="countdown-banner"><strong>{countdown || 3}</strong><span>Battle begins soon.</span></div>}
                        <TypingInterface gameState={game_state} onKeystroke={handleKeystroke} disabled={!connected} />
                    </>
                )}
                {game_state?.status === 'finished' && results_visible && <GameDialog title={game_state.winner === 'me' ? 'Victory is yours.' : 'Battle complete.'}><div className="result-metrics"><Metric label="Your WPM" value={Math.round(game_state.myState.wpm)} accent /><Metric label="Accuracy" value={Math.round(game_state.myState.accuracy * 100) + '%'} /></div><div className="dialog-actions"><Link href="/" className="button button-primary">Back to lobby</Link><Link href="/stats" className="button button-secondary">Combat record</Link></div></GameDialog>}
            </main>
            <GameFooter />
        </div>
    );
}
