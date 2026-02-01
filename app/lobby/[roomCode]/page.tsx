'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '../../hooks/useSocket';
import { GAME_MODE_NAMES, MODE_ICONS } from '../../lib/constants';
import type { GameMode } from '../../lib/constants';

const MODE_ICON_COLORS: Record<string, string> = {
  roland_gamos: '#2ec4b6',
  le_theme: '#f2c14e',
  mytho_pas_mytho: '#f08c3a',
  encheres: '#6c7aa1',
  blind_test: '#c6712b',
  pixel_cover: '#9aa4b2',
  devine_qui: '#249e92',
  continue_paroles: '#9e5a21',
};

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;

  const {
    state,
    room,
    currentPlayer,
    socket,
    createRoom,
    joinRoom,
    movePlayer,
    setReady,
    startGame,
  } = useSocket();

  const [playerName, setPlayerName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [joining, setJoining] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const joinAttemptedRef = useRef(false);

  // On mount: load saved player name
  useEffect(() => {
    const saved = sessionStorage.getItem('playerName') || localStorage.getItem('rapjeu_player_name');
    if (saved) {
      setPlayerName(saved);
    }
  }, []);

  // Save player name
  useEffect(() => {
    if (playerName) {
      sessionStorage.setItem('playerName', playerName);
    }
  }, [playerName]);

  // Join or create room when name is submitted and socket is connected
  useEffect(() => {
    if (!nameSubmitted || !state.connected || joinAttemptedRef.current || room) return;
    joinAttemptedRef.current = true;

    const doJoin = async () => {
      setJoining(true);
      setServerError(null);
      try {
        const success = await joinRoom(roomCode, playerName);
        if (!success) {
          // Room doesn't exist, create it then join
          const serverCode = await createRoom();
          if (serverCode) {
            const joined = await joinRoom(serverCode, playerName);
            if (joined && serverCode !== roomCode) {
              router.replace(`/lobby/${serverCode}`);
            }
          } else {
            setServerError('Impossible de creer la room');
            joinAttemptedRef.current = false;
          }
        }
      } catch (err: any) {
        console.error('Join error:', err);
        setServerError(err?.message || 'Erreur de connexion');
        joinAttemptedRef.current = false;
      }
      setJoining(false);
    };

    doJoin();
  }, [nameSubmitted, state.connected, room, roomCode, playerName, joinRoom, createRoom, router]);

  // Save room code for reconnection
  useEffect(() => {
    if (room) {
      localStorage.setItem('currentRoomCode', room.code);
      sessionStorage.setItem('currentRoomCode', room.code);
    }
  }, [room]);

  // Listen for game start -> navigate to /game
  useEffect(() => {
    if (!socket) return;
    const handleGameStarted = () => {
      router.push('/game');
    };
    socket.on('game:started', handleGameStarted);
    return () => { socket.off('game:started', handleGameStarted); };
  }, [socket, router]);

  // Listen for server errors
  useEffect(() => {
    if (!socket) return;
    const handleError = (msg: string) => {
      setServerError(msg);
      setTimeout(() => setServerError(null), 5000);
    };
    socket.on('error', handleError);
    return () => { socket.off('error', handleError); };
  }, [socket]);

  // Derived state
  const isHost = !!(currentPlayer && (currentPlayer.role === 'host' || room?.hostId === currentPlayer.id));
  const players = room?.players || [];
  const teamAPlayers = players.filter(p => p.team === 'A');
  const teamBPlayers = players.filter(p => p.team === 'B');
  const spectators = players.filter(p => p.team === null);
  const allTeamPlayers = [...teamAPlayers, ...teamBPlayers];
  const allReady = allTeamPlayers.length > 0 && allTeamPlayers.every(p => p.isReady);
  const canStart = isHost && teamAPlayers.length > 0 && teamBPlayers.length > 0 && allReady;
  const displayRoomCode = room?.code || roomCode;

  // Actions
  const handleCopyCode = () => {
    navigator.clipboard.writeText(displayRoomCode);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  const handleJoinTeam = (team: 'A' | 'B') => {
    if (!currentPlayer) return;
    movePlayer(currentPlayer.id, team, currentPlayer.role);
  };

  const handleChangeTeam = () => {
    if (!currentPlayer || !currentPlayer.team) return;
    const newTeam = currentPlayer.team === 'A' ? 'B' : 'A';
    movePlayer(currentPlayer.id, newTeam, currentPlayer.role);
  };

  const handleToggleReady = () => {
    if (!currentPlayer) return;
    setReady(!currentPlayer.isReady);
  };

  const handleStartGame = () => {
    if (!canStart) return;
    startGame();
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim().length >= 2) {
      localStorage.setItem('rapjeu_player_name', playerName.trim());
      setNameSubmitted(true);
    }
  };

  /* =============================================
     NAME ENTRY SCREEN
     ============================================= */
  if (!nameSubmitted) {
    return (
      <div className="relative min-h-screen">
        <div className="sa-background" />
        <div className="sa-scanlines" />

        <div className="sa-page flex items-center justify-center p-5">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="sa-card w-full max-w-[460px] p-10"
          >
            <div className="text-center mb-8">
              <div className="sa-logo sa-logo-lg mb-2">
                <span className="sa-logo-rap">RAP</span>
                <span className="sa-logo-jeu">JEU</span>
                <span className="sa-logo-tag">LOBBY</span>
              </div>
              <div className="sa-subtitle text-lg mb-4">REJOINDRE LA ROOM</div>
              <div className="sa-room-code-value">{roomCode}</div>
            </div>

            <form onSubmit={handleNameSubmit}>
              <div className="mb-6">
                <label className="sa-section-label block mb-3">TON PSEUDO</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Entre ton nom..."
                  autoFocus
                  maxLength={20}
                  className="sa-input w-full"
                />
                <div className="sa-text-muted text-sm mt-2">Minimum 2 caracteres</div>
              </div>

              <button
                type="submit"
                disabled={playerName.trim().length < 2}
                className="sa-btn sa-btn-start w-full"
              >
                C&apos;EST PARTI !
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  /* =============================================
     LOADING STATE
     ============================================= */
  if (!state.connected || !room || joining) {
    return (
      <div className="relative min-h-screen">
        <div className="sa-background" />
        <div className="sa-scanlines" />

        <div className="sa-page flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="text-6xl mb-6"
            >
              &#9203;
            </motion.div>
            <div className="sa-subtitle text-2xl">CONNEXION...</div>
            {(state.error || serverError) && (
              <div className="mt-4 text-red-400 text-sm">{state.error || serverError}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* =============================================
     MAIN LOBBY
     ============================================= */
  return (
    <div className="relative min-h-screen">
      <div className="sa-background" />
      <div className="sa-scanlines" />

      <div className="sa-page py-8 px-5">
        <div className="max-w-[1000px] mx-auto">

          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-6"
          >
            <div className="sa-logo sa-logo-lg mb-1">
              <span className="sa-logo-rap">RAP</span>
              <span className="sa-logo-jeu">JEU</span>
              <span className="sa-logo-tag">BATTLE</span>
            </div>
            <div className="sa-subtitle text-sm tracking-[3px]">
              QUIZ BATTLE &middot; MULTIJOUEUR
            </div>
          </motion.div>

          {/* Room Code */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-8"
          >
            <div className="sa-room-code" onClick={handleCopyCode}>
              <div>
                <div className="sa-room-code-label">CODE ROOM</div>
                <div className="sa-room-code-value">{displayRoomCode}</div>
              </div>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f7a81b" strokeWidth="2.5">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2-2v1" />
              </svg>
            </div>
          </motion.div>

          {/* Toast */}
          <AnimatePresence>
            {showCopyToast && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="sa-toast"
              >
                CODE COPIE !
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error banner */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-900/60 border border-red-500/50 rounded-xl text-red-200 text-center text-sm font-semibold"
              >
                {serverError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Players Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="sa-card p-6 mb-6"
          >
            <div className="mb-6">
              <div className="sa-subtitle text-xl mb-1">JOUEURS</div>
              <div className="sa-text-muted text-sm font-semibold uppercase">
                {players.length} JOUEUR{players.length > 1 ? 'S' : ''} EN LIGNE
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team A */}
              <div>
                <div className="sa-team-header">
                  <div className="sa-team-bar sa-team-bar-a" />
                  <span className="sa-subtitle text-base" style={{ color: 'var(--sa-team-a)' }}>
                    TEAM A
                  </span>
                  <span className="sa-team-count" style={{ background: 'var(--sa-team-a)' }}>
                    {teamAPlayers.length}
                  </span>
                </div>

                <div className="grid gap-3 mb-3">
                  {teamAPlayers.map((player) => (
                    <div key={player.id} className="sa-player-row">
                      <div className="sa-avatar sa-avatar-team-a">
                        <span>&#127908;</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-white text-base flex items-center gap-2">
                          {player.name}
                          {room.hostId === player.id && <span className="text-[var(--sa-orange)] text-sm">HOST</span>}
                          {player.isReady && <span className="text-[var(--sa-success)] text-sm">PRET</span>}
                        </div>
                        <div className="text-xs font-semibold uppercase" style={{ color: 'var(--sa-team-a)' }}>
                          TEAM A
                        </div>
                      </div>
                      {player.id === currentPlayer?.id && (
                        <button
                          onClick={handleChangeTeam}
                          className="sa-btn sa-btn-secondary text-xs py-2 px-4"
                        >
                          CHANGER
                        </button>
                      )}
                    </div>
                  ))}
                  {teamAPlayers.length === 0 && (
                    <div className="sa-player-row opacity-40 justify-center">
                      <span className="sa-text-muted text-sm">Aucun joueur</span>
                    </div>
                  )}
                </div>

                {currentPlayer && currentPlayer.team !== 'A' && (
                  <button
                    onClick={() => handleJoinTeam('A')}
                    className="sa-btn sa-btn-team-a w-full text-sm"
                  >
                    REJOINDRE TEAM A
                  </button>
                )}
              </div>

              {/* Team B */}
              <div>
                <div className="sa-team-header">
                  <div className="sa-team-bar sa-team-bar-b" />
                  <span className="sa-subtitle text-base" style={{ color: 'var(--sa-team-b)' }}>
                    TEAM B
                  </span>
                  <span className="sa-team-count" style={{ background: 'var(--sa-team-b)', color: '#1a1a1a' }}>
                    {teamBPlayers.length}
                  </span>
                </div>

                <div className="grid gap-3 mb-3">
                  {teamBPlayers.map((player) => (
                    <div key={player.id} className="sa-player-row">
                      <div className="sa-avatar sa-avatar-team-b">
                        <span>&#127911;</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-white text-base flex items-center gap-2">
                          {player.name}
                          {room.hostId === player.id && <span className="text-[var(--sa-orange)] text-sm">HOST</span>}
                          {player.isReady && <span className="text-[var(--sa-success)] text-sm">PRET</span>}
                        </div>
                        <div className="text-xs font-semibold uppercase" style={{ color: 'var(--sa-team-b)' }}>
                          TEAM B
                        </div>
                      </div>
                      {player.id === currentPlayer?.id && (
                        <button
                          onClick={handleChangeTeam}
                          className="sa-btn sa-btn-secondary text-xs py-2 px-4"
                        >
                          CHANGER
                        </button>
                      )}
                    </div>
                  ))}
                  {teamBPlayers.length === 0 && (
                    <div className="sa-player-row opacity-40 justify-center">
                      <span className="sa-text-muted text-sm">Aucun joueur</span>
                    </div>
                  )}
                </div>

                {currentPlayer && currentPlayer.team !== 'B' && (
                  <button
                    onClick={() => handleJoinTeam('B')}
                    className="sa-btn sa-btn-team-b w-full text-sm"
                  >
                    REJOINDRE TEAM B
                  </button>
                )}
              </div>
            </div>

            {/* Spectators */}
            {spectators.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="sa-section-label mb-3">SPECTATEURS</div>
                <div className="grid gap-2">
                  {spectators.map((player) => (
                    <div key={player.id} className="sa-player-row opacity-60">
                      <div className="sa-avatar" style={{ border: '3px solid #666' }}>
                        <span>&#128100;</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-white text-sm">
                          {player.name}
                          {room.hostId === player.id && <span className="text-[var(--sa-orange)] text-sm ml-2">HOST</span>}
                        </div>
                        <div className="text-xs sa-text-muted uppercase">CHOISIS UNE EQUIPE</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-4"
          >
            {/* Ready toggle - only if in a team */}
            {currentPlayer && currentPlayer.team && (
              <button
                onClick={handleToggleReady}
                className={`sa-btn ${currentPlayer.isReady ? 'sa-btn-primary' : 'sa-btn-secondary'}`}
                style={{ minWidth: '260px', padding: '14px 30px', fontSize: '16px', borderRadius: '14px' }}
              >
                {currentPlayer.isReady ? '\u2713 PRET !' : 'SE METTRE PRET'}
              </button>
            )}

            {/* Start button - host only when conditions met */}
            {canStart && (
              <button
                onClick={handleStartGame}
                className="sa-btn sa-btn-start min-w-[320px] sm:min-w-[400px]"
              >
                LANCER LA BATAILLE !
              </button>
            )}

            {/* Status messages */}
            {!currentPlayer?.team && currentPlayer && (
              <div className="sa-subtitle text-lg" style={{ color: 'var(--sa-warning)' }}>
                CHOISIS UNE EQUIPE POUR JOUER
              </div>
            )}

            {currentPlayer?.team && !isHost && currentPlayer?.isReady && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="sa-subtitle text-lg"
              >
                EN ATTENTE DE L&apos;HOTE...
              </motion.div>
            )}

            {isHost && !canStart && teamAPlayers.length > 0 && teamBPlayers.length > 0 && !allReady && (
              <div className="sa-text-muted text-sm uppercase font-semibold">
                Tous les joueurs doivent etre prets
              </div>
            )}

            {isHost && (teamAPlayers.length === 0 || teamBPlayers.length === 0) && (
              <div className="sa-text-muted text-sm uppercase font-semibold">
                Il faut au moins 1 joueur par equipe
              </div>
            )}
          </motion.div>

          {/* Active modes info */}
          {room.config.modes && room.config.modes.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="sa-card p-5 mt-6"
            >
              <div className="sa-section-label mb-3">MODES ACTIFS</div>
              <div className="flex flex-wrap gap-2">
                {room.config.modes.map((mode: string) => (
                  <div
                    key={mode}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{
                      background: `${MODE_ICON_COLORS[mode] || '#666'}22`,
                      border: `1px solid ${MODE_ICON_COLORS[mode] || '#666'}66`,
                    }}
                  >
                    <span className="text-lg">{MODE_ICONS[mode as GameMode]}</span>
                    <span className="text-white text-xs font-bold uppercase">
                      {GAME_MODE_NAMES[mode as GameMode] || mode}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
