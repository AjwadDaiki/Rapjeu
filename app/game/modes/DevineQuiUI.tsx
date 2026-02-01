'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface DevineQuiUIProps {
  roundData: any;
  currentPlayer: any;
  teamHP: { A: number; B: number };
  combos: { A: number; B: number };
  onSubmitAnswer: (answer: string) => void;
}

export function DevineQuiUI({ roundData, currentPlayer, teamHP, combos, onSubmitAnswer }: DevineQuiUIProps) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmitAnswer(answer.trim());
      setAnswer('');
    }
  };

  const isMyTurn = roundData?.currentTurn === currentPlayer?.team;
  const attempts = roundData?.attempts || [];
  const clues = roundData?.targetArtist?.clues || {};

  const getStatusColor = (status: string) => {
    if (status === 'correct') return 'var(--rj-success)';
    if (status === 'close') return 'var(--rj-warning)';
    return 'var(--rj-danger)';
  };

  const getStatusEmoji = (status: string) => {
    if (status === 'correct') return '✅';
    if (status === 'close') return '⚠️';
    return '❌';
  };

  return (
    <div className="rj-container" style={{ padding: '40px', minHeight: '100vh' }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rj-card"
        style={{ maxWidth: '900px', margin: '0 auto' }}
      >
        <div className="rj-card-header" style={{ textAlign: 'center' }}>
          <h2 className="rj-card-title" style={{ fontSize: '32px' }}>
            🔍 Devine Qui
          </h2>
          <p className="rj-card-description">Style Wordle - Trouve le rappeur mystère!</p>
        </div>

        {/* Clues */}
        <div style={{ padding: '24px', background: 'var(--rj-bg-elevated)', borderRadius: 'var(--radius-lg)', margin: '24px' }}>
          <div className="rj-text-sm" style={{ color: 'var(--rj-text-muted)', marginBottom: '16px' }}>
            Indices:
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div className="rj-text">📀 Albums: {clues.albums || '???'}</div>
            <div className="rj-text">🎧 Streams: {clues.streams || '???'}M</div>
            <div className="rj-text">🔤 Lettres: {clues.letters || '???'}</div>
            <div className="rj-text">📅 Année début: {clues.yearDebut || '???'}</div>
            <div className="rj-text">📍 Origine: {clues.origin || '???'}</div>
          </div>
        </div>

        {/* Previous Attempts */}
        {attempts.length > 0 && (
          <div style={{ padding: '24px' }}>
            <div className="rj-text-sm" style={{ color: 'var(--rj-text-muted)', marginBottom: '12px' }}>
              Tentatives ({attempts.length}/5):
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {attempts.map((attempt: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  style={{
                    padding: '16px',
                    background: 'var(--rj-bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--rj-border)'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                    {attempt.artistName}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                    <span style={{ color: getStatusColor(attempt.cluesStatus.albums) }}>
                      {getStatusEmoji(attempt.cluesStatus.albums)} Albums
                    </span>
                    <span style={{ color: getStatusColor(attempt.cluesStatus.streams) }}>
                      {getStatusEmoji(attempt.cluesStatus.streams)} Streams
                    </span>
                    <span style={{ color: getStatusColor(attempt.cluesStatus.letters) }}>
                      {getStatusEmoji(attempt.cluesStatus.letters)} Lettres
                    </span>
                    <span style={{ color: getStatusColor(attempt.cluesStatus.yearDebut) }}>
                      {getStatusEmoji(attempt.cluesStatus.yearDebut)} Année
                    </span>
                    <span style={{ color: getStatusColor(attempt.cluesStatus.origin) }}>
                      {getStatusEmoji(attempt.cluesStatus.origin)} Origine
                    </span>
                  </div>
                  {attempt.actualValues && (
                    <div style={{ fontSize: '11px', color: 'var(--rj-text-muted)', marginTop: '4px' }}>
                      {attempt.actualValues.albums} albums · {attempt.actualValues.streams}M streams · {attempt.actualValues.letters} lettres
                    </div>
                  )}
                </motion.div>
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
              placeholder={isMyTurn ? "Nom du rappeur..." : "Attends ton tour..."}
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
              🎯 Deviner
            </button>
          </form>
          <div className="rj-text-sm" style={{ textAlign: 'center', marginTop: '12px', color: 'var(--rj-text-muted)' }}>
            ✅ = Correct · ⚠️ = Proche (±2) · ❌ = Faux
          </div>
        </div>
      </motion.div>
    </div>
  );
}
