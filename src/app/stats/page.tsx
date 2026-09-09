'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocalStats } from '@/hooks/useLocalStats';
import { clearAllStats } from '@/lib/storage';
import { Button, GameDialog, GameFooter, GameHeader, Metric, Panel } from '@/components/game/GameUI';

export default function StatsPage() {
    const { stats, loading, refresh } = useLocalStats();
    const [confirm_reset, setConfirmReset] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [reset_error, setResetError] = useState('');
    const win_rate = stats && stats.totalMatches > 0 ? Math.round(stats.wins / stats.totalMatches * 100) : 0;
    const average_wpm = stats && stats.totalTimeMs > 0 ? Math.round(stats.totalKeystrokes / 5 / (stats.totalTimeMs / 60000)) : 0;

    async function resetStats() {
        setResetting(true);
        setResetError('');
        try {
            await clearAllStats();
            await refresh();
            setConfirmReset(false);
        } catch {
            setResetError('Unable to reset your record. Please try again.');
        } finally {
            setResetting(false);
        }
    }

    return (
        <div className="app-shell">
            <GameHeader active="stats" />
            <main id="main" className="page-container">
                <div className="stats-heading">
                    <div><p className="eyebrow">PLAYER INTELLIGENCE</p><h1>Your combat record.</h1><p className="muted">Every duel is a chance to get sharper.</p></div>
                    <Link href="/" className="button button-primary">Enter the arena <span aria-hidden="true">↗</span></Link>
                </div>
                {loading ? <Panel className="empty-state"><div className="loading-line" /><p className="muted" role="status">Loading your combat record…</p></Panel> : !stats ? <Panel className="empty-state"><h2>Record unavailable</h2><p className="muted">Check that your browser allows site storage, then refresh this page.</p></Panel> : (
                    <>
                        <Panel className="stats-summary">
                            <Metric label="Battles played" value={stats.totalMatches} />
                            <Metric label="Victories" value={stats.wins} accent />
                            <Metric label="Win rate" value={win_rate + '%'} />
                            <Metric label="Best WPM" value={Math.round(stats.bestWpm)} />
                        </Panel>
                        <div className="stats-grid">
                            <Panel className="history-panel">
                                <div className="section-heading"><h2>Battle history</h2><span className="micro-label">LAST {stats.recentMatches.length} DUELS</span></div>
                                {stats.recentMatches.length === 0 ? (
                                    <div className="empty-state"><span className="empty-symbol" aria-hidden="true">[ — ]</span><h2>A clean slate. A new challenger.</h2><p className="muted">Your battles will appear here.<br />Invite a friend and make your first mark.</p><Link href="/" className="button button-secondary">Play your first battle</Link></div>
                                ) : stats.recentMatches.map((match) => (
                                    <article className="match-row" key={match.id}>
                                        <span className={'match-badge' + (match.won ? '' : ' loss')} aria-label={match.won ? 'Victory' : 'Defeat'}>{match.won ? 'W' : 'L'}</span>
                                        <div><strong>vs. {match.opponentName}</strong><small>{new Date(match.playedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {formatDuration(match.durationMs)}</small></div>
                                        <div className="match-score"><strong>{Math.round(match.wpm)} WPM</strong><small>{Math.round(match.accuracy * 100)}% accuracy</small></div>
                                    </article>
                                ))}
                            </Panel>
                            <aside className="stats-sidebar">
                                <Panel><h2>Performance</h2><div className="detail-row"><span>Average speed</span><strong>{average_wpm} WPM</strong></div><div className="detail-row"><span>Best accuracy</span><strong>{Math.round(stats.bestAccuracy * 100)}%</strong></div><div className="detail-row"><span>Defeats</span><strong>{stats.losses}</strong></div><div className="detail-row"><span>Time in combat</span><strong>{formatDuration(stats.totalTimeMs)}</strong></div></Panel>
                                <Panel><h2>Session record</h2><div className="detail-row"><span>Battles</span><strong>{stats.sessionMatches}</strong></div><div className="detail-row"><span>Victories</span><strong>{stats.sessionWins}</strong></div></Panel>
                                <Panel><h2>Your data</h2><p className="muted" style={{ fontSize: 12 }}>Your combat record is saved in this browser, on this device.</p><Button variant="danger" style={{ marginTop: 20, width: '100%' }} onClick={() => setConfirmReset(true)}>Reset combat record</Button></Panel>
                            </aside>
                        </div>
                    </>
                )}
                {confirm_reset && (
                    <GameDialog title="Reset your combat record?" onClose={() => { if (!resetting) setConfirmReset(false); }}>
                        <p className="muted">This permanently removes all saved match history and statistics from this browser. Your player name and preferences will stay.</p>
                        {reset_error && <p className="form-error" role="alert">{reset_error}</p>}
                        <div className="dialog-actions"><Button variant="secondary" autoFocus disabled={resetting} onClick={() => setConfirmReset(false)}>Keep my record</Button><Button variant="danger" disabled={resetting} onClick={() => void resetStats()}>{resetting ? 'Resetting…' : 'Reset record'}</Button></div>
                    </GameDialog>
                )}
            </main>
            <GameFooter />
        </div>
    );
}

function formatDuration(duration_ms: number) {
    const seconds = Math.floor(duration_ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? minutes + 'm ' + seconds % 60 + 's' : seconds + 's';
}
