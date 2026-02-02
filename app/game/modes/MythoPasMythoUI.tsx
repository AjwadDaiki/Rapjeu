'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface MythoPasMythoUIProps {
  roundData: any;
  currentPlayer: any;
  teamHP: { A: number; B: number };
  combos: { A: number; B: number };
  onSubmitAnswer: (answer: string) => void;
}

export function MythoPasMythoUI({ roundData, currentPlayer, teamHP, combos, onSubmitAnswer }: MythoPasMythoUIProps) {
  const [selected, setSelected] = useState<'true' | 'false' | null>(null);

  const handleChoice = (choice: 'true' | 'false') => {
    setSelected(choice);
    onSubmitAnswer(choice);
  };

  const hasAnswered = roundData?.answers?.[currentPlayer?.team];

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
            🤔 Mytho / Pas Mytho
          </h2>
        </div>

        {/* Anecdote */}
        <div style={{ padding: '32px', background: 'var(--rj-bg-elevated)', borderRadius: 'var(--radius-lg)', margin: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '24px', lineHeight: '1.6', color: 'var(--rj-text)' }}>
            {roundData?.anecdote || 'Chargement de l\'anecdote...'}
          </p>
        </div>

        {/* Choices */}
        {!hasAnswered ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '24px' }}>
            <button
              onClick={() => handleChoice('true')}
              className="rj-btn"
              style={{
                padding: '32px',
                fontSize: '24px',
                background: 'var(--rj-success)',
                borderColor: 'var(--rj-success)'
              }}
            >
              ✅ Vrai
            </button>
            <button
              onClick={() => handleChoice('false')}
              className="rj-btn"
              style={{
                padding: '32px',
                fontSize: '24px',
                background: 'var(--rj-danger)',
                borderColor: 'var(--rj-danger)'
              }}
            >
              ❌ Faux
            </button>
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div className="rj-badge rj-badge-primary" style={{ padding: '16px 32px', fontSize: '18px' }}>
              ⏳ En attente de l'autre équipe...
            </div>
          </div>
        )}

        {/* Revealed answer */}
        {roundData?.revealed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid var(--rj-border)' }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {roundData.correctAnswer ? '✅' : '❌'}
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600' }}>
              {roundData.correctAnswer ? 'C\'était VRAI!' : 'C\'était FAUX!'}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
