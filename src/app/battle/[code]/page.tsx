'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GameHeader, GameFooter } from '@/components/game/GameUI';
import { BattleArena } from '@/components/game/BattleArena';
import { fetchRoomState } from '@/lib/signaling';
import type { Quote, Room, RoomPlayer, User } from '@/types';

interface RoomData {
  room: Room;
  quote: Quote | null;
  players: (RoomPlayer & { username: string })[];
  host: User;
}

export default function BattlePage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const init = async () => {
      const { code } = await params;
      const savedUsername = localStorage.getItem('typeracer-username')?.trim();

      if (!savedUsername) {
        router.replace('/?join=' + encodeURIComponent(code));
        return;
      }

      try {
        let ownPlayerId = localStorage.getItem(`typeracer-room-user-${code}`);
        if (!ownPlayerId) {
          const joinResponse = await fetch(`/api/rooms/${code}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'join', username: savedUsername }),
          });
          const joinData = await joinResponse.json();
          if (!joinResponse.ok) {
            setError(joinData.error || 'Unable to join battle');
            return;
          }
          ownPlayerId = joinData.userId;
          if (typeof ownPlayerId !== 'string') {
            setError('Unable to join battle');
            return;
          }
          localStorage.setItem(`typeracer-room-user-${code}`, ownPlayerId);
        }

        const data = await fetchRoomState(code);
        if (!data) {
          setError('Battle not found');
          return;
        }

        setRoomData({
          room: data.room,
          quote: data.quote as Quote | null,
          players: data.players || [],
          host: data.host,
        });
        setUsername(savedUsername);
        setPlayerId(ownPlayerId);
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

  if (error || !roomData) {
    return (
      <div className="app-shell"><GameHeader active="battle" /><main id="main" className="state-page"><p className="eyebrow">CONNECTION UNSUCCESSFUL</p><h1>Unable to enter this battle.</h1><p className="muted" role="alert">{error || 'Battle not found'}. Check your invitation or create a new room.</p><Link href="/" className="button button-primary">Back to lobby</Link></main><GameFooter /></div>
    );
  }

  const { room, players } = roomData;
  const isHost = room.hostId === playerId;
  const opponent = players.find((player) => player.userId !== playerId);
  const opponentUsername = opponent?.username || 'Opponent';

  return (
    <BattleArena
      roomCode={room.code}
      isHost={isHost}
      userId={playerId || ''}
      username={username}
      opponentUsername={opponentUsername}
    />
  );
}
