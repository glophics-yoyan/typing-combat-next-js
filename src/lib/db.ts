import { neon } from '@neondatabase/serverless';
import type { User, Room, RoomPlayer, Quote, Match } from '@/types';

const sql = neon(process.env.DATABASE_URL!);

export async function getUser(username: string): Promise<User | null> {
  const result = await sql`SELECT * FROM users WHERE username = ${username}`;
  return result[0] ? toUser(result[0]) : null;
}

export async function createUser(username: string): Promise<User> {
  const result = await sql`
    INSERT INTO users (username) VALUES (${username})
    ON CONFLICT (username) DO UPDATE SET last_seen = NOW()
    RETURNING *
  `;
  return toUser(result[0]);
}

export async function createRoom(hostId: string, quoteId: string): Promise<Room> {
  const code = generateRoomCode();
  const result = await sql`
    INSERT INTO rooms (code, host_id, quote_id) VALUES (${code}, ${hostId}, ${quoteId})
    RETURNING *
  `;
  return toRoom(result[0]);
}

export async function getRoomByCode(code: string): Promise<(Room & { host: User }) | null> {
  const result = await sql`
    SELECT r.*, u.username as host_username, u.id as host_id
    FROM rooms r
    JOIN users u ON r.host_id = u.id
    WHERE r.code = ${code}
  `;
  if (!result[0]) return null;
  const row = result[0];
  return { ...toRoom(row), host: toUser(row, 'host_') };
}

export async function getRoomPlayers(roomId: string): Promise<(RoomPlayer & { username: string })[]> {
  const result = await sql`
    SELECT rp.*, u.username
    FROM room_players rp
    JOIN users u ON rp.user_id = u.id
    WHERE rp.room_id = ${roomId}
  `;
  return result.map(toRoomPlayer);
}

export async function joinRoom(roomId: string, userId: string): Promise<RoomPlayer> {
  const result = await sql`
    INSERT INTO room_players (room_id, user_id) VALUES (${roomId}, ${userId})
    ON CONFLICT (room_id, user_id) DO NOTHING
    RETURNING *
  `;
  return toRoomPlayer(result[0]);
}

export async function updatePlayerState(
  roomId: string,
  userId: string,
  updates: Partial<RoomPlayer>
): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [roomId, userId];
  let paramIndex = 3;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return;

  await sql`UPDATE room_players SET ${sql.unsafe(setClauses.join(', '))} WHERE room_id = ${roomId} AND user_id = ${userId}`;
}

export async function updateRoomStatus(
  roomId: string,
  status: Room['status'],
  quoteId?: string
): Promise<void> {
  if (status === 'active') {
    if (quoteId) {
      await sql`UPDATE rooms SET status = ${status}, quote_id = ${quoteId}, started_at = NOW() WHERE id = ${roomId}`;
    } else {
      await sql`UPDATE rooms SET status = ${status}, started_at = NOW() WHERE id = ${roomId}`;
    }
    return;
  }

  if (status === 'finished') {
    await sql`UPDATE rooms SET status = ${status}, finished_at = NOW() WHERE id = ${roomId}`;
    return;
  }

  await sql`UPDATE rooms SET status = ${status} WHERE id = ${roomId}`;
}

export async function updateRoomSignaling(
  roomId: string,
  field: 'signaling_offer' | 'signaling_answer' | 'signaling_ice',
  value: unknown
): Promise<void> {
  await sql`UPDATE rooms SET ${sql.unsafe(field)} = ${JSON.stringify(value)} WHERE id = ${roomId}`;
}

export async function appendRoomIce(roomId: string, candidate: RTCIceCandidateInit): Promise<void> {
  await sql`UPDATE rooms SET signaling_ice = signaling_ice || ${JSON.stringify([candidate])}::jsonb[] WHERE id = ${roomId}`;
}

export async function clearRoomSignaling(roomId: string): Promise<void> {
  await sql`UPDATE rooms SET signaling_offer = NULL, signaling_answer = NULL, signaling_ice = '{}'::jsonb[] WHERE id = ${roomId}`;
}

export async function getRandomQuote(difficulty: number): Promise<Quote | null> {
  const result = await sql`
    SELECT * FROM quotes 
    WHERE difficulty = ${difficulty}
    ORDER BY RANDOM() 
    LIMIT 1
  `;
  return result[0] ? toQuote(result[0]) : null;
}

export async function saveMatch(match: Omit<Match, 'id' | 'playedAt'>): Promise<Match> {
  const result = await sql`
    INSERT INTO matches (room_id, winner_id, loser_id, winner_wpm, loser_wpm, duration_ms)
    VALUES (${match.roomId}, ${match.winnerId}, ${match.loserId}, ${match.winnerWpm}, ${match.loserWpm}, ${match.durationMs})
    RETURNING *
  `;
  return toMatch(result[0]);
}

export async function getUserMatches(userId: string, limit = 20): Promise<Match[]> {
  const result = await sql`
    SELECT m.*, 
      w.username as winner_name,
      l.username as loser_name
    FROM matches m
    JOIN users w ON m.winner_id = w.id
    JOIN users l ON m.loser_id = l.id
    WHERE m.winner_id = ${userId} OR m.loser_id = ${userId}
    ORDER BY m.played_at DESC
    LIMIT ${limit}
  `;
  return result.map(toMatch);
}

function toUser(row: Record<string, unknown>, prefix = ''): User {
  return {
    id: String(row[`${prefix}id`]),
    username: String(row[`${prefix}username`]),
    createdAt: String(row[`${prefix}created_at`] ?? ''),
    lastSeen: String(row[`${prefix}last_seen`] ?? ''),
  };
}

function toRoom(row: Record<string, unknown>): Room {
  return {
    id: String(row.id), code: String(row.code), hostId: String(row.host_id),
    status: row.status as Room['status'], quoteId: row.quote_id ? String(row.quote_id) : null,
    createdAt: String(row.created_at), startedAt: row.started_at ? String(row.started_at) : null,
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    signalingOffer: row.signaling_offer as Room['signalingOffer'],
    signalingAnswer: row.signaling_answer as Room['signalingAnswer'],
    signalingIce: (row.signaling_ice as Room['signalingIce']) ?? [],
  };
}

function toRoomPlayer(row: Record<string, unknown>): RoomPlayer & { username: string } {
  return {
    roomId: String(row.room_id), userId: String(row.user_id), hp: Number(row.hp),
    wpm: Number(row.wpm), accuracy: Number(row.accuracy), position: Number(row.position),
    isReady: Boolean(row.is_ready), joinedAt: String(row.joined_at), username: String(row.username),
  };
}

function toQuote(row: Record<string, unknown>): Quote {
  return { id: String(row.id), text: String(row.text), author: String(row.author ?? ''), difficulty: Number(row.difficulty), charCount: Number(row.char_count) };
}

function toMatch(row: Record<string, unknown>): Match {
  return { id: String(row.id), roomId: String(row.room_id), winnerId: String(row.winner_id), loserId: String(row.loser_id), winnerWpm: Number(row.winner_wpm), loserWpm: Number(row.loser_wpm), durationMs: Number(row.duration_ms), playedAt: String(row.played_at) };
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
