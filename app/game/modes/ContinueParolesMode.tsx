'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContinueParolesData, Team } from '../../types';

interface ContinueParolesModeProps {
  data: ContinueParolesData;
  team: Team;
  turn: Team | null;
  onSubmitAnswer: (answer: string) => void;
  timeLeft: number;
  lastCorrect?: boolean | null;
}

export function ContinueParolesMode({
  data,
  team,
  turn,
  onSubmitAnswer,
  timeLeft,
  lastCorrect,
}: ContinueParolesModeProps) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentSnippet = data.snippets[data.currentIndex];
  const isMyTurn = turn === team;

  if (!currentSnippet) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-300">
        <div className="text-2xl font-bold mb-2">Paroles indisponibles</div>
        <div className="text-sm text-gray-500">Pas assez de snippets pour ce mode.</div>
      </div>
    );
  }

  // Reset quand on change de snippet
  useEffect(() => {
    setAnswer('');
    setSubmitted(false);
    if (isMyTurn) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [data.currentIndex, isMyTurn]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || submitted || !isMyTurn) return;
    onSubmitAnswer(answer.trim());
    setSubmitted(true);
  };

  // Score actuel
  const teamAScore = data.teamAAnswers.filter(a => a === true).length;
  const teamBScore = data.teamBAnswers.filter(a => a === true).length;

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 sm:p-8">
      {/* Header */}
      <div className="mb-4 text-gray-400 text-sm">
        Paroles {data.currentIndex + 1} / {data.snippets.length}
      </div>

      {/* Score */}
      <div className="flex gap-8 mb-6 text-lg">
        <div className={`font-bold ${team === 'A' ? 'text-blue-400' : 'text-gray-500'}`}>
          Equipe A: {teamAScore}
        </div>
        <div className={`font-bold ${team === 'B' ? 'text-yellow-400' : 'text-gray-500'}`}>
          Equipe B: {teamBScore}
        </div>
      </div>

      {/* Lyrics prompt card */}
      <motion.div
        key={data.currentIndex}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-lg mb-6"
      >
        {/* Artist & Track info */}
        <div className="text-center mb-3">
          <span className="text-emerald-400 font-bold text-lg">
            {currentSnippet.artistName}
          </span>
          <span className="text-gray-500 mx-2">-</span>
          <span className="text-gray-400 italic">
            {currentSnippet.trackTitle}
          </span>
        </div>

        {/* The lyrics prompt */}
        <div className="bg-gray-800/80 border-2 border-emerald-500/50 rounded-2xl p-6 sm:p-8">
          <div className="text-center">
            <span className="text-gray-500 text-sm block mb-2">Continue ces paroles...</span>
            <p className="text-white text-xl sm:text-2xl font-medium leading-relaxed">
              &laquo; {currentSnippet.prompt} &raquo;
            </p>
          </div>

          {/* The answer (hidden until revealed) */}
          <AnimatePresence>
            {data.revealed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t border-emerald-500/30"
              >
                <span className="text-gray-500 text-sm block mb-1">La suite :</span>
                <p className="text-emerald-400 text-lg sm:text-xl font-medium leading-relaxed">
                  &laquo; {currentSnippet.answer} &raquo;
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Input or waiting */}
      {isMyTurn && !submitted && !data.revealed ? (
        <motion.form
          onSubmit={handleSubmit}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-lg"
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Ecris la suite des paroles..."
              className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-xl border-2 border-emerald-500
                         focus:border-emerald-400 focus:outline-none text-lg"
              autoFocus
            />
            <button
              type="submit"
              disabled={!answer.trim()}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700
                         rounded-xl text-white font-bold transition-colors"
            >
              OK
            </button>
          </div>
          <p className="text-center text-gray-400 mt-2 text-sm">
            {Math.ceil(timeLeft / 1000)}s pour repondre
          </p>
        </motion.form>
      ) : isMyTurn && submitted ? (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          {lastCorrect !== null && lastCorrect !== undefined ? (
            <div className={`text-3xl font-bold ${lastCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {lastCorrect ? 'CORRECT !' : 'RATE...'}
            </div>
          ) : (
            <div className="text-gray-400">Reponse envoyee...</div>
          )}
        </motion.div>
      ) : !isMyTurn ? (
        <div className="text-center text-gray-400">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {turn === 'A' ? 'Equipe A' : 'Equipe B'} repond...
          </motion.div>
        </div>
      ) : null}

      {/* Hint */}
      <p className="mt-6 text-sm text-gray-500 text-center max-w-md">
        {isMyTurn
          ? "Ecris la suite des paroles - pas besoin d'etre mot pour mot, l'idee compte !"
          : "C'est au tour de l'autre equipe"}
      </p>
    </div>
  );
}
