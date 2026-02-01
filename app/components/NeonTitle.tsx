'use client';

// ============================================
// NEON TITLE - Fighting Game Style Logo
// Street Fighter inspired title with neon glow
// ============================================

import { motion } from 'framer-motion';

interface NeonTitleProps {
  size?: 'small' | 'medium' | 'large' | 'xl';
  animated?: boolean;
  variant?: 'gradient' | 'cyan' | 'magenta' | 'yellow';
  className?: string;
}

export function NeonTitle({
  size = 'large',
  animated = true,
  variant = 'gradient',
  className = '',
}: NeonTitleProps) {

  const sizeClasses = {
    small: 'text-2xl',
    medium: 'text-3xl md:text-4xl',
    large: 'text-4xl md:text-6xl',
    xl: 'text-5xl md:text-7xl lg:text-8xl',
  };

  return (
    <motion.h1
      className={`font-black uppercase tracking-[0.1em] ${sizeClasses[size]} ${className}`}
      style={{
        fontFamily: 'var(--font-display)',
        letterSpacing: '0.08em',
      }}
      initial={animated ? { opacity: 0, scale: 0.8 } : {}}
      animate={animated ? {
        opacity: 1,
        scale: 1,
      } : {}}
      transition={{
        duration: 0.5,
        ease: 'easeOut',
      }}
    >
      <motion.span
        animate={animated ? {
          y: [0, -2, 0],
        } : {}}
        transition={{
          duration: 2.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: '0.3em',
        }}
      >
        <span
          style={{
            color: 'var(--rj-rap)',
            textShadow: '0 6px 14px rgba(6, 8, 12, 0.35)',
          }}
        >
          RAP
        </span>
        <span
          style={{
            color: 'var(--rj-secondary)',
            textShadow: '0 6px 14px rgba(6, 8, 12, 0.35)',
          }}
        >
          JEU
        </span>
      </motion.span>
    </motion.h1>
  );
}

// ============================================
// VS LOGO - Fighting Game Match Intro
// ============================================

interface VSLogoProps {
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

export function VSLogo({ size = 'large', animated = true }: VSLogoProps) {
  const sizeClasses = {
    small: 'text-4xl',
    medium: 'text-6xl',
    large: 'text-8xl',
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} font-bold relative`}
      style={{
        fontFamily: 'var(--font-display)',
      }}
      initial={animated ? { scale: 0, rotate: -180 } : {}}
      animate={animated ? {
        scale: [0, 1.2, 1],
        rotate: [-180, 10, 0],
      } : {}}
      transition={{
        duration: 0.6,
        ease: 'easeOut',
      }}
    >
      {/* Cyan shadow */}
      <motion.span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          color: 'var(--rj-secondary)',
          textShadow: '2px 2px 0 rgba(6, 8, 12, 0.6)',
          opacity: 0.7,
        }}
      >
        VS
      </motion.span>

      {/* Magenta shadow */}
      <motion.span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          color: 'var(--rj-primary)',
          textShadow: '2px 2px 0 rgba(6, 8, 12, 0.6)',
          opacity: 0.7,
        }}
      >
        VS
      </motion.span>

      {/* Main text */}
      <span
        className="relative z-10"
        style={{
          color: '#FFFFFF',
          textShadow: '0 6px 18px rgba(6, 8, 12, 0.5)',
        }}
      >
        VS
      </span>
    </motion.div>
  );
}

// ============================================
// ROUND ANNOUNCE - Fighting Game Round Start
// ============================================

interface RoundAnnounceProps {
  round: number;
  totalRounds: number;
  onComplete?: () => void;
}

export function RoundAnnounce({ round, totalRounds, onComplete }: RoundAnnounceProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onAnimationComplete={onComplete}
    >
      <div className="text-center">
        {/* ROUND text */}
        <motion.div
          className="text-4xl md:text-6xl font-bold mb-4"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--rj-secondary)',
            textShadow: '0 6px 16px rgba(6, 8, 12, 0.35)',
          }}
          initial={{ x: -200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          ROUND
        </motion.div>

        {/* Number */}
        <motion.div
          className="text-9xl md:text-[12rem] font-bold"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'linear-gradient(135deg, var(--rj-primary) 0%, var(--rj-secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 10px 18px rgba(6, 8, 12, 0.4))',
          }}
          initial={{ scale: 0, rotate: -45 }}
          animate={{
            scale: [0, 1.3, 1],
            rotate: [-45, 10, 0],
          }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        >
          {round}
        </motion.div>

        {/* Sub text */}
        <motion.div
          className="text-xl md:text-2xl text-gray-400 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          / {totalRounds} rounds
        </motion.div>

        {/* FIGHT! */}
        <motion.div
          className="text-6xl md:text-8xl font-bold mt-8"
          style={{
            fontFamily: 'var(--font-display)',
            color: '#FFFFFF',
            textShadow: '0 10px 24px rgba(6, 8, 12, 0.45)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.5, 1.2],
            opacity: [0, 1, 1],
          }}
          transition={{ duration: 0.4, delay: 1, ease: 'easeOut' }}
        >
          FIGHT!
        </motion.div>
      </div>
    </motion.div>
  );
}
