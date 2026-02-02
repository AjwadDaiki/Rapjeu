'use client';

// ============================================
// FIGHTING ANIMATIONS
// Street Fighter inspired animations
// Combo counters, damage flashes, K.O., etc.
// ============================================

import { motion, AnimatePresence } from 'framer-motion';
import { colors, shadows } from '../lib/designSystem';

// ============================================
// COMBO COUNTER
// ============================================

interface ComboCounterProps {
  count: number;
  team: 'A' | 'B';
}

export function ComboCounter({ count, team }: ComboCounterProps) {
  if (count < 2) return null;

  const teamColor = team === 'A' ? colors.neon.cyan : colors.neon.magenta;
  const teamShadow = team === 'A' ? shadows.neonCyan : shadows.neonMagenta;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
        initial={{ scale: 0, rotate: -45, opacity: 0 }}
        animate={{
          scale: [0, 1.5, 1],
          rotate: [-45, 10, 0],
          opacity: [0, 1, 1],
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* COMBO text */}
        <div
          className="text-6xl md:text-8xl font-bold uppercase mb-2"
          style={{
            fontFamily: 'var(--font-display)',
            color: teamColor,
            textShadow: teamShadow,
          }}
        >
          COMBO
        </div>

        {/* Count with rotating animation */}
        <motion.div
          className="text-9xl md:text-[12rem] font-bold text-center"
          style={{
            fontFamily: 'var(--font-display)',
            background: `linear-gradient(135deg, ${teamColor} 0%, ${colors.neon.yellow} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: `drop-shadow(0 10px 20px ${teamColor}) drop-shadow(0 16px 30px ${colors.neon.yellow})`,
          }}
          animate={{
            rotate: [0, -5, 5, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
          }}
        >
          {count}
        </motion.div>

        {/* HIT text */}
        <motion.div
          className="text-3xl md:text-5xl font-bold text-center uppercase"
          style={{
            fontFamily: 'var(--font-display)',
            color: colors.neon.yellow,
            textShadow: shadows.neonYellow,
          }}
          animate={{
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
          }}
        >
          HITS!
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================
// DAMAGE FLASH
// ============================================

interface DamageFlashProps {
  damage: number;
  team: 'A' | 'B';
  position?: 'left' | 'right';
}

export function DamageFlash({ damage, team, position = 'left' }: DamageFlashProps) {
  const positionClass = position === 'left' ? 'left-1/4' : 'right-1/4';

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed top-1/2 ${positionClass} transform -translate-y-1/2 z-40 pointer-events-none`}
        initial={{ scale: 0, opacity: 0, y: -50 }}
        animate={{
          scale: [0, 1.3, 1],
          opacity: [0, 1, 0.8, 0],
          y: [-50, -80, -100],
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        {/* Damage number */}
        <div
          className="text-8xl md:text-9xl font-bold"
          style={{
            fontFamily: 'var(--font-display)',
            color: '#FF0000',
            textShadow: shadows.damageCritical,
            WebkitTextStroke: '3px #FFFFFF',
          }}
        >
          -{damage}
        </div>

        {/* Impact effect */}
        <motion.div
          className="absolute inset-0 -z-10"
          initial={{ scale: 0.5, opacity: 0.8 }}
          animate={{
            scale: [0.5, 2],
            opacity: [0.8, 0],
          }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="w-full h-full rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255, 0, 0, 0.8) 0%, transparent 70%)',
              filter: 'blur(8px)',
            }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================
// K.O. ANIMATION
// ============================================

interface KOAnimationProps {
  winner: 'A' | 'B';
  onComplete?: () => void;
}

export function KOAnimation({ winner, onComplete }: KOAnimationProps) {
  const winnerColor = winner === 'A' ? colors.neon.cyan : colors.neon.magenta;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {/* K.O. text */}
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -180 }}
        animate={{
          scale: [0, 1.5, 1.2, 1],
          rotate: [-180, 20, -10, 0],
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div
          className="text-[15rem] md:text-[20rem] font-bold"
          style={{
            fontFamily: 'var(--font-display)',
            color: '#FFFFFF',
            textShadow: `
              0 12px 24px #FF0000,
              0 20px 36px #FF0000,
              0 24px 40px #FF0000,
              5px 5px 0px rgba(0, 0, 0, 0.8)
            `,
            WebkitTextStroke: '5px #FF0000',
          }}
        >
          K.O.
        </div>

        {/* Lightning bolts */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-32 bg-yellow-400"
            style={{
              top: '50%',
              left: '50%',
              transformOrigin: 'center',
              rotate: `${i * 45}deg`,
              boxShadow: shadows.neonYellow,
            }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{
              scaleY: [0, 1.5, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.6,
              delay: 0.3 + i * 0.05,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Shockwave */}
        <motion.div
          className="absolute inset-0 rounded-full border-8 border-red-500"
          style={{
            boxShadow: '0 16px 30px rgba(255, 0, 0, 0.8)',
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 4],
            opacity: [1, 0],
          }}
          transition={{ duration: 1, delay: 0.2 }}
        />
      </motion.div>

      {/* Winner announcement */}
      <motion.div
        className="absolute bottom-32 text-center"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <div
          className="text-6xl md:text-8xl font-bold mb-4"
          style={{
            fontFamily: 'var(--font-display)',
            color: winnerColor,
            textShadow: winner === 'A' ? shadows.neonCyan : shadows.neonMagenta,
          }}
        >
          TEAM {winner}
        </div>
        <div
          className="text-4xl md:text-5xl font-bold uppercase"
          style={{
            fontFamily: 'var(--font-display)',
            color: colors.neon.yellow,
            textShadow: shadows.neonYellow,
          }}
        >
          WINS!
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// PERFECT ANSWER
// ============================================

export function PerfectAnswer() {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-1/4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
        initial={{ scale: 0, rotate: -45, opacity: 0 }}
        animate={{
          scale: [0, 1.3, 1],
          rotate: [-45, 10, 0],
          opacity: [0, 1, 1, 0],
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      >
        <div
          className="text-7xl md:text-9xl font-bold uppercase"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 10px 20px rgba(255, 215, 0, 0.8)) drop-shadow(0 16px 30px rgba(255, 165, 0, 0.6))',
          }}
        >
          PERFECT!
        </div>

        {/* Stars */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-6xl"
            style={{
              left: `${20 + i * 15}%`,
              top: '-50%',
            }}
            initial={{ y: 0, opacity: 0, rotate: 0 }}
            animate={{
              y: [-50, -100],
              opacity: [0, 1, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: 1,
              delay: i * 0.1,
              ease: 'easeOut',
            }}
          >
            ⭐
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================
// TIME RUNNING OUT
// ============================================

interface TimeWarningProps {
  show: boolean;
}

export function TimeWarning({ show }: TimeWarningProps) {
  if (!show) return null;

  return (
    <motion.div
      className="fixed inset-0 z-30 pointer-events-none"
      animate={{
        backgroundColor: ['rgba(255, 0, 0, 0)', 'rgba(255, 0, 0, 0.2)', 'rgba(255, 0, 0, 0)'],
      }}
      transition={{
        duration: 0.5,
        repeat: Infinity,
      }}
    >
      {/* Vignette pulse */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(255, 0, 0, 0.3) 100%)',
        }}
      />

      {/* Corner indicators */}
      {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
        <motion.div
          key={i}
          className={`absolute ${pos} w-32 h-32`}
          animate={{
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.1,
          }}
        >
          <div
            className="w-full h-full"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 0, 0, 0.6) 0%, transparent 100%)',
              boxShadow: '0 12px 24px rgba(255, 0, 0, 0.6)',
            }}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ============================================
// ANSWER FEEDBACK
// ============================================

interface AnswerFeedbackProps {
  type: 'correct' | 'incorrect' | 'duplicate' | 'invalid';
  message?: string;
}

export function AnswerFeedback({ type, message }: AnswerFeedbackProps) {
  const config = {
    correct: {
      color: colors.neon.green,
      shadow: shadows.neonGreen,
      text: '✓ CORRECT',
      emoji: '✨',
    },
    incorrect: {
      color: '#FF0000',
      shadow: shadows.damageCritical,
      text: '✗ INCORRECT',
      emoji: '💥',
    },
    duplicate: {
      color: '#FFA500',
      shadow: shadows.damageNormal,
      text: '⚠ DUPLICATE',
      emoji: '⚠️',
    },
    invalid: {
      color: '#FF6B6B',
      shadow: shadows.damageNormal,
      text: '✗ INVALID',
      emoji: '🚫',
    },
  }[type];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-center"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div
          className="text-7xl md:text-9xl font-bold uppercase mb-4"
          style={{
            fontFamily: 'var(--font-display)',
            color: config.color,
            textShadow: config.shadow,
          }}
        >
          {config.text}
        </div>
        {message && (
          <div className="text-2xl md:text-3xl text-white">
            {message}
          </div>
        )}
        <div className="text-8xl mt-4">
          {config.emoji}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
