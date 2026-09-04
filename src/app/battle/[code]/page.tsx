'use client';

import { useEffect, useState } from 'react';
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
        window.location.href = '/?join=' + code;
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
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--primary)] border-t-transparent mx-auto mb-4" />
          <p className="text-[var(--muted-foreground)]">Loading battle...</p>
        </div>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Battle Not Found</h1>
          <p className="text-[var(--muted-foreground)] mb-6">{error || 'Unknown error'}</p>
          <a href="/" className="text-[var(--primary)] hover:underline">
            Back to Home
          </a>
        </div>
      </div>
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
