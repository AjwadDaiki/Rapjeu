'use client';

// ============================================
// HP BAR - Rapjeu Street Arena
// Bold, readable, no neon glow
// ============================================

import { motion } from 'framer-motion';
import { getTeamColor, getTeamGradient } from '../lib/designSystem';
import type { Team } from '../types';

interface HPBarProps {
  team: Team;
  hp: number;
  maxHp?: number;
  isActive?: boolean;
  label?: string;
  showDamageFlash?: boolean;
}

export function HPBar({
  team,
  hp,
  maxHp = 100,
  isActive = false,
  label,
  showDamageFlash = false,
}: HPBarProps) {
  const percentage = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const isLow = percentage <= 25;
  const isCritical = percentage <= 10;

  const primaryColor = getTeamColor(team, 'primary');
  const gradient = getTeamGradient(team);

  return (
    <div className="relative w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <motion.span
            className="text-sm md:text-base font-extrabold uppercase tracking-[0.32em]"
            style={{
              color: primaryColor,
              textShadow: '0 4px 10px rgba(6, 8, 12, 0.35)',
            }}
            animate={isActive ? { opacity: [1, 0.75, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {label}
          </motion.span>

          <div className="flex items-center gap-2">
            <motion.span
              className="text-2xl font-bold font-mono tabular-nums"
              style={{
                color: isCritical ? '#EF4444' : '#F6F2EA',
                textShadow: '0 4px 10px rgba(6, 8, 12, 0.35)',
              }}
              animate={isCritical ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              {Math.round(hp)}
            </motion.span>
            <span className="text-xs text-gray-400 uppercase">HP</span>
          </div>
        </div>
      )}

      <div
        className="relative h-10 rounded-xl overflow-hidden"
        style={{
          background: 'rgba(15, 17, 21, 0.75)',
          border: `2px solid ${primaryColor}`,
          boxShadow: '0 14px 28px rgba(6, 8, 12, 0.35)',
        }}
      >
        {/* Subtle diagonal texture */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(246,242,234,0.4) 0%, transparent 40%, transparent 60%, rgba(246,242,234,0.4) 100%)',
            backgroundSize: '18px 18px',
          }}
        />

        <motion.div
          className="absolute inset-0"
          style={{
            background: isCritical
              ? 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)'
              : isLow
                ? 'linear-gradient(90deg, #F2C14E 0%, #F08C3A 100%)'
                : gradient,
          }}
          initial={{ width: '100%' }}
          animate={{
            width: `${percentage}%`,
            opacity: isLow ? [1, 0.85, 1] : 1,
          }}
          transition={{
            width: { type: 'spring', stiffness: 100, damping: 20 },
            opacity: { duration: 0.6, repeat: isLow ? Infinity : 0 },
          }}
        />

        {/* Segment dividers */}
        <div className="absolute inset-0">
          {[25, 50, 75].map((mark) => (
            <div
              key={mark}
              className="absolute top-0 bottom-0 w-[2px]"
              style={{
                left: `${mark}%`,
                background: 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.45) 20%, rgba(0, 0, 0, 0.45) 80%, transparent 100%)',
              }}
            />
          ))}
        </div>

        {/* Team indicator */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-sm flex items-center justify-center font-bold text-xs"
            style={{
              background: 'rgba(246, 242, 234, 0.1)',
              border: `2px solid ${primaryColor}`,
              color: primaryColor,
            }}
          >
            {team}
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: primaryColor }}
          >
            {team === 'A' ? 'PLAYER 1' : 'PLAYER 2'}
          </span>
        </div>
      </div>

      {showDamageFlash && (
        <motion.div
          className="absolute -inset-1 rounded pointer-events-none mix-blend-screen"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, transparent 70%)',
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 0], scale: [0.8, 1.1, 1] }}
          transition={{ duration: 0.3 }}
        />
      )}
    </div>
  );
}
