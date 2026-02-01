'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SF2ComboTextProps {
  message?: string;
  type?: 'combo' | 'perfect' | 'ko' | 'critical' | 'hit' | 'miss';
  show: boolean;
  onComplete?: () => void;
}

export function SF2ComboText({ message, type = 'combo', show, onComplete }: SF2ComboTextProps) {
  const [displayMessage, setDisplayMessage] = useState(message);

  useEffect(() => {
    if (show && message) {
      setDisplayMessage(message);
    }
  }, [show, message]);

  // Get color and styling based on type
  const getStyles = () => {
    switch (type) {
      case 'perfect':
        return {
          color: '#FFD700',
          fontSize: '120px',
          animation: 'perfect-bounce 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          textShadow: '8px 8px 0px #000, 0 0 40px #FFD700',
        };
      case 'ko':
        return {
          color: '#FF0000',
          fontSize: '140px',
          animation: 'ko-shake 1s ease',
          textShadow: '10px 10px 0px #000, 0 0 60px #FF0000',
        };
      case 'critical':
        return {
          color: '#FF4500',
          fontSize: '80px',
          animation: 'critical-flash 0.5s ease',
          textShadow: '6px 6px 0px #000, 0 0 30px #FF4500',
        };
      case 'hit':
        return {
          color: '#00FF00',
          fontSize: '60px',
          animation: 'hit-fade 0.6s ease',
          textShadow: '4px 4px 0px #000, 0 0 20px #00FF00',
        };
      case 'miss':
        return {
          color: '#808080',
          fontSize: '50px',
          animation: 'miss-fall 0.7s ease',
          textShadow: '4px 4px 0px #000',
        };
      default: // combo
        return {
          color: '#00D4FF',
          fontSize: '100px',
          animation: 'combo-pop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          textShadow: '8px 8px 0px #000, 0 0 40px #00D4FF',
        };
    }
  };

  const styles = getStyles();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: -100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onAnimationComplete={() => {
            if (onComplete) {
              setTimeout(onComplete, 800);
            }
          }}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
            pointerEvents: 'none',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: styles.fontSize,
            color: styles.color,
            textShadow: styles.textShadow,
            fontWeight: 'bold',
            letterSpacing: '8px',
            whiteSpace: 'nowrap',
            WebkitTextStroke: '3px #000',
            animation: styles.animation,
          }}
        >
          {displayMessage}

          {/* Impact lines effect */}
          {(type === 'ko' || type === 'perfect' || type === 'critical') && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 3, opacity: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '200px',
                    height: '4px',
                    background: styles.color,
                    transformOrigin: 'left center',
                    transform: `rotate(${i * 45}deg)`,
                  }}
                />
              ))}
            </>
          )}

          <style jsx>{`
            @keyframes perfect-bounce {
              0% { transform: translate(-50%, -50%) scale(0) rotate(-20deg); }
              50% { transform: translate(-50%, -50%) scale(1.2) rotate(5deg); }
              100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
            }

            @keyframes ko-shake {
              0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
              10%, 30%, 50%, 70%, 90% { transform: translate(-48%, -50%) rotate(-3deg); }
              20%, 40%, 60%, 80% { transform: translate(-52%, -50%) rotate(3deg); }
            }

            @keyframes critical-flash {
              0%, 50%, 100% { opacity: 1; }
              25%, 75% { opacity: 0.5; }
            }

            @keyframes combo-pop {
              0% { transform: translate(-50%, -50%) scale(0); }
              50% { transform: translate(-50%, -50%) scale(1.3); }
              100% { transform: translate(-50%, -50%) scale(1); }
            }

            @keyframes hit-fade {
              0% { transform: translate(-50%, -50%) translateY(0); opacity: 1; }
              100% { transform: translate(-50%, -50%) translateY(-50px); opacity: 0; }
            }

            @keyframes miss-fall {
              0% { transform: translate(-50%, -50%) translateY(0); opacity: 1; }
              100% { transform: translate(-50%, -50%) translateY(80px); opacity: 0; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
