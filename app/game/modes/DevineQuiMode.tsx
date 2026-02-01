'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DevineQuiData, Team, ClueStatus } from '../../types';

interface DevineQuiModeProps {
  data: DevineQuiData;
  onSubmit: (artistName: string) => void;
  timeLeft: number;
  totalTime: number;
  currentTeam: Team;
  isMyTurn: boolean;
}

const CLUE_LABELS = {
  albums: 'Albums',
  streams: 'Streams (M)',
  letters: 'Lettres',
  yearDebut: 'Année',
  origin: 'Origine',
};

const CLUE_ICONS = {
  albums: '💿',
  streams: '🎵',
  letters: '🔤',
  yearDebut: '📅',
  origin: '🌍',
};

function getClueColor(status: ClueStatus): string {
  switch (status) {
    case 'correct': return '#10B981'; // Vert
    case 'close': return '#F59E0B';   // Jaune
    case 'wrong': return '#DC2626';   // Rouge
    default: return '#334155';        // Gris
  }
}

function getClueIndicator(attemptValue: number | undefined, targetValue: number): string {
  if (attemptValue === undefined || attemptValue === null) return '';
  if (attemptValue === targetValue) return '';
  if (attemptValue < targetValue) return '^';
  return 'v';
}

export function DevineQuiMode({
  data,
  onSubmit,
  timeLeft,
  totalTime,
  currentTeam,
  isMyTurn,
}: DevineQuiModeProps) {
  const [input, setInput] = useState('');
  const progress = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;

  const handleSubmit = () => {
    if (input.trim() && isMyTurn) {
      onSubmit(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8" style={{ background: 'var(--rj-bg)' }}>
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--rj-text)' }}>
          🕵️ Devine Qui
        </h2>
        <p className="text-lg" style={{ color: currentTeam === 'A' ? 'var(--rj-primary)' : 'var(--rj-secondary)' }}>
          {isMyTurn ? '🎯 C\'est votre tour!' : `En attente de la Team ${currentTeam}`}
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--rj-text-muted)' }}>
          Tentative {data.attempts.length + 1} / {data.maxAttempts}
        </p>
      </div>

      {/* Attempts Grid */}
      <div className="mb-8 w-full max-w-4xl">
        <div className="grid grid-cols-6 gap-3 mb-4">
          {/* Headers */}
          <div className="text-center font-bold text-sm" style={{ color: 'var(--rj-text-muted)' }}>Artiste</div>
          {(Object.keys(CLUE_LABELS) as Array<keyof typeof CLUE_LABELS>).map((clueKey) => (
            <div key={clueKey} className="text-center">
              <div className="text-2xl mb-1">{CLUE_ICONS[clueKey]}</div>
              <div className="text-xs font-semibold" style={{ color: 'var(--rj-text-muted)' }}>
                {CLUE_LABELS[clueKey]}
              </div>
            </div>
          ))}
        </div>

        {/* Previous Attempts */}
        <AnimatePresence>
          {data.attempts.map((attempt, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="grid grid-cols-6 gap-3 mb-3"
            >
              {/* Artist Name */}
              <div
                className="flex items-center justify-center rounded-lg p-3 font-bold text-sm"
                style={{
                  background: 'var(--rj-bg-elevated)',
                  color: 'var(--rj-text)',
                  border: '2px solid var(--rj-border)'
                }}
              >
                {attempt.artistName}
              </div>

              {/* Clues */}
              {(Object.keys(CLUE_LABELS) as Array<keyof typeof CLUE_LABELS>).map((clueKey) => {
                const status = attempt.cluesStatus[clueKey];
                const clueValue = attempt.clues?.[clueKey];
                const isOrigin = clueKey === 'origin';
                const displayValue = isOrigin
                  ? (typeof clueValue === 'string' && clueValue ? clueValue : '?')
                  : (typeof clueValue === 'number' ? clueValue : '?');
                const indicator = !isOrigin && status !== 'correct'
                  ? getClueIndicator(typeof clueValue === 'number' ? clueValue : undefined, data.targetArtist.clues[clueKey] as number)
                  : '';

                return (
                  <motion.div
                    key={clueKey}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1, backgroundColor: getClueColor(status) }}
                    transition={{ delay: idx * 0.1 + 0.2 }}
                    className="flex flex-col items-center justify-center rounded-lg p-3 relative font-bold"
                    style={{
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      color: 'white'
                    }}
                  >
                    <span className="text-lg">{displayValue}</span>
                    {indicator && (
                      <span className="absolute -top-1 -right-1 text-2xl">{indicator}</span>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty Slots */}
        {Array.from({ length: data.maxAttempts - data.attempts.length }).map((_, idx) => (
          <div key={`empty-${idx}`} className="grid grid-cols-6 gap-3 mb-3 opacity-30">
            <div
              className="rounded-lg p-3"
              style={{ background: 'var(--rj-bg-elevated)', border: '1px dashed var(--rj-border)' }}
            />
            {(Object.keys(CLUE_LABELS) as Array<keyof typeof CLUE_LABELS>).map((clueKey) => (
              <div
                key={clueKey}
                className="rounded-lg p-3"
                style={{ background: 'var(--rj-bg-elevated)', border: '1px dashed var(--rj-border)' }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Input */}
      {!data.foundBy && (
        <div className="w-full max-w-2xl">
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isMyTurn}
              placeholder={isMyTurn ? "Nom de l'artiste..." : "En attente..."}
              className="flex-1 px-6 py-4 rounded-xl font-bold text-lg text-center"
              style={{
                background: 'var(--rj-bg-elevated)',
                border: '2px solid var(--rj-border)',
                color: 'var(--rj-text)',
                outline: 'none',
                cursor: isMyTurn ? 'text' : 'not-allowed',
                opacity: isMyTurn ? 1 : 0.5
              }}
              autoFocus={isMyTurn}
            />
            <button
              onClick={handleSubmit}
              disabled={!isMyTurn || !input.trim()}
              className="px-8 py-4 rounded-xl font-bold text-lg transition-all"
              style={{
                background: isMyTurn && input.trim() ? 'var(--rj-primary)' : 'var(--rj-bg-elevated)',
                color: isMyTurn && input.trim() ? 'white' : 'var(--rj-text-muted)',
                cursor: isMyTurn && input.trim() ? 'pointer' : 'not-allowed',
                border: '2px solid var(--rj-border)',
                opacity: isMyTurn && input.trim() ? 1 : 0.5
              }}
            >
              VALIDER →
            </button>
          </div>

          {/* Timer Bar */}
          <div className="w-full">
            <div
              className="h-3 rounded-full overflow-hidden"
              style={{ background: 'var(--rj-bg-elevated)' }}
            >
              <motion.div
                className="h-full"
                style={{
                  background: currentTeam === 'A'
                    ? 'linear-gradient(90deg, var(--rj-primary), var(--rj-primary-hover))'
                    : 'linear-gradient(90deg, var(--rj-secondary), var(--rj-secondary-hover))'
                }}
                initial={{ width: '100%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
            </div>
            <p
              className="text-center mt-2 text-lg font-mono font-bold"
              style={{ color: 'var(--rj-text-muted)' }}
            >
              ⏱️ {Math.ceil(timeLeft / 1000)}s
            </p>
          </div>
        </div>
      )}

      {/* Winner Message */}
      {data.foundBy && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center p-8 rounded-2xl"
            style={{
              background: data.foundBy === 'A'
              ? 'rgba(34, 211, 238, 0.25)'
              : 'rgba(245, 158, 11, 0.3)',
              border: `3px solid ${data.foundBy === 'A' ? 'var(--rj-primary)' : 'var(--rj-secondary)'}`
            }}
        >
          <h3 className="text-4xl font-bold mb-2">🎉 Trouvé!</h3>
          <p className="text-2xl" style={{ color: 'var(--rj-text)' }}>
            La Team {data.foundBy} a deviné:
          </p>
          <p
            className="text-5xl font-bold mt-4"
            style={{ color: data.foundBy === 'A' ? 'var(--rj-primary)' : 'var(--rj-secondary)' }}
          >
            {data.targetArtist.name}
          </p>
        </motion.div>
      )}
    </div>
  );
}
