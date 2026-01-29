'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BlindTestData, Team } from '../../types';

interface BlindTestModeProps {
  data: BlindTestData;
  team: Team;
  onBuzz: () => void;
  onSubmitAnswer: (answer: string) => void;
  buzzedTeam: Team | null;
  timeLeft: number;
}

export function BlindTestMode({
  data,
  team,
  onBuzz,
  onSubmitAnswer,
  buzzedTeam,
  timeLeft,
}: BlindTestModeProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [answer, setAnswer] = useState('');
  const currentTrack = data.tracks[data.currentIndex];

  // Play audio when track changes
  useEffect(() => {
    if (currentTrack?.previewUrl && !buzzedTeam) {
      audioRef.current = new Audio(currentTrack.previewUrl);
      audioRef.current.volume = 0.7;
      audioRef.current.play().catch(() => {
        // Autoplay blocked, user interaction needed
      });
    }

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [currentTrack, buzzedTeam]);

  const handleBuzz = () => {
    if (hasBuzzed || buzzedTeam) return;
    setHasBuzzed(true);
    audioRef.current?.pause();
    onBuzz();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    onSubmitAnswer(answer.trim());
    setAnswer('');
    setHasBuzzed(false);
  };

  const isBuzzed = !!buzzedTeam;
  const isMyTurn = buzzedTeam === team;

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Track Number */}
      <div className="mb-4 text-gray-400">
        Morceau {data.currentIndex + 1} / {data.tracks.length}
      </div>

      {/* Visualizer */}
      <div className="relative w-64 h-64 mb-8">
        {/* Vinyl/CD animation */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-800 to-black border-4 border-gray-700"
          animate={!isBuzzed ? { rotate: 360 } : { rotate: 0 }}
          transition={!isBuzzed ? { duration: 3, repeat: Infinity, ease: "linear" } : {}}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gray-900 border-2 border-gray-600" />
          </div>
          {/* Grooves */}
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-gray-700"
              style={{
                inset: `${20 + i * 15}%`,
              }}
            />
          ))}
        </motion.div>

        {/* Buzz overlay */}
        {isBuzzed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className={`text-6xl font-bold ${isMyTurn ? 'text-green-400' : 'text-red-400'}`}>
              {isMyTurn ? 'À VOUS !' : `${buzzedTeam === 'A' ? 'Équipe A' : 'Équipe B'}`}
            </div>
          </motion.div>
        )}
      </div>

      {/* Buzz Button */}
      {!isBuzzed ? (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBuzz}
          className="w-48 h-48 rounded-full bg-gradient-to-br from-red-600 to-red-800 
                     flex flex-col items-center justify-center text-white font-bold text-2xl
                     shadow-lg shadow-red-500/50 hover:shadow-red-500/70 transition-shadow"
        >
          <span className="text-4xl mb-2">🔔</span>
          BUZZ
        </motion.button>
      ) : isMyTurn ? (
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className="flex gap-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Nom de l'artiste..."
              className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-xl border-2 border-red-500 focus:outline-none text-lg"
              autoFocus
            />
            <button
              type="submit"
              className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold"
            >
              OK
            </button>
          </div>
          <p className="text-center text-gray-400 mt-2">
            {Math.ceil(timeLeft / 1000)}s pour répondre
          </p>
        </form>
      ) : (
        <div className="text-center text-gray-400">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            L'équipe adverse répond...
          </motion.div>
        </div>
      )}

      {/* Hint */}
      <p className="mt-8 text-sm text-gray-500">
        {!isBuzzed 
          ? "Appuyez sur BUZZ dès que vous reconnaissez le morceau !" 
          : isMyTurn 
            ? "Entrez le nom de l'artiste"
            : "En attente de la réponse..."}
      </p>
    </div>
  );
}
