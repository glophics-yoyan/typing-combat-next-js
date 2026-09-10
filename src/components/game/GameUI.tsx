'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';

export function GameHeader({ active = 'play' }: { active?: 'play' | 'stats' | 'battle' | 'settings' }) {
    return (
        <header className="game-header">
            <a className="skip-link" href="#main">Skip to content</a>
            <div className="header-inner">
                <Link href="/" className="brand" aria-label="TypeRacer Combat home">
                    <span className="brand-mark" aria-hidden="true">⌁</span>
                    <span>TYPERACER<span className="brand-sub">COMBAT</span></span>
                </Link>
                <nav aria-label="Main navigation">
                    <Link href="/" aria-current={active === 'play' ? 'page' : undefined}>Play</Link>
                    <Link href="/stats" aria-current={active === 'stats' ? 'page' : undefined}>Combat record</Link>
                    <Link href="/settings" aria-current={active === 'settings' ? 'page' : undefined}>Settings</Link>
                </nav>
                <span className="header-tag">1V1 · TYPING ARENA</span>
            </div>
        </header>
    );
}

export function Panel({ children, className: class_name = '' }: { children: ReactNode; className?: string }) {
    return <section className={`panel ${class_name}`}>{children}</section>;
}

export function Button({ children, className: class_name = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
    return <button className={`button button-${variant} ${class_name}`} {...props}>{children}</button>;
}

export function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
    return (
        <div className="field">
            <label htmlFor={props.id}>{label}</label>
            <input {...props} aria-describedby={hint ? `${props.id}-hint` : props['aria-describedby']} />
            {hint && <p id={`${props.id}-hint`} className="field-hint">{hint}</p>}
        </div>
    );
}

export function Status({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'danger' }) {
    return <span className={`status status-${tone}`}><span aria-hidden="true" />{children}</span>;
}

export function Metric({ label, value, accent = false }: { label: string; value: ReactNode; accent?: boolean }) {
    return <div className={`metric ${accent ? 'metric-accent' : ''}`}><strong>{value}</strong><span>{label}</span></div>;
}

export function GameDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
    const dialog_ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const previous_focus = document.activeElement as HTMLElement | null;
        const dialog = dialog_ref.current;
        dialog?.showModal();
        return () => {
            dialog?.close();
            previous_focus?.focus();
        };
    }, []);
    return (
        <dialog ref={dialog_ref} className="game-dialog" aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); onClose?.(); }}>
            <p className="eyebrow">TYPERACER / COMBAT</p>
            <h2 id="dialog-title">{title}</h2>
            {children}
        </dialog>
    );
}

export function GameFooter() {
    return <footer className="game-footer"><span>EVERY KEYSTROKE COUNTS.</span><span>Speed is power. Accuracy is everything.</span></footer>;
}

export function ArenaArtwork() {
    return (
        <div className="arena-art" aria-hidden="true">
            <div className="arena-orbit orbit-one" /><div className="arena-orbit orbit-two" />
            <div className="arena-grid" />
            <div className="combatant combatant-left"><div className="helmet"><i /></div><div className="armor"><i /></div><div className="arm arm-left" /><div className="arm arm-right" /><div className="legs" /></div>
            <div className="combatant combatant-right"><div className="helmet"><i /></div><div className="armor"><i /></div><div className="arm arm-left" /><div className="arm arm-right" /><div className="legs" /></div>
            <div className="arena-versus">VS<span>DUEL PROTOCOL</span></div>
            <span className="art-label art-label-left">01 / YOU</span><span className="art-label art-label-right">02 / OPPONENT</span>
        </div>
    );
}
