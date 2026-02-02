'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';

interface SF2VSScreenProps {
  teamA: string;
  teamB: string;
  duration?: number;
  onComplete?: () => void;
}

export function SF2VSScreen({ teamA, teamB, duration = 3000, onComplete }: SF2VSScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, #000 0%, #1a0000 50%, #000 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        overflow: 'hidden',
      }}
    >
      {/* Animated background stripes */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,0,0,0.05) 40px, rgba(255,0,0,0.05) 80px)',
          animation: 'stripe-move 2s linear infinite',
        }}
      />

      {/* Lightning bolts effect */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 0.5,
            delay: i * 0.1,
            repeat: Infinity,
            repeatDelay: 2,
          }}
          style={{
            position: 'absolute',
            top: `${20 + i * 15}%`,
            left: `${10 + i * 10}%`,
            width: '100px',
            height: '4px',
            background: '#FFD700',
            transform: `rotate(${-30 + i * 10}deg)`,
            boxShadow: '0 0 20px #FFD700',
          }}
        />
      ))}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          width: '100%',
          maxWidth: '1200px',
          padding: '0 40px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Team A */}
        <motion.div
          initial={{ x: -500, opacity: 0, rotate: -20 }}
          animate={{ x: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.2 }}
          style={{
            textAlign: 'center',
          }}
        >
          {/* Character silhouette effect */}
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
              height: '300px',
              background: 'linear-gradient(180deg, #00D4FF 0%, #0080FF 100%)',
              borderRadius: '20px',
              marginBottom: '30px',
              boxShadow: '0 0 60px rgba(0, 212, 255, 0.8), inset 0 -20px 40px rgba(0,0,0,0.3)',
              border: '6px solid #FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '100px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            🎤
            {/* Scan lines */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
              }}
            />
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '36px',
              color: '#00D4FF',
              textShadow: '6px 6px 0px #000, 0 0 30px #00D4FF',
              letterSpacing: '4px',
              WebkitTextStroke: '2px #000',
            }}
          >
            {teamA}
          </motion.div>
        </motion.div>

        {/* VS Text */}
        <motion.div
          initial={{ scale: 0, rotate: 180 }}
          animate={{
            scale: [0, 1.3, 1],
            rotate: [180, 0, 0],
          }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
            delay: 0.6,
          }}
          style={{
            position: 'relative',
          }}
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '120px',
              color: '#FF0000',
              textShadow: '12px 12px 0px #000, 0 0 80px #FF0000, 0 0 40px #FFD700',
              letterSpacing: '10px',
              WebkitTextStroke: '4px #000',
              position: 'relative',
            }}
          >
            VS
          </motion.div>

          {/* Impact circles */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 1 }}
              animate={{
                scale: [0, 3],
                opacity: [1, 0],
              }}
              transition={{
                duration: 1.5,
                delay: 0.8 + i * 0.2,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '200px',
                height: '200px',
                border: '6px solid #FF0000',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </motion.div>

        {/* Team B */}
        <motion.div
          initial={{ x: 500, opacity: 0, rotate: 20 }}
          animate={{ x: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.2 }}
          style={{
            textAlign: 'center',
          }}
        >
          {/* Character silhouette effect */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.75,
            }}
            style={{
              width: '200px',
              height: '300px',
              background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)',
              borderRadius: '20px',
              marginBottom: '30px',
              boxShadow: '0 0 60px rgba(255, 215, 0, 0.8), inset 0 -20px 40px rgba(0,0,0,0.3)',
              border: '6px solid #FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '100px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            🎧
            {/* Scan lines */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
              }}
            />
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '36px',
              color: '#FFD700',
              textShadow: '6px 6px 0px #000, 0 0 30px #FFD700',
              letterSpacing: '4px',
              WebkitTextStroke: '2px #000',
            }}
          >
            {teamB}
          </motion.div>
        </motion.div>
      </div>

      {/* FIGHT text appearing */}
      <motion.div
        initial={{ scale: 0, y: 100, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ delay: 2, type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          position: 'absolute',
          bottom: '100px',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '80px',
          color: '#FFF',
          textShadow: '8px 8px 0px #FF0000, 0 0 60px #FFD700',
          letterSpacing: '10px',
          WebkitTextStroke: '3px #000',
        }}
      >
        READY...
      </motion.div>

      <style jsx>{`
        @keyframes stripe-move {
          0% { background-position: 0 0; }
          100% { background-position: 80px 80px; }
        }
      `}</style>
    </div>
  );
}
