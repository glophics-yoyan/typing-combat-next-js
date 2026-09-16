import type { NextRequest } from 'next/server';
import { failResponse, successResponse } from '@/lib/api-response';
import { verifyRoomToken } from '@/lib/auth-tokens';
import { getOpponentCharacterImage, removeBattleCharacterImage, setBattleCharacterImage } from '@/lib/battle-character-images';
import { isCharacterImageSource } from '@/lib/local-character-image';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
    try {
        const session = await authorizeCharacterImageRequest(request, context);
        if (!session) return failResponse('Battle authorization is invalid.', 'INVALID_JOIN_TOKEN', 401);
        const opponent_image = getOpponentCharacterImage(session.room_code, session.user_id);
        const known_revision = request.nextUrl.searchParams.get('revision');
        if (!opponent_image || opponent_image.revision === known_revision) {
            return successResponse({ changed: false, revision: opponent_image?.revision ?? null }, 'No character image change.');
        }
        return successResponse({ changed: true, revision: opponent_image.revision, image_source: opponent_image.image_source }, 'Character image received.');
    } catch (caught_error) {
        console.error('[API v2] Get character image error:', caught_error);
        return failResponse('Failed to receive the opponent image.', 'CHARACTER_IMAGE_FAILED', 500);
    }
}

export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
    try {
        const session = await authorizeCharacterImageRequest(request, context);
        if (!session) return failResponse('Battle authorization is invalid.', 'INVALID_JOIN_TOKEN', 401);
        const body = await request.json() as { image_source?: unknown };
        if (body.image_source !== null && !isCharacterImageSource(body.image_source)) {
            return failResponse('Character image is invalid.', 'INVALID_CHARACTER_IMAGE', 400);
        }
        const revision = setBattleCharacterImage(session.room_code, session.user_id, body.image_source);
        return successResponse({ revision }, 'Character image shared for this battle.');
    } catch (caught_error) {
        console.error('[API v2] Share character image error:', caught_error);
        return failResponse('Failed to share the character image.', 'CHARACTER_IMAGE_FAILED', 500);
    }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ code: string }> }) {
    try {
        const session = await authorizeCharacterImageRequest(request, context);
        if (!session) return failResponse('Battle authorization is invalid.', 'INVALID_JOIN_TOKEN', 401);
        removeBattleCharacterImage(session.room_code, session.user_id);
        return successResponse(null, 'Character image sharing ended.');
    } catch (caught_error) {
        console.error('[API v2] Remove character image error:', caught_error);
        return failResponse('Failed to end character image sharing.', 'CHARACTER_IMAGE_FAILED', 500);
    }
}

async function authorizeCharacterImageRequest(request: NextRequest, context: { params: Promise<{ code: string }> }) {
    const authorization = request.headers.get('authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    const payload = token ? verifyRoomToken(token) : null;
    const { code } = await context.params;
    return payload?.room_code === code.trim().toUpperCase() ? payload : null;
}
