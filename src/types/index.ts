export type RTCSessionDescriptionInit = {
  type: RTCSdpType;
  sdp?: string;
};

export type RTCIceCandidateInit = {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
};

export interface User {
  id: string;
  username: string;
  createdAt: string;
  lastSeen: string;
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  difficulty: number;
  charCount: number;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  status: 'waiting' | 'active' | 'finished';
  quoteId: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  signalingOffer: RTCSessionDescriptionInit | null;
  signalingAnswer: RTCSessionDescriptionInit | null;
  signalingIce: RTCIceCandidateInit[];
}

export interface RoomPlayer {
  roomId: string;
  userId: string;
  hp: number;
  wpm: number;
  accuracy: number;
  position: number;
  isReady: boolean;
  joinedAt: string;
}

export interface Match {
  id: string;
  roomId: string;
  winnerId: string;
  loserId: string;
  winnerWpm: number;
  loserWpm: number;
  durationMs: number;
  playedAt: string;
}

export interface PlayerState {
  hp: number;
  position: number;
  wpm: number;
  accuracy: number;
  lastKeystroke: number;
  isReady: boolean;
  totalKeystrokes: number;
  correctKeystrokes: number;
}

export interface GameState {
  quote: Quote | null;
  myState: PlayerState;
  opponentState: PlayerState | null;
  status: 'waiting' | 'countdown' | 'active' | 'finished';
  winner: 'me' | 'opponent' | null;
  startTime: number | null;
  endTime: number | null;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
  from: string;
  to: string;
}

export interface WebRTCMessage {
  type: 'state' | 'keystroke' | 'ready' | 'start' | 'finish' | 'rematch';
  payload: unknown;
}

export interface LocalStats {
  totalMatches: number;
  wins: number;
  losses: number;
  totalKeystrokes: number;
  totalTimeMs: number;
  bestWpm: number;
  bestAccuracy: number;
  sessionMatches: number;
  sessionWins: number;
  settings: {
    soundEnabled: boolean;
    particlesEnabled: boolean;
    theme: 'dark' | 'light' | 'system';
    quoteDifficulty: 1 | 2 | 3 | 4 | 5;
  };
  recentMatches: MatchSummary[];
}

export interface MatchSummary {
  id: string;
  won: boolean;
  wpm: number;
  accuracy: number;
  durationMs: number;
  playedAt: string;
  opponentName: string;
}

export interface CreateRoomResponse {
  code: string;
  url: string;
  room: Room;
}

export interface JoinRoomResponse {
  room: Room;
  quote: Quote;
  isHost: boolean;
}
