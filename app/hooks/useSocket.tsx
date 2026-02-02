'use client';

// ============================================
// HOOK SOCKET.IO - Gestion de la connexion temps réel
// ============================================

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SerializedRoom,
  Player,
  Team,
  PlayerRole,
  GameMode,
  AnswerResult,
  DisputeState,
  RoomConfig,
  RoundResult,
  ModeData,
} from '../types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type CleanupFn = () => void;

interface SocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

interface UseSocketReturn {
  socket: TypedSocket | null;
  state: SocketState;
  room: SerializedRoom | null;
  currentPlayer: Player | null;

  // Actions Room
  createRoom: (config?: Partial<RoomConfig>) => Promise<string>;
  joinRoom: (roomCode: string, playerName: string) => Promise<boolean>;
  leaveRoom: () => void;
  movePlayer: (playerId: string, team: Team | null, role: PlayerRole) => void;
  setReady: (ready: boolean) => void;
  updateConfig: (config: Partial<RoomConfig>) => void;

  // Actions Jeu
  startGame: () => void;
  selectMode: (mode: GameMode) => void;
  skipTurn: () => void;
  submitAnswer: (answer: string | Record<string, any>) => void;
  submitBet: (bet: number) => void;
  submitMytho: (isTrue: boolean) => void;
  buzz: () => void;
  requestDispute: (answerId: string) => void;
  voteDispute: (accept: boolean) => void;
  syncInput: (value: string) => void;

  // Game Flow Events
  onVSIntro: (callback: (teamAPlayers: Player[], teamBPlayers: Player[]) => void) => CleanupFn | undefined;
  onModeRoulette: (callback: (modes: GameMode[], selected: GameMode, duration: number) => void) => CleanupFn | undefined;
  onModeSelected: (callback: (mode: GameMode, data: ModeData) => void) => CleanupFn | undefined;
  onRoundStarted: (callback: (round: number, mode: GameMode, data: ModeData) => void) => CleanupFn | undefined;
  onRoundEnded: (callback: (result: RoundResult) => void) => CleanupFn | undefined;
  onGameEnded: (callback: (winner: Team, scores: { A: number; B: number }, results: RoundResult[]) => void) => CleanupFn | undefined;
  onTimerTick: (callback: (remaining: number) => void) => CleanupFn | undefined;

  // Gameplay Events
  onAnswerResult: (callback: (result: AnswerResult) => void) => CleanupFn | undefined;
  onComboUpdate: (callback: (team: Team, combo: number, multiplier: number) => void) => CleanupFn | undefined;
  onChainUpdate: (callback: (chain: Array<{ artistId: string; artistName: string; answeredBy: Team; answerTime: number }>) => void) => CleanupFn | undefined;
  onMythoStatement: (callback: (statement: string, index: number, total: number) => void) => CleanupFn | undefined;
  onMythoResult: (callback: (isTrue: boolean, explanation: string, teamAScore: number, teamBScore: number) => void) => CleanupFn | undefined;
  onBetRevealed: (callback: (bets: { A: number; B: number }, winner: Team, target: number) => void) => CleanupFn | undefined;
  onBuzzResult: (callback: (team: Team | null, timeLeft: number) => void) => CleanupFn | undefined;
  onPixelBlurUpdate: (callback: (blur: number, progress: number) => void) => CleanupFn | undefined;

  // Dispute & Effects
  onDisputeStarted: (callback: (dispute: DisputeState) => void) => CleanupFn | undefined;
  onDisputeResolved: (callback: (dispute: DisputeState, accepted: boolean) => void) => CleanupFn | undefined;
  onShake: (callback: (intensity: number) => void) => CleanupFn | undefined;
  onNotice: (callback: (message: string, tone?: 'info' | 'warning' | 'error') => void) => CleanupFn | undefined;
  onError: (callback: (message: string) => void) => CleanupFn | undefined;
  onInputSync: (callback: (team: Team, value: string) => void) => CleanupFn | undefined;
}

const STORAGE_KEYS = {
  roomCode: 'currentRoomCode',
  playerName: 'playerName',
  autoReconnect: 'autoReconnect',
};

const SocketContext = createContext<UseSocketReturn | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<TypedSocket | null>(null);
  const currentPlayerRef = useRef<Player | null>(null);
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [state, setState] = useState<SocketState>({
    connected: false,
    connecting: false,
    error: null,
  });
  const [room, setRoom] = useState<SerializedRoom | null>(null);
  const [currentPlayer, setCurrentPlayerState] = useState<Player | null>(null);

  const setCurrentPlayer = useCallback((player: Player | null) => {
    currentPlayerRef.current = player;
    setCurrentPlayerState(player);
  }, []);

  const persistSession = useCallback((roomCode: string, playerName: string) => {
    try {
      sessionStorage.setItem(STORAGE_KEYS.roomCode, roomCode);
      sessionStorage.setItem(STORAGE_KEYS.playerName, playerName);
      sessionStorage.setItem(STORAGE_KEYS.autoReconnect, '1');
      localStorage.setItem(STORAGE_KEYS.roomCode, roomCode);
      localStorage.setItem('rapjeu_player_name', playerName);
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  const clearSession = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEYS.roomCode);
      sessionStorage.removeItem(STORAGE_KEYS.autoReconnect);
      localStorage.removeItem(STORAGE_KEYS.roomCode);
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (socketRef.current) return;

    setState(prev => ({ ...prev, connecting: true }));

    const socketInstance: TypedSocket = io({
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setState({ connected: true, connecting: false, error: null });

      // Tentative de reconnexion automatique si flag actif
      try {
        const shouldReconnect = sessionStorage.getItem(STORAGE_KEYS.autoReconnect) === '1';
        const savedRoomCode = sessionStorage.getItem(STORAGE_KEYS.roomCode);
        const savedPlayerName = sessionStorage.getItem(STORAGE_KEYS.playerName) || localStorage.getItem('rapjeu_player_name');

        if (shouldReconnect && savedRoomCode && savedPlayerName) {
          socketInstance.emit('room:join', savedRoomCode, savedPlayerName, (success: boolean, error?: string) => {
            if (!success && error) {
              clearSession();
            }
          });
        }
      } catch (e) {
        // ignore
      }
    });

    socketInstance.on('disconnect', () => {
      setState(prev => ({ ...prev, connected: false }));
    });

    socketInstance.on('connect_error', (err) => {
      setState({ connected: false, connecting: false, error: err.message });
    });

    socketInstance.on('room:joined', (joinedRoom, player) => {
      setRoom(joinedRoom);
      setCurrentPlayer(player);
      setState(prev => ({ ...prev, error: null }));
      persistSession(joinedRoom.code, player.name);
    });

    socketInstance.on('room:updated', (updatedRoom) => {
      setRoom(updatedRoom);
      const playerRef = currentPlayerRef.current;
      if (playerRef) {
        const updatedPlayer = updatedRoom.players.find(p => p.id === playerRef.id);
        if (updatedPlayer) {
          setCurrentPlayer(updatedPlayer);
        } else {
          setCurrentPlayer(null);
        }
      }
    });

    socketInstance.on('room:left', (playerId) => {
      if (currentPlayerRef.current?.id === playerId) {
        setRoom(null);
        setCurrentPlayer(null);
      }
    });

    socketInstance.on('error', (message) => {
      setState(prev => ({ ...prev, error: message }));
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [clearSession, persistSession, setCurrentPlayer]);

  // Actions Room
  const createRoom = useCallback((config: Partial<RoomConfig> = {}): Promise<string> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve('');
        return;
      }
      socketRef.current.emit('room:create', config as RoomConfig, (roomCode) => {
        resolve(roomCode);
      });
    });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string): Promise<boolean> => {
    const cleanName = playerName.trim().slice(0, 20);
    const cleanCode = roomCode.trim().toUpperCase();

    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve(false);
        return;
      }
      setState(prev => ({ ...prev, error: null }));
      socketRef.current.emit('room:join', cleanCode, cleanName, (success, error) => {
        if (error) {
          setState(prev => ({ ...prev, error: error || null }));
        }
        if (success) {
          persistSession(cleanCode, cleanName);
        }
        resolve(success);
      });
    });
  }, [persistSession]);

  const leaveRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:leave');
    setRoom(null);
    setCurrentPlayer(null);
    clearSession();
  }, [clearSession, setCurrentPlayer]);

  const movePlayer = useCallback((playerId: string, team: Team | null, role: PlayerRole) => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:move_player', playerId, team, role);
  }, []);

  const setReady = useCallback((ready: boolean) => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:set_ready', ready);
  }, []);

  const updateConfig = useCallback((config: Partial<RoomConfig>) => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:update_config', config);
  }, []);

  // Actions Jeu
  const startGame = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:start');
  }, []);

  const selectMode = useCallback((mode: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:select_mode', mode);
  }, []);

  const skipTurn = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:skip');
  }, []);

  const submitAnswer = useCallback((answer: string | Record<string, any>) => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:submit_answer', answer as any);
  }, []);

  const submitBet = useCallback((bet: number) => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:submit_bet', bet);
  }, []);

  const submitMytho = useCallback((isTrue: boolean) => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:submit_mytho', isTrue);
  }, []);

  const buzz = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:buzz');
  }, []);

  const requestDispute = useCallback((answerId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:request_dispute', answerId);
  }, []);

  const voteDispute = useCallback((accept: boolean) => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:vote_dispute', accept);
  }, []);

  const syncInput = useCallback((value: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('input:typing', value);
  }, []);

  // Event listeners - retournent une fonction de cleanup
  const onVSIntro = useCallback((callback: (teamAPlayers: Player[], teamBPlayers: Player[]) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:vs_intro', callback);
    return () => socketInstance.off('game:vs_intro', callback);
  }, []);

  const onModeRoulette = useCallback((callback: (modes: GameMode[], selected: GameMode, duration: number) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:mode_roulette', callback);
    return () => socketInstance.off('game:mode_roulette', callback);
  }, []);

  const onModeSelected = useCallback((callback: (mode: GameMode, data: ModeData) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:mode_selected', callback);
    return () => socketInstance.off('game:mode_selected', callback);
  }, []);

  const onRoundStarted = useCallback((callback: (round: number, mode: GameMode, data: ModeData) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:round_started', callback);
    return () => socketInstance.off('game:round_started', callback);
  }, []);

  const onRoundEnded = useCallback((callback: (result: RoundResult) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:round_ended', callback);
    return () => socketInstance.off('game:round_ended', callback);
  }, []);

  const onGameEnded = useCallback((callback: (winner: Team, scores: { A: number; B: number }, results: RoundResult[]) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:ended', callback);
    return () => socketInstance.off('game:ended', callback);
  }, []);

  const onTimerTick = useCallback((callback: (remaining: number) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:timer_tick', callback);
    return () => socketInstance.off('game:timer_tick', callback);
  }, []);

  const onAnswerResult = useCallback((callback: (result: AnswerResult) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:answer_result', callback);
    return () => socketInstance.off('game:answer_result', callback);
  }, []);

  const onComboUpdate = useCallback((callback: (team: Team, combo: number, multiplier: number) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:combo_update', callback);
    return () => socketInstance.off('game:combo_update', callback);
  }, []);

  const onChainUpdate = useCallback((callback: (chain: Array<{ artistId: string; artistName: string; answeredBy: Team; answerTime: number }>) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:chain_update', callback);
    return () => socketInstance.off('game:chain_update', callback);
  }, []);

  const onMythoStatement = useCallback((callback: (statement: string, index: number, total: number) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:mytho_statement', callback);
    return () => socketInstance.off('game:mytho_statement', callback);
  }, []);

  const onMythoResult = useCallback((callback: (isTrue: boolean, explanation: string, teamAScore: number, teamBScore: number) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:mytho_result', callback);
    return () => socketInstance.off('game:mytho_result', callback);
  }, []);

  const onBetRevealed = useCallback((callback: (bets: { A: number; B: number }, winner: Team, target: number) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:bet_revealed', callback);
    return () => socketInstance.off('game:bet_revealed', callback);
  }, []);

  const onBuzzResult = useCallback((callback: (team: Team | null, timeLeft: number) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:buzz_result', callback);
    return () => socketInstance.off('game:buzz_result', callback);
  }, []);

  const onPixelBlurUpdate = useCallback((callback: (blur: number, progress: number) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:pixel_blur_update', callback);
    return () => socketInstance.off('game:pixel_blur_update', callback);
  }, []);

  const onDisputeStarted = useCallback((callback: (dispute: DisputeState) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:dispute_started', callback);
    return () => socketInstance.off('game:dispute_started', callback);
  }, []);

  const onDisputeResolved = useCallback((callback: (dispute: DisputeState, accepted: boolean) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:dispute_resolved', callback);
    return () => socketInstance.off('game:dispute_resolved', callback);
  }, []);

  const onShake = useCallback((callback: (intensity: number) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('shake', callback);
    return () => socketInstance.off('shake', callback);
  }, []);

  const onNotice = useCallback((callback: (message: string, tone?: 'info' | 'warning' | 'error') => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('game:notice', callback);
    return () => socketInstance.off('game:notice', callback);
  }, []);

  const onError = useCallback((callback: (message: string) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('error', callback);
    return () => socketInstance.off('error', callback);
  }, []);

  const onInputSync = useCallback((callback: (team: Team, value: string) => void): CleanupFn | undefined => {
    const socketInstance = socketRef.current;
    if (!socketInstance) return undefined;
    socketInstance.on('input:sync', callback);
    return () => socketInstance.off('input:sync', callback);
  }, []);

  const value: UseSocketReturn = {
    socket,
    state,
    room,
    currentPlayer,
    createRoom,
    joinRoom,
    leaveRoom,
    movePlayer,
    setReady,
    updateConfig,
    startGame,
    selectMode,
    skipTurn,
    submitAnswer,
    submitBet,
    submitMytho,
    buzz,
    requestDispute,
    voteDispute,
    syncInput,
    onVSIntro,
    onModeRoulette,
    onModeSelected,
    onRoundStarted,
    onRoundEnded,
    onGameEnded,
    onTimerTick,
    onAnswerResult,
    onComboUpdate,
    onChainUpdate,
    onMythoStatement,
    onMythoResult,
    onBetRevealed,
    onBuzzResult,
    onPixelBlurUpdate,
    onDisputeStarted,
    onDisputeResolved,
    onShake,
    onNotice,
    onError,
    onInputSync,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): UseSocketReturn {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}


