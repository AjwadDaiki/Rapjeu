'use client';

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

// ✅ Tone attendu par showNotice() dans app/game/page.tsx
export type NoticeTone = 'info' | 'warning' | 'error';

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
  onNotice: (callback: (message: string, tone?: NoticeTone) => void) => CleanupFn | undefined;
  onError: (callback: (message: string) => void) => CleanupFn | undefined;
  onInputSync: (callback: (team: Team, value: string) => void) => CleanupFn | undefined;
}

const SocketContext = createContext<UseSocketReturn | null>(null);

function getApiOrigin() {
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

function safeSessionGet(key: string) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function safeSessionSet(key: string, value: string) {
  try { sessionStorage.setItem(key, value); } catch {}
}
function safeSessionRemove(key: string) {
  try { sessionStorage.removeItem(key); } catch {}
}
function safeLocalGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeLocalSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}
function safeLocalRemove(key: string) {
  try { localStorage.removeItem(key); } catch {}
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

      const savedRoomCode = safeSessionGet('currentRoomCode') || safeLocalGet('currentRoomCode');
      const savedPlayerName = safeSessionGet('playerName');

      if (savedRoomCode && savedPlayerName) {
        setTimeout(() => {
          socketInstance.emit('room:join', savedRoomCode, savedPlayerName, (success: boolean) => {
            if (!success) clearSession();
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

  const skipTurn = useCallback(() => {
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

  // Helpers
  const onAny = useCallback((event: string, callback: any): CleanupFn | undefined => {
    const s = socketRef.current as any;
    if (!s) return undefined;
    s.on(event, callback);
    return () => s.off(event, callback);
  }, []);

  // Game Flow Events
  const onVSIntro = useCallback((cb: (teamAPlayers: Player[], teamBPlayers: Player[]) => void) => onAny('game:vs_intro', cb), [onAny]);
  const onModeRoulette = useCallback((cb: (modes: GameMode[], selected: GameMode, duration: number) => void) => onAny('game:mode_roulette', cb), [onAny]);
  const onModeSelected = useCallback((cb: (mode: GameMode, data: ModeData) => void) => onAny('game:mode_selected', cb), [onAny]);
  const onRoundStarted = useCallback((cb: (round: number, mode: GameMode, data: ModeData) => void) => onAny('game:round_started', cb), [onAny]);
  const onRoundEnded = useCallback((cb: (result: RoundResult) => void) => onAny('game:round_ended', cb), [onAny]);
  const onGameEnded = useCallback((cb: (winner: Team, scores: { A: number; B: number }, results: RoundResult[]) => void) => onAny('game:ended', cb), [onAny]);
  const onTimerTick = useCallback((cb: (remaining: number) => void) => onAny('game:timer_tick', cb), [onAny]);

  // Gameplay Events
  const onAnswerResult = useCallback((cb: (result: AnswerResult) => void) => onAny('game:answer_result', cb), [onAny]);
  const onComboUpdate = useCallback((cb: (team: Team, combo: number, multiplier: number) => void) => onAny('game:combo_update', cb), [onAny]);
  const onChainUpdate = useCallback((cb: (chain: Array<{ artistId: string; artistName: string; answeredBy: Team; answerTime: number }>) => void) => onAny('game:chain_update', cb), [onAny]);
  const onMythoStatement = useCallback((cb: (statement: string, index: number, total: number) => void) => onAny('game:mytho_statement', cb), [onAny]);
  const onMythoResult = useCallback((cb: (isTrue: boolean, explanation: string, teamAScore: number, teamBScore: number) => void) => onAny('game:mytho_result', cb), [onAny]);
  const onBetRevealed = useCallback((cb: (bets: { A: number; B: number }, winner: Team, target: number) => void) => onAny('game:bet_revealed', cb), [onAny]);
  const onBuzzResult = useCallback((cb: (team: Team | null, timeLeft: number) => void) => onAny('game:buzz_result', cb), [onAny]);
  const onPixelBlurUpdate = useCallback((cb: (blur: number, progress: number) => void) => onAny('game:pixel_blur_update', cb), [onAny]);

  // Dispute & Effects
  const onDisputeStarted = useCallback((cb: (dispute: DisputeState) => void) => onAny('game:dispute_started', cb), [onAny]);
  const onDisputeResolved = useCallback((cb: (dispute: DisputeState, accepted: boolean) => void) => onAny('game:dispute_resolved', cb), [onAny]);
  const onShake = useCallback((cb: (intensity: number) => void) => onAny('shake', cb), [onAny]);

  // ✅ onNotice: tone typé pour matcher showNotice
  const onNotice = useCallback((cb: (message: string, tone?: NoticeTone) => void) => onAny('game:notice', cb), [onAny]);

  const onError = useCallback((cb: (message: string) => void) => onAny('error', cb), [onAny]);
  const onInputSync = useCallback((cb: (team: Team, value: string) => void) => onAny('input:sync', cb), [onAny]);

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

  // Pas de JSX dans un .ts
  return React.createElement(SocketContext.Provider, { value }, children);
}

export function useSocket(): UseSocketReturn {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
}
