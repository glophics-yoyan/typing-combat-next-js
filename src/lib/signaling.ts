import type { Room, Quote, RoomPlayer, User } from '@/types';
import type { SignalData } from 'simple-peer';

const POLL_INTERVAL = 500;
const MAX_POLL_DURATION = 30000;

export async function pollForOffer(
  roomCode: string,
  onOffer: (offer: SignalData) => void,
  onTimeout: () => void
): Promise<() => void> {
  let stopped = false;
  let startTime = Date.now();

  const poll = async () => {
    if (stopped) return;
    if (Date.now() - startTime > MAX_POLL_DURATION) {
      onTimeout();
      startTime = Date.now();
    }

    try {
      const res = await fetch(`/api/rooms/${roomCode}/signaling`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.offer && !data.answer) {
          onOffer(data.offer);
          return;
        }
      }
    } catch (e) {
      console.error('[Signaling] Poll error:', e);
    }

    setTimeout(poll, POLL_INTERVAL);
  };

  poll();

  return () => {
    stopped = true;
  };
}

export async function pollForAnswer(
  roomCode: string,
  onAnswer: (answer: SignalData) => void,
  onTimeout: () => void
): Promise<() => void> {
  let stopped = false;
  let startTime = Date.now();

  const poll = async () => {
    if (stopped) return;
    if (Date.now() - startTime > MAX_POLL_DURATION) {
      onTimeout();
      startTime = Date.now();
    }

    try {
      const res = await fetch(`/api/rooms/${roomCode}/signaling`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.answer) {
          onAnswer(data.answer);
          return;
        }
      }
    } catch (e) {
      console.error('[Signaling] Poll error:', e);
    }

    setTimeout(poll, POLL_INTERVAL);
  };

  poll();

  return () => {
    stopped = true;
  };
}

export async function pollForOpponent(
  roomCode: string,
  onOpponent: () => void,
  onTimeout: () => void
): Promise<() => void> {
  let stopped = false;
  let startTime = Date.now();

  const poll = async () => {
    if (stopped) return;
    if (Date.now() - startTime > MAX_POLL_DURATION) {
      onTimeout();
      startTime = Date.now();
    }

    try {
      const roomData = await fetchRoomState(roomCode);
      if (roomData && roomData.players.length >= 2) {
        onOpponent();
        return;
      }
    } catch (error) {
      console.error('[Signaling] Opponent poll error:', error);
    }

    setTimeout(poll, POLL_INTERVAL);
  };

  poll();

  return () => {
    stopped = true;
  };
}

export async function pollForIceCandidates(
  roomCode: string,
  onIce: (candidates: SignalData[]) => void
): Promise<() => void> {
  let stopped = false;
  let lastIceLength = 0;

  const poll = async () => {
    if (stopped) return;

    try {
      const res = await fetch(`/api/rooms/${roomCode}/signaling`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ice && data.ice.length > lastIceLength) {
          const newCandidates = data.ice.slice(lastIceLength);
          lastIceLength = data.ice.length;
          onIce(newCandidates);
        }
      }
    } catch (e) {
      console.error('[Signaling] ICE poll error:', e);
    }

    setTimeout(poll, POLL_INTERVAL);
  };

  poll();

  return () => {
    stopped = true;
  };
}

export async function sendOffer(roomCode: string, offer: SignalData): Promise<void> {
  const res = await fetch(`/api/rooms/${roomCode}/signaling`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'offer', payload: offer }),
  });
  if (!res.ok) throw new Error('Failed to send offer');
}

export async function sendAnswer(roomCode: string, answer: SignalData): Promise<void> {
  const res = await fetch(`/api/rooms/${roomCode}/signaling`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'answer', payload: answer }),
  });
  if (!res.ok) throw new Error('Failed to send answer');
}

export async function clearSignaling(roomCode: string): Promise<void> {
  const res = await fetch(`/api/rooms/${roomCode}/signaling`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear signaling data');
}

export async function sendIceCandidate(roomCode: string, candidate: SignalData): Promise<void> {
  const res = await fetch(`/api/rooms/${roomCode}/signaling`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'ice-candidate', payload: candidate }),
  });
  if (!res.ok) throw new Error('Failed to send ICE candidate');
}

export interface RoomData {
  room: Room;
  quote: Quote | null;
  players: (RoomPlayer & { username: string })[];
  host: User;
}

export async function fetchRoomState(roomCode: string): Promise<RoomData | null> {
  const res = await fetch(`/api/rooms/${roomCode}`);
  if (!res.ok) return null;
  return res.json();
}
