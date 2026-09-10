import type { NextRequest, NextResponse } from 'next/server';
import { attachGuestCookie, createRoomToken, getGuestSession, requireGuestSession } from '@/lib/auth-tokens';
import { getRoomByCode, getRoomPlayers, getUserById, joinRoom, upsertGuestUser } from '@/lib/db';
import type { Room, RoomPlayer, User } from '@/types';

export function normalizeUsername(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

export function normalizeDifficulty(value: unknown) {
    const difficulty = Number(value ?? 2);
    return Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 5 ? difficulty : null;
}

export async function resolveGuestUser(request: NextRequest, username: string) {
    const guest_session = getGuestSession(request);
    const user = await upsertGuestUser(guest_session.user_id, username);
    return { user, cookie_token: guest_session.cookie_token };
}

export async function requireGuestUser(request: NextRequest) {
    const guest_session = requireGuestSession(request);
    if (!guest_session) return null;
    return getUserById(guest_session.user_id);
}

export function withGuestCookie(response: NextResponse, cookie_token: string | null) {
    return attachGuestCookie(response, cookie_token);
}

export function issueRoomSession(room: Room, user: User) {
    const role = room.hostId === user.id ? 'host' as const : 'player' as const;
    return {
        room: {
            id: room.id,
            code: room.code,
            status: room.status,
            difficulty: room.difficulty,
        },
        player: {
            user_id: user.id,
            username: user.username,
        },
        role,
        join_token: createRoomToken({
            room_code: room.code,
            user_id: user.id,
            username: user.username,
            role,
        }),
    };
}

export async function getRoomMembership(code: string, user_id: string) {
    const normalized_code = code.trim().toUpperCase();
    const room = await getRoomByCode(normalized_code);
    if (!room) return null;
    const players = await getRoomPlayers(room.id);
    const player = players.find((candidate) => candidate.userId === user_id) ?? null;
    return { room, players, player };
}

export async function addRoomMember(room: Room, players: (RoomPlayer & { username: string })[], user: User) {
    const existing_player = players.find((player) => player.userId === user.id);
    if (existing_player) return true;
    if (room.status !== 'waiting' || players.length >= 2) return false;
    await joinRoom(room.id, user.id);
    return true;
}
