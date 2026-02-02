'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface PixelCoverUIProps {
  roundData: any;
  currentPlayer: any;
  teamHP: { A: number; B: number };
  combos: { A: number; B: number };
  onSubmitAnswer: (answer: string) => void;
}

export function PixelCoverUI({ roundData, currentPlayer, teamHP, combos, onSubmitAnswer }: PixelCoverUIProps) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmitAnswer(answer.trim());
      setAnswer('');
    }
  };

  const blurLevel = roundData?.blurLevel !== undefined ? roundData.blurLevel : 100;

  return (
    <div className="rj-container" style={{ padding: '40px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rj-card"
        style={{ maxWidth: '900px', width: '100%' }}
      >
        <div className="rj-card-header" style={{ textAlign: 'center' }}>
          <h2 className="rj-card-title" style={{ fontSize: '32px' }}>
            🖼️ Pixel Cover
          </h2>
          <p className="rj-card-description">Devine l'album avant qu'il ne devienne trop net!</p>
        </div>

        {/* Album Cover */}
        <div style={{ padding: '24px' }}>
          <motion.div
            style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              background: 'var(--rj-bg-elevated)',
              position: 'relative'
            }}
          >
            {roundData?.coverUrl ? (
              <img
                src={roundData.coverUrl}
                alt="Album Cover"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: `blur(${blurLevel}px)`,
                  transition: 'filter 0.25s ease-out'
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '64px' }}>
                🎨
              </div>
            )}

            {/* Blur indicator */}
            <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.7)', padding: '8px 16px', borderRadius: 'var(--radius-md)' }}>
              <div className="rj-text-sm" style={{ color: 'white' }}>
                Flou: {Math.round(blurLevel)}%
              </div>
            </div>
          </motion.div>
        </div>

        {/* Answer Input */}
        <div style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Titre de l'album ou artiste..."
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
              🎯 Valider
            </button>
          </form>
        </div>

        {/* Timer */}
        {roundData?.timeLeft !== undefined && (
          <div style={{ padding: '0 24px 24px' }}>
            <div className="rj-text-sm" style={{ textAlign: 'center', color: 'var(--rj-text-muted)' }}>
              {roundData.timeLeft}s restantes · Plus tu trouves vite, plus tu fais mal!
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
