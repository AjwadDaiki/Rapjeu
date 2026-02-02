'use client';

import { motion } from 'framer-motion';
import { Player } from '../../types';
import { useEffect } from 'react';

interface VSIntroProps {
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  teamNames?: { A: string; B: string };
  onComplete: () => void;
}

export function VSIntro({ teamAPlayers, teamBPlayers, teamNames, onComplete }: VSIntroProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const labelA = teamNames?.A || '\u00c9QUIPE A';
  const labelB = teamNames?.B || '\u00c9QUIPE B';

  return (
    <div className="flex items-center justify-center min-h-[60vh] relative overflow-hidden">
      {/* Team A */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wider text-blue-400 mb-4">{labelA}</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {teamAPlayers.map((player, i) => (
            <motion.div
              key={player.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="px-4 py-2 rounded-xl text-white font-bold text-sm"
              style={{ background: 'rgba(59, 130, 246, 0.25)', border: '1px solid rgba(59, 130, 246, 0.4)' }}
            >
              {player.name}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* VS */}
      <motion.div
        className="z-10 mx-6"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 10,
          delay: 0.5
        }}
      >
        <span
          className="text-8xl md:text-9xl font-black"
          style={{
            color: '#FFFFFF',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          }}
        >
          VS
        </span>
      </motion.div>

      {/* Team B */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wider text-amber-400 mb-4">{labelB}</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {teamBPlayers.map((player, i) => (
            <motion.div
              key={player.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="px-4 py-2 rounded-xl text-white font-bold text-sm"
              style={{ background: 'rgba(251, 191, 36, 0.2)', border: '1px solid rgba(251, 191, 36, 0.4)' }}
            >
              {player.name}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
