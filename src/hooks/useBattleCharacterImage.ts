'use client';

import { useEffect, useRef, useState } from 'react';
import type { ApiEnvelope } from '@/types';

interface UseBattleCharacterImageOptions {
    room_code: string;
    join_token: string;
    enabled: boolean;
    player_head_image: string | null;
}

interface CharacterImageResponse {
    changed: boolean;
    revision: string | null;
    image_source?: string | null;
}

const CHARACTER_IMAGE_POLL_INTERVAL_MS = 1000;

export function useBattleCharacterImage({ room_code, join_token, enabled, player_head_image }: UseBattleCharacterImageOptions) {
    const [opponent_head_image, setOpponentHeadImage] = useState<string | null>(null);
    const revision_ref = useRef<string | null>(null);

    useEffect(() => {
        if (!enabled) return;
        const abort_controller = new AbortController();
        void fetch(`/api/v2/rooms/${room_code}/character-image`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${join_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_source: player_head_image }),
            cache: 'no-store',
            signal: abort_controller.signal,
        }).catch(() => undefined);
        return () => abort_controller.abort();
    }, [enabled, join_token, player_head_image, room_code]);

    useEffect(() => {
        if (!enabled) {
            revision_ref.current = null;
            const reset_timer = setTimeout(() => setOpponentHeadImage(null), 0);
            return () => clearTimeout(reset_timer);
        }
        let cancelled = false;
        let poll_timer: ReturnType<typeof setTimeout> | null = null;
        let active_request: AbortController | null = null;

        async function poll() {
            active_request = new AbortController();
            try {
                const revision = revision_ref.current;
                const query = revision ? `?revision=${encodeURIComponent(revision)}` : '';
                const response = await fetch(`/api/v2/rooms/${room_code}/character-image${query}`, {
                    headers: { Authorization: `Bearer ${join_token}` },
                    cache: 'no-store',
                    signal: active_request.signal,
                });
                const envelope = await response.json() as ApiEnvelope<CharacterImageResponse>;
                if (response.ok && envelope.data?.changed) {
                    revision_ref.current = envelope.data.revision;
                    setOpponentHeadImage(envelope.data.image_source ?? null);
                }
            } catch {
                // Cosmetic sharing is best effort and never interrupts the battle.
            } finally {
                if (!cancelled) poll_timer = setTimeout(() => void poll(), CHARACTER_IMAGE_POLL_INTERVAL_MS);
            }
        }

        void poll();
        return () => {
            cancelled = true;
            if (poll_timer) clearTimeout(poll_timer);
            active_request?.abort();
        };
    }, [enabled, join_token, room_code]);

    useEffect(() => {
        if (!enabled) return;
        const stopSharing = () => {
            void fetch(`/api/v2/rooms/${room_code}/character-image`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${join_token}` },
                keepalive: true,
            }).catch(() => undefined);
        };
        window.addEventListener('pagehide', stopSharing);
        return () => window.removeEventListener('pagehide', stopSharing);
    }, [enabled, join_token, room_code]);

    return opponent_head_image;
}
