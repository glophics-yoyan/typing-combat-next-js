export type AttackKind = 'jab' | 'cross' | 'kick' | 'throw';
export type CombatSide = 0 | 1;

export interface CombatPlayer {
    position: number;
    mistakes: number;
    hp: number;
}

export interface CombatSnapshot {
    quote_text: string;
    connected: boolean;
    status: string;
    winner: 'me' | 'opponent' | null;
    paused: boolean;
    players: [CombatPlayer, CombatPlayer];
}

export interface WordAttack {
    kind: AttackKind;
    word: string;
    end: number;
    ordinal: number;
}

export interface LiveAttack extends WordAttack {
    started_at: number;
    duration: number;
    impacted: boolean;
}

export interface FighterTimeline {
    position: number;
    mistakes: number;
    queue: WordAttack[];
    attack: LiveAttack | null;
    last_started: number;
    charge_until: number;
    hit_at: number;
    hit_kind: AttackKind;
    hit_word: string;
    hits: number;
}

export interface CombatTimeline {
    quote_text: string;
    words: WordAttack[];
    status: string;
    connected: boolean;
    initialized: boolean;
    finished_at: number;
    fighters: [FighterTimeline, FighterTimeline];
}

export const ATTACK_LABELS: Record<AttackKind, string> = { jab: 'FLASH JAB', cross: 'CROSS STRIKE', kick: 'METEOR KICK', throw: 'WORD BURST' };
export const ATTACK_DURATION: Record<AttackKind, number> = { jab: .55, cross: .62, kick: .75, throw: .85 };
export const IMPACT_PHASE: Record<AttackKind, number> = { jab: .43, cross: .43, kick: .5, throw: .66 };
const COMBO: AttackKind[] = ['jab', 'cross', 'kick', 'throw'];

export function getWordAttacks(quote_text: string): WordAttack[] {
    return Array.from(quote_text.matchAll(/\S+/g), (match, ordinal) => ({
        kind: COMBO[ordinal % COMBO.length], word: match[0], end: match.index + match[0].length, ordinal,
    }));
}

function createFighter(): FighterTimeline {
    return { position: 0, mistakes: 0, queue: [], attack: null, last_started: -10, charge_until: 0, hit_at: -10, hit_kind: 'jab', hit_word: '', hits: 0 };
}

export function createTimeline(): CombatTimeline {
    return { quote_text: '', words: [], status: '', connected: false, initialized: false, finished_at: -1, fighters: [createFighter(), createFighter()] };
}

function clearActions(fighter: FighterTimeline) {
    fighter.queue.length = 0;
    fighter.attack = null;
    fighter.charge_until = 0;
    fighter.hit_at = -10;
}

export function advanceTimeline(timeline: CombatTimeline, snapshot: CombatSnapshot, now: number) {
    const reset = !timeline.initialized || timeline.quote_text !== snapshot.quote_text || timeline.connected !== snapshot.connected
        || snapshot.players.some((player, side) => player.position < timeline.fighters[side].position);
    if (timeline.quote_text !== snapshot.quote_text) timeline.words = getWordAttacks(snapshot.quote_text);
    if (reset) {
        timeline.fighters.forEach((fighter, side) => {
            clearActions(fighter);
            fighter.position = snapshot.players[side].position;
            fighter.mistakes = snapshot.players[side].mistakes;
            fighter.last_started = -10;
        });
        timeline.finished_at = snapshot.status === 'finished' ? now : -1;
    }
    const just_finished = !reset && timeline.status !== 'finished' && snapshot.status === 'finished';
    if (just_finished) timeline.finished_at = now;

    timeline.fighters.forEach((fighter, side) => {
        const player = snapshot.players[side];
        const advanced = player.position > fighter.position;
        const crossed = advanced && !reset ? timeline.words.filter((word) => word.end > fighter.position && word.end <= player.position) : [];
        if (!snapshot.connected || snapshot.paused || !['active', 'finished'].includes(snapshot.status)) {
            clearActions(fighter);
        } else if (just_finished) {
            const concluding_attack = fighter.attack;
            clearActions(fighter);
            const winner_side = snapshot.winner === 'me' ? 0 : 1;
            const final_attack = crossed.at(-1);
            if (side === winner_side && final_attack) fighter.attack = { ...final_attack, started_at: now, duration: ATTACK_DURATION[final_attack.kind], impacted: false };
            else if (side === winner_side) fighter.attack = concluding_attack;
        } else if (snapshot.status === 'active') {
            // Keep only the latest two events, never replay a long network backlog.
            if (crossed.length) fighter.queue = [...fighter.queue, ...crossed].slice(-2);
            if (advanced) fighter.charge_until = now + .28;
            if (player.mistakes > fighter.mistakes) fighter.charge_until = 0;
        }
        fighter.position = player.position;
        fighter.mistakes = player.mistakes;
        if (snapshot.status === 'active' && snapshot.connected && !snapshot.paused && !fighter.attack && fighter.queue.length && now - fighter.last_started >= .35) {
            const next = fighter.queue.shift()!;
            fighter.attack = { ...next, started_at: now, duration: ATTACK_DURATION[next.kind], impacted: false };
            fighter.last_started = now;
        }
    });

    timeline.fighters.forEach((fighter, side) => {
        const attack = fighter.attack;
        if (!attack) return;
        if (!attack.impacted && (now - attack.started_at) / attack.duration >= IMPACT_PHASE[attack.kind]) {
            attack.impacted = true;
            const target = timeline.fighters[side === 0 ? 1 : 0];
            target.hit_at = now;
            target.hit_kind = attack.kind;
            target.hit_word = attack.word;
            target.hits += 1;
        }
        if (now - attack.started_at >= attack.duration) fighter.attack = null;
    });
    timeline.initialized = true;
    timeline.quote_text = snapshot.quote_text;
    timeline.status = snapshot.status;
    timeline.connected = snapshot.connected;
}

export function attackPhase(fighter: FighterTimeline, now: number) {
    return fighter.attack ? Math.min(1, Math.max(0, (now - fighter.attack.started_at) / fighter.attack.duration)) : 0;
}

export function strikeEnvelope(phase: number, impact: number) {
    if (phase < .2) return -Math.sin(phase / .2 * Math.PI / 2) * .16;
    if (phase < impact) return (phase - .2) / (impact - .2);
    return Math.max(0, 1 - (phase - impact) / (1 - impact));
}

export function fighterPositions(pressure: number, left_lunge: number, right_lunge: number, left_recoil: number, right_recoil: number): [number, number] {
    const center = Math.max(-.65, Math.min(.65, pressure * .65));
    let left = center - 1.5 + Math.max(0, left_lunge) * 1.35 - left_recoil * .35;
    let right = center + 1.5 - Math.max(0, right_lunge) * 1.35 + right_recoil * .35;
    if (right - left < 1.65) {
        const midpoint = (left + right) / 2;
        left = midpoint - .825;
        right = midpoint + .825;
    }
    return [Math.max(-2.9, left), Math.min(2.9, right)];
}
