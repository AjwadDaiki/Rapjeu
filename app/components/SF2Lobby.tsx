'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GameConfig, DEFAULT_CONFIG, QUICK_CONFIG, MARATHON_CONFIG, CULTURE_CONFIG, SPEED_CONFIG, estimateGameDuration } from '../lib/gameConfig';
import { GAME_MODE_NAMES, MODE_ICONS } from '../lib/constants';
import type { GameMode } from '../lib/constants';

interface SF2LobbyProps {
  roomCode: string;
  players: Array<{ id: string; name: string; team: 'A' | 'B'; isHost: boolean }>;
  isHost: boolean;
  onStartGame: (config: GameConfig) => void;
  onChangeTeam: (playerId: string) => void;
}

export function SF2Lobby({ roomCode, players, isHost, onStartGame, onChangeTeam }: SF2LobbyProps) {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [selectionMode, setSelectionMode] = useState<'random' | 'fixed' | 'vote'>('random');
  const [copyToast, setCopyToast] = useState(false);

  const duration = estimateGameDuration(config);
  const activeModesCount = Object.values(config.enabledModes).filter(Boolean).length;

  // Copy room code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const handlePreset = (preset: GameConfig) => {
    setConfig(preset);
  };

  const handleToggleMode = (mode: GameMode) => {
    setConfig({
      ...config,
      enabledModes: {
        ...config.enabledModes,
        [mode]: !config.enabledModes[mode],
      },
    });
  };

  const handleStartGame = () => {
    onStartGame({ ...config, selectionMode } as any);
  };

  const teamACount = players.filter(p => p.team === 'A').length;
  const teamBCount = players.filter(p => p.team === 'B').length;

  return (
    <div className="sf2-game-container" style={{ minHeight: '100vh', padding: '20px' }}>
      {/* Header */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8"
      >
        <h1
          className="sf2-text"
          style={{
            fontSize: '64px',
            color: '#FFD700',
            textShadow: '8px 8px 0px #000, 0 0 60px #FFD700',
            WebkitTextStroke: '3px #000',
            marginBottom: '20px',
          }}
        >
          🥊 RAP BATTLE
        </h1>
        <div
          className="sf2-text"
          style={{
            fontSize: '24px',
            color: '#FF0000',
            textShadow: '4px 4px 0px #000',
            WebkitTextStroke: '1px #000',
          }}
        >
          STREET FIGHTER EDITION
        </div>
      </motion.div>

      {/* Room Code */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center mb-8"
      >
        <button
          onClick={handleCopyCode}
          className="sf2-button sf2-button-blue"
          style={{
            position: 'relative',
            fontSize: '32px',
            padding: '20px 40px',
          }}
        >
          Room: {roomCode} 📋
          {copyToast && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: -60, opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                top: '0',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#51CF66',
                color: '#000',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '16px',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              ✅ Copied!
            </motion.div>
          )}
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        {/* LEFT: Configuration (Host only) */}
        {isHost && (
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-900/80 border-4 border-yellow-400 rounded-xl p-6"
          >
            <h2 className="sf2-text sf2-text-large text-yellow-400 mb-6">⚙️ CONFIG</h2>

            {/* Presets */}
            <div className="mb-6">
              <h3 className="sf2-text text-white text-xl mb-3">Presets:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { name: 'Défaut', config: DEFAULT_CONFIG },
                  { name: 'Rapide', config: QUICK_CONFIG },
                  { name: 'Marathon', config: MARATHON_CONFIG },
                  { name: 'Culture', config: CULTURE_CONFIG },
                  { name: 'Rapidité', config: SPEED_CONFIG },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePreset(preset.config)}
                    className="sf2-button"
                    style={{ fontSize: '14px', padding: '12px' }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Modes actifs */}
            <div className="mb-6">
              <h3 className="sf2-text text-white text-xl mb-3">
                Modes ({activeModesCount}/6):
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(config.enabledModes) as GameMode[]).map((mode) => {
                  const enabled = config.enabledModes[mode];
                  return (
                    <button
                      key={mode}
                      onClick={() => handleToggleMode(mode)}
                      className={`p-3 rounded-lg border-4 transition-all ${
                        enabled
                          ? 'bg-green-600 border-green-400'
                          : 'bg-gray-700 border-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{MODE_ICONS[mode]}</span>
                        <div className="text-left">
                          <div className="sf2-text text-white text-xs">{GAME_MODE_NAMES[mode]}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rythme */}
            <div className="mb-6">
              <label className="sf2-text text-white text-lg mb-2 block">
                Modes par partie: {config.modesPerGame}
              </label>
              <input
                type="range"
                min="1"
                max={activeModesCount}
                value={config.modesPerGame}
                onChange={(e) => setConfig({ ...config, modesPerGame: parseInt(e.target.value) })}
                className="w-full h-4 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
              />
            </div>

            <div className="mb-6">
              <label className="sf2-text text-white text-lg mb-2 block">
                Rounds par mode: {config.roundsPerMode}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={config.roundsPerMode}
                onChange={(e) => setConfig({ ...config, roundsPerMode: parseInt(e.target.value) })}
                className="w-full h-4 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
              />
            </div>

            {/* Mode sélection */}
            <div className="mb-6">
              <h3 className="sf2-text text-white text-lg mb-3">🎲 Sélection modes:</h3>
              <div className="space-y-2">
                {[
                  { id: 'random', label: '🎰 Aléatoire (roulette)', desc: 'Modes tirés au hasard' },
                  { id: 'fixed', label: '📋 Ordre fixe', desc: 'Dans l\'ordre des toggles' },
                  { id: 'vote', label: '🗳️ Vote joueurs', desc: 'Les joueurs votent' },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectionMode(option.id as any)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      selectionMode === option.id
                        ? 'bg-blue-600 border-blue-400'
                        : 'bg-gray-700 border-gray-500'
                    }`}
                  >
                    <div className="sf2-text text-white text-sm">{option.label}</div>
                    <div className="text-gray-400 text-xs mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Temps estimé */}
            <div className="p-4 bg-purple-900 rounded-lg border-2 border-purple-400">
              <div className="text-center">
                <div className="sf2-text text-purple-300 text-sm">Durée estimée:</div>
                <div className="sf2-text text-purple-100 text-4xl mt-2">~{duration} min</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* RIGHT: Players */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-900/80 border-4 border-blue-400 rounded-xl p-6"
        >
          <h2 className="sf2-text sf2-text-large text-blue-400 mb-6">
            👥 JOUEURS ({players.length}/8)
          </h2>

          {/* Team A */}
          <div className="mb-6">
            <h3 className="sf2-text text-xl text-blue-400 mb-3">
              🔵 TEAM A ({teamACount})
            </h3>
            <div className="space-y-2">
              {players
                .filter(p => p.team === 'A')
                .map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    onChangeTeam={onChangeTeam}
                    color="blue"
                  />
                ))}
              {teamACount === 0 && (
                <div className="p-4 bg-gray-800 rounded-lg text-center text-gray-500 sf2-text text-sm">
                  Aucun joueur
                </div>
              )}
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center my-6">
            <div
              className="sf2-text"
              style={{
                fontSize: '48px',
                color: '#FF0000',
                textShadow: '6px 6px 0px #000, 0 0 40px #FF0000',
                WebkitTextStroke: '2px #000',
              }}
            >
              VS
            </div>
          </div>

          {/* Team B */}
          <div>
            <h3 className="sf2-text text-xl text-yellow-400 mb-3">
              🟡 TEAM B ({teamBCount})
            </h3>
            <div className="space-y-2">
              {players
                .filter(p => p.team === 'B')
                .map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    onChangeTeam={onChangeTeam}
                    color="yellow"
                  />
                ))}
              {teamBCount === 0 && (
                <div className="p-4 bg-gray-800 rounded-lg text-center text-gray-500 sf2-text text-sm">
                  Aucun joueur
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Start Button (Host only) */}
      {isHost && players.length >= 2 && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center mt-8"
        >
          <button
            onClick={handleStartGame}
            className="sf2-button sf2-button-red"
            style={{
              fontSize: '48px',
              padding: '24px 60px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            🔥 START BATTLE 🔥
            {/* Shine effect */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                pointerEvents: 'none',
              }}
            />
          </button>
        </motion.div>
      )}

      {!isHost && (
        <div className="sf2-text text-center text-gray-400 mt-8 text-lg">
          En attente du host...
        </div>
      )}
    </div>
  );
}

// ==========================================
// PLAYER CARD COMPONENT
// ==========================================

interface PlayerCardProps {
  player: { id: string; name: string; team: 'A' | 'B'; isHost: boolean };
  onChangeTeam: (playerId: string) => void;
  color: 'blue' | 'yellow';
}

function PlayerCard({ player, onChangeTeam, color }: PlayerCardProps) {
  const bgColor = color === 'blue' ? 'from-blue-900 to-blue-700' : 'from-yellow-900 to-yellow-700';
  const borderColor = color === 'blue' ? 'border-blue-400' : 'border-yellow-400';

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`bg-gradient-to-r ${bgColor} border-2 ${borderColor} rounded-lg p-4 flex items-center justify-between`}
    >
      <div className="flex items-center gap-3">
        <div className="text-4xl">{player.team === 'A' ? '🎤' : '🎧'}</div>
        <div>
          <div className="sf2-text text-white text-lg flex items-center gap-2">
            {player.name}
            {player.isHost && <span className="text-yellow-400">👑</span>}
          </div>
          <div className="text-xs text-gray-300 mt-1">
            Team {player.team}
          </div>
        </div>
      </div>
      <button
        onClick={() => onChangeTeam(player.id)}
        className="sf2-button"
        style={{ fontSize: '12px', padding: '8px 16px' }}
      >
        🔄
      </button>
    </motion.div>
  );
}
