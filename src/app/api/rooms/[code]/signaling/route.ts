import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { updateRoomSignaling, appendRoomIce, clearRoomSignaling } from '@/lib/db';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const result = await sql`
      SELECT signaling_offer, signaling_answer, signaling_ice
      FROM rooms
      WHERE code = ${code}
    `;

    if (!result[0]) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const room = result[0];
    return NextResponse.json({
      offer: room.signaling_offer,
      answer: room.signaling_answer,
      ice: room.signaling_ice || [],
    });
  } catch (error) {
    console.error('[API] Get signaling error:', error);
    return NextResponse.json({ error: 'Failed to get signaling data' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { type, payload } = await request.json();

    const roomResult = await sql`SELECT id FROM rooms WHERE code = ${code}`;
    if (!roomResult[0]) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    const roomId = roomResult[0].id;

    if (type === 'offer') {
      await updateRoomSignaling(roomId, 'signaling_offer', payload);
    } else if (type === 'answer') {
      await updateRoomSignaling(roomId, 'signaling_answer', payload);
    } else if (type === 'ice-candidate') {
      await appendRoomIce(roomId, payload);
    } else {
      return NextResponse.json({ error: 'Invalid signaling type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Signaling error:', error);
    return NextResponse.json({ error: 'Failed to process signaling' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomResult = await sql`SELECT id FROM rooms WHERE code = ${code}`;
    if (!roomResult[0]) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    await clearRoomSignaling(roomResult[0].id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Clear signaling error:', error);
    return NextResponse.json({ error: 'Failed to clear signaling' }, { status: 500 });
  }
}