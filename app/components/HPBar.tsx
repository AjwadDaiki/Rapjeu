'use client';

// ============================================
// HP BAR - Barre de vie style Versus Fighting
// ============================================

import { motion } from 'framer-motion';
import { getTeamColor } from '../lib/utils';
import type { Team } from '../types';

interface HPBarProps {
  team: Team;
  hp: number;
  maxHp?: number;
  isActive?: boolean;
  label?: string;
}

export function HPBar({ team, hp, maxHp = 100, isActive = false, label }: HPBarProps) {
  const percentage = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const isLow = percentage <= 25;
  const isCritical = percentage <= 10;

  // Couleurs dynamiques
  const primaryColor = getTeamColor(team);
  const bgColor = team === 'A' ? 'bg-cyan-950/40' : 'bg-amber-950/40';
  
  return (
    <div className="relative w-full">
      {/* Label */}
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className={`text-sm font-display font-bold uppercase tracking-wider ${
            team === 'A' ? 'text-blue-400' : 'text-yellow-400'
          }`}>
            {label}
          </span>
          <span className={`text-lg font-mono font-bold ${
            isCritical ? 'text-red-500 animate-pulse' : 'text-white'
          }`}>
            {Math.round(hp)} HP
          </span>
        </div>
      )}

      {/* Container */}
      <div className={`relative h-9 ${bgColor} rounded-xl overflow-hidden border ${
        isActive ? 'border-white/70 shadow-lg shadow-white/20' : 'border-white/10'
      } hud-panel`}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-[linear-gradient(90deg,transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:20px_100%]" />
        </div>

        {/* HP Fill */}
        <motion.div
          className={`absolute inset-y-0 left-0 ${
            isCritical 
              ? 'bg-red-600' 
              : isLow 
                ? 'bg-orange-500' 
                : ''
          }`}
          style={{ backgroundColor: isCritical || isLow ? undefined : primaryColor }}
          initial={{ width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ 
            type: 'spring', 
            stiffness: 100, 
            damping: 15,
            duration: 0.5 
          }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
          
          {/* Pulse effect on low HP */}
          {isLow && (
            <motion.div
              className="absolute inset-0 bg-white"
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
        </motion.div>

        {/* Segments markers */}
        <div className="absolute inset-0 flex">
          {[25, 50, 75].map((mark) => (
            <div
              key={mark}
              className="absolute top-0 bottom-0 w-0.5 bg-black/30"
              style={{ left: `${mark}%` }}
            />
          ))}
        </div>

        {/* Team indicator */}
        <div className={`absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest ${
          team === 'A' ? 'text-cyan-200' : 'text-amber-200'
        }`}>
          {team === 'A' ? '◄ TEAM A' : 'TEAM B ►'}
        </div>
      </div>

      {/* Damage flash overlay */}
      <motion.div
        className="absolute inset-0 bg-red-500 rounded-lg pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0 }}
        whileInView={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}
