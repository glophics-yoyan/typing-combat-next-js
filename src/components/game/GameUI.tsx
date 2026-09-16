'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode, type ButtonHTMLAttributes, type ChangeEventHandler, type InputHTMLAttributes } from 'react';

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

interface ArenaImagePickersProps {
    on_player_image_change?: ChangeEventHandler<HTMLInputElement>;
    on_target_image_change?: ChangeEventHandler<HTMLInputElement>;
    disabled?: boolean;
    target_kind?: 'fighter' | 'punching_bag';
}

export function ArenaImagePickers({ on_player_image_change, on_target_image_change, disabled = false, target_kind = 'fighter' }: ArenaImagePickersProps) {
    return <>
        {on_player_image_change && <label className="arena-image-picker arena-player-image-picker" data-label="CHANGE FIGHTER" title="Change fighter image">
            <span className="sr-only">Choose a new fighter image</span>
            <input className="local-image-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={on_player_image_change} />
        </label>}
        {on_target_image_change && <label className="arena-image-picker arena-target-image-picker" data-label={target_kind === 'punching_bag' ? 'CHANGE BAG' : 'CHANGE FIGHTER'} title={target_kind === 'punching_bag' ? 'Change punching bag image' : 'Change fighter image'}>
            <span className="sr-only">{target_kind === 'punching_bag' ? 'Choose a new punching bag image' : 'Choose a new fighter image'}</span>
            <input className="local-image-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={on_target_image_change} />
        </label>}
    </>;
}

export function ArenaArtwork({ opponent_kind = 'fighter', player_head_image = null, opponent_head_image = null, punching_bag_image = null, on_player_image_change, on_target_image_change, image_picker_disabled = false }: { opponent_kind?: 'fighter' | 'punching_bag'; player_head_image?: string | null; opponent_head_image?: string | null; punching_bag_image?: string | null; on_player_image_change?: ChangeEventHandler<HTMLInputElement>; on_target_image_change?: ChangeEventHandler<HTMLInputElement>; image_picker_disabled?: boolean }) {
    const is_practice = opponent_kind === 'punching_bag';

    return (
        <div className={'arena-art' + (is_practice ? ' practice-arena-art' : '')} aria-hidden={on_player_image_change || on_target_image_change ? undefined : true}>
            <div className="arena-orbit orbit-one" /><div className="arena-orbit orbit-two" />
            <div className="arena-grid" />
            <div className="combatant combatant-left"><div className={'helmet' + (player_head_image ? ' has-local-image' : '')}>{player_head_image ? <b className="local-image-face" style={{ backgroundImage: `url("${player_head_image}")` }} /> : <i />}</div><div className="armor"><i /></div><div className="arm arm-left" /><div className="arm arm-right" /><div className="legs" /></div>
            {is_practice
                ? <div className="fallback-punching-bag"><div className={'bag-target' + (punching_bag_image ? ' has-local-image' : '')}>{punching_bag_image ? <b className="local-image-face bag-image-face" style={{ backgroundImage: `url("${punching_bag_image}")` }} /> : <><i /><span /></>}</div><div className="bag-post" /><div className="bag-base" /></div>
                : <div className="combatant combatant-right"><div className={'helmet' + (opponent_head_image ? ' has-local-image' : '')}>{opponent_head_image ? <b className="local-image-face" style={{ backgroundImage: `url("${opponent_head_image}")` }} /> : <i />}</div><div className="armor"><i /></div><div className="arm arm-left" /><div className="arm arm-right" /><div className="legs" /></div>}
            <div className="arena-versus">{is_practice ? 'PRACTICE' : 'VS'}<span>{is_practice ? 'SOLO DRILL' : 'DUEL PROTOCOL'}</span></div>
            <span className="art-label art-label-left">01 / YOU</span><span className="art-label art-label-right">{is_practice ? 'TARGET / BAG' : '02 / OPPONENT'}</span>
            <ArenaImagePickers on_player_image_change={on_player_image_change} on_target_image_change={on_target_image_change} disabled={image_picker_disabled} target_kind={opponent_kind} />
        </div>
    );
}
