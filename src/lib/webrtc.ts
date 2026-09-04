import SimplePeer from 'simple-peer';
import type { WebRTCMessage, PlayerState } from '@/types';

type MessageHandler = (message: WebRTCMessage) => void;
type ConnectionHandler = (connected: boolean) => void;
type ErrorHandler = (error: Error) => void;
type SignalHandler = (data: SimplePeer.SignalData) => void;

export class WebRTCManager {
  private peer: SimplePeer.Instance | null = null;
  private isInitiator: boolean;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private pendingMessages: WebRTCMessage[] = [];
  private lastStateSent = 0;
  private stateThrottle = 50;
  private signalResolver: ((data: SimplePeer.SignalData) => void) | null = null;

  constructor(isInitiator: boolean) {
    this.isInitiator = isInitiator;
  }

  initialize(onSignal: (data: SimplePeer.SignalData) => void): void {
    this.peer = new SimplePeer({
      initiator: this.isInitiator,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    this.peer.on('signal', (data) => {
      onSignal(data);
      if (this.signalResolver) {
        this.signalResolver(data);
        this.signalResolver = null;
      }
    });

    this.peer.on('connect', () => {
      console.log('[WebRTC] Connected');
      this.notifyConnection(true);
      this.flushPendingMessages();
    });

    this.peer.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebRTCMessage;
        this.notifyMessage(message);
      } catch (e) {
        console.error('[WebRTC] Failed to parse message:', e);
      }
    });

    this.peer.on('close', () => {
      console.log('[WebRTC] Disconnected');
      this.notifyConnection(false);
    });

    this.peer.on('error', (err) => {
      console.error('[WebRTC] Error:', err);
      this.notifyError(err);
    });
  }

  handleSignal(signal: SimplePeer.SignalData): void {
    if (this.peer) {
      this.peer.signal(signal);
    }
  }

  waitForSignal(): Promise<SimplePeer.SignalData> {
    return new Promise((resolve) => {
      this.signalResolver = resolve;
    });
  }

  send(message: WebRTCMessage): void {
    const data = JSON.stringify(message);
    if (this.peer && this.peer.connected) {
      this.peer.send(data);
    } else {
      this.pendingMessages.push(message);
    }
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

  sendReady(): void {
    this.send({ type: 'ready', payload: {} });
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
    return this.peer?.connected === true;
  }

  destroy(): void {
    this.peer?.destroy();
    this.peer = null;
    this.messageHandlers.clear();
    this.connectionHandlers.clear();
    this.errorHandlers.clear();
    this.pendingMessages = [];
  }

  private notifyMessage(message: WebRTCMessage): void {
    this.messageHandlers.forEach((h) => h(message));
  }

  private notifyConnection(connected: boolean): void {
    this.connectionHandlers.forEach((h) => h(connected));
  }

  private notifyError(error: Error): void {
    this.errorHandlers.forEach((h) => h(error));
  }

  private flushPendingMessages(): void {
    while (this.pendingMessages.length > 0) {
      const msg = this.pendingMessages.shift();
      if (msg && this.peer?.connected) {
        this.peer.send(JSON.stringify(msg));
      }
    }
  }
}

export function createWebRTCManager(isInitiator: boolean): WebRTCManager {
  return new WebRTCManager(isInitiator);
}
