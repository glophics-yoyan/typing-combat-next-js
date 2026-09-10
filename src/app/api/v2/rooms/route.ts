import type { NextRequest } from 'next/server';
import { failResponse, successResponse } from '@/lib/api-response';
import { createRoomV2, joinRoom } from '@/lib/db';
import { issueRoomSession, normalizeDifficulty, normalizeUsername, resolveGuestUser, withGuestCookie } from '@/lib/room-session';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { username?: unknown; difficulty?: unknown };
        const username = normalizeUsername(body.username);
        const difficulty = normalizeDifficulty(body.difficulty);
        if (username.length < 2 || username.length > 32) {
            return failResponse('Username must be 2-32 characters.', 'INVALID_USERNAME', 400);
        }
        if (difficulty === null) {
            return failResponse('Difficulty must be an integer from 1 to 5.', 'INVALID_DIFFICULTY', 400);
        }

        const { user, cookie_token } = await resolveGuestUser(request, username);
        const room = await createRoomV2(user.id, difficulty);
        await joinRoom(room.id, user.id);
        const response = successResponse(issueRoomSession(room, user), 'Battle created.', 201);
        return withGuestCookie(response, cookie_token);
    } catch (caught_error) {
        console.error('[API v2] Create room error:', caught_error);
        return failResponse('Failed to create room.', 'CREATE_ROOM_FAILED', 500);
    }
}
