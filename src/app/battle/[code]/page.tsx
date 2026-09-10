'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GameHeader, GameFooter } from '@/components/game/GameUI';
import { BattleArena } from '@/components/game/BattleArena';
import { LegacyBattleArena } from '@/components/game/LegacyBattleArena';
import { fetchRoomState } from '@/lib/signaling';
import type { ApiEnvelope, Quote, Room, RoomPlayer, RoomSessionData, User } from '@/types';

interface LegacyRoomData {
  room: Room;
  quote: Quote | null;
  players: (RoomPlayer & { username: string })[];
  host: User;
  player_id: string;
  username: string;
}

export default function BattlePage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [room_session, setRoomSession] = useState<RoomSessionData | null>(null);
  const [legacy_room, setLegacyRoom] = useState<LegacyRoomData | null>(null);

  useEffect(() => {
    const init = async () => {
      const { code: raw_code } = await params;
      const code = raw_code.trim().toUpperCase();
      const savedUsername = localStorage.getItem('typeracer-username')?.trim();

      if (!savedUsername) {
        router.replace('/?join=' + encodeURIComponent(code));
        return;
      }

      try {
        if (process.env.NEXT_PUBLIC_GAME_PROTOCOL_VERSION === '1') {
          let player_id = localStorage.getItem(`typeracer-room-user-${code}`);
          if (!player_id) {
            const join_response = await fetch(`/api/rooms/${code}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'join', username: savedUsername }),
            });
            const join_data = await join_response.json();
            if (!join_response.ok || typeof join_data.userId !== 'string') {
              setError(join_data.error || 'Unable to join battle');
              return;
            }
            player_id = join_data.userId;
            localStorage.setItem(`typeracer-room-user-${code}`, player_id as string);
          }
          if (!player_id) {
            setError('Unable to identify this player');
            return;
          }
          const data = await fetchRoomState(code);
          if (!data) {
            setError('Battle not found');
            return;
          }
          setLegacyRoom({ room: data.room, quote: data.quote as Quote | null, players: data.players ?? [], host: data.host, player_id, username: savedUsername });
          return;
        }
        let response = await fetch(`/api/v2/rooms/${code}/token`, { method: 'POST' });
        let envelope = await response.json() as ApiEnvelope<RoomSessionData>;
        if (!response.ok || !envelope.data) {
          response = await fetch(`/api/v2/rooms/${code}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: savedUsername }),
          });
          envelope = await response.json() as ApiEnvelope<RoomSessionData>;
        }
        if (!response.ok || !envelope.data) {
          setError(envelope.message || 'Unable to join battle');
          return;
        }
        sessionStorage.setItem(`typeracer-room-session-${code}`, JSON.stringify(envelope.data));
        setRoomSession(envelope.data);
      } catch {
        setError('Failed to load battle');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [params, router]);

  if (loading) {
    return (
      <div className="app-shell"><GameHeader active="battle" /><main id="main" className="state-page"><div className="loading-line" /><h1>Entering the arena.</h1><p className="muted" role="status">Finding your battle and preparing the connection…</p></main><GameFooter /></div>
    );
  }

  if (error || (!room_session && !legacy_room)) {
    return (
      <div className="app-shell"><GameHeader active="battle" /><main id="main" className="state-page"><p className="eyebrow">CONNECTION UNSUCCESSFUL</p><h1>Unable to enter this battle.</h1><p className="muted" role="alert">{error || 'Battle not found'}. Check your invitation or create a new room.</p><Link href="/" className="button button-primary">Back to lobby</Link></main><GameFooter /></div>
    );
  }

  if (legacy_room) {
    const opponent = legacy_room.players.find((player) => player.userId !== legacy_room.player_id);
    return <LegacyBattleArena room_code={legacy_room.room.code} is_host={legacy_room.room.hostId === legacy_room.player_id} user_id={legacy_room.player_id} username={legacy_room.username} opponent_username={opponent?.username ?? 'Opponent'} />;
  }

  if (!room_session) return null;

  return (
    <BattleArena
      roomCode={room_session.room.code}
      isHost={room_session.role === 'host'}
      userId={room_session.player.user_id}
      username={room_session.player.username}
      joinToken={room_session.join_token}
    />
  );
}
