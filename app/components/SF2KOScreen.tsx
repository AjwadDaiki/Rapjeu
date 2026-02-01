'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';

interface SF2KOScreenProps {
  winner: 'A' | 'B';
  winnerName: string;
  loserName: string;
  isPerfect?: boolean;
  duration?: number;
  onComplete?: () => void;
}

export function SF2KOScreen({
  winner,
  winnerName,
  loserName,
  isPerfect = false,
  duration = 5000,
  onComplete,
}: SF2KOScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  const winnerColor = winner === 'A' ? '#00D4FF' : '#FFD700';
  const loserColor = winner === 'A' ? '#FFD700' : '#00D4FF';

  return (
    <div
      className={winner === 'A' ? 'sf2-victory-screen' : 'sf2-victory-screen'}
      style={{
        position: 'fixed',
        inset: 0,
        background: `radial-gradient(circle, rgba(${winner === 'A' ? '0, 212, 255' : '255, 215, 0'}, 0.2) 0%, rgba(0, 0, 0, 0.95) 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        overflow: 'hidden',
      }}
    >
      {/* Animated background effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 80px)',
          animation: 'rotate-bg 20s linear infinite',
        }}
      />

      {/* Fireworks effect */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 2, 3],
            opacity: [1, 0.5, 0],
            x: Math.cos((i * 360) / 12 * Math.PI / 180) * 300,
            y: Math.sin((i * 360) / 12 * Math.PI / 180) * 300,
          }}
          transition={{
            duration: 2,
            delay: 1 + (i * 0.1),
            repeat: Infinity,
            repeatDelay: 2,
          }}
          style={{
            position: 'absolute',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: winnerColor,
            boxShadow: `0 0 20px ${winnerColor}`,
          }}
        />
      ))}

      {/* K.O. Text */}
      <motion.div
        initial={{ scale: 0, rotate: -180, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
        style={{
          position: 'relative',
          marginBottom: '80px',
        }}
      >
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, -2, 2, 0],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '180px',
            color: '#FF0000',
            textShadow: '12px 12px 0px #000, 0 0 80px #FF0000, 0 0 40px #FFD700',
            letterSpacing: '20px',
            WebkitTextStroke: '6px #000',
          }}
        >
          K.O.
        </motion.div>

        {/* Impact lines radiating */}
        {[...Array(16)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 1, delay: 0.3 + (i * 0.02) }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '300px',
              height: '8px',
              background: '#FF0000',
              transformOrigin: 'left center',
              transform: `rotate(${i * 22.5}deg)`,
              boxShadow: '0 0 20px #FF0000',
            }}
          />
        ))}
      </motion.div>

      {/* Perfect text (if applicable) */}
      {isPerfect && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, type: 'spring', stiffness: 200 }}
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '72px',
            color: '#FFD700',
            textShadow: '8px 8px 0px #000, 0 0 60px #FFD700',
            letterSpacing: '10px',
            WebkitTextStroke: '3px #000',
            marginBottom: '60px',
          }}
        >
          PERFECT!
        </motion.div>
      )}

      {/* Winner announcement */}
      <motion.div
        initial={{ x: -500, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 100, damping: 15 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '40px',
          marginBottom: '40px',
        }}
      >
        {/* Winner character box */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            width: '200px',
            height: '280px',
            background: `linear-gradient(180deg, ${winnerColor} 0%, ${winner === 'A' ? '#0080FF' : '#FFA500'} 100%)`,
            borderRadius: '20px',
            boxShadow: `0 0 60px ${winnerColor}, inset 0 -20px 40px rgba(0,0,0,0.3)`,
            border: '6px solid #FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '120px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {winner === 'A' ? '🎤' : '🎧'}
          {/* Victory pose effect */}
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
            }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
            }}
          />
        </motion.div>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '24px',
              color: '#FFF',
              textShadow: '4px 4px 0px #000',
              marginBottom: '16px',
            }}
          >
            WINNER
          </div>
          <div
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '42px',
              color: winnerColor,
              textShadow: `6px 6px 0px #000, 0 0 40px ${winnerColor}`,
              letterSpacing: '4px',
              WebkitTextStroke: '2px #000',
            }}
          >
            {winnerName}
          </div>
        </div>
      </motion.div>

      {/* Loser (faded) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 2 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        <div
          style={{
            width: '100px',
            height: '140px',
            background: `linear-gradient(180deg, ${loserColor} 0%, #444 100%)`,
            borderRadius: '10px',
            border: '3px solid #666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '60px',
            filter: 'grayscale(80%)',
          }}
        >
          {winner === 'A' ? '🎧' : '🎤'}
        </div>
        <div
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '20px',
            color: '#666',
            textShadow: '3px 3px 0px #000',
          }}
        >
          {loserName}
        </div>
      </motion.div>

      {/* Continue text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ delay: 3, duration: 1, repeat: Infinity }}
        style={{
          position: 'absolute',
          bottom: '60px',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '20px',
          color: '#FFF',
          textShadow: '3px 3px 0px #000',
        }}
      >
        Press any button to continue...
      </motion.div>

      <style jsx>{`
        @keyframes rotate-bg {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
