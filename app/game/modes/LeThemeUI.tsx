'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface LeThemeUIProps {
  roundData: any;
  currentPlayer: any;
  teamHP: { A: number; B: number };
  combos: { A: number; B: number };
  onSubmitAnswer: (answer: string) => void;
}

export function LeThemeUI({ roundData, currentPlayer, teamHP, combos, onSubmitAnswer }: LeThemeUIProps) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmitAnswer(answer.trim());
      setAnswer('');
    }
  };

  const isMyTurn = roundData?.currentTurn === currentPlayer?.team;

  return (
    <div className="rj-container" style={{ padding: '40px', minHeight: '100vh' }}>
      {/* HP Bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
        <div>
          <div className="rj-text-sm" style={{ color: 'var(--rj-text-muted)', marginBottom: '8px' }}>Team A</div>
          <div className="h-4 rounded-full overflow-hidden" style={{ background: 'var(--rj-bg-elevated)' }}>
            <div
              className="h-full transition-all"
              style={{ background: 'var(--rj-primary)', width: `${teamHP.A}%` }}
            />
          </div>
          <div className="rj-text-sm" style={{ marginTop: '4px' }}>
            {teamHP.A} HP {combos.A > 0 && `🔥 x${combos.A}`}
          </div>
        </div>
        <div>
          <div className="rj-text-sm" style={{ color: 'var(--rj-text-muted)', marginBottom: '8px' }}>Team B</div>
          <div className="h-4 rounded-full overflow-hidden" style={{ background: 'var(--rj-bg-elevated)' }}>
            <div
              className="h-full transition-all"
              style={{ background: 'var(--rj-secondary)', width: `${teamHP.B}%` }}
            />
          </div>
          <div className="rj-text-sm" style={{ marginTop: '4px' }}>
            {teamHP.B} HP {combos.B > 0 && `🔥 x${combos.B}`}
          </div>
        </div>
      </div>

      {/* Theme */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rj-card"
        style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '32px' }}
      >
        <div className="rj-card-header">
          <h2 className="rj-card-title" style={{ fontSize: '32px' }}>
            🎯 Le Thème
          </h2>
          <p className="rj-card-description" style={{ fontSize: '24px', fontWeight: '600', color: 'var(--rj-primary)' }}>
            {roundData?.themeTitle || 'Chargement...'}
          </p>
          <p className="rj-text-sm" style={{ marginTop: '8px', color: 'var(--rj-text-muted)' }}>
            {roundData?.themeDescription}
          </p>
        </div>

        {/* Timer */}
        {roundData?.timeLeft !== undefined && (
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="rj-text-sm">Temps restant</span>
              <span className="rj-badge">{roundData.timeLeft}s</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--rj-bg-elevated)' }}>
              <div
                className="h-full transition-all"
                style={{
                  background: 'var(--rj-primary)',
                  width: `${(roundData.timeLeft / (roundData.totalTime || 30)) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </motion.div>

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
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ maxWidth: '600px', margin: '0 auto' }}
      >
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={isMyTurn ? "Tape un rappeur..." : "Attends ton tour..."}
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
      </motion.div>

      {/* Used Answers */}
      {roundData?.usedAnswers && roundData.usedAnswers.length > 0 && (
        <div style={{ maxWidth: '800px', margin: '32px auto' }}>
          <div className="rj-text-sm" style={{ color: 'var(--rj-text-muted)', marginBottom: '12px' }}>
            Déjà trouvés: {roundData.usedAnswers.length}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {roundData.usedAnswers.map((artist: string, i: number) => (
              <div key={i} className="rj-badge">{artist}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
