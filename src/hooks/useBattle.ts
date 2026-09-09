'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, PlayerState, Quote, WebRTCMessage } from '@/types';
import {
  createInitialGameState,
  processKeystroke,
  applyOpponentState,
  applyDamage,
  checkQuoteComplete,
  startGame,
  beginActiveGame,
  setReady,
  canStartCountdown,
  isGameActive,
  isGameFinished,
} from '@/lib/game-engine';
import { createWebRTCManager } from '@/lib/webrtc';
import { clearSignaling, pollForOffer, pollForAnswer, pollForOpponent, sendOffer, sendAnswer, fetchRoomState } from '@/lib/signaling';

const MAX_CONNECTION_ATTEMPT_DURATION = 20000;

interface UseBattleOptions {
  roomCode: string;
  isHost: boolean;
  userId: string;
  username: string;
  onGameEnd?: (won: boolean, wpm: number, accuracy: number, durationMs: number) => void;
}

export function useBattle({
  roomCode,
  isHost,
  userId,
  onGameEnd,
}: UseBattleOptions) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [connection_attempt, setConnectionAttempt] = useState(0);
  const [opponent_username, setOpponentUsername] = useState('');

  const webrtcRef = useRef<ReturnType<typeof createWebRTCManager> | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const cleanupFnsRef = useRef<(() => void)[]>([]);
  const quoteRef = useRef<Quote | null>(null);
  const didReportEndRef = useRef(false);
  const didSendFinishRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameLoopRef = useRef<((timestamp: number) => void) | null>(null);

  const sendState = useCallback(() => {
    if (webrtcRef.current && gameState) {
      webrtcRef.current.sendState(gameState.myState);
    }
  }, [gameState]);

  const handleMessage = useCallback((message: WebRTCMessage) => {
    switch (message.type) {
      case 'state': {
        const opponentState = message.payload as PlayerState;
        setGameState((prev: GameState | null) => {
          if (!prev) return prev;
          return applyOpponentState(prev, opponentState);
        });
        break;
      }
      case 'ready': {
        const opponent_state = message.payload as PlayerState;
        setGameState((prev: GameState | null) => {
          if (!prev) return prev;
          return applyOpponentState(prev, { ...opponent_state, isReady: true });
        });
        break;
      }
      case 'start': {
        const { startTime } = message.payload as { startTime: number };
        setGameState((prev: GameState | null) => (prev ? startGame(prev, startTime) : prev));
        break;
      }
      case 'finish': {
        const { winner } = message.payload as { winner: 'me' | 'opponent' };
        setGameState((prev: GameState | null) => {
          if (!prev || prev.status === 'finished') return prev;
          return { ...prev, status: 'finished', winner: winner === 'me' ? 'opponent' : 'me', endTime: Date.now() };
        });
        break;
      }
      case 'rematch': {
        // Handle rematch
        break;
      }
    }
  }, []);

  const handleConnectionChange = useCallback((isConnected: boolean) => {
    setConnected(isConnected);
    if (!isConnected) {
      setError('Connection lost. Trying to reconnect...');
    } else {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setError(null);
    }
  }, []);

  const handleError = useCallback((err: Error) => {
    setError(err.message);
  }, []);

  useEffect(() => {
    const webrtc = createWebRTCManager(isHost);
    let is_cancelled = false;
    webrtcRef.current = webrtc;

    const unsubMessage = webrtc.onMessage(handleMessage);
    const unsubConnection = webrtc.onConnectionChange(handleConnectionChange);
    const unsubError = webrtc.onError(handleError);
    cleanupFnsRef.current = [unsubMessage, unsubConnection, unsubError];

    const initConnection = async () => {
      try {
        const roomData = await fetchRoomState(roomCode);
        if (is_cancelled) return;
        if (!roomData || !roomData.quote) {
          setError('Battle not found or has no quote');
          return;
        }

        quoteRef.current = roomData.quote;
        const initialState = createInitialGameState(roomData.quote);
        const me = roomData.players.find((player) => player.userId === userId);
        const opponent = roomData.players.find((player) => player.userId !== userId);
        if (me) {
          initialState.myState = {
            hp: me.hp, position: me.position, wpm: me.wpm, accuracy: me.accuracy,
            lastKeystroke: Date.now(), isReady: me.isReady, totalKeystrokes: 0, correctKeystrokes: 0,
          };
        }
        if (opponent) {
          initialState.opponentState = {
            hp: opponent.hp, position: opponent.position, wpm: opponent.wpm, accuracy: opponent.accuracy,
            lastKeystroke: Date.now(), isReady: opponent.isReady, totalKeystrokes: 0, correctKeystrokes: 0,
          };
          setOpponentUsername(opponent.username);
        }
        setGameState(initialState);

        if (isHost) {
        const startHostConnection = async () => {
          await clearSignaling(roomCode);
          if (is_cancelled) return;
          const session_id = crypto.randomUUID();
          webrtc.initialize(async (signal) => {
              await sendOffer(roomCode, session_id, signal);
            });

            const stopPolling = await pollForAnswer(
              roomCode,
              session_id,
              async (answer) => {
                webrtc.handleSignal(answer);
              },
              () => setError('Connection timeout')
            );
            cleanupFnsRef.current.push(stopPolling);
          };

          if (roomData.players.length >= 2) {
            await startHostConnection();
          } else {
            const stopPolling = await pollForOpponent(
              roomCode,
              () => {
                void startHostConnection().catch((err) => {
                  setError(err instanceof Error ? err.message : 'Connection failed');
                });
              },
              () => setError('Waiting for opponent')
            );
            cleanupFnsRef.current.push(stopPolling);
          }
        } else {
          const stopPolling = await pollForOffer(
            roomCode,
            async (offer) => {
              if (is_cancelled) return;
              webrtc.initialize(async (signal) => {
                await sendAnswer(roomCode, offer.sessionId, signal);
              });
              webrtc.handleSignal(offer.signal);
            },
            () => setError('Connection timeout')
          );
          cleanupFnsRef.current.push(stopPolling);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed');
      }
    };

    initConnection();

    reconnectTimerRef.current = setTimeout(() => {
      if (is_cancelled || webrtc.isConnected()) return;
      setError('Direct connection timed out. Retrying...');
      setConnectionAttempt((current_attempt) => current_attempt + 1);
    }, MAX_CONNECTION_ATTEMPT_DURATION);

    return () => {
      is_cancelled = true;
      cleanupFnsRef.current.forEach((fn) => fn());
      cleanupFnsRef.current = [];
      webrtc.destroy();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [roomCode, isHost, userId, handleMessage, handleConnectionChange, handleError, connection_attempt]);

  const gameLoop = useCallback((timestamp: number) => {
    if (!gameState) return;

    const dt = timestamp - lastFrameRef.current;
    lastFrameRef.current = timestamp;

    setGameState((prev: GameState | null) => {
      if (!prev) return prev;

      let next = prev;

      if (prev.status === 'countdown') {
        const remaining = Math.max(0, (prev.startTime || 0) - Date.now());
        setCountdown(Math.ceil(remaining / 1000));
        if (remaining <= 0) {
          next = beginActiveGame(next);
        }
      }

      if (isGameActive(next)) {
        next = checkQuoteComplete(next);
        if (isGameActive(next)) next = applyDamage(next, dt);
      }

      if (isGameFinished(next) && prev.status !== 'finished') {
        if (!didSendFinishRef.current && next.winner) {
          didSendFinishRef.current = true;
          webrtcRef.current?.sendFinish(next.winner);
        }
      }

      return next;
    });

    if (isGameActive(gameState)) {
      sendState();
    }

    animationRef.current = requestAnimationFrame((next_timestamp) => {
      gameLoopRef.current?.(next_timestamp);
    });
  }, [gameState, sendState]);

  useEffect(() => {
    gameLoopRef.current = gameLoop;
  }, [gameLoop]);

  useEffect(() => {
    if (gameState && (gameState.status === 'countdown' || gameState.status === 'active')) {
      lastFrameRef.current = performance.now();
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState, gameLoop]);

  useEffect(() => {
    if (!gameState || !isGameFinished(gameState) || didReportEndRef.current) return;

    didReportEndRef.current = true;
    const duration = (gameState.endTime || Date.now()) - (gameState.startTime || Date.now());
    onGameEnd?.(
      gameState.winner === 'me',
      gameState.myState.wpm,
      gameState.myState.accuracy,
      Math.max(0, duration)
    );
  }, [gameState, onGameEnd]);

  const handleKeystroke = useCallback((char: string, isCorrect: boolean) => {
    setGameState((prev: GameState | null) => {
      if (!prev || !isGameActive(prev)) return prev;
      return processKeystroke(prev, char, isCorrect);
    });
  }, []);

  const handleReady = useCallback(() => {
    setGameState((prev: GameState | null) => {
      if (!prev) return prev;
      const next = setReady(prev);
      webrtcRef.current?.sendReady(next.myState);
      return next;
    });
  }, []);

  const startCountdown = useCallback(() => {
    setGameState((prev: GameState | null) => {
      if (!prev || !canStartCountdown(prev)) return prev;
      const next = startGame(prev);
      webrtcRef.current?.sendStart(next.startTime!);
      return next;
    });
  }, []);

  const retryConnection = useCallback(() => {
    setConnected(false);
    setError('Retrying direct connection...');
    setConnectionAttempt((current_attempt) => current_attempt + 1);
  }, []);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    void fetchRoomState(roomCode).then((room_data) => {
      const opponent = room_data?.players.find((player) => player.userId !== userId);
      if (!cancelled && opponent) setOpponentUsername(opponent.username);
    }).catch(() => {
      // Keep the existing display name if the room lookup is temporarily unavailable.
    });
    return () => { cancelled = true; };
  }, [connected, roomCode, userId]);

  return {
    gameState,
    connected,
    error,
    countdown,
    handleKeystroke,
    handleReady,
    startCountdown,
    retryConnection,
    opponentUsername: opponent_username,
  };
}
