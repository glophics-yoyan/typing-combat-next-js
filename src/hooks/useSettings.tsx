'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getLocalStats, updateSettings } from '@/lib/storage';
import type { LocalStats } from '@/types';

const DEFAULT_SETTINGS: LocalStats['settings'] = {
    sound_enabled: true,
    particles_enabled: true,
    theme: 'system',
    quote_difficulty: 2,
};

interface SettingsContextValue {
    settings: LocalStats['settings'];
    loading: boolean;
    saveSettings: (updates: Partial<LocalStats['settings']>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void getLocalStats()
            .then((stats) => setSettings(stats.settings))
            .catch(() => setSettings(DEFAULT_SETTINGS))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        if (settings.theme === 'system') root.removeAttribute('data-theme');
        else root.dataset.theme = settings.theme;
    }, [settings.theme]);

    async function saveSettings(updates: Partial<LocalStats['settings']>) {
        const stats = await updateSettings(updates);
        setSettings(stats.settings);
    }

    return <SettingsContext.Provider value={{ settings, loading, saveSettings }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used inside SettingsProvider');
    return context;
}
