import 'server-only';
import { randomUUID } from 'node:crypto';

interface CharacterImageEntry {
    image_source: string | null;
    revision: string;
    updated_at: number;
}

interface CharacterImageStore {
    rooms: Map<string, Map<string, CharacterImageEntry>>;
}

const CHARACTER_IMAGE_TTL_MS = 60 * 60 * 1000;
const MAX_IMAGE_ROOMS = 100;
const global_store = globalThis as typeof globalThis & { __battle_character_images?: CharacterImageStore };
const character_image_store: CharacterImageStore = global_store.__battle_character_images ?? {
    rooms: new Map<string, Map<string, CharacterImageEntry>>(),
};
global_store.__battle_character_images = character_image_store;

export function setBattleCharacterImage(room_code: string, user_id: string, image_source: string | null) {
    pruneCharacterImages();
    const room_images = character_image_store.rooms.get(room_code) ?? new Map<string, CharacterImageEntry>();
    const entry = { image_source, revision: randomUUID(), updated_at: Date.now() };
    room_images.set(user_id, entry);
    character_image_store.rooms.set(room_code, room_images);
    return entry.revision;
}

export function getOpponentCharacterImage(room_code: string, user_id: string) {
    pruneCharacterImages();
    const room_images = character_image_store.rooms.get(room_code);
    if (!room_images) return null;
    return [...room_images.entries()].find(([candidate_id]) => candidate_id !== user_id)?.[1] ?? null;
}

export function removeBattleCharacterImage(room_code: string, user_id: string) {
    const room_images = character_image_store.rooms.get(room_code);
    room_images?.delete(user_id);
    if (room_images?.size === 0) character_image_store.rooms.delete(room_code);
}

function pruneCharacterImages() {
    const expiry = Date.now() - CHARACTER_IMAGE_TTL_MS;
    character_image_store.rooms.forEach((room_images, room_code) => {
        room_images.forEach((entry, user_id) => {
            if (entry.updated_at < expiry) room_images.delete(user_id);
        });
        if (room_images.size === 0) character_image_store.rooms.delete(room_code);
    });
    while (character_image_store.rooms.size > MAX_IMAGE_ROOMS) {
        const oldest_room = character_image_store.rooms.keys().next().value;
        if (!oldest_room) break;
        character_image_store.rooms.delete(oldest_room);
    }
}
