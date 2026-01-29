'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { EncheresData, Team } from '../../types';

interface EncheresModeProps {
  data: EncheresData;
  team: Team;
  onSubmitBet: (bet: number) => void;
  onSubmitAnswer: (answer: string) => void;
  timeLeft: number;
  totalTime: number;
  phase: 'betting' | 'proof';
  winner?: Team | null;
}

export function EncheresMode({
  data,
  team,
  onSubmitBet,
  onSubmitAnswer,
  timeLeft,
  totalTime,
  phase,
  winner,
}: EncheresModeProps) {
  const [bet, setBet] = useState(5);
  const [answer, setAnswer] = useState('');
  const progress = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;

  const handleBetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitBet(bet);
  };

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    onSubmitAnswer(answer.trim());
    setAnswer('');
  };

  // Phase de mise
  if (phase === 'betting') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-6 text-center"
        >
          <p className="text-sm text-gray-400 mb-2">Les Enchères</p>
          <div className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl">
            <span className="text-xl font-bold text-white">{data.themeTitle}</span>
          </div>
        </motion.div>

        <p className="text-gray-300 mb-6 text-center max-w-md">
          Misez le nombre de réponses que vous pensez pouvoir donner.
          L'équipe qui mise le plus devra prouver ses dires !
        </p>

        <form onSubmit={handleBetSubmit} className="w-full max-w-md">
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              type="button"
              onClick={() => setBet(Math.max(1, bet - 1))}
              className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full text-2xl font-bold text-white transition-colors"
            >
              -
            </button>
            <span className="text-5xl font-bold text-white w-24 text-center">{bet}</span>
            <button
              type="button"
              onClick={() => setBet(Math.min(20, bet + 1))}
              className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full text-2xl font-bold text-white transition-colors"
            >
              +
            </button>
          </div>
          <button
            type="submit"
            className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl text-white font-bold text-xl transition-colors"
          >
            ENCHÉRIR
          </button>
        </form>

        {/* Timer */}
        <div className="w-full max-w-md mt-8">
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Phase de preuve
  const isWinner = winner === team;

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="mb-4 text-center">
        <p className="text-sm text-gray-400">Objectif</p>
        <p className="text-3xl font-bold text-green-400">{data.betState.targetCount} réponses</p>
      </div>

      <div className="mb-6 text-center">
        <p className="text-gray-300">
          {isWinner 
            ? "Vous avez gagné les enchères ! Prouvez-le :" 
            : "L'équipe adverse doit prouver ses dires..."}
        </p>
      </div>

      {isWinner ? (
        <form onSubmit={handleAnswerSubmit} className="w-full max-w-md">
          <div className="flex gap-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Votre réponse..."
              className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-xl border-2 border-green-500 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-white font-bold"
            >
              OK
            </button>
          </div>
          <p className="text-center text-gray-400 mt-4">
            {data.currentCount} / {data.betState.targetCount}
          </p>
        </form>
      ) : (
        <div className="text-center text-gray-400">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            En attente des réponses...
          </motion.div>
        </div>
      )}

      {/* Used Answers */}
      {data.usedAnswers.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-md">
          {data.usedAnswers.map((ans, i) => (
            <span key={i} className="px-3 py-1 bg-green-600/30 text-green-400 rounded-full text-sm">
              {ans}
            </span>
          ))}
        </div>
      )}

      {/* Timer */}
      <div className="w-full max-w-md mt-8">
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-gray-400 mt-2 font-mono">
          {Math.ceil(timeLeft / 1000)}s
        </p>
      </div>
    </div>
  );
}
