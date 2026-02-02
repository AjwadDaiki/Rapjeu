'use client';

// ============================================
// HOOK SOCKET.IO - Gestion de la connexion temps réel
// ============================================

import { useEffect, useRef, useCallback, useState } from 'react';
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

  // Actions Jeu
  startGame: () => void;
  selectMode: (mode: GameMode) => void;
  skipTurn: () => void;
  submitAnswer: (answer: string) => void;
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
  onError: (callback: (message: string) => void) => CleanupFn | undefined;
  onInputSync: (callback: (team: Team, value: string) => void) => CleanupFn | undefined;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<TypedSocket | null>(null);
  const currentPlayerRef = useRef<Player | null>(null);
  const [state, setState] = useState<SocketState>({
    connected: false,
    connecting: false,
    error: null,
  });
  const [room, setRoom] = useState<SerializedRoom | null>(null);
  const [currentPlayer, setCurrentPlayerState] = useState<Player | null>(null);

  // Sync ref with state
  const setCurrentPlayer = useCallback((player: Player | null) => {
    currentPlayerRef.current = player;
    setCurrentPlayerState(player);
  }, []);

  // Initialisation du socket
  useEffect(() => {
    const initSocket = () => {
      setState(prev => ({ ...prev, connecting: true }));

      const socket: TypedSocket = io({
        path: '/socket.io',
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('🔌 Socket connecté');
        setState({ connected: true, connecting: false, error: null });

        // Tentative de reconnexion automatique
        try {
          // sessionStorage = par onglet, localStorage = room partagé
          const savedRoomCode = sessionStorage.getItem('currentRoomCode') || localStorage.getItem('currentRoomCode');
          const savedPlayerName = sessionStorage.getItem('playerName');

          console.log('📦 Storage check:', { savedRoomCode, savedPlayerName });

          if (savedRoomCode && savedPlayerName) {
            console.log('🔄 Tentative reconnexion auto:', savedRoomCode, savedPlayerName);
            setTimeout(() => {
              console.log('📤 Émission room:join pour reconnexion');
              socket.emit('room:join', savedRoomCode, savedPlayerName, (success: boolean, error?: string) => {
                console.log('📥 Callback reconnexion:', success, error);
                if (success) {
                  console.log('✅ Reconnexion réussie!');
                } else {
                  console.log('❌ Reconnexion échouée:', error);
                  localStorage.removeItem('currentRoomCode');
                }
              });
            }, 1000);
          } else {
            console.log('⚠️ Pas de données de reconnexion dans localStorage');
          }
        } catch (e) {
          console.error('❌ Erreur reconnexion:', e);
        }
      });

      socket.on('disconnect', () => {
        console.log('🔌 Socket déconnecté');
        setState(prev => ({ ...prev, connected: false }));
      });

      socket.on('connect_error', (err) => {
        console.error('Erreur socket:', err);
        setState({ connected: false, connecting: false, error: err.message });
      });

      // Room events
      socket.on('room:joined', (joinedRoom, player) => {
        console.log('✅ CLIENT room:joined:', player.name, 'role:', player.role, 'id:', player.id);
        console.log('✅ CLIENT room.hostId:', joinedRoom.hostId);
        setRoom(joinedRoom);
        setCurrentPlayer(player);
      });

      socket.on('room:updated', (updatedRoom) => {
        console.log('📥 CLIENT room:updated reçu');
        setRoom(updatedRoom);
        // Mettre à jour currentPlayer si nécessaire
        const playerRef = currentPlayerRef.current;
        console.log('📥 CLIENT playerRef:', playerRef?.id, 'role:', playerRef?.role);
        if (playerRef) {
          const updatedPlayer = updatedRoom.players.find(p => p.id === playerRef.id);
          console.log('🔍 CLIENT updatedPlayer trouvé:', updatedPlayer?.id, 'role:', updatedPlayer?.role);
          if (updatedPlayer) {
            // Ne pas écraser si le rôle est différent (sécurité)
            if (playerRef.role === 'host' && updatedPlayer.role !== 'host') {
              console.log('⚠️ CLIENT Tentative d\'écraser HOST par', updatedPlayer.role, '- PROTECTION ACTIVE');
              // On garde le rôle host
              setCurrentPlayer({ ...updatedPlayer, role: 'host' });
            } else {
              setCurrentPlayer(updatedPlayer);
            }
          }
        }
      });

      socket.on('room:left', (playerId) => {
        if (currentPlayerRef.current?.id === playerId) {
          setRoom(null);
          setCurrentPlayer(null);
        }
      });

      socket.on('error', (message) => {
        setState(prev => ({ ...prev, error: message }));
      });
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [setCurrentPlayer]);

  // Actions Room
  const createRoom = useCallback((config: Partial<RoomConfig> = {}): Promise<string> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        console.log('❌ Socket non disponible pour créer room');
        resolve('');
        return;
      }
      console.log('🏠 Création de room...');
      socketRef.current.emit('room:create', config as RoomConfig, (roomCode) => {
        console.log(`✅ Room créée: ${roomCode}`);
        resolve(roomCode);
      });
    });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        console.log('❌ Socket non disponible pour rejoindre');
        resolve(false);
        return;
      }
      console.log(`👤 Tentative de join ${roomCode} avec ${playerName}`);
      socketRef.current.emit('room:join', roomCode, playerName, (success, error) => {
        if (error) {
          console.log(`❌ Erreur join: ${error}`);
          setState(prev => ({ ...prev, error: error || null }));
        } else {
          console.log(`✅ Join réussi: ${success}`);
        }
        resolve(success);
      });
    });
  }, []);

  const leaveRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:leave');
    setRoom(null);
    setCurrentPlayer(null);
  }, []);

  const movePlayer = useCallback((playerId: string, team: Team | null, role: PlayerRole) => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:move_player', playerId, team, role);
  }, []);

  const setReady = useCallback((ready: boolean) => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:set_ready', ready);
  }, []);

  // Actions Jeu
  const startGame = useCallback(() => {
    console.log('🎮 Tentative de démarrage du jeu...');
    if (!socketRef.current) {
      console.log('❌ Socket non disponible');
      return;
    }
    console.log('📤 Envoi event game:start');
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

  const submitAnswer = useCallback((answer: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:submit_answer', answer);
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
  // Game Flow Events
  const onVSIntro = useCallback((callback: (teamAPlayers: Player[], teamBPlayers: Player[]) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:vs_intro', callback);
    return () => socket.off('game:vs_intro', callback);
  }, []);

  const onModeRoulette = useCallback((callback: (modes: GameMode[], selected: GameMode, duration: number) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:mode_roulette', callback);
    return () => socket.off('game:mode_roulette', callback);
  }, []);

  const onModeSelected = useCallback((callback: (mode: GameMode, data: ModeData) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:mode_selected', callback);
    return () => socket.off('game:mode_selected', callback);
  }, []);

  const onRoundStarted = useCallback((callback: (round: number, mode: GameMode, data: ModeData) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:round_started', callback);
    return () => socket.off('game:round_started', callback);
  }, []);

  const onRoundEnded = useCallback((callback: (result: RoundResult) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:round_ended', callback);
    return () => socket.off('game:round_ended', callback);
  }, []);

  const onGameEnded = useCallback((callback: (winner: Team, scores: { A: number; B: number }, results: RoundResult[]) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:ended', callback);
    return () => socket.off('game:ended', callback);
  }, []);

  const onTimerTick = useCallback((callback: (remaining: number) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:timer_tick', callback);
    return () => socket.off('game:timer_tick', callback);
  }, []);

  // Gameplay Events
  const onAnswerResult = useCallback((callback: (result: AnswerResult) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:answer_result', callback);
    return () => socket.off('game:answer_result', callback);
  }, []);

  const onComboUpdate = useCallback((callback: (team: Team, combo: number, multiplier: number) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:combo_update', callback);
    return () => socket.off('game:combo_update', callback);
  }, []);

  const onChainUpdate = useCallback((callback: (chain: Array<{ artistId: string; artistName: string; answeredBy: Team; answerTime: number }>) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:chain_update', callback);
    return () => socket.off('game:chain_update', callback);
  }, []);

  const onMythoStatement = useCallback((callback: (statement: string, index: number, total: number) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:mytho_statement', callback);
    return () => socket.off('game:mytho_statement', callback);
  }, []);

  const onMythoResult = useCallback((callback: (isTrue: boolean, explanation: string, teamAScore: number, teamBScore: number) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:mytho_result', callback);
    return () => socket.off('game:mytho_result', callback);
  }, []);

  const onBetRevealed = useCallback((callback: (bets: { A: number; B: number }, winner: Team, target: number) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:bet_revealed', callback);
    return () => socket.off('game:bet_revealed', callback);
  }, []);

  const onBuzzResult = useCallback((callback: (team: Team | null, timeLeft: number) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:buzz_result', callback);
    return () => socket.off('game:buzz_result', callback);
  }, []);

  const onPixelBlurUpdate = useCallback((callback: (blur: number, progress: number) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:pixel_blur_update', callback);
    return () => socket.off('game:pixel_blur_update', callback);
  }, []);

  // Dispute & Effects
  const onDisputeStarted = useCallback((callback: (dispute: DisputeState) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:dispute_started', callback);
    return () => socket.off('game:dispute_started', callback);
  }, []);

  const onDisputeResolved = useCallback((callback: (dispute: DisputeState, accepted: boolean) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('game:dispute_resolved', callback);
    return () => socket.off('game:dispute_resolved', callback);
  }, []);

  const onShake = useCallback((callback: (intensity: number) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('shake', callback);
    return () => socket.off('shake', callback);
  }, []);

  const onError = useCallback((callback: (message: string) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('error', callback);
    return () => socket.off('error', callback);
  }, []);

  const onInputSync = useCallback((callback: (team: Team, value: string) => void): CleanupFn | undefined => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('input:sync', callback);
    return () => socket.off('input:sync', callback);
  }, []);

  return {
    socket: socketRef.current,
    state,
    room,
    currentPlayer,
    createRoom,
    joinRoom,
    leaveRoom,
    movePlayer,
    setReady,
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
    // Game Flow
    onVSIntro,
    onModeRoulette,
    onModeSelected,
    onRoundStarted,
    onRoundEnded,
    onGameEnded,
    onTimerTick,
    // Gameplay
    onAnswerResult,
    onComboUpdate,
    onChainUpdate,
    onMythoStatement,
    onMythoResult,
    onBetRevealed,
    onBuzzResult,
    onPixelBlurUpdate,
    // Dispute & Effects
    onDisputeStarted,
    onDisputeResolved,
    onShake,
    onError,
    // Input
    onInputSync,
  };
}
