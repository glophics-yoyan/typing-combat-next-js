import { NextRequest, NextResponse } from 'next/server';
import { createRoom, getUser, createUser, getRandomQuote, joinRoom } from '@/lib/db';
import { getRandomQuote as getFallbackQuote } from '@/lib/quotes';

export async function POST(request: NextRequest) {
  try {
    const { username, difficulty = 2 } = await request.json();

    if (!username || username.length < 2 || username.length > 32) {
      return NextResponse.json({ error: 'Username must be 2-32 characters' }, { status: 400 });
    }

    let user = await getUser(username);
    if (!user) {
      user = await createUser(username);
    }

    const quote = await getRandomQuote(Number(difficulty)).catch(() => null) ?? getFallbackQuote(Number(difficulty));
    const room = await createRoom(user.id, quote.id);
    await joinRoom(room.id, user.id);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${baseUrl}/battle/${room.code}`;

    return NextResponse.json({
      code: room.code,
      url,
      userId: user.id,
      room: {
        id: room.id,
        code: room.code,
        hostId: room.hostId,
        status: room.status,
        quoteId: room.quoteId,
        createdAt: room.createdAt,
        startedAt: room.startedAt,
        finishedAt: room.finishedAt,
        signalingOffer: room.signalingOffer,
        signalingAnswer: room.signalingAnswer,
        signalingIce: room.signalingIce,
      },
    });
  } catch (error) {
    console.error('[API] Create room error:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
