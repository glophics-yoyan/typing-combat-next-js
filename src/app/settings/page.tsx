'use client';

import { useState, type ChangeEvent } from 'react';
import { Button, GameFooter, GameHeader, Panel } from '@/components/game/GameUI';
import { useSettings } from '@/hooks/useSettings';
import { prepareCharacterImage } from '@/lib/local-character-image';
import type { LocalStats } from '@/types';

type ImageSettingKey = 'fighter_head_image' | 'punching_bag_image';

export default function SettingsPage() {
    const { settings, loading, saveSettings } = useSettings();
    const [uploading_target, setUploadingTarget] = useState<ImageSettingKey | null>(null);
    const [image_message, setImageMessage] = useState('');
    const [image_error, setImageError] = useState('');

    function update<K extends keyof LocalStats['settings']>(key: K, value: LocalStats['settings'][K]) {
        void saveSettings({ [key]: value });
    }

    async function uploadImage(key: ImageSettingKey, event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || uploading_target) return;
        setUploadingTarget(key);
        setImageMessage('');
        setImageError('');
        try {
            const image_data = await prepareCharacterImage(file);
            await saveSettings({ [key]: image_data });
            setImageMessage(key === 'fighter_head_image' ? 'Fighter head saved on this device.' : 'Punching bag target saved on this device.');
        } catch (caught_error) {
            setImageError(caught_error instanceof Error ? caught_error.message : 'The selected image could not be saved.');
        } finally {
            setUploadingTarget(null);
        }
    }

    async function removeImage(key: ImageSettingKey) {
        if (uploading_target) return;
        setUploadingTarget(key);
        setImageMessage('');
        setImageError('');
        try {
            await saveSettings({ [key]: null });
            setImageMessage('Custom image removed from this device.');
        } catch {
            setImageError('The custom image could not be removed.');
        } finally {
            setUploadingTarget(null);
        }
    }

    return (
        <div className="app-shell">
            <GameHeader active="settings" />
            <main id="main" className="page-container settings-page">
                <div className="stats-heading"><div><p className="eyebrow">ARENA CONFIGURATION</p><h1>Battle settings.</h1><p className="muted">Tune the arena to match your setup.</p></div></div>
                <Panel className="settings-panel">
                    {loading && <p className="muted" role="status">Loading settings…</p>}
                    <label className="setting-row"><span><strong>Theme</strong><small>Choose the arena color scheme.</small></span><select value={settings.theme} onChange={(event) => update('theme', event.target.value as LocalStats['settings']['theme'])}><option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option></select></label>
                    <label className="setting-row"><span><strong>Quote difficulty</strong><small>The room host controls quote difficulty.</small></span><select value={settings.quote_difficulty} onChange={(event) => update('quote_difficulty', Number(event.target.value) as LocalStats['settings']['quote_difficulty'])}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>Level {value}</option>)}</select></label>
                    <label className="setting-row"><span><strong>Combat particles</strong><small>Show word projectiles, sparks, and impact bursts.</small></span><input type="checkbox" checked={settings.particles_enabled} onChange={(event) => update('particles_enabled', event.target.checked)} /></label>
                    <label className="setting-row"><span><strong>Battle sounds</strong><small>Play synthesized typing and combat cues.</small></span><input type="checkbox" checked={settings.sound_enabled} onChange={(event) => update('sound_enabled', event.target.checked)} /></label>
                    <div className="character-customization">
                        <div><p className="eyebrow">LOCAL CHARACTER IMAGES</p><h2>Customize your training crew.</h2><p className="muted">Images are cropped, resized, and stored only in this browser. They are never uploaded.</p></div>
                        <div className="image-customization-grid">
                            <section className="image-setting-card" aria-labelledby="fighter-image-title">
                                <div className="local-image-preview fighter-image-preview" role="img" aria-label={settings.fighter_head_image ? 'Custom fighter head preview' : 'Default fighter head preview'} style={settings.fighter_head_image ? { backgroundImage: `url("${settings.fighter_head_image}")` } : undefined}><span>{settings.fighter_head_image ? '' : 'DEFAULT'}</span></div>
                                <div><h3 id="fighter-image-title">Fighter head</h3><p>Mapped onto your fighter’s 3D faceplate in battles and practice.</p></div>
                                <input className="local-image-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose fighter head image" disabled={loading || Boolean(uploading_target)} onChange={(event) => void uploadImage('fighter_head_image', event)} />
                                {settings.fighter_head_image && <Button variant="secondary" disabled={Boolean(uploading_target)} onClick={() => void removeImage('fighter_head_image')}>Remove image</Button>}
                            </section>
                            <section className="image-setting-card" aria-labelledby="bag-image-title">
                                <div className="local-image-preview bag-image-preview" role="img" aria-label={settings.punching_bag_image ? 'Custom punching bag target preview' : 'Default punching bag target preview'} style={settings.punching_bag_image ? { backgroundImage: `url("${settings.punching_bag_image}")` } : undefined}><span>{settings.punching_bag_image ? '' : 'TARGET'}</span></div>
                                <div><h3 id="bag-image-title">Punching bag target</h3><p>Fitted to the reactive 3D target in solo practice.</p></div>
                                <input className="local-image-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose punching bag target image" disabled={loading || Boolean(uploading_target)} onChange={(event) => void uploadImage('punching_bag_image', event)} />
                                {settings.punching_bag_image && <Button variant="secondary" disabled={Boolean(uploading_target)} onClick={() => void removeImage('punching_bag_image')}>Remove image</Button>}
                            </section>
                        </div>
                        {uploading_target && <p className="image-status" role="status">Processing image locally…</p>}
                        {image_message && <p className="image-status image-success" role="status">{image_message}</p>}
                        {image_error && <p className="form-error" role="alert">{image_error}</p>}
                    </div>
                </Panel>
            </main>
            <GameFooter />
        </div>
    );
}
