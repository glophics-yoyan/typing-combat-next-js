import { AuthoritativeBattleApi, type AuthoritativeBattleTransport, type AuthoritativeEvent, type ConnectionHandler, type ErrorHandler, type MessageHandler } from '@/lib/authoritative-battle-api';

interface SocketServerMessage {
    type: string;
    payload?: unknown;
    code?: string;
    message?: string;
}

const CONNECTION_TIMEOUT_MS = 5000;

export class AuthoritativeBattleSocket implements AuthoritativeBattleTransport {
    private socket: WebSocket | null = null;
    private message_handlers = new Set<MessageHandler>();
    private connection_handlers = new Set<ConnectionHandler>();
    private error_handlers = new Set<ErrorHandler>();
    private pending_messages: Record<string, unknown>[] = [];
    private connection_timer: ReturnType<typeof setTimeout> | null = null;
    private connected = false;
    private destroyed = false;

    constructor(
        private websocket_url: string,
        private join_token: string,
    ) {}

    initialize() {
        try {
            this.socket = new WebSocket(this.websocket_url);
        } catch (caught_error) {
            this.notifyError(caught_error instanceof Error ? caught_error : new Error('Unable to open the realtime battle connection.'));
            this.notifyConnection(false, true);
            return;
        }

        this.connection_timer = setTimeout(() => {
            if (this.connected || this.destroyed) return;
            this.notifyError(new Error('The realtime battle connection timed out.'));
            this.socket?.close();
        }, CONNECTION_TIMEOUT_MS);

        this.socket.addEventListener('open', () => {
            this.sendRaw({ type: 'join', protocol_version: 2, join_token: this.join_token });
        });
        this.socket.addEventListener('message', (event) => this.handleMessage(event.data));
        this.socket.addEventListener('close', () => {
            if (this.connection_timer) clearTimeout(this.connection_timer);
            this.connection_timer = null;
            if (!this.destroyed) this.notifyConnection(false, true);
        });
        this.socket.addEventListener('error', () => {
            if (!this.destroyed) this.notifyError(new Error('Unable to reach the realtime battle server.'));
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
        if (this.connection_timer) clearTimeout(this.connection_timer);
        this.connection_timer = null;
        this.socket?.close(1000, 'Battle closed');
        this.socket = null;
        this.pending_messages = [];
        this.message_handlers.clear();
        this.connection_handlers.clear();
        this.error_handlers.clear();
    }

    private handleMessage(data: unknown) {
        if (typeof data !== 'string') return;
        let message: SocketServerMessage;
        try {
            message = JSON.parse(data) as SocketServerMessage;
        } catch {
            this.notifyError(new Error('Realtime battle server returned an invalid message.'));
            return;
        }
        if (message.type === 'error') {
            const error = new Error(message.message ?? 'Realtime battle command failed.') as Error & { code?: string };
            error.code = message.code;
            this.notifyError(error);
            return;
        }
        if (!isAuthoritativeEvent(message)) return;
        if (message.type === 'room_snapshot' && !this.connected) {
            if (this.connection_timer) clearTimeout(this.connection_timer);
            this.connection_timer = null;
            this.notifyConnection(true);
            this.flushPendingMessages();
        }
        this.message_handlers.forEach((handler) => handler(message));
    }

    private send(message: Record<string, unknown>) {
        if (this.connected && this.socket?.readyState === WebSocket.OPEN) {
            this.sendRaw(message);
            return;
        }
        this.pending_messages.push(message);
    }

    private sendRaw(message: Record<string, unknown>) {
        if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
    }

    private flushPendingMessages() {
        while (this.pending_messages.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
            const message = this.pending_messages.shift();
            if (message) this.sendRaw(message);
        }
    }

    private notifyConnection(connected: boolean, force = false) {
        if (!force && this.connected === connected) return;
        this.connected = connected;
        this.connection_handlers.forEach((handler) => handler(connected));
    }

    private notifyError(error: Error) {
        this.error_handlers.forEach((handler) => handler(error));
    }
}

export function createAuthoritativeBattleTransport(room_code: string, join_token: string): AuthoritativeBattleTransport {
    const websocket_url = process.env.NEXT_PUBLIC_WEBSOCKET_URL?.trim();
    return websocket_url
        ? new AuthoritativeBattleSocket(websocket_url, join_token)
        : new AuthoritativeBattleApi(room_code, join_token);
}

function isAuthoritativeEvent(message: SocketServerMessage): message is AuthoritativeEvent {
    return ['room_snapshot', 'match_finished', 'match_cancelled', 'rematch_status'].includes(message.type)
        && message.payload !== undefined;
}
