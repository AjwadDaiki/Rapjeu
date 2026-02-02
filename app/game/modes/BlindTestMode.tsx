'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { BlindTestData, BlindTestAnswer, BlindTestResult, Team } from '../../types';
import { audioManager } from '../../lib/audioManager';

interface BlindTestModeProps {
  data: BlindTestData;
  team: Team;
  onBuzz: () => void;
  onSubmitAnswer: (answer: BlindTestAnswer) => void;
  buzzedTeam: Team | null;
  timeLeft: number;
  lastResult?: BlindTestResult | null;
}

export function BlindTestMode({
  data,
  team,
  onBuzz,
  onSubmitAnswer,
  buzzedTeam,
  timeLeft,
  lastResult,
}: BlindTestModeProps) {
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentTrack = data.tracks[data.currentIndex];

  // Reset state when track changes
  useEffect(() => {
    setHasBuzzed(false);
    setAnswer('');
    setSubmitted(false);
  }, [data.currentIndex]);

  // Play audio when track changes
  useEffect(() => {
    if (currentTrack?.previewUrl && !buzzedTeam) {
      audioManager.playMusicPreview(currentTrack.previewUrl, 30000)
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch(() => {
          setAutoplayBlocked(true);
          setIsPlaying(false);
        });
    }

    return () => {
      audioManager.stopMusicPreview();
      setIsPlaying(false);
    };
  }, [currentTrack, buzzedTeam]);

  const handleManualPlay = () => {
    if (currentTrack?.previewUrl) {
      audioManager.playMusicPreview(currentTrack.previewUrl, 30000)
        .then(() => {
          setAutoplayBlocked(false);
          setIsPlaying(true);
        })
        .catch(console.error);
    }
  };

  const handleBuzz = () => {
    if (hasBuzzed || buzzedTeam) return;
    setHasBuzzed(true);
    audioManager.pauseMusicPreview();
    audioManager.playBuzzSound();
    onBuzz();
  };

  // Single submit - server will match against artist and/or track
  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || submitted) return;
    // Send as both artist and track - server fuzzy matches both
    onSubmitAnswer({ artist: answer.trim(), track: answer.trim() });
    setSubmitted(true);
  };

  const isBuzzed = !!buzzedTeam;
  const isMyTurn = buzzedTeam === team;

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 sm:p-8">
      {/* Autoplay blocked warning */}
      {autoplayBlocked && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-6 px-6 py-4 bg-yellow-900/50 border-2 border-yellow-500 rounded-xl"
        >
          <button
            onClick={handleManualPlay}
            className="flex items-center gap-3 text-yellow-300 hover:text-yellow-100 transition-colors"
          >
            <span className="text-3xl">🔊</span>
            <span className="font-bold">Cliquez ici pour activer l&apos;audio</span>
          </button>
        </motion.div>
      )}

      {/* Track Number */}
      <div className="mb-4 text-gray-400">
        Morceau {data.currentIndex + 1} / {data.tracks.length}
      </div>

      {/* Visualizer */}
      <div className="relative w-48 h-48 sm:w-64 sm:h-64 mb-6">
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-800 to-black border-4 border-gray-700"
          animate={!isBuzzed ? { rotate: 360 } : { rotate: 0 }}
          transition={!isBuzzed ? { duration: 3, repeat: Infinity, ease: "linear" } : {}}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-900 border-2 border-gray-600" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-gray-700"
              style={{ inset: `${20 + i * 15}%` }}
            />
          ))}
        </motion.div>

        {isBuzzed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className={`text-4xl sm:text-6xl font-bold ${isMyTurn ? 'text-green-400' : 'text-red-400'}`}>
              {isMyTurn ? 'A VOUS !' : `${buzzedTeam === 'A' ? 'Equipe A' : 'Equipe B'}`}
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
          className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-gradient-to-br from-red-600 to-red-800
                     flex flex-col items-center justify-center text-white font-bold text-2xl
                     shadow-lg shadow-red-500/50 hover:shadow-red-500/70 transition-shadow"
        >
          <span className="text-4xl mb-2">🔔</span>
          BUZZ
        </motion.button>
      ) : isMyTurn && !submitted ? (
        /* Single input field */
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-md"
        >
          <form onSubmit={handleSubmitAnswer} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Artiste ou titre du morceau..."
              className="flex-1 px-4 py-4 bg-gray-800 text-white rounded-xl border-2 border-pink-500 focus:border-pink-400 focus:outline-none text-lg"
              autoFocus
            />
            <button
              type="submit"
              disabled={!answer.trim()}
              className="px-6 py-4 bg-pink-600 hover:bg-pink-500 disabled:bg-gray-700 disabled:text-gray-500
                         rounded-xl text-white font-bold text-lg transition-colors"
            >
              OK
            </button>
          </form>
          <p className="text-center text-gray-400 mt-3 text-sm">
            {Math.ceil(timeLeft / 1000)}s pour r{'\u00e9'}pondre
          </p>
        </motion.div>
      ) : isMyTurn && submitted ? (
        /* Submitted - show result */
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-2"
        >
          {lastResult ? (
            <>
              <div className="text-2xl font-bold">
                {lastResult.pointsEarned}/2 point{lastResult.pointsEarned !== 1 ? 's' : ''}
              </div>
              <div className="text-sm text-gray-400 space-y-1">
                <div>
                  Artiste: {lastResult.artistCorrect ? '\u2705' : '\u274c'} {lastResult.correctArtist}
                </div>
                <div>
                  Titre: {lastResult.trackCorrect ? '\u2705' : '\u274c'} {lastResult.correctTrack}
                </div>
              </div>
            </>
          ) : (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-yellow-400 font-bold text-xl"
            >
              {'\u2705 R\u00e9ponse envoy\u00e9e !'}
            </motion.div>
          )}
        </motion.div>
      ) : (
        <div className="text-center text-gray-400">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            L&apos;equipe adverse repond...
          </motion.div>
        </div>
      )}

      {/* Hint */}
      <p className="mt-6 text-sm text-gray-500 text-center max-w-md">
        {!isBuzzed
          ? 'Tout le monde peut buzzer. Appuyez d\u00e8s que vous reconnaissez le morceau.'
          : isMyTurn
            ? 'Tapez le nom de l\'artiste ou le titre. 1 point pour chaque bonne r\u00e9ponse.'
            : 'En attente de la r\u00e9ponse...'}
      </p>
    </div>
  );
}
