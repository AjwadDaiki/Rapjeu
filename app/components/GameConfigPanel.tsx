'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GameConfig,
  DEFAULT_CONFIG,
  QUICK_CONFIG,
  MARATHON_CONFIG,
  CULTURE_CONFIG,
  SPEED_CONFIG,
  validateConfig,
  estimateGameDuration,
  saveConfig,
  loadConfig,
} from '../lib/gameConfig';
import { GAME_MODE_NAMES, GAME_MODE_DESCRIPTIONS, MODE_ICONS } from '../lib/constants';
import type { GameMode } from '../lib/constants';

export default function GameConfigPanel({ onSave }: { onSave: (config: GameConfig) => void }) {
  const [config, setConfig] = useState<GameConfig>(loadConfig());
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const handleSave = () => {
    const validation = validateConfig(config);
    if (!validation.valid) {
      alert(`Erreurs:\n${validation.errors.join('\n')}`);
      return;
    }

    saveConfig(config);
    onSave(config);
  };

  const duration = estimateGameDuration(config);
  const activeModesCount = Object.values(config.enabledModes).filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 border-4 border-yellow-400 rounded-2xl p-6 max-w-2xl mx-auto"
    >
      <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center">
        ⚙️ Configuration de la partie
      </h2>

      {/* Presets rapides */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-3">Presets:</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { name: 'Défaut', config: DEFAULT_CONFIG, duration: '20min' },
            { name: 'Rapide', config: QUICK_CONFIG, duration: '15min' },
            { name: 'Marathon', config: MARATHON_CONFIG, duration: '35min' },
            { name: 'Culture', config: CULTURE_CONFIG, duration: '25min' },
            { name: 'Rapidité', config: SPEED_CONFIG, duration: '18min' },
          ].map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePreset(preset.config)}
              className="px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors border-2 border-transparent hover:border-yellow-400"
            >
              {preset.name}
              <div className="text-xs text-gray-400">{preset.duration}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Modes de jeu */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-3">
          Modes actifs ({activeModesCount}/6):
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(config.enabledModes) as GameMode[]).map((mode) => {
            const enabled = config.enabledModes[mode];
            return (
              <button
                key={mode}
                onClick={() => handleToggleMode(mode)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  enabled
                    ? 'bg-green-900 border-green-400 text-white'
                    : 'bg-gray-800 border-gray-600 text-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{MODE_ICONS[mode]}</span>
                  <div className="text-left">
                    <div className="font-bold">{GAME_MODE_NAMES[mode]}</div>
                    <div className="text-xs opacity-75">
                      {GAME_MODE_DESCRIPTIONS[mode].slice(0, 40)}...
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings avancés */}
      <div className="mb-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-2"
        >
          {showAdvanced ? '▼' : '▶'} Paramètres avancés
        </button>

        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-4 bg-gray-800 p-4 rounded-lg"
          >
            {/* Modes par partie */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Modes par partie: {config.modesPerGame}
              </label>
              <input
                type="range"
                min="1"
                max={activeModesCount}
                value={config.modesPerGame}
                onChange={(e) =>
                  setConfig({ ...config, modesPerGame: parseInt(e.target.value) })
                }
                className="w-full"
              />
              <div className="text-sm text-gray-400">
                1 = Court, {Math.ceil(activeModesCount / 2)} = Moyen, {activeModesCount} = Tous
              </div>
            </div>

            {/* Rounds par mode */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Rounds par mode: {config.roundsPerMode}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={config.roundsPerMode}
                onChange={(e) =>
                  setConfig({ ...config, roundsPerMode: parseInt(e.target.value) })
                }
                className="w-full"
              />
              <div className="text-sm text-gray-400">1 = Rapide, 5 = Moyen, 10 = Long</div>
            </div>

            {/* Durées transitions */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-white text-sm mb-1">VS Intro</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={config.vsIntroDuration}
                  onChange={(e) =>
                    setConfig({ ...config, vsIntroDuration: parseInt(e.target.value) })
                  }
                  className="w-full px-2 py-1 rounded bg-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-1">Roulette</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={config.rouletteDuration}
                  onChange={(e) =>
                    setConfig({ ...config, rouletteDuration: parseInt(e.target.value) })
                  }
                  className="w-full px-2 py-1 rounded bg-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-1">Résultat</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={config.roundResultDuration}
                  onChange={(e) =>
                    setConfig({ ...config, roundResultDuration: parseInt(e.target.value) })
                  }
                  className="w-full px-2 py-1 rounded bg-gray-700 text-white"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Durée estimée */}
      <div className="mb-6 p-4 bg-purple-900 rounded-lg border-2 border-purple-400">
        <div className="text-center">
          <div className="text-sm text-purple-300">Durée estimée de la partie:</div>
          <div className="text-4xl font-bold text-purple-100">~{duration} minutes</div>
        </div>
      </div>

      {/* Bouton Sauvegarder */}
      <button
        onClick={handleSave}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-black font-bold text-xl shadow-lg transition-all"
      >
        💾 Sauvegarder et jouer
      </button>
    </motion.div>
  );
}
