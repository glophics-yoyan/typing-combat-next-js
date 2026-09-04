import { NextRequest, NextResponse } from 'next/server';
import { getUser, createUser } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || username.length < 2 || username.length > 32) {
      return NextResponse.json({ error: 'Username must be 2-32 characters' }, { status: 400 });
    }

    let user = await getUser(username);
    if (!user) {
      user = await createUser(username);
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[API] User error:', error);
    return NextResponse.json({ error: 'Failed to get/create user' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  try {
    const user = await getUser(username);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('[API] Get user error:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}