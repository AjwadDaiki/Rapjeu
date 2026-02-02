'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface GameOverProps {
  winner: 'A' | 'B';
  finalHP: { A: number; B: number };
  stats?: any;
}

export function GameOver({ winner, finalHP, stats }: GameOverProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--rj-bg)' }}>
      <div className="text-center max-w-4xl w-full px-8">
        {/* Confetti effect */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 1 }}
          className="mb-8"
        >
          <div className="text-9xl">🎉</div>
        </motion.div>

        {/* Winner */}
        <motion.h1
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rj-team-title rj-team-title-xl text-8xl mb-4"
          style={{ color: winner === 'A' ? 'var(--rj-primary)' : 'var(--rj-secondary)' }}
        >
          TEAM {winner}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-5xl font-bold mb-12"
          style={{ color: 'var(--rj-text)' }}
        >
          VICTOIRE!
        </motion.p>

        {/* Final HP */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-2 gap-8 mb-12"
        >
          <div>
            <div className="rj-team-title rj-team-title-lg mb-2" style={{ color: 'var(--rj-text-muted)' }}>TEAM A</div>
            <div className="text-5xl font-bold" style={{ color: 'var(--rj-primary)' }}>
              {finalHP.A} HP
            </div>
          </div>
          <div>
            <div className="rj-team-title rj-team-title-lg mb-2" style={{ color: 'var(--rj-text-muted)' }}>TEAM B</div>
            <div className="text-5xl font-bold" style={{ color: 'var(--rj-secondary)' }}>
              {finalHP.B} HP
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex gap-4 justify-center"
        >
          <button
            onClick={() => router.push('/')}
            className="rj-btn rj-btn-lg"
            style={{ padding: '16px 32px' }}
          >
            🏠 Retour à l'accueil
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rj-btn rj-btn-ghost rj-btn-lg"
            style={{ padding: '16px 32px' }}
          >
            🔄 Nouvelle partie
          </button>
        </motion.div>
      </div>
    </div>
  );
}
