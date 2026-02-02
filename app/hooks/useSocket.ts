'use client';

// ============================================
// SOCKET CONTEXT + HOOK (version .ts sans JSX)
// Corrige: skipTurn + onNotice + exports SocketProvider
// ============================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
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
  onNotice: (callback: (message: string) => void) => CleanupFn | undefined;
  onError: (callback: (message: string) => void) => CleanupFn | undefined;
  onInputSync: (callback: (team: Team, value: string) => void) => CleanupFn | undefined;
}

const SocketContext = createContext<UseSocketReturn | null>(null);

function getApiOrigin() {
  // Même origin que le site (prod derrière nginx)
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

function safeSessionGet(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSessionSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {}
}
function safeSessionRemove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

function safeLocalGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeLocalSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
function safeLocalRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

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
    safeSessionSet('currentRoomCode', roomCode);
    safeSessionSet('playerName', playerName);
    safeLocalSet('currentRoomCode', roomCode);
  }, []);

  const clearSession = useCallback(() => {
    safeSessionRemove('currentRoomCode');
    safeSessionRemove('playerName');
    safeLocalRemove('currentRoomCode');
  }, []);

  // Init socket
  useEffect(() => {
    setState(prev => ({ ...prev, connecting: true }));

    const socketInstance: TypedSocket = io(getApiOrigin(), {
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setState({ connected: true, connecting: false, error: null });

      // reconnexion auto si on a room + playerName
      const savedRoomCode = safeSessionGet('currentRoomCode') || safeLocalGet('currentRoomCode');
      const savedPlayerName = safeSessionGet('playerName');

      if (savedRoomCode && savedPlayerName) {
        setTimeout(() => {
          socketInstance.emit('room:join', savedRoomCode, savedPlayerName, (success: boolean) => {
            if (!success) {
              clearSession();
            }
          });
        }, 500);
      }
    });

    socketInstance.on('disconnect', () => {
      setState(prev => ({ ...prev, connected: false }));
    });

    socketInstance.on('connect_error', (err: any) => {
      setState({ connected: false, connecting: false, error: String(err?.message ?? err) });
    });

    // Room events
    socketInstance.on('room:joined', (joinedRoom: SerializedRoom, player: Player) => {
      setRoom(joinedRoom);
      setCurrentPlayer(player);
      persistSession(joinedRoom.code, player.name);
    });

    socketInstance.on('room:updated', (updatedRoom: SerializedRoom) => {
      setRoom(updatedRoom);
      const playerRef = currentPlayerRef.current;
      if (playerRef) {
        const updatedPlayer = updatedRoom.players.find(p => p.id === playerRef.id);
        if (updatedPlayer) setCurrentPlayer(updatedPlayer);
      }
    });

    socketInstance.on('room:left', (playerId: string) => {
      if (currentPlayerRef.current?.id === playerId) {
        setRoom(null);
        setCurrentPlayer(null);
        clearSession();
      }
    });

    socketInstance.on('error', (message: string) => {
      setState(prev => ({ ...prev, error: message }));
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [clearSession, persistSession, setCurrentPlayer]);

  // Actions Room
  const createRoom = useCallback((config: Partial<RoomConfig> = {}): Promise<string> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve('');
      socketRef.current.emit('room:create', config as RoomConfig, (roomCode: string) => resolve(roomCode));
    });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve(false);
      socketRef.current.emit('room:join', roomCode, playerName, (success: boolean, error?: string) => {
        if (error) setState(prev => ({ ...prev, error }));
        resolve(success);
      });
    });
  }, []);

  const leaveRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:leave');
    setRoom(null);
    setCurrentPlayer(null);
    clearSession();
  }, [clearSession]);

  const movePlayer = useCallback((playerId: string, team: Team | null, role: PlayerRole) => {
    socketRef.current?.emit('room:move_player', playerId, team, role);
  }, []);

  const setReady = useCallback((ready: boolean) => {
    socketRef.current?.emit('room:set_ready', ready);
  }, []);

  const updateConfig = useCallback((config: Partial<RoomConfig>) => {
    socketRef.current?.emit('room:update_config', config);
  }, []);

  // Actions Jeu
  const startGame = useCallback(() => {
    socketRef.current?.emit('game:start');
  }, []);

  const selectMode = useCallback((mode: GameMode) => {
    socketRef.current?.emit('game:select_mode', mode);
  }, []);

  // ✅ skipTurn (corrige l'erreur TS)
  const skipTurn = useCallback(() => {
    // dans le .tsx du repo, c'est game:skip
    socketRef.current?.emit('game:skip');
  }, []);

  const submitAnswer = useCallback((answer: string | Record<string, any>) => {
    socketRef.current?.emit('game:submit_answer', answer as any);
  }, []);

  const submitBet = useCallback((bet: number) => {
    socketRef.current?.emit('game:submit_bet', bet);
  }, []);

  const submitMytho = useCallback((isTrue: boolean) => {
    socketRef.current?.emit('game:submit_mytho', isTrue);
  }, []);

  const buzz = useCallback(() => {
    socketRef.current?.emit('game:buzz');
  }, []);

  const requestDispute = useCallback((answerId: string) => {
    socketRef.current?.emit('game:request_dispute', answerId);
  }, []);

  const voteDispute = useCallback((accept: boolean) => {
    socketRef.current?.emit('game:vote_dispute', accept);
  }, []);

  const syncInput = useCallback((value: string) => {
    socketRef.current?.emit('input:typing', value);
  }, []);

  // Listeners
  const onVSIntro = useCallback((callback: (teamAPlayers: Player[], teamBPlayers: Player[]) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:vs_intro', callback);
    return () => s.off('game:vs_intro', callback);
  }, []);

  const onModeRoulette = useCallback((callback: (modes: GameMode[], selected: GameMode, duration: number) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:mode_roulette', callback);
    return () => s.off('game:mode_roulette', callback);
  }, []);

  const onModeSelected = useCallback((callback: (mode: GameMode, data: ModeData) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:mode_selected', callback);
    return () => s.off('game:mode_selected', callback);
  }, []);

  const onRoundStarted = useCallback((callback: (round: number, mode: GameMode, data: ModeData) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:round_started', callback);
    return () => s.off('game:round_started', callback);
  }, []);

  const onRoundEnded = useCallback((callback: (result: RoundResult) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:round_ended', callback);
    return () => s.off('game:round_ended', callback);
  }, []);

  const onGameEnded = useCallback((callback: (winner: Team, scores: { A: number; B: number }, results: RoundResult[]) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:ended', callback);
    return () => s.off('game:ended', callback);
  }, []);

  const onTimerTick = useCallback((callback: (remaining: number) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:timer_tick', callback);
    return () => s.off('game:timer_tick', callback);
  }, []);

  const onAnswerResult = useCallback((callback: (result: AnswerResult) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:answer_result', callback);
    return () => s.off('game:answer_result', callback);
  }, []);

  const onComboUpdate = useCallback((callback: (team: Team, combo: number, multiplier: number) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:combo_update', callback);
    return () => s.off('game:combo_update', callback);
  }, []);

  const onChainUpdate = useCallback((callback: (chain: Array<{ artistId: string; artistName: string; answeredBy: Team; answerTime: number }>) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:chain_update', callback);
    return () => s.off('game:chain_update', callback);
  }, []);

  const onMythoStatement = useCallback((callback: (statement: string, index: number, total: number) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:mytho_statement', callback);
    return () => s.off('game:mytho_statement', callback);
  }, []);

  const onMythoResult = useCallback((callback: (isTrue: boolean, explanation: string, teamAScore: number, teamBScore: number) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:mytho_result', callback);
    return () => s.off('game:mytho_result', callback);
  }, []);

  const onBetRevealed = useCallback((callback: (bets: { A: number; B: number }, winner: Team, target: number) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:bet_revealed', callback);
    return () => s.off('game:bet_revealed', callback);
  }, []);

  const onBuzzResult = useCallback((callback: (team: Team | null, timeLeft: number) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:buzz_result', callback);
    return () => s.off('game:buzz_result', callback);
  }, []);

  const onPixelBlurUpdate = useCallback((callback: (blur: number, progress: number) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:pixel_blur_update', callback);
    return () => s.off('game:pixel_blur_update', callback);
  }, []);

  const onDisputeStarted = useCallback((callback: (dispute: DisputeState) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:dispute_started', callback);
    return () => s.off('game:dispute_started', callback);
  }, []);

  const onDisputeResolved = useCallback((callback: (dispute: DisputeState, accepted: boolean) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:dispute_resolved', callback);
    return () => s.off('game:dispute_resolved', callback);
  }, []);

  const onShake = useCallback((callback: (intensity: number) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('shake', callback);
    return () => s.off('shake', callback);
  }, []);

  // ✅ onNotice (corrige l'erreur TS). Dans le .tsx, c'est game:notice
  const onNotice = useCallback((callback: (message: string) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('game:notice', callback);
    return () => s.off('game:notice', callback);
  }, []);

  const onError = useCallback((callback: (message: string) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('error', callback);
    return () => s.off('error', callback);
  }, []);

  const onInputSync = useCallback((callback: (team: Team, value: string) => void): CleanupFn | undefined => {
    const s = socketRef.current;
    if (!s) return undefined;
    s.on('input:sync', callback);
    return () => s.off('input:sync', callback);
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

  // ✅ pas de JSX dans un .ts
  return React.createElement(SocketContext.Provider, { value }, children);
}

export function useSocket(): UseSocketReturn {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
}
