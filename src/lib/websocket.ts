import type { PlayerState, WebRTCMessage } from '@/types';

type MessageHandler = (message: WebRTCMessage) => void;
type ConnectionHandler = (connected: boolean) => void;
type ErrorHandler = (error: Error) => void;

interface WebSocketManagerOptions {
  room_code: string;
  user_id: string;
  username: string;
}

interface ServerMessage {
  type: string;
  payload?: unknown;
  code?: string;
  message?: string;
}

interface RoomStatePayload {
  players?: { user_id: string; username: string }[];
}

const GAME_MESSAGE_TYPES = new Set([
  'state',
  'keystroke',
  'ready',
  'start',
  'finish',
  'rematch',
]);

export class WebSocketManager {
  private socket: WebSocket | null = null;
  private options: WebSocketManagerOptions;
  private messageHandlers = new Set<MessageHandler>();
  private connectionHandlers = new Set<ConnectionHandler>();
  private errorHandlers = new Set<ErrorHandler>();
  private pendingMessages: WebRTCMessage[] = [];
  private opponent_connected = false;
  private destroyed = false;
  private lastStateSent = 0;
  private stateThrottle = 50;

  constructor(options: WebSocketManagerOptions) {
    this.options = options;
  }

  initialize(): void {
    const websocket_url = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
    if (!websocket_url) {
      this.notifyError(new Error('NEXT_PUBLIC_WEBSOCKET_URL is not configured'));
      return;
    }

    try {
      this.socket = new WebSocket(websocket_url);
    } catch (error) {
      this.notifyError(error instanceof Error ? error : new Error('Unable to open realtime connection'));
      return;
    }

    this.socket.addEventListener('open', () => {
      this.sendRaw({
        type: 'join',
        room_code: this.options.room_code,
        user_id: this.options.user_id,
        username: this.options.username,
      });
      this.flushPendingMessages();
    });

    this.socket.addEventListener('message', (event) => {
      this.handleServerMessage(event.data);
    });

    this.socket.addEventListener('close', () => {
      if (this.destroyed) return;
      this.setOpponentConnected(false);
    });

    this.socket.addEventListener('error', () => {
      if (this.destroyed) return;
      this.notifyError(new Error('Unable to reach the realtime game server'));
    });
  }

  send(message: WebRTCMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendRaw(message);
      return;
    }

    this.pendingMessages.push(message);
  }

  sendState(state: PlayerState): void {
    const now = Date.now();
    if (now - this.lastStateSent < this.stateThrottle) return;
    this.lastStateSent = now;
    this.send({ type: 'state', payload: state });
  }

  sendKeystroke(char: string, position: number, isCorrect: boolean): void {
    this.send({ type: 'keystroke', payload: { char, position, isCorrect, timestamp: Date.now() } });
  }

  sendReady(state: PlayerState): void {
    this.send({ type: 'ready', payload: state });
  }

  sendStart(startTime: number): void {
    this.send({ type: 'start', payload: { startTime } });
  }

  sendFinish(winner: 'me' | 'opponent'): void {
    this.send({ type: 'finish', payload: { winner } });
  }

  sendRematch(): void {
    this.send({ type: 'rematch', payload: {} });
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN && this.opponent_connected;
  }

  destroy(): void {
    this.destroyed = true;
    this.socket?.close(1000, 'Battle closed');
    this.socket = null;
    this.messageHandlers.clear();
    this.connectionHandlers.clear();
    this.errorHandlers.clear();
    this.pendingMessages = [];
  }

  private handleServerMessage(data: unknown): void {
    if (typeof data !== 'string') return;

    let message: ServerMessage;
    try {
      message = JSON.parse(data) as ServerMessage;
    } catch {
      this.notifyError(new Error('Realtime server returned an invalid message'));
      return;
    }

    if (message.type === 'room-state') {
      const room_state = message.payload as RoomStatePayload;
      this.setOpponentConnected((room_state.players?.length ?? 0) >= 2);
      return;
    }

    if (message.type === 'opponent-joined') {
      this.setOpponentConnected(true);
      return;
    }

    if (message.type === 'opponent-left') {
      this.setOpponentConnected(false);
      return;
    }

    if (message.type === 'error') {
      this.notifyError(new Error(message.message ?? message.code ?? 'Realtime server error'));
      return;
    }

    if (GAME_MESSAGE_TYPES.has(message.type)) {
      this.messageHandlers.forEach((handler) => handler(message as WebRTCMessage));
    }
  }

  private sendRaw(message: object): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }

  private setOpponentConnected(connected: boolean): void {
    if (this.opponent_connected === connected) return;
    this.opponent_connected = connected;
    this.connectionHandlers.forEach((handler) => handler(connected));
  }

  private notifyError(error: Error): void {
    this.errorHandlers.forEach((handler) => handler(error));
  }

  private flushPendingMessages(): void {
    while (this.pendingMessages.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const message = this.pendingMessages.shift();
      if (message) this.sendRaw(message);
    }
  }
}

export function createWebSocketManager(options: WebSocketManagerOptions): WebSocketManager {
  return new WebSocketManager(options);
}
