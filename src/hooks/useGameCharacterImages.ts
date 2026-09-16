'use client';

import { useState, type ChangeEvent } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { prepareCharacterImage } from '@/lib/local-character-image';

export type CharacterImageTarget = 'fighter_head_image' | 'punching_bag_image';

export function useGameCharacterImages() {
    const { settings, loading, saveSettings } = useSettings();
    const [uploading_target, setUploadingTarget] = useState<CharacterImageTarget | null>(null);
    const [image_message, setImageMessage] = useState('');
    const [image_error, setImageError] = useState('');

    async function uploadImage(target: CharacterImageTarget, event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || uploading_target) return;
        setUploadingTarget(target);
        setImageMessage('');
        setImageError('');
        try {
            const image_source = await prepareCharacterImage(file);
            await saveSettings({ [target]: image_source });
            setImageMessage(target === 'fighter_head_image'
                ? 'Fighter image changed for this device and battle.'
                : 'Punching bag image changed for this device.');
        } catch (caught_error) {
            setImageError(caught_error instanceof Error ? caught_error.message : 'The selected image could not be saved.');
        } finally {
            setUploadingTarget(null);
        }
    }

    return {
        settings,
        settings_loading: loading,
        uploading_target,
        image_message,
        image_error,
        uploadImage,
    };
}
