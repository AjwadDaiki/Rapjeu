'use client';

// ============================================
// PAGE LOBBY - CrÃ©ation et gestion des rooms
// ============================================

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSocket } from '../hooks/useSocket';
import { TeamSlot } from '../components/TeamSlot';
import { LobbyBackground } from '../components/RetrowaveBackground';
import { NeonTitle, VSLogo } from '../components/NeonTitle';
import { NeonButton, NeonInput } from '../components/NeonButton';
import { DEFAULT_ROOM_CONFIG, GAME_MODES, GAME_MODE_NAMES } from '../lib/constants';
import type { GameMode, RoomConfig } from '../types';

type TimerKey = keyof NonNullable<RoomConfig['timers']>;

export const dynamic = 'force-dynamic';

export default function LobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    state, 
    room, 
    currentPlayer,
    socket,
    createRoom, 
    joinRoom, 
    leaveRoom,
    movePlayer,
    setReady,
    startGame,
    updateConfig,
  } = useSocket();

  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [localConfig, setLocalConfig] = useState<RoomConfig | null>(null);
  const [configDirty, setConfigDirty] = useState(false);
  const configSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Charger le nom depuis sessionStorage/localStorage
  useEffect(() => {
    const savedName = sessionStorage.getItem('playerName') || localStorage.getItem('rapjeu_player_name');
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  // Sauvegarder le nom dans sessionStorage (par onglet)
  useEffect(() => {
    if (playerName) {
      sessionStorage.setItem('playerName', playerName);
    }
  }, [playerName]);

  // Sauvegarder le roomCode quand on a une room (dans les deux storages)
  useEffect(() => {
    if (room) {
      localStorage.setItem('currentRoomCode', room.code);
      sessionStorage.setItem('currentRoomCode', room.code);
      console.log('ðŸ’¾ Room code sauvegardÃ©:', room.code);
    }
  }, [room]);

  // PrÃ©-remplir le code si passÃ© en query (?code=XXXX)
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setRoomCode(code.toUpperCase().slice(0, 4));
      setActiveTab('join');
    }
  }, [searchParams]);


  // Ã‰tat pour savoir si la partie a dÃ©marrÃ©
  const [gameStarted, setGameStarted] = useState(false);

  // DÃ©tection du dÃ©marrage de partie
  useEffect(() => {
    if (!socket) return;
    
    const handleGameStarted = () => {
      console.log('ðŸŽ® Partie dÃ©marrÃ©e!');
      setGameStarted(true);
    };
    
    socket.on('game:started', handleGameStarted);
    return () => {
      socket.off('game:started', handleGameStarted);
    };
  }, [socket]);

  const handleCreateRoom = async () => {
    if (playerName.trim().length < 3) return;
    const code = await createRoom();
    if (code) {
      await joinRoom(code, playerName);
      router.replace(`/lobby?code=${code}`);
    }
  };

  const handleJoinRoom = async () => {
    if (playerName.trim().length < 3 || !roomCode.trim()) return;
    const cleanCode = roomCode.toUpperCase().trim();
    const success = await joinRoom(cleanCode, playerName);
    if (success) {
      router.replace(`/lobby?code=${cleanCode}`);
    }
  };



  // Sync local config from room (host only, avoid overriding during edits)
  useEffect(() => {
    if (!room) return;
    if (configDirty) return;
    const mergedTimers = {
      ...DEFAULT_ROOM_CONFIG.timers,
      ...(room.config?.timers || {}),
    } as NonNullable<RoomConfig['timers']>;
    const merged: RoomConfig = {
      ...DEFAULT_ROOM_CONFIG,
      ...room.config,
      timers: mergedTimers,
    };
    setLocalConfig(merged);
  }, [room, configDirty]);

  // Push config updates (debounced)
  useEffect(() => {
    if (!localConfig || !configDirty) return;
    if (!currentPlayer || (currentPlayer.role !== 'host' && room?.hostId !== currentPlayer.id)) return;

    if (configSyncRef.current) {
      clearTimeout(configSyncRef.current);
    }
    configSyncRef.current = setTimeout(() => {
      updateConfig(localConfig);
      setConfigDirty(false);
    }, 350);

    return () => {
      if (configSyncRef.current) clearTimeout(configSyncRef.current);
    };
  }, [localConfig, configDirty, updateConfig, currentPlayer, room?.hostId]);

  // Redirection vers /game quand la partie dÃ©marre
  useEffect(() => {
    if (gameStarted && room) {
      console.log('ðŸ”„ Redirection vers /game');
      router.push('/game');
    }
  }, [gameStarted, room, router]);

  // Si dÃ©jÃ  dans une room
  if (room) {
    console.log('ðŸ  Render lobby - currentPlayer:', currentPlayer?.name, 'role:', currentPlayer?.role, 'id:', currentPlayer?.id);
    console.log('ðŸ  room.hostId:', room.hostId);
    
    const teamAPlayers = room.players.filter(p => p.team === 'A');
    const teamBPlayers = room.players.filter(p => p.team === 'B');
    const spectators = room.players.filter(p => p.team === null);
    
    const isHost = currentPlayer?.role === 'host' || room.hostId === currentPlayer?.id;
    const config = localConfig || room.config || DEFAULT_ROOM_CONFIG;
    const modeSelection = config.modeSelection || 'random';
    const teamNames = config.teamNames || { A: 'Equipe A', B: 'Equipe B' };
    const canEditConfig = isHost;
    const effectiveTimers = (config.timers || DEFAULT_ROOM_CONFIG.timers) as NonNullable<RoomConfig['timers']>;
    const timerValues = Object.values(effectiveTimers).filter((v): v is number => typeof v === 'number' && v > 0);
    const minTimer = timerValues.length ? Math.round(Math.min(...timerValues) / 1000) : 0;
    const maxTimer = timerValues.length ? Math.round(Math.max(...timerValues) / 1000) : 0;
    const selectedModes = (config.modes || []);

    const applyConfig = (patch: Partial<RoomConfig>) => {
      setLocalConfig(prev => {
        const base = prev || config;
        return { ...base, ...patch };
      });
      setConfigDirty(true);
    };

    const applyTimer = (key: TimerKey, seconds: number) => {
      const safeSeconds = Math.max(5, Math.min(120, seconds));
      setLocalConfig(prev => {
        const base = prev || config;
        const baseTimers = (base.timers || DEFAULT_ROOM_CONFIG.timers) as NonNullable<RoomConfig['timers']>;
        return {
          ...base,
          timers: {
            ...baseTimers,
            [key]: safeSeconds * 1000,
          },
        };
      });
      setConfigDirty(true);
    };

    const toggleMode = (mode: GameMode) => {
      const current = new Set((localConfig || config).modes || []);
      if (current.has(mode)) {
        if (current.size <= 1) return; // minimum 1 mode
        current.delete(mode);
      } else {
        current.add(mode);
      }
      const nextModes = Array.from(current);
      const nextRounds = Math.min((localConfig || config).totalRounds || 2, nextModes.length);
      applyConfig({ modes: nextModes, totalRounds: nextRounds, modeSelection: 'manual' });
    };

    const setModeSelection = (value: 'random' | 'manual') => {
      if (value === 'random') {
        applyConfig({ modeSelection: 'random', modes: [...GAME_MODES] });
        return;
      }
      applyConfig({ modeSelection: 'manual' });
    };

    const setRounds = (value: number) => {
      const next = Math.max(1, Math.min(8, value));
      if (modeSelection === 'manual') {
        const max = (localConfig || config).modes.length || 2;
        applyConfig({ totalRounds: Math.min(next, max) });
        return;
      }
      applyConfig({ totalRounds: next });
    };

    const updateTeamName = (teamKey: 'A' | 'B', value: string) => {
      const clean = value.slice(0, 16);
      setLocalConfig(prev => {
        const base = prev || config;
        return {
          ...base,
          teamNames: {
            ...(base.teamNames || { A: 'Equipe A', B: 'Equipe B' }),
            [teamKey]: clean,
          },
        };
      });
      setConfigDirty(true);
    };
    console.log('ðŸ‘‘ isHost:', isHost);
    
    const allReady = room.players.filter(p => p.team !== null).every(p => p.isReady);
    const canStart = allReady && teamAPlayers.length > 0 && teamBPlayers.length > 0;

    return (
      <div className="min-h-screen text-slate-100 p-6 relative">
        <LobbyBackground />
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <NeonTitle size="medium" animated={false} />
              <motion.p
                className="text-slate-300 mt-2"
                style={{
                  fontFamily: 'var(--font-display)',
                  textShadow: '0 6px 16px rgba(6, 8, 12, 0.35)',
                }}
              >
                Room: <span className="font-mono text-2xl font-bold" style={{ color: 'var(--rj-secondary)' }}>{room.code}</span>
                {isHost && (
                  <span className="ml-3 px-3 py-1 rounded-full text-[11px] font-bold text-slate-900 shadow-lg" style={{ background: 'linear-gradient(135deg, #f2c14e 0%, #f08c3a 100%)' }}>
                    {'\uD83D\uDC51 H\u00d4TE'}
                  </span>
                )}
              </motion.p>
            </div>
            <NeonButton
              onClick={leaveRoom}
              variant="danger"
              size="md"
            >
              Quitter
            </NeonButton>
          </div>

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <TeamSlot
              team="A"
              players={teamAPlayers}
              isHost={isHost}
              currentPlayerId={currentPlayer?.id || ''}
              label={teamNames.A}
              onMovePlayer={(playerId, team) => movePlayer(playerId, team, 'player')}
            />

            {/* Center Info */}
            <div className="flex flex-col items-center justify-center p-6 bg-[#151a21]/70 rounded-2xl backdrop-blur-xl border border-white/10 shadow-[0_20px_60px_rgba(6,8,12,0.4)]">
              <div className="mb-4">
                <VSLogo size="medium" animated={false} />
              </div>
              <div className="text-center">
                <p className="text-slate-300 mb-2">{room.players.length} joueurs</p>
                <p className="text-sm text-slate-400">
                  {teamAPlayers.length} vs {teamBPlayers.length}
                </p>
                <p className="text-xs mt-2 uppercase tracking-[0.16em]" style={{ color: 'var(--rj-secondary)' }}>
                  1v1 possible !
                </p>
              </div>
            </div>

            <TeamSlot
              team="B"
              players={teamBPlayers}
              isHost={isHost}
              currentPlayerId={currentPlayer?.id || ''}
              label={teamNames.B}
              onMovePlayer={(playerId, team) => movePlayer(playerId, team, 'player')}
            />
          </div>

          {/* Spectateurs (compact) */}
          <div className="mb-8">
            <div className="p-4 rounded-2xl bg-[#151a21]/70 border border-white/10 shadow-[0_20px_60px_rgba(6,8,12,0.35)]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs uppercase tracking-[0.2em] text-slate-400">Spectateurs</h3>
                <span className="chip text-gray-200">{spectators.length}</span>
              </div>
              {spectators.length === 0 ? (
                <div className="text-xs text-slate-500">Aucun spectateur pour l'instant.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {spectators.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-xs"
                    >
                      <span className="font-semibold text-slate-200">{player.name}</span>
                      {player.role === 'host' && (
                        <span className="text-[10px]" style={{ color: 'var(--rj-accent)' }}>👑</span>
                      )}
                      {isHost && (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={() => movePlayer(player.id, 'A', 'player')}
                            className="w-5 h-5 rounded text-[10px] text-[#0f1115]"
                            style={{ background: 'var(--rj-secondary)' }}
                          >
                            A
                          </button>
                          <button
                            onClick={() => movePlayer(player.id, 'B', 'player')}
                            className="w-5 h-5 rounded text-[10px] text-[#0f1115]"
                            style={{ background: 'var(--rj-primary)' }}
                          >
                            B
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-3">
                Clique sur une equipe pour rejoindre la partie.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <NeonButton
              onClick={() => setReady(!currentPlayer?.isReady)}
              variant={currentPlayer?.isReady ? 'success' : 'danger'}
              size="lg"
            >
              {currentPlayer?.isReady ? '\u2714 Pr\u00eat' : 'Pas pr\u00eat'}
            </NeonButton>

            {/* Bouton DÃ©marrer */}
            <NeonButton
              onClick={startGame}
              disabled={!canStart || !isHost}
              variant={!isHost ? 'secondary' : canStart ? 'cyan' : 'secondary'}
              size="lg"
              glow={canStart && isHost}
              title={!isHost ? 'Seul l\'h\u00f4te peut d\u00e9marrer' : ''}
            >
              {!isHost
                ? '\uD83D\uDC51 En attente de l\'h\u00f4te...'
                : teamAPlayers.length === 0 || teamBPlayers.length === 0
                  ? '1v1 minimum requis'
                  : !allReady
                    ? 'En attente joueurs...'
                    : '\uD83D\uDD25 D\u00e9marrer la partie'}
            </NeonButton>
          </div>

          {/* Resume config visible pour tous */}
          <div className="mt-10 mb-6 p-5 rounded-2xl bg-[#151a21]/70 border border-white/10 shadow-[0_20px_60px_rgba(6,8,12,0.35)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Configuration de la partie
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Visible pour tous • {isHost ? "modifiable par l'hote" : "seul l'hote modifie"}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-1">Modes</div>
                <div className="font-semibold text-slate-100">
                  {modeSelection === 'random' ? 'Aleatoire' : 'Manuel'} • {selectedModes.length} modes
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-1">Rounds</div>
                <div className="font-semibold text-slate-100">{(localConfig || config).totalRounds}</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-1">Temps par mode</div>
                <div className="font-semibold text-slate-100">
                  {minTimer > 0 ? `${minTimer}s – ${maxTimer}s` : 'Personnalise'}
                </div>
              </div>
            </div>
          </div>

          {/* Config */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {!canEditConfig && (
              <div className="lg:col-span-2 text-center text-xs uppercase tracking-[0.2em] text-slate-400">
                Visible pour tous &bull; Modifiable par l&apos;h&ocirc;te uniquement
              </div>
            )}
            <div className={`p-6 rounded-2xl bg-[#151a21]/70 border border-white/10 shadow-[0_20px_60px_rgba(6,8,12,0.4)] ${!canEditConfig ? 'opacity-70 pointer-events-none' : ''}`}>
                <div className="text-sm uppercase tracking-[0.2em] text-slate-400 mb-3">
                  Configuration Partie
                </div>

                <div className="mb-5">
                  <label className="block text-xs text-slate-400 mb-2">Selection des modes</label>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setModeSelection('random')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-[0.14em] border ${modeSelection === 'random' ? 'bg-white/10 text-white border-white/20' : 'text-slate-400 border-white/10'}`}
                    >
                      Aleatoire
                    </button>
                    <button
                      onClick={() => setModeSelection('manual')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-[0.14em] border ${modeSelection === 'manual' ? 'bg-white/10 text-white border-white/20' : 'text-slate-400 border-white/10'}`}
                    >
                      Manuel
                    </button>
                  </div>

                  {modeSelection === 'manual' && (
                    <div className="grid grid-cols-2 gap-2">
                      {GAME_MODES.map((mode) => {
                        const isSelected = (localConfig || config).modes?.includes(mode);
                        return (
                          <button
                            key={mode}
                            onClick={() => toggleMode(mode)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.1em] border ${isSelected ? 'bg-white/10 text-white border-white/20' : 'text-slate-500 border-white/10'}`}
                          >
                            {GAME_MODE_NAMES[mode]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="block text-xs text-slate-400 mb-2">Nombre de rounds</label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5,6,7,8].map((rounds) => {
                      const active = (localConfig || config).totalRounds === rounds;
                      return (
                        <button
                          key={rounds}
                          onClick={() => setRounds(rounds)}
                          className={`px-3 py-2 rounded-lg text-xs font-bold border ${active ? 'bg-white/10 text-white border-white/20' : 'text-slate-500 border-white/10'}`}
                        >
                          {rounds}
                        </button>
                      );
                    })}
                  </div>
                  {modeSelection === 'manual' && (localConfig || config).totalRounds > (localConfig || config).modes.length && (
                    <p className="text-xs text-amber-400 mt-2">Le nombre de rounds ne peut pas depasser le nombre de modes choisis.</p>
                  )}
                </div>

                <div className="mt-6">
                  <label className="block text-xs text-slate-400 mb-2">Noms des equipes</label>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <label className="flex flex-col gap-2 text-slate-300">
                      <span className="uppercase tracking-[0.14em] text-[10px]" style={{ color: 'var(--rj-secondary)' }}>Equipe A</span>
                      <input
                        type="text"
                        value={teamNames.A}
                        onChange={(e) => updateTeamName('A', e.target.value)}
                        className="px-3 py-2 rounded-lg bg-[#0f141a] border border-white/10 text-white"
                        maxLength={16}
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-slate-300">
                      <span className="uppercase tracking-[0.14em] text-[10px]" style={{ color: 'var(--rj-primary)' }}>Equipe B</span>
                      <input
                        type="text"
                        value={teamNames.B}
                        onChange={(e) => updateTeamName('B', e.target.value)}
                        className="px-3 py-2 rounded-lg bg-[#0f141a] border border-white/10 text-white"
                        maxLength={16}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-2xl bg-[#151a21]/70 border border-white/10 shadow-[0_20px_60px_rgba(6,8,12,0.4)] ${!canEditConfig ? 'opacity-70 pointer-events-none' : ''}`}>
                <div className="text-sm uppercase tracking-[0.2em] text-slate-400 mb-3">
                  Temps par mode (secondes)
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { key: 'rolandGamosTurnTime', label: 'Roland Gamos' },
                    { key: 'leThemeTurnTime', label: 'Le Theme' },
                    { key: 'mythoTime', label: 'Mytho' },
                    { key: 'encheresBetTime', label: 'Encheres - Mise' },
                    { key: 'encheresProofTime', label: 'Encheres - Preuve' },
                    { key: 'blindTestAnswerTime', label: 'Blind Test' },
                    { key: 'pixelCoverTime', label: 'Pixel Cover' },
                    { key: 'devineQuiTime', label: 'Devine Qui' },
                    { key: 'continueParolesTime', label: 'Continue Paroles' },
                  ].map((t) => {
                    const valueMs = (localConfig || config).timers?.[t.key as keyof NonNullable<RoomConfig['timers']>] || 0;
                    const valueSec = Math.round(valueMs / 1000) || 0;
                    return (
                      <label key={t.key} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="w-32">{t.label}</span>
                        <input
                          type="number"
                          min={5}
                          max={120}
                          value={valueSec}
                          onChange={(e) => applyTimer(t.key as TimerKey, Number(e.target.value || 0))}
                          className="w-20 px-2 py-1 rounded-lg bg-[#0f141a] border border-white/10 text-white"
                        />
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-3">
                  Astuce: ajuste les timings selon ton rythme de jeu. (min 5s / max 120s)
                </p>
              </div>
            </div>
          </div>
      </div>
    );
  }

  // Ã‰cran de connexion
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <LobbyBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl p-8 border border-white/12 relative z-10"
        style={{
          background: 'linear-gradient(180deg, #151a22 0%, #0d1118 100%)',
          boxShadow: '0 30px 90px rgba(6, 8, 12, 0.7)',
        }}
      >
        <div className="text-center mb-2">
          <NeonTitle size="medium" />
        </div>
        <p className="text-center text-slate-300 mb-8 tracking-[0.18em] uppercase text-xs">
          {'Le quiz rap multijoueur en temps r\u00e9el'}
        </p>

        {/* Tabs */}
        <div className="flex mb-6 rounded-2xl p-1 border border-white/10" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 rounded-xl font-semibold uppercase tracking-[0.14em] text-xs transition-all ${
              activeTab === 'create'
                ? 'bg-white/10 text-white border border-white/20 shadow-[0_10px_24px_rgba(6,8,12,0.35)]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {'Cr\u00e9er'}
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2 rounded-xl font-semibold uppercase tracking-[0.14em] text-xs transition-all ${
              activeTab === 'join'
                ? 'bg-white/10 text-white border border-white/20 shadow-[0_10px_24px_rgba(6,8,12,0.35)]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Rejoindre
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <NeonInput
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
            placeholder="Entrez votre nom..."
            label="Votre nom"
            variant="cyan"
          />

          {activeTab === 'join' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <NeonInput
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="ABCD"
                label="Code de la room"
                variant="magenta"
                className="font-mono text-center text-xl tracking-widest"
              />
            </motion.div>
          )}

          <NeonButton
            onClick={activeTab === 'create' ? handleCreateRoom : handleJoinRoom}
            disabled={playerName.trim().length < 3 || (activeTab === 'join' && roomCode.length !== 4)}
            variant="primary"
            size="lg"
            className="w-full"
          >
            {state.connecting ? 'Connexion...' : activeTab === 'create' ? 'Cr\u00e9er une partie' : 'Rejoindre'}
          </NeonButton>
        </div>

        {state.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 bg-rose-500/10 border border-rose-400/40 rounded-2xl text-rose-200 text-center text-sm"
          >
            {state.error}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
