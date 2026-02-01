'use client';

import { motion } from 'framer-motion';

interface RoundResultProps {
  results: {
    winner: 'A' | 'B' | null;
    damage: number;
    [key: string]: any;
  };
  teamHP: { A: number; B: number };
  combos: { A: number; B: number };
}

export function RoundResult({ results, teamHP, combos }: RoundResultProps) {
  return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--rj-bg)' }}>
      <div className="text-center max-w-4xl w-full px-8">
        {/* Winner */}
        {results.winner ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <h1
              className="rj-team-title rj-team-title-xl text-8xl mb-8"
              style={{ color: results.winner === 'A' ? 'var(--rj-primary)' : 'var(--rj-secondary)' }}
            >
              TEAM {results.winner} GAGNE!
            </h1>
            <div className="text-4xl mb-8" style={{ color: 'var(--rj-text)' }}>
              -{results.damage} HP
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h1 className="text-6xl font-bold mb-8" style={{ color: 'var(--rj-text-muted)' }}>
              ÉGALITÉ
            </h1>
          </motion.div>
        )}

        {/* HP Bars */}
        <div className="grid grid-cols-2 gap-8 mt-12">
          {/* Team A */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="rj-team-title rj-team-title-lg mb-4" style={{ color: 'var(--rj-primary)' }}>
              TEAM A
            </div>
            <div className="h-12 rounded-full overflow-hidden" style={{ background: 'var(--rj-bg-elevated)' }}>
              <motion.div
                className="h-full"
                style={{ background: 'linear-gradient(90deg, var(--rj-primary), var(--rj-primary-hover))' }}
                initial={{ width: '100%' }}
                animate={{ width: `${teamHP.A}%` }}
                transition={{ duration: 0.5, delay: 0.5 }}
              />
            </div>
            <div className="text-3xl font-mono font-bold mt-2" style={{ color: 'var(--rj-text)' }}>
              {teamHP.A} HP {combos.A > 0 && `🔥 x${combos.A}`}
            </div>
          </motion.div>

          {/* Team B */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="rj-team-title rj-team-title-lg mb-4" style={{ color: 'var(--rj-secondary)' }}>
              TEAM B
            </div>
            <div className="h-12 rounded-full overflow-hidden" style={{ background: 'var(--rj-bg-elevated)' }}>
              <motion.div
                className="h-full"
                style={{ background: 'linear-gradient(90deg, var(--rj-secondary), var(--rj-secondary-hover))' }}
                initial={{ width: '100%' }}
                animate={{ width: `${teamHP.B}%` }}
                transition={{ duration: 0.5, delay: 0.5 }}
              />
            </div>
            <div className="text-3xl font-mono font-bold mt-2" style={{ color: 'var(--rj-text)' }}>
              {teamHP.B} HP {combos.B > 0 && `🔥 x${combos.B}`}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
