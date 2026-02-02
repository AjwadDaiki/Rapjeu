'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SF2HealthBarProps {
  team: 'A' | 'B';
  hp: number;
  maxHp: number;
  teamName: string;
  position: 'left' | 'right';
}

export function SF2HealthBar({ team, hp, maxHp, teamName, position }: SF2HealthBarProps) {
  const [prevHp, setPrevHp] = useState(hp);
  const percentage = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  useEffect(() => {
    setPrevHp(hp);
  }, [hp]);

  // Color based on HP percentage (SF2 style)
  const getBarColor = () => {
    if (percentage > 60) return '#FFD700'; // Yellow (full health)
    if (percentage > 30) return '#FFA500'; // Orange (medium health)
    return '#FF0000'; // Red (low health)
  };

  // Determine if HP is critical (flashing red)
  const isCritical = percentage <= 20;

  return (
    <div
      className={`sf2-health-container ${position === 'left' ? 'left' : 'right'}`}
      style={{
        position: 'absolute',
        top: '20px',
        [position]: '20px',
        width: '380px',
        zIndex: 100,
      }}
    >
      {/* Team Name */}
      <div
        className="sf2-team-name"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '20px',
          color: team === 'A' ? '#00D4FF' : '#FFD700',
          textShadow: '3px 3px 0px rgba(0,0,0,0.8)',
          marginBottom: '8px',
          textAlign: position === 'left' ? 'left' : 'right',
          letterSpacing: '2px',
        }}
      >
        {teamName}
      </div>

      {/* HP Bar Container */}
      <div
        className="sf2-hp-bar-container"
        style={{
          background: 'linear-gradient(180deg, #2D2D2D 0%, #1A1A1A 100%)',
          border: '4px solid #000',
          borderRadius: '0px',
          padding: '8px',
          boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.5)',
          position: 'relative',
        }}
      >
        {/* HP Label */}
        <div
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#FFF',
            marginBottom: '4px',
            textShadow: '2px 2px 0px rgba(0,0,0,0.8)',
          }}
        >
          HP
        </div>

        {/* HP Bar Background */}
        <div
          style={{
            width: '100%',
            height: '24px',
            background: '#000',
            border: '2px solid #444',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Red flashing background (critical HP) */}
          {isCritical && (
            <motion.div
              animate={{
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                inset: 0,
                background: '#FF0000',
              }}
            />
          )}

          {/* HP Fill */}
          <motion.div
            className="sf2-hp-fill"
            initial={{ width: `${percentage}%` }}
            animate={{ width: `${percentage}%` }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
            style={{
              position: 'absolute',
              left: position === 'left' ? 0 : 'auto',
              right: position === 'right' ? 0 : 'auto',
              top: 0,
              height: '100%',
              background: getBarColor(),
              boxShadow: `inset 0 -4px 8px rgba(0,0,0,0.3), 0 0 10px ${getBarColor()}`,
              transformOrigin: position === 'left' ? 'left' : 'right',
            }}
          >
            {/* Segmented bars effect (SF2 style) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,0,0,0.2) 8px, rgba(0,0,0,0.2) 10px)',
              }}
            />
          </motion.div>

          {/* HP Damage flash */}
          {prevHp > hp && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute',
                left: position === 'left' ? `${percentage}%` : 'auto',
                right: position === 'right' ? `${percentage}%` : 'auto',
                top: 0,
                width: `${Math.abs(prevHp - hp)}%`,
                height: '100%',
                background: '#FFF',
              }}
            />
          )}
        </div>

        {/* HP Number Display */}
        <div
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: isCritical ? '#FF0000' : '#FFF',
            marginTop: '4px',
            textAlign: 'center',
            textShadow: '2px 2px 0px rgba(0,0,0,0.8)',
          }}
        >
          {Math.max(0, hp)} / {maxHp}
        </div>
      </div>

      {/* VS Indicator */}
      {position === 'left' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '-60px',
            transform: 'translateY(-50%)',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '24px',
            color: '#FF0000',
            textShadow: '4px 4px 0px rgba(0,0,0,0.8)',
            animation: 'pulse-vs 1s infinite',
          }}
        >
          VS
        </div>
      )}

      <style jsx>{`
        @keyframes pulse-vs {
          0%, 100% { transform: translateY(-50%) scale(1); }
          50% { transform: translateY(-50%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
