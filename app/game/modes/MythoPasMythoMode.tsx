'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MythoPasMythoData } from '../../types';

interface MythoPasMythoModeProps {
  data: MythoPasMythoData;
  onSubmit: (isTrue: boolean) => void;
  timeLeft: number;
  totalTime: number;
  currentStatement?: { statement: string; index: number; total: number };
  lastResult?: { isTrue: boolean; explanation: string } | null;
}

export function MythoPasMythoMode({
  data,
  onSubmit,
  timeLeft,
  totalTime,
  currentStatement,
  lastResult,
}: MythoPasMythoModeProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [myVote, setMyVote] = useState<boolean | null>(null);
  const progress = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const current = currentStatement || {
    statement: data.anecdotes[data.currentIndex]?.statement || 'Chargement...',
    index: data.currentIndex + 1,
    total: data.anecdotes.length,
  };

  // Reset vote state when statement changes
  useEffect(() => {
    setHasVoted(false);
    setMyVote(null);
  }, [current.index]);

  const handleVote = (isTrue: boolean) => {
    if (hasVoted) return;
    setHasVoted(true);
    setMyVote(isTrue);
    onSubmit(isTrue);
  };

  // Did my team vote correctly?
  const gotItRight = lastResult && myVote !== null ? myVote === lastResult.isTrue : null;

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
            &quot;{current.statement}&quot;
          </p>
        </div>
      </motion.div>

      {/* Result feedback overlay */}
      <AnimatePresence>
        {lastResult && hasVoted && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="mb-6 max-w-lg w-full"
          >
            <div
              className={`px-6 py-5 rounded-2xl border-2 text-center ${
                gotItRight
                  ? 'bg-green-900/40 border-green-500/60'
                  : 'bg-red-900/40 border-red-500/60'
              }`}
            >
              <div className="text-3xl font-bold mb-2">
                {gotItRight ? '\u2705 BIEN JOU\u00c9 !' : '\u274c RAT\u00c9 !'}
              </div>
              <div className="text-sm text-gray-300 mb-2">
                {'C\'\u00e9tait '}
                <span className={`font-bold ${lastResult.isTrue ? 'text-green-400' : 'text-red-400'}`}>
                  {lastResult.isTrue ? 'PAS MYTHO (vrai)' : 'MYTHO (faux)'}
                </span>
              </div>
              {lastResult.explanation && (
                <div className="text-xs text-gray-400 mt-2 italic">
                  {lastResult.explanation}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vote buttons or voted state */}
      {!hasVoted ? (
        <>
          <p className="text-center text-sm text-gray-400 mb-6 max-w-xl">
            Tout le monde vote en m{'\u00ea'}me temps. Vrai ou faux ?
          </p>
          <div className="flex gap-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleVote(false)}
              className="px-8 py-4 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold text-xl transition-colors"
            >
              MYTHO {'\u274c'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleVote(true)}
              className="px-8 py-4 bg-green-600 hover:bg-green-500 rounded-xl text-white font-bold text-xl transition-colors"
            >
              PAS MYTHO {'\u2705'}
            </motion.button>
          </div>
        </>
      ) : !lastResult ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-6"
        >
          <div className={`inline-block px-6 py-3 rounded-xl font-bold text-lg ${
            myVote ? 'bg-green-800/40 border border-green-500/40 text-green-300' : 'bg-red-800/40 border border-red-500/40 text-red-300'
          }`}>
            Vous avez vot{'\u00e9'} : {myVote ? 'PAS MYTHO' : 'MYTHO'}
          </div>
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-gray-400 mt-3 text-sm"
          >
            En attente du r{'\u00e9'}sultat...
          </motion.p>
        </motion.div>
      ) : null}

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
