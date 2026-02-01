'use client';

import { motion } from 'framer-motion';
import { GAME_MODE_NAMES, MODE_ICONS, GameMode } from '../../lib/constants';

interface ModeRouletteProps {
  selectedMode: GameMode;
  modesQueue: GameMode[];
  currentIndex: number;
}

export function ModeRoulette({ selectedMode, modesQueue, currentIndex }: ModeRouletteProps) {
  return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--rj-bg)' }}>
      <div className="text-center">
        {/* Icon qui tourne */}
        <motion.div
          animate={{ rotate: 360 * 3 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="text-9xl mb-8"
        >
          {MODE_ICONS[selectedMode]}
        </motion.div>

        {/* Nom du mode */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="text-6xl font-bold"
          style={{ color: 'var(--rj-primary)' }}
        >
          {GAME_MODE_NAMES[selectedMode]}
        </motion.h1>

        {/* Progression */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-2xl mt-4"
          style={{ color: 'var(--rj-text-muted)' }}
        >
          Mode {currentIndex + 1}/{modesQueue.length}
        </motion.p>
      </div>
    </div>
  );
}
