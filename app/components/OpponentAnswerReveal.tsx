'use client';

// ============================================
// OPPONENT ANSWER REVEAL
// Clean, bold reveal without neon
// ============================================

import { motion, AnimatePresence } from 'framer-motion';
import { colors, shadows } from '../lib/designSystem';
import { Team } from '../types';

interface OpponentAnswerRevealProps {
  show: boolean;
  team: Team;
  answer: string;
  playerName?: string;
  isCorrect: boolean;
  onComplete?: () => void;
}

export function OpponentAnswerReveal({
  show,
  team,
  answer,
  playerName,
  isCorrect,
  onComplete,
}: OpponentAnswerRevealProps) {
  if (!show) return null;

  const teamColor = team === 'A' ? colors.neon.cyan : colors.neon.magenta;
  const teamShadow = team === 'A' ? shadows.neonCyan : shadows.neonMagenta;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-6 right-6 z-50 pointer-events-none"
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onAnimationComplete={onComplete}
      >
        <div
          className="rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-md"
          style={{
            background: 'rgba(8, 10, 14, 0.75)',
            border: `1px solid ${teamColor}55`,
            boxShadow: teamShadow,
            minWidth: '260px',
            maxWidth: '420px',
          }}
        >
          <div
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: teamColor }}
          >
            {playerName ? `${playerName} • TEAM ${team}` : `TEAM ${team}`}
          </div>
          <div
            className="mt-2 text-2xl font-bold break-words"
            style={{
              fontFamily: 'var(--font-display)',
              color: '#F6F2EA',
              textShadow: '0 6px 16px rgba(6, 8, 12, 0.45)',
            }}
          >
            {answer}
          </div>
          <div
            className="mt-3 text-sm font-semibold"
            style={{ color: isCorrect ? colors.neon.green : '#EF4444' }}
          >
            {isCorrect ? '✅ Valide' : '❌ Invalide'}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
