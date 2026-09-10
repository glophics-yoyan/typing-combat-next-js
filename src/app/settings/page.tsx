'use client';

import { GameFooter, GameHeader, Panel } from '@/components/game/GameUI';
import { useSettings } from '@/hooks/useSettings';
import type { LocalStats } from '@/types';

export default function SettingsPage() {
    const { settings, loading, saveSettings } = useSettings();

    function update<K extends keyof LocalStats['settings']>(key: K, value: LocalStats['settings'][K]) {
        void saveSettings({ [key]: value });
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
                </Panel>
            </main>
            <GameFooter />
        </div>
    );
}
