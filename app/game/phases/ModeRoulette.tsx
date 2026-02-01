'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameMode } from '../../types';
import { GAME_MODE_NAMES, GAME_MODE_DESCRIPTIONS } from '../../lib/constants';

interface ModeRouletteProps {
  availableModes: GameMode[];
  selectedMode: GameMode;
  duration: number;
  onComplete: () => void;
}

const MODE_ICONS: Record<GameMode, string> = {
  roland_gamos: '🔗',
  le_theme: '🎯',
  mytho_pas_mytho: '🤔',
  encheres: '💰',
  blind_test: '🎵',
  pixel_cover: '🖼️',
  devine_qui: '🕵️',
  continue_paroles: '📝',
};

const MODE_COLORS: Record<GameMode, string> = {
  roland_gamos: 'from-purple-600 to-pink-600',
  le_theme: 'from-blue-600 to-cyan-600',
  mytho_pas_mytho: 'from-yellow-600 to-orange-600',
  encheres: 'from-green-600 to-emerald-600',
  blind_test: 'from-red-600 to-rose-600',
  pixel_cover: 'from-indigo-600 to-violet-600',
  devine_qui: 'from-orange-600 to-amber-600',
  continue_paroles: 'from-emerald-600 to-teal-600',
};

export function ModeRoulette({ availableModes, selectedMode, duration, onComplete }: ModeRouletteProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    // Spin animation
    const spinInterval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % availableModes.length);
    }, 100);

    // Slow down and stop
    const slowDownTimeout = setTimeout(() => {
      clearInterval(spinInterval);
      
      // Find selected mode index
      const selectedIndex = availableModes.indexOf(selectedMode);
      let current = currentIndex;
      
      const finalInterval = setInterval(() => {
        current = (current + 1) % availableModes.length;
        setCurrentIndex(current);
        
        if (current === selectedIndex) {
          clearInterval(finalInterval);
          setIsSpinning(false);
          setShowResult(true);
          
          setTimeout(onComplete, 2000);
        }
      }, 200);

      return () => clearInterval(finalInterval);
    }, duration - 1000);

    return () => {
      clearInterval(spinInterval);
      clearTimeout(slowDownTimeout);
    };
  }, [availableModes, selectedMode, duration, onComplete]);

  const currentMode = availableModes[currentIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <AnimatePresence mode="wait">
        {!showResult ? (
          <motion.div
            key="roulette"
            className="text-center"
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <h2 className="text-2xl text-gray-400 mb-8">Sélection du mode...</h2>
            
            <motion.div
              className={`w-64 h-64 rounded-2xl bg-gradient-to-br ${MODE_COLORS[currentMode]} 
                         flex flex-col items-center justify-center text-white shadow-2xl`}
              animate={{ 
                scale: isSpinning ? [1, 1.05, 1] : 1,
                rotate: isSpinning ? [0, 5, -5, 0] : 0 
              }}
              transition={{ duration: 0.1 }}
            >
              <span className="text-6xl mb-4">{MODE_ICONS[currentMode]}</span>
              <span className="text-xl font-bold px-4 text-center">
                {GAME_MODE_NAMES[currentMode]}
              </span>
            </motion.div>

            {/* Mode indicators */}
            <div className="flex justify-center gap-2 mt-8">
              {availableModes.map((mode, i) => (
                <div
                  key={mode}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentIndex ? 'bg-white' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              className={`w-80 h-80 rounded-3xl bg-gradient-to-br ${MODE_COLORS[selectedMode]} 
                         flex flex-col items-center justify-center text-white shadow-2xl`}
              animate={{ 
                boxShadow: [
                  '0 0 0 0 rgba(255,255,255,0)',
                  '0 0 50px 20px rgba(255,255,255,0.3)',
                  '0 0 0 0 rgba(255,255,255,0)'
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span className="text-8xl mb-4">{MODE_ICONS[selectedMode]}</span>
              <span className="text-3xl font-bold px-4 text-center mb-2">
                {GAME_MODE_NAMES[selectedMode]}
              </span>
              <span className="text-sm opacity-80 px-6">
                {GAME_MODE_DESCRIPTIONS[selectedMode]}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
