import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';

const GUEST_COOKIE_NAME = 'typeracer_guest';
const GUEST_TOKEN_SECONDS = 365 * 24 * 60 * 60;
const ROOM_TOKEN_SECONDS = 4 * 60 * 60;

interface SignedPayload {
    issued_at: number;
    expires_at: number;
}

interface GuestPayload extends SignedPayload {
    user_id: string;
}

export interface RoomTokenPayload extends SignedPayload {
    protocol_version: 2;
    room_code: string;
    user_id: string;
    username: string;
    role: 'host' | 'player';
}

interface GuestSession {
    user_id: string;
    cookie_token: string | null;
}

function getSecret(name: 'GUEST_SESSION_SECRET' | 'ROOM_TOKEN_SECRET') {
    const secret = process.env[name];
    if (!secret || secret.length < 32) {
        throw new Error(`${name} must contain at least 32 characters`);
    }
    return secret;
}

function encode(value: string) {
    return Buffer.from(value, 'utf8').toString('base64url');
}

function signPayload<T extends SignedPayload>(payload: T, secret: string) {
    const encoded_header = encode(JSON.stringify({ algorithm: 'HS256', type: 'JWT' }));
    const encoded_payload = encode(JSON.stringify(payload));
    const unsigned_token = `${encoded_header}.${encoded_payload}`;
    const signature = createHmac('sha256', secret).update(unsigned_token).digest('base64url');
    return `${unsigned_token}.${signature}`;
}

function verifyPayload<T extends SignedPayload>(token: string, secret: string): T | null {
    const segments = token.split('.');
    if (segments.length !== 3) return null;
    const unsigned_token = `${segments[0]}.${segments[1]}`;
    const expected_signature = createHmac('sha256', secret).update(unsigned_token).digest();
    let supplied_signature: Buffer;
    try {
        supplied_signature = Buffer.from(segments[2], 'base64url');
    } catch {
        return null;
    }
    if (supplied_signature.length !== expected_signature.length
        || !timingSafeEqual(supplied_signature, expected_signature)) return null;
    try {
        const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8')) as T;
        if (!Number.isInteger(payload.expires_at) || payload.expires_at <= Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch {
        return null;
    }
}

export function getGuestSession(request: NextRequest): GuestSession {
    const cookie_token = request.cookies.get(GUEST_COOKIE_NAME)?.value;
    if (cookie_token) {
        const payload = verifyPayload<GuestPayload>(cookie_token, getSecret('GUEST_SESSION_SECRET'));
        if (payload?.user_id) return { user_id: payload.user_id, cookie_token: null };
    }

    const now = Math.floor(Date.now() / 1000);
    const user_id = randomUUID();
    return {
        user_id,
        cookie_token: signPayload({ user_id, issued_at: now, expires_at: now + GUEST_TOKEN_SECONDS }, getSecret('GUEST_SESSION_SECRET')),
    };
}

export function requireGuestSession(request: NextRequest) {
    const cookie_token = request.cookies.get(GUEST_COOKIE_NAME)?.value;
    if (!cookie_token) return null;
    return verifyPayload<GuestPayload>(cookie_token, getSecret('GUEST_SESSION_SECRET'));
}

export function attachGuestCookie(response: NextResponse, cookie_token: string | null) {
    if (!cookie_token) return response;
    response.cookies.set(GUEST_COOKIE_NAME, cookie_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: GUEST_TOKEN_SECONDS,
    });
    return response;
}

export function createRoomToken(payload: Omit<RoomTokenPayload, keyof SignedPayload | 'protocol_version'>) {
    const now = Math.floor(Date.now() / 1000);
    return signPayload({
        ...payload,
        protocol_version: 2,
        issued_at: now,
        expires_at: now + ROOM_TOKEN_SECONDS,
    }, getSecret('ROOM_TOKEN_SECRET'));
}
