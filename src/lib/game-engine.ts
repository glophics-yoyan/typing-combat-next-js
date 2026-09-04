import type { Quote, PlayerState, GameState } from '@/types';

export const STARTING_HP = 100;
export const COUNTDOWN_DURATION = 3000;
export const STATE_SYNC_INTERVAL = 50;

export function calculateDamage(wpm: number, accuracy: number): number {
  const baseDps = (wpm / 60) * 5;
  return baseDps * accuracy * accuracy;
}

export function calculateWpm(keystrokes: number, timeMs: number): number {
  if (timeMs <= 0) return 0;
  const words = keystrokes / 5;
  const minutes = timeMs / 60000;
  return words / minutes;
}

export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 1;
  return Math.max(0, correct / total);
}

export function createInitialGameState(quote: Quote): GameState {
  return {
    quote,
    myState: {
      hp: STARTING_HP,
      position: 0,
      wpm: 0,
      accuracy: 1,
      lastKeystroke: Date.now(),
      isReady: false,
      totalKeystrokes: 0,
      correctKeystrokes: 0,
    },
    opponentState: null,
    status: 'waiting',
    winner: null,
    startTime: null,
    endTime: null,
  };
}

export function processKeystroke(
  gameState: GameState,
  char: string,
  isCorrect: boolean
): GameState {
  const { myState, quote } = gameState;
  if (!quote || myState.hp <= 0 || gameState.status !== 'active') {
    return gameState;
  }

  const newPosition = isCorrect ? Math.min(myState.position + 1, quote.text.length) : myState.position;
  const keystrokeTime = Date.now();
  const timeSinceStart = gameState.startTime ? keystrokeTime - gameState.startTime : 0;

  const totalKeystrokes = myState.totalKeystrokes + 1;
  const correctKeystrokes = myState.correctKeystrokes + (isCorrect ? 1 : 0);

  const newWpm = calculateWpm(totalKeystrokes, timeSinceStart);
  const newAccuracy = calculateAccuracy(correctKeystrokes, totalKeystrokes);

  return {
    ...gameState,
    myState: {
      ...myState,
      position: newPosition,
      wpm: newWpm,
      accuracy: newAccuracy,
      lastKeystroke: keystrokeTime,
      totalKeystrokes,
      correctKeystrokes,
    },
  };
}

export function applyOpponentState(gameState: GameState, opponentState: PlayerState): GameState {
  return {
    ...gameState,
    opponentState: { ...opponentState },
  };
}

export function applyDamage(gameState: GameState, dt: number): GameState {
  if (gameState.status !== 'active') return gameState;

  const { myState, opponentState } = gameState;
  if (!opponentState) return gameState;

  const myDamage = calculateDamage(myState.wpm, myState.accuracy) * (dt / 1000);
  const opponentDamage = calculateDamage(opponentState.wpm, opponentState.accuracy) * (dt / 1000);

  let newMyHp = Math.max(0, myState.hp - opponentDamage);
  let newOpponentHp = Math.max(0, opponentState.hp - myDamage);

  let winner: GameState['winner'] = null;
  let status: GameState['status'] = gameState.status;
  let endTime = gameState.endTime;

  if (newMyHp <= 0 && newOpponentHp <= 0) {
    winner = myState.position >= opponentState.position ? 'me' : 'opponent';
    status = 'finished';
    endTime = Date.now();
  } else if (newMyHp <= 0) {
    winner = 'opponent';
    status = 'finished';
    endTime = Date.now();
  } else if (newOpponentHp <= 0) {
    winner = 'me';
    status = 'finished';
    endTime = Date.now();
  }

  return {
    ...gameState,
    myState: { ...myState, hp: newMyHp },
    opponentState: { ...opponentState, hp: newOpponentHp },
    status,
    winner,
    endTime,
  };
}

export function checkQuoteComplete(gameState: GameState): GameState {
  const { myState, opponentState, quote } = gameState;
  if (!quote || gameState.status !== 'active') return gameState;

  const myComplete = myState.position >= quote.text.length;
  const opponentComplete = opponentState && opponentState.position >= quote.text.length;

  if (myComplete && opponentComplete) {
    return {
      ...gameState,
      status: 'finished',
      winner: myState.wpm >= opponentState!.wpm ? 'me' : 'opponent',
      endTime: Date.now(),
    };
  }

  if (myComplete) {
    return {
      ...gameState,
      status: 'finished',
      winner: 'me',
      endTime: Date.now(),
    };
  }

  if (opponentComplete) {
    return {
      ...gameState,
      status: 'finished',
      winner: 'opponent',
      endTime: Date.now(),
    };
  }

  return gameState;
}

export function startGame(gameState: GameState, startTime = Date.now() + COUNTDOWN_DURATION): GameState {
  return {
    ...gameState,
    status: 'countdown',
    startTime,
  };
}

export function beginActiveGame(gameState: GameState, startTime = Date.now()): GameState {
  return {
    ...gameState,
    status: 'active',
    startTime,
  };
}

export function setReady(gameState: GameState): GameState {
  return {
    ...gameState,
    myState: { ...gameState.myState, isReady: true },
  };
}

export function setOpponentReady(gameState: GameState): GameState {
  if (!gameState.opponentState) return gameState;
  return {
    ...gameState,
    opponentState: { ...gameState.opponentState, isReady: true },
  };
}

export function canStartCountdown(gameState: GameState): boolean {
  return (
    gameState.status === 'waiting' &&
    gameState.myState.isReady &&
    gameState.opponentState?.isReady === true
  );
}

export function getTimeRemaining(gameState: GameState): number {
  if (gameState.status === 'countdown' && gameState.startTime) {
    return Math.max(0, gameState.startTime - Date.now());
  }
  return 0;
}

export function isGameActive(gameState: GameState): boolean {
  return gameState.status === 'active';
}

export function isGameFinished(gameState: GameState): boolean {
  return gameState.status === 'finished';
}
