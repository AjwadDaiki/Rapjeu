'use client';

import { motion } from 'framer-motion';

interface Player {
  id: string;
  name: string;
  team: 'A' | 'B';
}

interface VsScreenProps {
  teamA: Player[];
  teamB: Player[];
}

export function VsScreen({ teamA, teamB }: VsScreenProps) {
  return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--rj-bg)' }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-16"
      >
        {/* Team A */}
        <motion.div
          initial={{ x: -100 }}
          animate={{ x: 0 }}
          className="text-center"
        >
          <div className="rj-team-title rj-team-title-xl mb-4" style={{ color: 'var(--rj-primary)' }}>
            TEAM A
          </div>
          <div className="space-y-2">
            {teamA.map(player => (
              <div key={player.id} className="text-2xl" style={{ color: 'var(--rj-text)' }}>
                {player.name}
              </div>
            ))}
          </div>
        </motion.div>

        {/* VS */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-9xl font-black"
          style={{ color: 'var(--rj-text-muted)' }}
        >
          VS
        </motion.div>

        {/* Team B */}
        <motion.div
          initial={{ x: 100 }}
          animate={{ x: 0 }}
          className="text-center"
        >
          <div className="rj-team-title rj-team-title-xl mb-4" style={{ color: 'var(--rj-secondary)' }}>
            TEAM B
          </div>
          <div className="space-y-2">
            {teamB.map(player => (
              <div key={player.id} className="text-2xl" style={{ color: 'var(--rj-text)' }}>
                {player.name}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
