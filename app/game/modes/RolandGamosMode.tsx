'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RolandGamosData, ChainLink, Team } from '../../types';
import { useSocket } from '../../hooks/useSocket';

interface RolandGamosModeProps {
  data: RolandGamosData;
  isMyTurn: boolean;
  team: Team;
  onSubmit: (answer: string) => void;
  timeLeft: number;
  totalTime: number;
  chain?: ChainLink[];
}

export function RolandGamosMode({
  data,
  isMyTurn,
  team,
  onSubmit,
  timeLeft,
  totalTime,
}: RolandGamosModeProps) {
  const [input, setInput] = useState('');
  const [teammateInput, setTeammateInput] = useState('');
  const { syncInput, onInputSync } = useSocket();
  const progress = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;

  // Sync input with teammates
  useEffect(() => {
    if (!isMyTurn) return;
    
    const timeout = setTimeout(() => {
      syncInput(input);
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [input, isMyTurn, syncInput]);

  // Listen for teammate input
  useEffect(() => {
    const cleanup = onInputSync((inputTeam, value) => {
      if (inputTeam === team && !isMyTurn) {
        setTeammateInput(value);
      }
    });
    return cleanup;
  }, [onInputSync, team, isMyTurn]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmit(input.trim());
    setInput('');
    setTeammateInput('');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Starting Artist */}
      <div className="mb-8 text-center">
        <p className="text-sm text-gray-400 mb-2">Artiste de départ</p>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl"
        >
          <span className="text-2xl font-bold text-white">
            {data.startingArtistName}
          </span>
        </motion.div>
      </div>

      {/* Chain Display */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8 max-w-4xl">
        <AnimatePresence>
          {data.chain.map((link: ChainLink, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">
                <span className="text-white font-medium">{link.artistName}</span>
              </div>
              {index < data.chain.length - 1 && (
                <span className="text-purple-400">→</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Current Artist */}
      {data.currentArtistName !== data.startingArtistName && (
        <div className="mb-8 text-center">
          <p className="text-sm text-gray-400 mb-2">À suivre...</p>
          <div className="px-6 py-3 bg-gray-800 rounded-xl border-2 border-purple-500">
            <span className="text-xl font-bold text-white">
              {data.currentArtistName}
            </span>
          </div>
        </div>
      )}

      <p className="text-center text-sm text-gray-400 mb-6 max-w-xl">
        Chacun son tour. Donne un rappeur qui a un feat avec <span className="text-purple-300 font-semibold">{data.currentArtistName}</span>.
      </p>

      {/* Input Area */}
      {isMyTurn ? (
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nom de l'artiste en feat..."
              className="w-full px-6 py-4 bg-gray-800 text-white rounded-xl border-2 border-purple-500 focus:outline-none focus:border-purple-400 placeholder-gray-500"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
            >
              Valider
            </button>
          </div>
          {/* Teammate typing indicator */}
          {teammateInput && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-purple-500/30"
            >
              <span className="text-xs text-gray-400">Coéquipier tape:</span>
              <span className="ml-2 text-purple-300 font-mono">{teammateInput}</span>
              <span className="inline-block w-2 h-4 bg-purple-400 ml-1 animate-pulse" />
            </motion.div>
          )}
          <p className="text-center text-gray-400 mt-4 text-sm">
            Trouve un artiste qui a fait un feat avec {data.currentArtistName}
          </p>
        </form>
      ) : (
        <div className="text-center text-gray-400">
          {teammateInput ? (
            <div className="px-4 py-3 bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-500">Votre équipe prépare:</span>
              <p className="text-white font-medium">{teammateInput}...</p>
            </div>
          ) : (
            <p className="text-lg">L'équipe adverse joue...</p>
          )}
        </div>
      )}

      {/* Timer Bar */}
      <div className="w-full max-w-md mt-8">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
        <p className="text-center text-gray-400 mt-2 text-sm">
          {Math.ceil(timeLeft / 1000)}s
        </p>
      </div>
    </div>
  );
}
