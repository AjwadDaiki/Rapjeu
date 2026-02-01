'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PixelCoverData, Team } from '../../types';

interface PixelCoverModeProps {
  data: PixelCoverData;
  onSubmitAnswer: (answer: string) => void;
  timeLeft: number;
  totalTime: number;
}

export function PixelCoverMode({
  data,
  onSubmitAnswer,
  timeLeft,
  totalTime,
}: PixelCoverModeProps) {
  const [answer, setAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const progress = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  
  const currentItem = data.items[data.currentIndex];
  const blurAmount = data.pixelState.currentBlur;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || hasAnswered) return;
    setHasAnswered(true);
    onSubmitAnswer(answer.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Progress */}
      <div className="mb-4 text-gray-400">
        Image {data.currentIndex + 1} / {data.items.length}
      </div>

      {/* Image Container */}
      <div className="relative mb-8">
        <motion.div
          className="w-80 h-80 rounded-xl overflow-hidden bg-gray-800 flex items-center justify-center"
          style={{
            boxShadow: '0 0 30px rgba(0,0,0,0.5)',
          }}
        >
          {currentItem?.imageUrl ? (
            <img
              src={currentItem.imageUrl}
              alt="Pixel Cover"
              className="w-full h-full object-cover transition-all duration-300"
              style={{
                filter: `blur(${blurAmount}px)`,
              }}
            />
          ) : (
            <div className="text-gray-600 text-6xl">🖼️</div>
          )}
        </motion.div>

        {/* Blur indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 rounded-full text-white text-sm">
          Flou: {Math.round((blurAmount / data.pixelState.maxBlur) * 100)}%
        </div>
      </div>

      {/* Input */}
      {!hasAnswered ? (
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className="flex gap-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Nom de l'artiste ou de l'album..."
              className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-xl border-2 border-indigo-500 focus:outline-none text-lg"
              autoFocus
            />
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold"
            >
              OK
            </button>
          </div>
        </form>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-green-400 font-bold text-xl"
        >
          Réponse enregistrée !
        </motion.div>
      )}

      {/* Timer */}
      <div className="w-full max-w-md mt-6">
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-gray-400 mt-2 font-mono">
          {Math.ceil(timeLeft / 1000)}s
        </p>
      </div>

      {/* Hint */}
      <p className="mt-4 text-sm text-gray-500 text-center max-w-md">
        Tout le monde peut répondre. Donne l'artiste ou l'album avant que l'image soit claire.
      </p>
    </div>
  );
}
