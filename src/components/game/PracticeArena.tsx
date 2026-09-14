'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePracticeBattle } from '@/hooks/usePracticeBattle';
import { useSettings } from '@/hooks/useSettings';
import { playBattleSound } from '@/lib/battle-audio';
import { BattleScene } from '@/components/three/BattleScene';
import { TypingInterface } from '@/components/game/TypingInterface';
import { Button, GameDialog, GameFooter, GameHeader, Metric, Panel, Status } from '@/components/game/GameUI';

export function PracticeArena() {
    const { settings, loading: settings_loading } = useSettings();
    const { game_state, countdown, loading, error, startPractice, handleKeystroke } = usePracticeBattle(settings.quote_difficulty, !settings_loading);
    const [results_visible, setResultsVisible] = useState(false);
    const previous_position_ref = useRef(0);

    useEffect(() => {
        if (game_state?.status !== 'finished') return;
        playBattleSound('victory', settings.sound_enabled);
        const motion_query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const timer = setTimeout(() => setResultsVisible(true), motion_query.matches ? 0 : 900);
        return () => clearTimeout(timer);
    }, [game_state?.status, settings.sound_enabled]);

    useEffect(() => {
        previous_position_ref.current = 0;
    }, [game_state?.quote?.id]);

    useEffect(() => {
        if (game_state?.status === 'countdown' && countdown > 0) playBattleSound('countdown', settings.sound_enabled);
    }, [countdown, game_state?.status, settings.sound_enabled]);

    useEffect(() => {
        if (!game_state?.quote || game_state.myState.position <= previous_position_ref.current) return;
        const position = game_state.myState.position;
        const completed_word = /\S/.test(game_state.quote.text[position - 1] ?? '')
            && (position === game_state.quote.text.length || /\s/.test(game_state.quote.text[position] ?? ''));
        if (completed_word) playBattleSound('impact', settings.sound_enabled);
        previous_position_ref.current = position;
    }, [game_state?.myState.position, game_state?.quote, settings.sound_enabled]);

    function typeCharacter(character: string, is_correct: boolean) {
        playBattleSound(is_correct ? 'correct' : 'incorrect', settings.sound_enabled);
        handleKeystroke(character, is_correct);
    }

    function restartPractice() {
        setResultsVisible(false);
        previous_position_ref.current = 0;
        void startPractice();
    }

    const duration_ms = game_state?.endTime && game_state.startTime
        ? Math.max(0, game_state.endTime - game_state.startTime)
        : 0;

    return (
        <div className="app-shell">
            <GameHeader />
            <main id="main" className="page-container battle-page practice-page">
                <div className="battle-topline">
                    <div><p className="eyebrow">SOLO PRACTICE / LEVEL {settings.quote_difficulty}</p><h1>{game_state?.status === 'finished' ? 'Practice complete.' : 'Sharpen your strikes.'}</h1></div>
                    <Status tone={game_state?.status === 'active' ? 'good' : 'neutral'}>{game_state?.status === 'active' ? 'Practice active' : game_state?.status === 'finished' ? 'Run complete' : 'Preparing drill'}</Status>
                </div>
                {error ? (
                    <Panel className="empty-state"><h2>Practice is unavailable.</h2><p className="muted" role="alert">{error}</p><div className="actions"><Button onClick={restartPractice}>Try again</Button><Link href="/" className="button button-secondary">Back to lobby</Link></div></Panel>
                ) : settings_loading || loading || !game_state ? (
                    <Panel className="empty-state"><div className="loading-line" /><h2>Preparing your training target…</h2><p className="muted" role="status">Selecting a quote and setting up the punching bag.</p></Panel>
                ) : (
                    <>
                        <BattleScene
                            key={game_state.quote?.id}
                            quote_text={game_state.quote?.text ?? ''}
                            connected
                            status={game_state.status}
                            winner={game_state.winner}
                            paused={results_visible}
                            particles_enabled={settings.particles_enabled}
                            opponent_kind="punching_bag"
                            my_position={game_state.myState.position}
                            opponent_position={0}
                            my_mistakes={game_state.myState.totalKeystrokes - game_state.myState.correctKeystrokes}
                            opponent_mistakes={0}
                            my_hp={100}
                            opponent_hp={100}
                        />
                        {game_state.status === 'countdown' && <div className="countdown-banner" role="status"><strong>{countdown || 3}</strong><span>Hands on the keyboard. Practice begins soon.</span></div>}
                        {game_state.status === 'finished' && !results_visible && <div className="finish-actions"><span>Drill complete.</span><Button variant="secondary" onClick={() => setResultsVisible(true)}>View results</Button></div>}
                        <TypingInterface gameState={game_state} onKeystroke={typeCharacter} />
                        <div className="practice-target-note"><span>TARGET</span><strong>Punching Bag</strong><span>Complete the quote to finish the drill.</span></div>
                    </>
                )}
                {game_state?.status === 'finished' && results_visible && (
                    <GameDialog title="Practice complete.">
                        <p className="result-mark">DRILL COMPLETE</p>
                        <p className="muted">The punching bag survived. Your technique improved.</p>
                        <div className="result-metrics"><Metric label="Your WPM" value={Math.round(game_state.myState.wpm)} accent /><Metric label="Accuracy" value={Math.round(game_state.myState.accuracy * 100) + '%'} /><Metric label="Elapsed" value={(duration_ms / 1000).toFixed(1) + 's'} /></div>
                        <div className="dialog-actions"><Button onClick={restartPractice}>Practice another quote</Button><Link href="/" className="button button-secondary">Back to lobby</Link></div>
                    </GameDialog>
                )}
                <Link href="/" className="text-link">← Leave practice and return to lobby</Link>
            </main>
            <GameFooter />
        </div>
    );
}
