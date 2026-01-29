'use client';

// ============================================
// SCREEN SHAKE - Effet de vibration d'impact
// ============================================

import { motion } from 'framer-motion';
import { useGameContext } from '../hooks/useGameContext';

interface ScreenShakeProps {
  children: React.ReactNode;
}

export function ScreenShake({ children }: ScreenShakeProps) {
  const { isShaking, shakeIntensity } = useGameContext();

  const shakeVariants = {
    idle: { x: 0, y: 0 },
    shake: {
      x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0],
      y: [0, 5, -5, 5, -5, 2, -2, 1, -1, 0],
      transition: {
        duration: 0.5,
        ease: 'easeInOut' as const,
      },
    },
  };

  // Intensité modulée
  const intensityMultiplier = shakeIntensity || 0.5;
  const modifiedShake = {
    shake: {
      x: shakeVariants.shake.x.map(v => v * intensityMultiplier),
      y: shakeVariants.shake.y.map(v => v * intensityMultiplier),
      transition: shakeVariants.shake.transition,
    },
  };

  return (
    <motion.div
      className="w-full h-full"
      variants={modifiedShake}
      animate={isShaking ? 'shake' : 'idle'}
      style={{ transformOrigin: 'center center' }}
    >
      {children}
    </motion.div>
  );
}
