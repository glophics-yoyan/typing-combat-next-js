import type { NextRequest } from 'next/server';
import { failResponse, successResponse } from '@/lib/api-response';
import { addRoomMember, getRoomMembership, issueRoomSession, normalizeUsername, resolveGuestUser, withGuestCookie } from '@/lib/room-session';

export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await context.params;
        const body = await request.json() as { username?: unknown };
        const username = normalizeUsername(body.username);
        if (username.length < 2 || username.length > 32) {
            return failResponse('Username must be 2-32 characters.', 'INVALID_USERNAME', 400);
        }

        const { user, cookie_token } = await resolveGuestUser(request, username);
        const membership = await getRoomMembership(code, user.id);
        if (!membership) return failResponse('Battle not found.', 'ROOM_NOT_FOUND', 404);
        if (!await addRoomMember(membership.room, membership.players, user)) {
            return failResponse('This battle is unavailable or full.', 'ROOM_UNAVAILABLE', 409);
        }

        const response = successResponse(issueRoomSession(membership.room, user), 'Battle joined.');
        return withGuestCookie(response, cookie_token);
    } catch (caught_error) {
        console.error('[API v2] Join room error:', caught_error);
        return failResponse('Failed to join room.', 'JOIN_ROOM_FAILED', 500);
    }
}
