import type { NextRequest } from 'next/server';
import { failResponse, successResponse } from '@/lib/api-response';
import { getRoomMembership, issueRoomSession, requireGuestUser } from '@/lib/room-session';

export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await context.params;
        const user = await requireGuestUser(request);
        if (!user) return failResponse('Guest session is missing or expired.', 'GUEST_SESSION_REQUIRED', 401);
        const membership = await getRoomMembership(code, user.id);
        if (!membership?.player) return failResponse('Battle membership was not found.', 'MEMBERSHIP_NOT_FOUND', 403);
        return successResponse(issueRoomSession(membership.room, user), 'Battle token refreshed.');
    } catch (caught_error) {
        console.error('[API v2] Refresh token error:', caught_error);
        return failResponse('Failed to refresh battle token.', 'TOKEN_REFRESH_FAILED', 500);
    }
}
