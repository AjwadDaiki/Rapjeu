'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LeThemeData, Team } from '../../types';
import { useSocket } from '../../hooks/useSocket';

interface LeThemeModeProps {
  data: LeThemeData;
  isMyTurn: boolean;
  team: Team;
  onSubmit: (answer: string) => void;
  timeLeft: number;
  totalTime: number;
  usedAnswers?: string[];
}

export function LeThemeMode({
  data,
  isMyTurn,
  team,
  onSubmit,
  timeLeft,
  totalTime,
  usedAnswers = [],
}: LeThemeModeProps) {
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
      {/* Theme Card */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 text-center"
      >
        <p className="text-sm text-gray-400 mb-2">{'Le Th\u00e8me'}</p>
        <div className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl shadow-lg">
          <span className="text-2xl font-bold text-white">{data.themeTitle}</span>
        </div>
      </motion.div>

      <p className="text-center text-sm text-gray-400 mb-4 max-w-xl">
        Chacun son tour. Donne un rappeur qui correspond au theme.
      </p>

      {/* Used Answers */}
      {usedAnswers.length > 0 && (
        <motion.div 
          className="mb-6 flex flex-wrap justify-center gap-2 max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {usedAnswers.map((answer, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-green-600/30 text-green-400 rounded-full text-sm"
            >
              {answer}
            </span>
          ))}
        </motion.div>
      )}

      {/* Input Area */}
      {isMyTurn ? (
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nommez un artiste..."
              className="w-full px-6 py-4 bg-gray-800 text-white rounded-xl border-2 border-blue-500 focus:outline-none focus:border-blue-400 placeholder-gray-500 text-lg"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-bold"
            >
              OK
            </button>
          </div>
          {/* Teammate typing indicator */}
          {teammateInput && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-blue-500/30"
            >
              <span className="text-xs text-gray-400">{'Co\u00e9quipier tape:'}</span>
              <span className="ml-2 text-blue-300 font-mono">{teammateInput}</span>
              <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse" />
            </motion.div>
          )}
        </form>
      ) : (
        <div className="text-center text-gray-400">
          {teammateInput ? (
            <div className="px-4 py-3 bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-500">{'Votre \u00e9quipe pr\u00e9pare:'}</span>
              <p className="text-white font-medium">{teammateInput}...</p>
            </div>
          ) : (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <p className="text-lg">{"L'\u00e9quipe adverse joue..."}</p>
            </motion.div>
          )}
        </div>
      )}

      {/* Timer Bar */}
      <div className="w-full max-w-md mt-8">
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
        <p className="text-center text-gray-400 mt-2 text-lg font-mono">
          {Math.ceil(timeLeft / 1000)}s
        </p>
      </div>
    </div>
  );
}


