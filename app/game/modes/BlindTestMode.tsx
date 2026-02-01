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
  const [artistAnswer, setArtistAnswer] = useState('');
  const [trackAnswer, setTrackAnswer] = useState('');
  const [artistSubmitted, setArtistSubmitted] = useState(false);
  const [trackSubmitted, setTrackSubmitted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const artistInputRef = useRef<HTMLInputElement>(null);
  const trackInputRef = useRef<HTMLInputElement>(null);

  const currentTrack = data.tracks[data.currentIndex];

  // Reset state when track changes
  useEffect(() => {
    setHasBuzzed(false);
    setArtistAnswer('');
    setTrackAnswer('');
    setArtistSubmitted(false);
    setTrackSubmitted(false);
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

  // Soumettre les deux réponses (l'une ou les deux peuvent être vides)
  const handleSubmitBoth = (e: React.FormEvent) => {
    e.preventDefault();
    const answer: BlindTestAnswer = {};
    if (artistAnswer.trim() && !artistSubmitted) answer.artist = artistAnswer.trim();
    if (trackAnswer.trim() && !trackSubmitted) answer.track = trackAnswer.trim();
    if (answer.artist || answer.track) {
      onSubmitAnswer(answer);
      if (answer.artist) setArtistSubmitted(true);
      if (answer.track) setTrackSubmitted(true);
    }
  };

  // Soumettre uniquement l'artiste
  const handleSubmitArtist = () => {
    if (!artistAnswer.trim() || artistSubmitted) return;
    onSubmitAnswer({ artist: artistAnswer.trim() });
    setArtistSubmitted(true);
    // Focus sur le champ titre si pas encore rempli
    if (!trackSubmitted) trackInputRef.current?.focus();
  };

  // Soumettre uniquement le titre
  const handleSubmitTrack = () => {
    if (!trackAnswer.trim() || trackSubmitted) return;
    onSubmitAnswer({ track: trackAnswer.trim() });
    setTrackSubmitted(true);
    // Focus sur le champ artiste si pas encore rempli
    if (!artistSubmitted) artistInputRef.current?.focus();
  };

  const isBuzzed = !!buzzedTeam;
  const isMyTurn = buzzedTeam === team;
  const bothSubmitted = artistSubmitted && trackSubmitted;

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
      ) : isMyTurn && !bothSubmitted ? (
        /* Two input fields for artist + track */
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-md space-y-3"
        >
          {/* Artist input */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">
                Artiste (1 pt)
              </label>
              <input
                ref={artistInputRef}
                type="text"
                value={artistAnswer}
                onChange={(e) => setArtistAnswer(e.target.value)}
                placeholder="Nom de l'artiste..."
                disabled={artistSubmitted}
                className={`w-full px-4 py-3 bg-gray-800 text-white rounded-xl border-2 focus:outline-none text-lg
                  ${artistSubmitted
                    ? lastResult?.artistCorrect
                      ? 'border-green-500 bg-green-900/30'
                      : 'border-red-500 bg-red-900/30'
                    : 'border-pink-500 focus:border-pink-400'
                  }`}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmitArtist();
                  }
                }}
              />
              {artistSubmitted && (
                <span className="absolute right-3 top-8 text-xl">
                  {lastResult?.artistCorrect ? '✅' : '❌'}
                </span>
              )}
            </div>
            <button
              onClick={handleSubmitArtist}
              disabled={!artistAnswer.trim() || artistSubmitted}
              className="mt-5 px-4 py-3 bg-pink-600 hover:bg-pink-500 disabled:bg-gray-700 disabled:text-gray-500
                         rounded-xl text-white font-bold transition-colors"
            >
              OK
            </button>
          </div>

          {/* Track input */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">
                Titre (1 pt)
              </label>
              <input
                ref={trackInputRef}
                type="text"
                value={trackAnswer}
                onChange={(e) => setTrackAnswer(e.target.value)}
                placeholder="Nom du morceau..."
                disabled={trackSubmitted}
                className={`w-full px-4 py-3 bg-gray-800 text-white rounded-xl border-2 focus:outline-none text-lg
                  ${trackSubmitted
                    ? lastResult?.trackCorrect
                      ? 'border-green-500 bg-green-900/30'
                      : 'border-red-500 bg-red-900/30'
                    : 'border-cyan-500 focus:border-cyan-400'
                  }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmitTrack();
                  }
                }}
              />
              {trackSubmitted && (
                <span className="absolute right-3 top-8 text-xl">
                  {lastResult?.trackCorrect ? '✅' : '❌'}
                </span>
              )}
            </div>
            <button
              onClick={handleSubmitTrack}
              disabled={!trackAnswer.trim() || trackSubmitted}
              className="mt-5 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500
                         rounded-xl text-white font-bold transition-colors"
            >
              OK
            </button>
          </div>

          {/* Submit both button */}
          {!artistSubmitted && !trackSubmitted && (
            <form onSubmit={handleSubmitBoth}>
              <button
                type="submit"
                disabled={(!artistAnswer.trim() && !trackAnswer.trim())}
                className="w-full py-3 mt-2 bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500
                           disabled:from-gray-700 disabled:to-gray-700
                           rounded-xl text-white font-bold text-lg transition-all"
              >
                Valider tout
              </button>
            </form>
          )}

          {/* Timer */}
          <p className="text-center text-gray-400 mt-1">
            {Math.ceil(timeLeft / 1000)}s pour repondre
          </p>
        </motion.div>
      ) : isMyTurn && bothSubmitted ? (
        /* Both submitted - show result summary */
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-2"
        >
          <div className="text-2xl font-bold">
            {lastResult
              ? `${lastResult.pointsEarned}/2 point${lastResult.pointsEarned !== 1 ? 's' : ''}`
              : 'En attente...'
            }
          </div>
          {lastResult && (
            <div className="text-sm text-gray-400 space-y-1">
              <div>
                Artiste: {lastResult.artistCorrect ? '✅' : '❌'} {lastResult.correctArtist}
              </div>
              <div>
                Titre: {lastResult.trackCorrect ? '✅' : '❌'} {lastResult.correctTrack}
              </div>
            </div>
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
          ? "Tout le monde peut buzzer. Appuyez des que vous reconnaissez le morceau."
          : isMyTurn
            ? "1 point par bonne reponse. Validez artiste et titre separement."
            : "En attente de la reponse..."}
      </p>
    </div>
  );
}
