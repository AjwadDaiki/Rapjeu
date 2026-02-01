'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface RolandGamosUIProps {
  roundData: any;
  currentPlayer: any;
  teamHP: { A: number; B: number };
  combos: { A: number; B: number };
  onSubmitAnswer: (answer: string) => void;
}

export function RolandGamosUI({ roundData, currentPlayer, teamHP, combos, onSubmitAnswer }: RolandGamosUIProps) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmitAnswer(answer.trim());
      setAnswer('');
    }
  };

  const isMyTurn = roundData?.currentTurn === currentPlayer?.team;
  const chain = roundData?.chain || [];

  return (
    <div className="rj-container" style={{ padding: '40px', minHeight: '100vh' }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rj-card"
        style={{ maxWidth: '800px', margin: '0 auto' }}
      >
        <div className="rj-card-header" style={{ textAlign: 'center' }}>
          <h2 className="rj-card-title" style={{ fontSize: '32px' }}>
            🔗 Roland Gamos
          </h2>
          <p className="rj-card-description">Chaîne de collaborations</p>
        </div>

        {/* Current Artist */}
        <div style={{ padding: '32px', background: 'var(--rj-bg-elevated)', borderRadius: 'var(--radius-lg)', margin: '24px', textAlign: 'center' }}>
          <div className="rj-text-sm" style={{ color: 'var(--rj-text-muted)', marginBottom: '8px' }}>
            Artiste actuel
          </div>
          <div style={{ fontSize: '48px', fontWeight: '700', color: 'var(--rj-primary)' }}>
            {roundData?.currentArtist?.name || 'Chargement...'}
          </div>
          <div className="rj-text-sm" style={{ color: 'var(--rj-text-muted)', marginTop: '8px' }}>
            Trouve un artiste qui a feat avec lui!
          </div>
        </div>

        {/* Chain */}
        {chain.length > 1 && (
          <div style={{ padding: '24px' }}>
            <div className="rj-text-sm" style={{ color: 'var(--rj-text-muted)', marginBottom: '12px' }}>
              Chaîne actuelle ({chain.length} artistes):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              {chain.map((artist: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="rj-badge rj-badge-primary" style={{ padding: '8px 16px' }}>
                    {artist.name}
                  </div>
                  {i < chain.length - 1 && <span style={{ fontSize: '20px' }}>→</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Turn Indicator */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {isMyTurn ? (
            <div className="rj-badge rj-badge-primary" style={{ padding: '12px 24px', fontSize: '18px' }}>
              🎤 À ton tour!
            </div>
          ) : (
            <div className="rj-badge" style={{ padding: '12px 24px', fontSize: '18px' }}>
              ⏳ Tour de Team {roundData?.currentTurn}
            </div>
          )}
        </div>

        {/* Answer Input */}
        <div style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={isMyTurn ? "Artiste qui a feat..." : "Attends ton tour..."}
              disabled={!isMyTurn}
              className="rj-input"
              style={{ width: '100%', marginBottom: '16px', fontSize: '18px', padding: '16px' }}
              autoFocus={isMyTurn}
            />
            <button
              type="submit"
              className="rj-btn rj-btn-lg"
              disabled={!isMyTurn || !answer.trim()}
              style={{ width: '100%' }}
            >
              Valider
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
