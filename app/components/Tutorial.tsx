'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialStep {
  title: string;
  description: string;
  position: 'top' | 'center' | 'bottom';
  highlight?: string; // Selector CSS à highlight
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: '🎮 Bienvenue dans RapJeu!',
    description: 'Un jeu de quiz rap en mode Fighting Game. 2 équipes s\'affrontent!',
    position: 'center',
  },
  {
    title: '❤️ Les barres de vie (HP)',
    description: 'Chaque équipe commence avec 100 HP. Réponds correctement pour infliger des dégâts!',
    position: 'top',
    highlight: '.hp-bar',
  },
  {
    title: '⏱️ Sois rapide!',
    description: 'Tu as 10-15 secondes par question. Plus tu réponds vite, mieux c\'est!',
    position: 'top',
    highlight: '.timer',
  },
  {
    title: '🔥 Les Combos!',
    description: 'Enchaîne les bonnes réponses pour multiplier les dégâts (×1.5, ×2)!',
    position: 'center',
  },
  {
    title: '🏆 Premier à 0 HP perd!',
    description: 'Prêt à te battre? C\'est parti! 💪',
    position: 'center',
  },
];

export default function Tutorial({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Check si l'utilisateur a déjà vu le tutorial
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (hasSeenTutorial === 'true') {
      setIsVisible(false);
      onComplete();
    }
  }, [onComplete]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Fin du tutorial
      localStorage.setItem('hasSeenTutorial', 'true');
      setIsVisible(false);
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenTutorial', 'true');
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible) return null;

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={handleNext}
      >
        {/* Overlay */}
        <div className="absolute inset-0" />

        {/* Tutorial Card */}
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`relative z-10 max-w-md mx-4 p-8 rounded-2xl bg-gradient-to-br from-purple-900 to-pink-900 border-4 border-yellow-400 shadow-2xl ${
            step.position === 'top' ? 'mt-auto mb-96' :
            step.position === 'bottom' ? 'mb-auto mt-96' :
            ''
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress dots */}
          <div className="flex gap-2 justify-center mb-6">
            {TUTORIAL_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-yellow-400'
                    : index < currentStep
                    ? 'w-2 bg-green-400'
                    : 'w-2 bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <h2 className="text-3xl font-bold text-yellow-400 mb-4 text-center">
            {step.title}
          </h2>
          <p className="text-white text-lg text-center mb-8 leading-relaxed">
            {step.description}
          </p>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSkip}
              className="flex-1 px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors"
            >
              Passer
            </button>
            <button
              onClick={handleNext}
              className="flex-1 px-6 py-3 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold transition-colors shadow-lg"
            >
              {currentStep < TUTORIAL_STEPS.length - 1 ? 'Suivant →' : 'C\'est parti! 🔥'}
            </button>
          </div>

          {/* Step counter */}
          <p className="text-center text-gray-400 text-sm mt-4">
            {currentStep + 1} / {TUTORIAL_STEPS.length}
          </p>
        </motion.div>

        {/* Highlight zone (si spécifié) */}
        {step.highlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute pointer-events-none"
            style={{
              border: '4px solid #FBBF24',
              boxShadow: '0 0 40px rgba(251, 191, 36, 0.8)',
              borderRadius: '12px',
            }}
          >
            {/* Pulse animation */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 border-4 border-yellow-400 rounded-xl"
            />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
