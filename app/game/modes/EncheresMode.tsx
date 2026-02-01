'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EncheresData, Team } from '../../types';

interface EncheresModeProps {
  data: EncheresData;
  team: Team;
  currentPlayerId?: string | null;
  currentResponderId?: string | null;
  currentResponderName?: string | null;
  onSubmitBet: (bet: number) => void;
  onSubmitAnswer: (answer: string) => void;
  timeLeft: number;
  totalTime: number;
  phase: 'betting' | 'proof';
  winner?: Team | null;
  opponentBet?: number; // Mise de l'adversaire
}

export function EncheresMode({
  data,
  team,
  currentPlayerId,
  currentResponderId,
  currentResponderName,
  onSubmitBet,
  onSubmitAnswer,
  timeLeft,
  totalTime,
  phase,
  winner,
  opponentBet,
}: EncheresModeProps) {
  const [bet, setBet] = useState(5);
  const [answer, setAnswer] = useState('');
  const [showBetAnimation, setShowBetAnimation] = useState(false);
  const progress = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;

  const handleBetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowBetAnimation(true);
    setTimeout(() => {
      onSubmitBet(bet);
      setShowBetAnimation(false);
    }, 800);
  };

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn || !answer.trim()) return;
    onSubmitAnswer(answer.trim());
    setAnswer('');
  };

  // Phase de mise (Poker style)
  if (phase === 'betting') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 relative">
        {/* Poker table background */}
        <div className="absolute inset-0 bg-gradient-radial from-green-800 via-green-900 to-black opacity-40 pointer-events-none" />

        {/* Poker felt texture overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,.1) 10px, rgba(0,0,0,.1) 20px)',
          }}
        />

        <motion.div
          initial={{ y: -30, opacity: 0, rotateX: -20 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          className="mb-8 text-center relative z-10"
        >
          {/* Playing card style for theme */}
          <div className="relative">
            <motion.div
              whileHover={{ scale: 1.05, rotateY: 5 }}
              className="px-10 py-6 bg-white rounded-2xl shadow-2xl border-4 border-yellow-400"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
              }}
            >
              <div className="text-sm font-bold text-red-600 mb-1">♠️ LES ENCHÈRES ♥️</div>
              <div className="text-2xl font-bold text-gray-900">{data.themeTitle}</div>
              <div className="text-xs text-gray-500 mt-1">♣️ Combien de réponses? ♦️</div>
            </motion.div>
            {/* Card shadow */}
            <div className="absolute inset-0 bg-black opacity-20 blur-xl -z-10 transform translate-y-2" />
          </div>
        </motion.div>

        <p className="text-gray-200 mb-8 text-center max-w-md relative z-10 font-semibold">
          🎰 Chaque équipe mise en secret le nombre de réponses.
          <br />
          <span className="text-yellow-400">La plus haute mise gagne et doit prouver.</span>
        </p>

        <form onSubmit={handleBetSubmit} className="w-full max-w-md relative z-10">
          {/* Poker chip counter */}
          <motion.div
            className="mb-8 relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Chip stacks visualization */}
            <div className="flex items-end justify-center gap-1 mb-6 h-32">
              {Array.from({ length: Math.min(bet, 20) }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="relative"
                  style={{
                    height: `${Math.min(100, (i + 1) * 5)}px`,
                  }}
                >
                  <PokerChip index={i} />
                </motion.div>
              ))}
            </div>

            {/* Bet amount display */}
            <div className="text-center mb-4">
              <motion.div
                key={bet}
                initial={{ scale: 1.3, color: '#FCD34D' }}
                animate={{ scale: 1, color: '#FFFFFF' }}
                className="text-7xl font-bold text-white drop-shadow-lg"
              >
                {bet}
              </motion.div>
              <div className="text-sm text-gray-400 mt-1">réponses</div>
            </div>

            {/* Bet controls */}
            <div className="flex items-center justify-center gap-6">
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setBet(Math.max(1, bet - 1))}
                className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 rounded-full text-3xl font-bold text-white transition-colors shadow-lg border-4 border-white/20"
              >
                -
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setBet(Math.min(20, bet + 5))}
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-white font-bold text-sm transition-colors shadow-md"
              >
                +5
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setBet(Math.min(20, bet + 1))}
                className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 rounded-full text-3xl font-bold text-white transition-colors shadow-lg border-4 border-white/20"
              >
                +
              </motion.button>
            </div>
          </motion.div>

          {/* Submit bet button (poker style) */}
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-5 bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-500 hover:from-yellow-400 hover:via-yellow-500 hover:to-yellow-400 rounded-2xl text-black font-bold text-2xl transition-all shadow-2xl border-4 border-yellow-300 relative overflow-hidden"
          >
            <span className="relative z-10">💰 ALL IN - MISER {bet} 💰</span>
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </motion.button>

          {/* Opponent bet display (if available) */}
          {opponentBet !== undefined && opponentBet > 0 && (
            <motion.div
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="mt-6 p-4 bg-red-900/30 border-2 border-red-500 rounded-xl text-center"
            >
              <div className="text-sm text-red-400 font-semibold">Mise adverse</div>
              <div className="text-3xl font-bold text-red-300">{opponentBet}</div>
              {bet > opponentBet && (
                <div className="text-xs text-green-400 mt-1">✅ Vous surenchérissez !</div>
              )}
              {bet === opponentBet && (
                <div className="text-xs text-yellow-400 mt-1">⚖️ Égalité</div>
              )}
              {bet < opponentBet && (
                <div className="text-xs text-red-400 mt-1">⚠️ Vous êtes en dessous</div>
              )}
            </motion.div>
          )}
        </form>

        {/* Timer bar */}
        <div className="w-full max-w-md mt-8 relative z-10">
          <div className="h-4 bg-gray-900/50 rounded-full overflow-hidden border-2 border-yellow-600/30">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500"
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-yellow-400 mt-2 font-mono font-bold">
            {Math.ceil(timeLeft / 1000)}s
          </p>
        </div>

        {/* Bet animation overlay */}
        <AnimatePresence>
          {showBetAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-50 bg-black/50"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1.5, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: 'spring', damping: 10 }}
                className="text-8xl"
              >
                💰
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Phase de preuve
  const isWinner = winner === team;
  const isMyTurn = isWinner && (!currentResponderId || currentResponderId === currentPlayerId);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-radial from-green-800 via-green-900 to-black opacity-40 pointer-events-none" />

      {/* Objective card */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-6 relative z-10"
      >
        <div className="px-8 py-4 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-2xl border-4 border-yellow-300">
          <p className="text-sm text-yellow-900 font-bold">🎯 OBJECTIF</p>
          <p className="text-5xl font-bold text-white drop-shadow-lg">
            {data.betState.targetCount}
          </p>
          <p className="text-sm text-yellow-900 font-bold">réponses</p>
        </div>
      </motion.div>

      <div className="mb-4 text-center relative z-10">
        <span className="text-xs uppercase tracking-[0.2em] text-yellow-300">Theme</span>
        <div className="mt-2 px-5 py-3 rounded-xl bg-black/40 border border-yellow-500/40 text-yellow-100 font-semibold">
          {data.themeTitle}
        </div>
      </div>

      <div className="mb-6 text-center relative z-10">
        <p className="text-gray-200 text-lg font-semibold">
          {isWinner
            ? "🏆 Vous avez gagné ! Prouvez vos capacités :"
            : "⏳ L'équipe adverse prouve sa mise..."}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Seule l'équipe gagnante répond pendant cette phase.
        </p>
        {currentResponderName && (
          <p className="text-sm text-yellow-300 mt-2 font-semibold">
            Tour de {currentResponderName}
          </p>
        )}
      </div>

      {isWinner ? (
        <form onSubmit={handleAnswerSubmit} className="w-full max-w-md relative z-10">
          <div className="flex gap-3">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={!isMyTurn}
              placeholder="Votre réponse..."
              className="flex-1 px-5 py-4 bg-gray-900 text-white rounded-xl border-3 border-yellow-500 focus:outline-none focus:border-yellow-400 text-lg font-semibold shadow-lg"
              autoFocus
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={!isMyTurn || !answer.trim()}
              className="px-8 py-4 bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 rounded-xl text-black font-bold text-lg shadow-lg"
            >
              ✓ OK
            </motion.button>
          </div>

          {/* Progress display */}
          <div className="mt-6 p-4 bg-gray-900/70 rounded-xl border-2 border-yellow-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 font-semibold">Progression:</span>
              <span className="text-2xl font-bold text-yellow-400">
                {data.currentCount} / {data.betState.targetCount}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${(data.currentCount / data.betState.targetCount) * 100}%` }}
                transition={{ type: 'spring' }}
              />
            </div>
          </div>
        </form>
      ) : (
        <div className="text-center text-gray-300 relative z-10">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xl font-semibold"
          >
            ⏳ En attente des réponses...
          </motion.div>
        </div>
      )}

      {/* Used Answers (poker chips style) */}
      {data.usedAnswers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-6 bg-gray-900/70 rounded-2xl max-w-2xl relative z-10 border-2 border-green-600"
        >
          <div className="text-center text-green-400 font-bold mb-3">
            ✅ Réponses validées ({data.usedAnswers.length})
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {data.usedAnswers.map((ans, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.05 }}
                className="px-4 py-2 bg-gradient-to-br from-green-600 to-green-700 text-white rounded-full text-sm font-bold shadow-lg border-2 border-green-400"
              >
                {ans}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Timer */}
      <div className="w-full max-w-md mt-8 relative z-10">
        <div className="h-4 bg-gray-900/50 rounded-full overflow-hidden border-2 border-green-600/30">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-green-400 mt-2 font-mono font-bold">
          {Math.ceil(timeLeft / 1000)}s
        </p>
      </div>
    </div>
  );
}

// Poker Chip Component
function PokerChip({ index }: { index: number }) {
  const colors = [
    'from-red-600 to-red-800',      // 0-4
    'from-blue-600 to-blue-800',    // 5-9
    'from-green-600 to-green-800',  // 10-14
    'from-yellow-500 to-yellow-700', // 15-19
  ];

  const colorIndex = Math.floor(index / 5) % colors.length;

  return (
    <div className="relative w-12 h-3 group">
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors[colorIndex]} border-2 border-white shadow-lg group-hover:scale-110 transition-transform`}
      >
        {/* Inner circle */}
        <div className="absolute inset-1 rounded-full border border-white/30" />
      </div>
    </div>
  );
}
