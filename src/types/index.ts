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
  status: 'waiting' | 'active' | 'finished' | 'cancelled';
  difficulty: number;
  quoteId: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  signalingOffer: RTCSessionDescriptionInit | null;
  signalingAnswer: RTCSessionDescriptionInit | null;
  signalingIce: RTCIceCandidateInit[];
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T | null;
  meta: unknown;
  error: { code: string } | null;
}

export interface BattlePlayer {
  user_id: string;
  username: string;
  hp: number;
  position: number;
  wpm: number;
  accuracy: number;
  is_ready: boolean;
  connected: boolean;
  total_keystrokes: number;
  correct_keystrokes: number;
  last_processed_sequence: number;
}

export type BattlePhase = 'waiting' | 'countdown' | 'active' | 'paused' | 'finished' | 'cancelled';

export interface RoomSnapshot {
  room_code: string;
  match_id: string | null;
  revision: number;
  server_time: number;
  phase: BattlePhase;
  quote: {
    id: string;
    text: string;
    author: string;
    difficulty: number;
    char_count: number;
  } | null;
  countdown_ends_at: number | null;
  reconnect_deadline: number | null;
  started_at: number | null;
  finished_at: number | null;
  winner_user_id: string | null;
  finished_reason: string | null;
  checkpointed_sequences: Record<string, number>;
  players: BattlePlayer[];
}

export interface MatchResult {
  match_id: string;
  winner_user_id: string | null;
  finished_reason: string;
  duration_ms: number;
  participants: BattlePlayer[];
}

export interface RoomSessionData {
  room: {
    id: string;
    code: string;
    status: Room['status'];
    difficulty: number;
  };
  player: {
    user_id: string;
    username: string;
  };
  role: 'host' | 'player';
  join_token: string;
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
  status: 'waiting' | 'countdown' | 'active' | 'paused' | 'finished' | 'cancelled';
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
  total_matches: number;
  wins: number;
  losses: number;
  total_keystrokes: number;
  total_time_ms: number;
  best_wpm: number;
  best_accuracy: number;
  session_matches: number;
  session_wins: number;
  settings: {
    sound_enabled: boolean;
    particles_enabled: boolean;
    theme: 'dark' | 'light' | 'system';
    quote_difficulty: 1 | 2 | 3 | 4 | 5;
  };
  recent_matches: MatchSummary[];
}

export interface MatchSummary {
  id: string;
  won: boolean;
  wpm: number;
  accuracy: number;
  duration_ms: number;
  played_at: string;
  opponent_name: string;
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
