import type { MatchResult, RoomSnapshot } from '@/types';

export type AuthoritativeEvent =
    | { type: 'room_snapshot'; payload: RoomSnapshot }
    | { type: 'presence_changed'; payload: { user_id: string; connected: boolean } }
    | { type: 'match_finished'; payload: MatchResult }
    | { type: 'match_cancelled'; payload: MatchResult }
    | { type: 'rematch_status'; payload: { votes: Record<string, boolean>; expires_at: number | null } }
    | { type: 'error'; code?: string; message?: string };

type MessageHandler = (message: AuthoritativeEvent) => void;
type ConnectionHandler = (connected: boolean) => void;
type ErrorHandler = (error: Error) => void;

const INITIAL_SNAPSHOT_TIMEOUT_MS = 10000;

export class AuthoritativeWebSocket {
    private socket: WebSocket | null = null;
    private initial_snapshot_timer: ReturnType<typeof setTimeout> | null = null;
    private pending_messages: object[] = [];
    private message_handlers = new Set<MessageHandler>();
    private connection_handlers = new Set<ConnectionHandler>();
    private error_handlers = new Set<ErrorHandler>();
    private destroyed = false;

    constructor(private join_token: string) {}

    initialize() {
        const websocket_url = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
        if (!websocket_url) {
            this.notifyError(new Error('NEXT_PUBLIC_WEBSOCKET_URL is not configured'));
            return;
        }
        this.socket = new WebSocket(websocket_url);
        this.initial_snapshot_timer = setTimeout(() => {
            if (this.destroyed) return;
            this.notifyError(new Error('Realtime server did not finish joining within 10 seconds.'));
            this.socket?.close(4000, 'Initial room snapshot timed out');
        }, INITIAL_SNAPSHOT_TIMEOUT_MS);
        this.socket.addEventListener('open', () => {
            this.sendRaw({ type: 'join', protocol_version: 2, join_token: this.join_token });
            this.flush();
        });
        this.socket.addEventListener('message', (event) => this.handleMessage(event.data));
        this.socket.addEventListener('close', () => {
            this.clearInitialSnapshotTimer();
            if (!this.destroyed) this.connection_handlers.forEach((handler) => handler(false));
        });
        this.socket.addEventListener('error', () => {
            if (!this.destroyed) this.notifyError(new Error('Unable to reach the realtime game server'));
        });
    }

    sendReady() {
        this.send({ type: 'ready', request_id: crypto.randomUUID() });
    }

    sendInput(sequence: number, character: string, client_timestamp = Date.now()) {
        this.send({ type: 'input', request_id: crypto.randomUUID(), sequence, character, client_timestamp });
    }

    sendRematch(accepted: boolean) {
        this.send({ type: 'rematch', accepted });
    }

    onMessage(handler: MessageHandler) {
        this.message_handlers.add(handler);
        return () => this.message_handlers.delete(handler);
    }

    onConnectionChange(handler: ConnectionHandler) {
        this.connection_handlers.add(handler);
        return () => this.connection_handlers.delete(handler);
    }

    onError(handler: ErrorHandler) {
        this.error_handlers.add(handler);
        return () => this.error_handlers.delete(handler);
    }

    destroy() {
        this.destroyed = true;
        this.clearInitialSnapshotTimer();
        this.socket?.close(1000, 'Battle closed');
        this.socket = null;
        this.pending_messages = [];
    }

    private send(message: object) {
        if (this.socket?.readyState === WebSocket.OPEN) this.sendRaw(message);
        else this.pending_messages.push(message);
    }

    private sendRaw(message: object) {
        if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
    }

    private flush() {
        while (this.pending_messages.length > 0) {
            const message = this.pending_messages.shift();
            if (message) this.sendRaw(message);
        }
    }

    private handleMessage(data: unknown) {
        if (typeof data !== 'string') return;
        try {
            const message = JSON.parse(data) as AuthoritativeEvent;
            if (message.type === 'room_snapshot') {
                this.clearInitialSnapshotTimer();
                this.connection_handlers.forEach((handler) => handler(true));
            }
            if (message.type === 'error') {
                const error = new Error(message.message ?? message.code ?? 'Realtime server error') as Error & { code?: string };
                error.code = message.code;
                this.notifyError(error);
                return;
            }
            this.message_handlers.forEach((handler) => handler(message));
        } catch {
            this.notifyError(new Error('Realtime server returned an invalid message'));
        }
    }

    private notifyError(error: Error) {
        this.error_handlers.forEach((handler) => handler(error));
    }

    private clearInitialSnapshotTimer() {
        if (!this.initial_snapshot_timer) return;
        clearTimeout(this.initial_snapshot_timer);
        this.initial_snapshot_timer = null;
    }
}
