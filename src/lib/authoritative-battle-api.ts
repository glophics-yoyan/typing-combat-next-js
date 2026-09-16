import type { ApiEnvelope, MatchResult, RestBattleData, RoomSnapshot } from '@/types';

export type AuthoritativeEvent =
    | { type: 'room_snapshot'; payload: RoomSnapshot }
    | { type: 'match_finished'; payload: MatchResult }
    | { type: 'match_cancelled'; payload: MatchResult }
    | { type: 'rematch_status'; payload: { votes: Record<string, boolean>; expires_at: number | null } };

type MessageHandler = (message: AuthoritativeEvent) => void;
type ConnectionHandler = (connected: boolean) => void;
type ErrorHandler = (error: Error) => void;

const ACTIVE_POLL_INTERVAL_MS = 250;
const IDLE_POLL_INTERVAL_MS = 750;
const FINISHED_POLL_INTERVAL_MS = 1000;
const REQUEST_TIMEOUT_MS = 10000;
const INPUT_BATCH_INTERVAL_MS = 100;

export class AuthoritativeBattleApi {
    private poll_timer: ReturnType<typeof setTimeout> | null = null;
    private active_requests = new Set<AbortController>();
    private command_chain: Promise<void> = Promise.resolve();
    private pending_inputs: Array<{
        request_id: string;
        sequence: number;
        character: string;
        client_timestamp: number;
    }> = [];
    private input_batch_timer: ReturnType<typeof setTimeout> | null = null;
    private message_handlers = new Set<MessageHandler>();
    private connection_handlers = new Set<ConnectionHandler>();
    private error_handlers = new Set<ErrorHandler>();
    private reported_match_id: string | null = null;
    private connected = false;
    private destroyed = false;
    private poll_interval = IDLE_POLL_INTERVAL_MS;

    constructor(
        private room_code: string,
        private join_token: string,
    ) {}

    initialize() {
        if (!getApiUrl()) {
            this.notifyError(new Error('NEXT_PUBLIC_API_URL is not configured'));
            return;
        }
        window.addEventListener('pagehide', this.handlePageHide);
        void this.poll();
    }

    sendReady() {
        this.enqueueCommand('ready', {});
    }

    sendInput(sequence: number, character: string, client_timestamp = Date.now()) {
        this.pending_inputs.push({
            request_id: crypto.randomUUID(),
            sequence,
            character,
            client_timestamp,
        });
        if (!this.input_batch_timer) {
            this.input_batch_timer = setTimeout(() => this.flushInputs(), INPUT_BATCH_INTERVAL_MS);
        }
    }

    sendRematch(accepted: boolean) {
        this.enqueueCommand('rematch', { accepted });
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
        if (this.poll_timer) clearTimeout(this.poll_timer);
        if (this.input_batch_timer) clearTimeout(this.input_batch_timer);
        this.poll_timer = null;
        this.input_batch_timer = null;
        this.pending_inputs = [];
        this.active_requests.forEach((controller) => controller.abort());
        this.active_requests.clear();
        window.removeEventListener('pagehide', this.handlePageHide);
    }

    private enqueueCommand(path: string, body: Record<string, unknown>) {
        this.command_chain = this.command_chain
            .then(async () => {
                const data = await this.request(path, body);
                this.setConnected(true);
                this.handleData(data);
            })
            .catch((caught_error) => {
                if (this.destroyed || isAbortError(caught_error)) return;
                this.notifyError(toError(caught_error));
            });
    }

    private async poll() {
        try {
            const data = await this.request('snapshot');
            if (this.destroyed) return;
            this.setConnected(true);
            this.handleData(data);
            this.poll_timer = setTimeout(() => void this.poll(), this.poll_interval);
        } catch (caught_error) {
            if (this.destroyed) return;
            this.setConnected(false);
            const error = isAbortError(caught_error)
                ? new Error('The battle API did not respond within 10 seconds.')
                : toError(caught_error, 'Unable to reach the battle API');
            const error_code = getErrorCode(caught_error);
            if (error_code) (error as Error & { code?: string }).code = error_code;
            this.notifyError(error);
        }
    }

    private async request(path: string, body?: Record<string, unknown>) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        this.active_requests.add(controller);
        try {
            const response = await fetch(`${getApiUrl()}/api/v2/battles/${this.room_code}/${path}`, {
                method: body ? 'POST' : 'GET',
                headers: {
                    Authorization: `Bearer ${this.join_token}`,
                    ...(body ? { 'Content-Type': 'application/json' } : {}),
                },
                body: body ? JSON.stringify(body) : undefined,
                cache: 'no-store',
                signal: controller.signal,
            });
            const envelope = await response.json() as ApiEnvelope<RestBattleData>;
            if (!response.ok || !envelope.data) {
                const error = new Error(envelope.message || 'Battle API request failed') as Error & { code?: string };
                error.code = envelope.error?.code;
                throw error;
            }
            return envelope.data;
        } finally {
            clearTimeout(timeout);
            this.active_requests.delete(controller);
        }
    }

    private handleData(data: RestBattleData) {
        this.poll_interval = data.snapshot.phase === 'active' || data.snapshot.phase === 'countdown'
            ? ACTIVE_POLL_INTERVAL_MS
            : data.snapshot.phase === 'finished' || data.snapshot.phase === 'cancelled'
                ? FINISHED_POLL_INTERVAL_MS
                : IDLE_POLL_INTERVAL_MS;
        this.message_handlers.forEach((handler) => handler({ type: 'room_snapshot', payload: data.snapshot }));
        this.message_handlers.forEach((handler) => handler({ type: 'rematch_status', payload: data.rematch_status }));
        if (!data.match_result || this.reported_match_id === data.match_result.match_id) return;
        this.reported_match_id = data.match_result.match_id;
        const type = data.snapshot.phase === 'cancelled' ? 'match_cancelled' : 'match_finished';
        this.message_handlers.forEach((handler) => handler({ type, payload: data.match_result! }));
    }

    private setConnected(connected: boolean) {
        if (this.connected === connected) return;
        this.connected = connected;
        this.connection_handlers.forEach((handler) => handler(connected));
    }

    private async sendLeave() {
        const api_url = getApiUrl();
        if (!api_url) return;
        try {
            await fetch(`${api_url}/api/v2/battles/${this.room_code}/leave`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${this.join_token}` },
                keepalive: true,
            });
        } catch {
            // Presence also expires automatically when polling stops.
        }
    }

    private notifyError(error: Error) {
        this.error_handlers.forEach((handler) => handler(error));
    }

    private flushInputs() {
        this.input_batch_timer = null;
        if (this.pending_inputs.length === 0 || this.destroyed) return;
        const inputs = this.pending_inputs.splice(0, this.pending_inputs.length);
        this.enqueueCommand('input', { inputs });
    }

    private handlePageHide = () => {
        void this.sendLeave();
    };
}

function getApiUrl() {
    const configured_url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
    if (configured_url) return configured_url;

    const previous_websocket_url = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
    if (!previous_websocket_url) return '';
    return previous_websocket_url
        .replace(/^wss:/, 'https:')
        .replace(/^ws:/, 'http:')
        .replace(/\/ws\/?$/, '');
}

function isAbortError(value: unknown) {
    return value instanceof DOMException && value.name === 'AbortError';
}

function toError(value: unknown, fallback = 'Battle API request failed') {
    return value instanceof Error ? value : new Error(fallback);
}

function getErrorCode(value: unknown) {
    return value instanceof Error ? (value as Error & { code?: string }).code : undefined;
}
