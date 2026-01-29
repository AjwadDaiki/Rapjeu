'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MythoPasMythoData } from '../../types';

interface MythoPasMythoModeProps {
  data: MythoPasMythoData;
  onSubmit: (isTrue: boolean) => void;
  timeLeft: number;
  totalTime: number;
  currentStatement?: { statement: string; index: number; total: number };
}

export function MythoPasMythoMode({
  data,
  onSubmit,
  timeLeft,
  totalTime,
  currentStatement,
}: MythoPasMythoModeProps) {
  const progress = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const current = currentStatement || {
    statement: data.anecdotes[data.currentIndex]?.statement || 'Chargement...',
    index: data.currentIndex + 1,
    total: data.anecdotes.length,
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Progress */}
      <div className="mb-6 text-gray-400">
        Anecdote {current.index} / {current.total}
      </div>

      {/* Statement Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        key={current.index}
        className="mb-8 max-w-2xl"
      >
        <div className="px-8 py-8 bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-2xl">
          <span className="text-4xl mb-4 block text-center">🤔</span>
          <p className="text-xl text-white text-center leading-relaxed">
            "{current.statement}"
          </p>
        </div>
      </motion.div>

      {/* Buttons */}
      <div className="flex gap-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSubmit(false)}
          className="px-8 py-4 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold text-xl transition-colors"
        >
          MYTHO ❌
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSubmit(true)}
          className="px-8 py-4 bg-green-600 hover:bg-green-500 rounded-xl text-white font-bold text-xl transition-colors"
        >
          PAS MYTHO ✅
        </motion.button>
      </div>

      {/* Timer Bar */}
      <div className="w-full max-w-md mt-8">
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
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
