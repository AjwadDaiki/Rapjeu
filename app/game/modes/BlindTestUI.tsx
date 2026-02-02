'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface BlindTestUIProps {
  roundData: any;
  currentPlayer: any;
  teamHP: { A: number; B: number };
  combos: { A: number; B: number };
  onBuzz: () => void;
  onSubmitAnswer: (answer: string) => void;
}

export function BlindTestUI({ roundData, currentPlayer, teamHP, combos, onBuzz, onSubmitAnswer }: BlindTestUIProps) {
  const [answer, setAnswer] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (roundData?.previewUrl && audioRef.current) {
      audioRef.current.src = roundData.previewUrl;
      audioRef.current.play().catch(console.error);
    }
  }, [roundData?.previewUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmitAnswer(answer.trim());
      setAnswer('');
    }
  };

  const hasBuzzed = roundData?.buzzer !== null;
  const canAnswer = roundData?.buzzer === currentPlayer?.team;

  return (
    <div className="rj-container" style={{ padding: '40px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <audio ref={audioRef} loop />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rj-card"
        style={{ maxWidth: '700px', width: '100%' }}
      >
        <div className="rj-card-header" style={{ textAlign: 'center' }}>
          <h2 className="rj-card-title" style={{ fontSize: '32px' }}>
            🎵 Blind Test
          </h2>
          <p className="rj-card-description">Devine le titre ou l'artiste!</p>
        </div>

        {/* Audio Visualization */}
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 360]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ fontSize: '120px', marginBottom: '24px' }}
          >
            🎧
          </motion.div>
          <div className="rj-text-sm" style={{ color: 'var(--rj-text-muted)' }}>
            Écoute bien le son...
          </div>
        </div>

        {/* Buzz Button */}
        {!hasBuzzed && (
          <div style={{ padding: '24px' }}>
            <button
              onClick={onBuzz}
              className="rj-btn rj-btn-lg"
              style={{
                width: '100%',
                padding: '32px',
                fontSize: '24px',
                background: 'var(--rj-warning)',
                borderColor: 'var(--rj-warning)'
              }}
            >
              🔔 BUZZER!
            </button>
          </div>
        )}

        {/* Answer Input (after buzz) */}
        {hasBuzzed && canAnswer && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{ padding: '24px' }}
          >
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Titre ou artiste..."
                className="rj-input"
                style={{ width: '100%', marginBottom: '16px', fontSize: '18px', padding: '16px' }}
                autoFocus
              />
              <button
                type="submit"
                className="rj-btn rj-btn-lg"
                disabled={!answer.trim()}
                style={{ width: '100%' }}
              >
                Valider
              </button>
            </form>
            <div className="rj-text-sm" style={{ textAlign: 'center', marginTop: '8px', color: 'var(--rj-text-muted)' }}>
              {roundData?.timeLeft}s restantes
            </div>
          </motion.div>
        )}

        {hasBuzzed && !canAnswer && (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div className="rj-badge" style={{ padding: '16px 32px', fontSize: '18px' }}>
              Team {roundData.buzzer} a buzzé!
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
