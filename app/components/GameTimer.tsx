'use client';

// ============================================
// GAME TIMER - Compte à rebours avec tension
// ============================================

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useGameContext } from '../hooks/useGameContext';

interface GameTimerProps {
  duration: number; // en secondes
  isRunning: boolean;
  onTimeUp?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function GameTimer({ duration, isRunning, onTimeUp, size = 'md' }: GameTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const { setBgmTrack } = useGameContext();

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp?.();
          return 0;
        }
        
        // BGM tension quand il reste peu de temps
        if (prev === 10) {
          setBgmTrack('tension');
        }
        
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, onTimeUp, setBgmTrack]);

  const percentage = (timeLeft / duration) * 100;
  const isLow = timeLeft <= 5;
  const isCritical = timeLeft <= 3;

  // Taille
  const sizeClasses = {
    sm: 'w-16 h-16 text-2xl',
    md: 'w-24 h-24 text-4xl',
    lg: 'w-32 h-32 text-5xl',
  };

  // Couleur basée sur le temps restant
  const getColor = () => {
    if (isCritical) return '#EF4444'; // Red
    if (isLow) return '#F97316'; // Orange
    return '#3B82F6'; // Blue
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      {/* Cercle de fond */}
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          fill="none"
          stroke="#374151"
          strokeWidth="8"
        />
        <motion.circle
          cx="50%"
          cy="50%"
          r="45%"
          fill="none"
          stroke={getColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{
            filter: isLow ? 'drop-shadow(0 0 8px currentColor)' : undefined,
          }}
        />
      </svg>

      {/* Texte du timer */}
      <motion.span
        className={`relative font-mono font-bold ${
          isCritical ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-white'
        }`}
        animate={isLow ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        {timeLeft}
      </motion.span>

      {/* Effet pulse sur low time */}
      {isLow && (
        <motion.div
          className="absolute inset-0 rounded-full border-4"
          style={{ borderColor: getColor() }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </div>
  );
}
