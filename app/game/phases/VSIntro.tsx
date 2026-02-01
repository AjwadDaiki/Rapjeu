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

  const labelA = teamNames?.A || 'ÉQUIPE A';
  const labelB = teamNames?.B || 'ÉQUIPE B';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-red-900/20" />
      
      {/* Team A */}
      <motion.div 
        className="absolute left-0 top-1/2 -translate-y-1/2 w-1/3"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center">
          <h2 className="rj-team-title rj-team-title-xl text-blue-200 mb-4">{labelA}</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {teamAPlayers.map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="px-4 py-2 bg-blue-600/80 rounded-lg text-white font-bold"
              >
                {player.name}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* VS */}
      <motion.div
        className="z-10"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: "spring",
          stiffness: 200,
          damping: 10,
          delay: 0.5 
        }}
      >
        <span className="text-9xl font-black bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 bg-clip-text text-transparent">
          VS
        </span>
      </motion.div>

      {/* Team B */}
      <motion.div 
        className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center">
          <h2 className="rj-team-title rj-team-title-xl text-amber-200 mb-4">{labelB}</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {teamBPlayers.map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="px-4 py-2 bg-red-600/80 rounded-lg text-white font-bold"
              >
                {player.name}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* VS bars animation */}
      <motion.div
        className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div className="w-32 h-2 bg-blue-500 rounded-full" />
        <div className="w-32 h-2 bg-red-500 rounded-full" />
      </motion.div>
    </div>
  );
}
