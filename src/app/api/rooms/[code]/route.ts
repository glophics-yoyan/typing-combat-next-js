import { NextRequest, NextResponse } from 'next/server';
import { getRoomByCode, getRoomPlayers, joinRoom, getUser, createUser, updateRoomStatus } from '@/lib/db';
import type { Quote } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomWithHost = await getRoomByCode(code);

    if (!roomWithHost) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const players = await getRoomPlayers(roomWithHost.id);

    let quote: Quote | null = null;
    if (roomWithHost.quoteId) {
      // In a real app, fetch from DB. For now, we'll fetch from API
      const quoteRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/quotes?id=${roomWithHost.quoteId}`);
      if (quoteRes.ok) {
        quote = await quoteRes.json();
      }
    }

    return NextResponse.json({
      room: {
        id: roomWithHost.id,
        code: roomWithHost.code,
        hostId: roomWithHost.hostId,
        status: roomWithHost.status,
        quoteId: roomWithHost.quoteId,
        createdAt: roomWithHost.createdAt,
        startedAt: roomWithHost.startedAt,
        finishedAt: roomWithHost.finishedAt,
        signalingOffer: roomWithHost.signalingOffer,
        signalingAnswer: roomWithHost.signalingAnswer,
        signalingIce: roomWithHost.signalingIce,
      },
      players,
      quote,
      host: roomWithHost.host,
    });
  } catch (error) {
    console.error('[API] Get room error:', error);
    return NextResponse.json({ error: 'Failed to get room' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { action, username, quoteId } = await request.json();

    const roomWithHost = await getRoomByCode(code);
    if (!roomWithHost) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (action === 'join') {
      const normalizedUsername = typeof username === 'string' ? username.trim() : '';
      if (normalizedUsername.length < 2 || normalizedUsername.length > 32) {
        return NextResponse.json({ error: 'Username must be 2-32 characters' }, { status: 400 });
      }
      let user = await getUser(normalizedUsername);
      if (!user) user = await createUser(normalizedUsername);
      const players = await getRoomPlayers(roomWithHost.id);
      if (players.length >= 2 && !players.some((player) => player.userId === user!.id)) {
        return NextResponse.json({ error: 'Battle is full' }, { status: 409 });
      }
      await joinRoom(roomWithHost.id, user.id);
      return NextResponse.json({ players: await getRoomPlayers(roomWithHost.id), userId: user.id, isHost: roomWithHost.hostId === user.id });
    }

    if (action === 'start' && quoteId) {
      await updateRoomStatus(roomWithHost.id, 'active', quoteId);
      return NextResponse.json({ success: true });
    }

    if (action === 'finish') {
      await updateRoomStatus(roomWithHost.id, 'finished');
      return NextResponse.json({ success: true });
    }

    if (action === 'ready') {
      // Update player ready state
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[API] Update room error:', error);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}
