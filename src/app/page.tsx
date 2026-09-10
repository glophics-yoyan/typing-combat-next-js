'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocalStats } from '@/hooks/useLocalStats';
import { ArenaArtwork, Button, Field, GameFooter, GameHeader, Metric, Panel } from '@/components/game/GameUI';
import type { ApiEnvelope, RoomSessionData } from '@/types';

export default function Home() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [join_code, setJoinCode] = useState('');
    const [pending_action, setPendingAction] = useState<'create' | 'join' | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const name_ref = useRef<HTMLInputElement>(null);
    const name_edited_ref = useRef(false);
    const { stats, loading } = useLocalStats();

    useEffect(() => {
        const frame_id = requestAnimationFrame(() => {
            try {
                const saved_name = localStorage.getItem('typeracer-username') || '';
                if (!name_edited_ref.current) setUsername(saved_name);
                const requested_code = new URLSearchParams(window.location.search).get('join')?.trim().toUpperCase();
                if (!requested_code) return;
                setJoinCode(requested_code);
                setPendingAction('join');
                if (/^[A-Z2-9]{6}$/.test(requested_code) && saved_name.trim().length >= 2) {
                    router.replace('/battle/' + requested_code);
                } else {
                    name_ref.current?.focus();
                }
            } catch {
                setError('Browser storage is unavailable. Enable site storage to enter a battle.');
            }
        });
        return () => cancelAnimationFrame(frame_id);
    }, [router]);

    async function enterBattle(action: 'create' | 'join') {
        if (busy) return;
        setError('');
        setPendingAction(action);
        const normalized_name = username.trim();
        const normalized_code = join_code.trim().toUpperCase();
        if (normalized_name.length < 2 || normalized_name.length > 32) {
            setError('Choose a player name between 2 and 32 characters to continue.');
            name_ref.current?.focus();
            return;
        }
        if (action === 'join' && !/^[A-Z2-9]{6}$/.test(normalized_code)) {
            setError('Enter the 6-character battle code shared by your opponent.');
            document.getElementById('join-code')?.focus();
            return;
        }
        setBusy(true);
        try {
            localStorage.setItem('typeracer-username', normalized_name);
            if (action === 'join') {
                router.push('/battle/' + normalized_code);
                return;
            }
            if (process.env.NEXT_PUBLIC_GAME_PROTOCOL_VERSION === '1') {
                const legacy_response = await fetch('/api/rooms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: normalized_name, difficulty: stats?.settings.quote_difficulty ?? 2 }),
                });
                const legacy_data = await legacy_response.json();
                if (!legacy_response.ok) throw new Error(legacy_data.error || 'Unable to create a battle. Please try again.');
                localStorage.setItem('typeracer-room-user-' + legacy_data.code, legacy_data.userId);
                router.push('/battle/' + legacy_data.code);
                return;
            }
            const response = await fetch('/api/v2/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: normalized_name, difficulty: stats?.settings.quote_difficulty ?? 2 }),
            });
            const envelope = await response.json() as ApiEnvelope<RoomSessionData>;
            if (!response.ok || !envelope.data) throw new Error(envelope.message || 'Unable to create a battle. Please try again.');
            sessionStorage.setItem('typeracer-room-session-' + envelope.data.room.code, JSON.stringify(envelope.data));
            router.push('/battle/' + envelope.data.room.code);
        } catch (caught_error) {
            setError(caught_error instanceof Error ? caught_error.message : 'Unable to connect. Please try again.');
            setBusy(false);
        }
    }

    return (
        <div className="app-shell">
            <GameHeader />
            <main id="main" className="page-container home-page">
                <div className="hero-heading">
                    <p className="eyebrow"><span className="small-cross">+</span> THE KEYBOARD IS YOUR WEAPON</p>
                    <h1>Fast fingers.<br /><span>Last fighter standing.</span></h1>
                    <p className="hero-description">Turn every keystroke into firepower. Challenge a friend<br className="desktop-break" /> to a real-time typing duel. Make every character count.</p>
                </div>
                <div className="home-grid">
                    <Panel className="arena-preview">
                        <div className="panel-topline"><span className="eyebrow">THE ARENA</span><span className="micro-label">HEAD-TO-HEAD / 01</span></div>
                        <ArenaArtwork />
                        <div className="preview-caption"><span className="preview-key">A<span>→</span></span><div><strong>Your words. Your firepower.</strong><p>Outtype. Outlast. Win the duel.</p></div><span className="caption-arrow">↗</span></div>
                    </Panel>
                    <Panel className="deployment-panel">
                        <div className="panel-topline"><span className="eyebrow">ENTER THE ARENA</span><span className="micro-label">01 — 02</span></div>
                        <h2>Ready to battle?</h2>
                        <p className="muted">Choose your name. Call out your opponent.</p>
                        <form onSubmit={(event) => { event.preventDefault(); void enterBattle(pending_action || 'create'); }}>
                            <div className="field name-field">
                                <label htmlFor="player-name">Player name</label>
                                <input ref={name_ref} id="player-name" value={username} onChange={(event) => { name_edited_ref.current = true; setUsername(event.target.value); }} maxLength={32} placeholder="Enter your callsign" autoComplete="nickname" aria-describedby="name-hint" />
                                <p className="field-hint" id="name-hint">2–32 characters · No account needed</p>
                            </div>
                            {error && <p className="form-error" role="alert">{error}</p>}
                            <Button type="button" className="full-width" disabled={busy} onClick={() => void enterBattle('create')}>{busy && pending_action === 'create' ? 'Creating battle…' : 'Create battle'}<span aria-hidden="true">↗</span></Button>
                        </form>
                        <div className="divider"><span>HAVE AN INVITE?</span></div>
                        <form onSubmit={(event) => { event.preventDefault(); void enterBattle('join'); }} className="join-form">
                            <Field id="join-code" label="Battle code" value={join_code} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} autoComplete="off" spellCheck={false} />
                            <Button variant="secondary" type="submit" disabled={busy}>{busy && pending_action === 'join' ? 'Joining…' : 'Join battle'}</Button>
                        </form>
                        <p className="setup-note">Private room. Just you and your rival.</p>
                    </Panel>
                </div>
                <section className="rules-section" aria-labelledby="rules-title">
                    <div className="section-heading"><h2 id="rules-title">Three steps. One winner.</h2><span className="micro-label">HOW TO PLAY</span></div>
                    <div className="rules-grid">
                        <article><span className="rule-number">01</span><div><h3>Challenge a friend</h3><p>Create a room and share the invite. Both players ready up to begin.</p></div></article>
                        <article><span className="rule-number">02</span><div><h3>Type to attack</h3><p>Type the quote accurately. Speed builds damage; mistakes weaken your attack.</p></div></article>
                        <article><span className="rule-number">03</span><div><h3>Claim the victory</h3><p>Finish the quote first or bring your opponent’s health down to zero.</p></div></article>
                    </div>
                </section>
                <Panel className="record-strip">
                    <div><p className="eyebrow">YOUR COMBAT RECORD</p><Link href="/stats" className="text-link">View full record <span aria-hidden="true">↗</span></Link></div>
                    <div className="record-metrics"><Metric label="Battles" value={loading ? '—' : stats?.total_matches ?? 0} /><Metric label="Victories" value={loading ? '—' : stats?.wins ?? 0} accent /><Metric label="Best WPM" value={loading ? '—' : Math.round(stats?.best_wpm ?? 0)} /><Metric label="Best accuracy" value={loading ? '—' : Math.round((stats?.best_accuracy ?? 0) * 100) + '%'} /></div>
                </Panel>
            </main>
            <GameFooter />
        </div>
    );
}
