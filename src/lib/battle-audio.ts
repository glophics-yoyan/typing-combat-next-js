export type BattleSound = 'ready' | 'correct' | 'incorrect' | 'countdown' | 'impact' | 'victory' | 'defeat';

let audio_context: AudioContext | null = null;

export function playBattleSound(sound: BattleSound, enabled: boolean) {
    if (!enabled || typeof window === 'undefined') return;
    try {
        audio_context ??= new AudioContext();
    } catch {
        return;
    }
    if (audio_context.state === 'suspended') void audio_context.resume();
    const frequencies: Record<BattleSound, number> = {
        ready: 440,
        correct: 620,
        incorrect: 150,
        countdown: 360,
        impact: 95,
        victory: 820,
        defeat: 120,
    };
    const oscillator = audio_context.createOscillator();
    const gain = audio_context.createGain();
    const now = audio_context.currentTime;
    oscillator.type = sound === 'incorrect' || sound === 'defeat' ? 'sawtooth' : 'sine';
    oscillator.frequency.setValueAtTime(frequencies[sound], now);
    if (sound === 'victory') oscillator.frequency.exponentialRampToValueAtTime(1240, now + 0.22);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(sound === 'impact' ? 0.12 : 0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (sound === 'victory' || sound === 'defeat' ? 0.3 : 0.08));
    oscillator.connect(gain).connect(audio_context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.32);
}
