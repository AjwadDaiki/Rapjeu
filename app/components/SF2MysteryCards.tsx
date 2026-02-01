'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MysteryCard, draw3Cards } from '../lib/mysteryCards';

interface SF2MysteryCardsProps {
  team: 'A' | 'B';
  teamName: string;
  onCardSelected: (card: MysteryCard) => void;
}

export function SF2MysteryCards({ team, teamName, onCardSelected }: SF2MysteryCardsProps) {
  const [cards] = useState<MysteryCard[]>(draw3Cards());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const teamColor = team === 'A' ? '#00D4FF' : '#FFD700';

  const handleCardClick = (index: number) => {
    if (selectedIndex !== null) return; // Déjà sélectionné

    setSelectedIndex(index);
    setRevealed(true);

    // Attendre l'animation puis notifier
    setTimeout(() => {
      onCardSelected(cards[index]);
    }, 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.95) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      {/* Background effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)',
          pointerEvents: 'none',
        }}
      />

      {/* Title */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '48px',
          color: teamColor,
          textShadow: `6px 6px 0px #000, 0 0 40px ${teamColor}`,
          marginBottom: '60px',
          textAlign: 'center',
          WebkitTextStroke: '2px #000',
        }}
      >
        🎴 MYSTERY CARD
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '20px',
          color: '#FFF',
          textShadow: '3px 3px 0px #000',
          marginBottom: '40px',
          textAlign: 'center',
        }}
      >
        {teamName} - Choisis une carte !
      </motion.div>

      {/* Cards */}
      <div
        style={{
          display: 'flex',
          gap: '40px',
          marginBottom: '60px',
        }}
      >
        {cards.map((card, index) => (
          <MysteryCardComponent
            key={index}
            card={card}
            index={index}
            isSelected={selectedIndex === index}
            isRevealed={revealed && selectedIndex === index}
            onClick={() => handleCardClick(index)}
            disabled={selectedIndex !== null}
          />
        ))}
      </div>

      {/* Hint */}
      {selectedIndex === null && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '16px',
            color: '#888',
            textShadow: '2px 2px 0px #000',
          }}
        >
          Clique sur une carte...
        </motion.div>
      )}
    </div>
  );
}

// ==========================================
// MYSTERY CARD COMPONENT
// ==========================================

interface MysteryCardComponentProps {
  card: MysteryCard;
  index: number;
  isSelected: boolean;
  isRevealed: boolean;
  onClick: () => void;
  disabled: boolean;
}

function MysteryCardComponent({
  card,
  index,
  isSelected,
  isRevealed,
  onClick,
  disabled,
}: MysteryCardComponentProps) {
  const getRarityGlow = () => {
    switch (card.rarity) {
      case 'common':
        return '0 0 20px rgba(255, 255, 255, 0.5)';
      case 'rare':
        return '0 0 30px rgba(34, 211, 238, 0.8)';
      case 'epic':
        return '0 0 40px rgba(251, 113, 133, 0.9)';
      case 'legendary':
        return '0 0 60px rgba(255, 215, 0, 1)';
      default:
        return '0 0 20px rgba(255, 255, 255, 0.5)';
    }
  };

  const getRarityBorder = () => {
    switch (card.rarity) {
      case 'common':
        return '#868E96';
      case 'rare':
        return '#22D3EE';
      case 'epic':
        return '#FB7185';
      case 'legendary':
        return '#FFD700';
      default:
        return '#868E96';
    }
  };

  return (
    <motion.div
      initial={{ rotateY: 0, scale: 0.8, y: 100 }}
      animate={{
        rotateY: isRevealed ? 180 : 0,
        scale: isSelected ? 1.1 : 1,
        y: 0,
      }}
      whileHover={!disabled ? { scale: 1.05, y: -10 } : {}}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay: index * 0.2,
      }}
      onClick={!disabled ? onClick : undefined}
      style={{
        width: '280px',
        height: '400px',
        position: 'relative',
        cursor: disabled ? 'default' : 'pointer',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Card back (face cachée) */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          backfaceVisibility: 'hidden',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          border: `6px solid #FFD700`,
          borderRadius: '20px',
          boxShadow: `0 10px 40px rgba(0,0,0,0.5), ${getRarityGlow()}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            fontSize: '120px',
            marginBottom: '20px',
            filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))',
          }}
        >
          ❓
        </div>
        <div
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '16px',
            color: '#FFD700',
            textShadow: '3px 3px 0px #000',
            textAlign: 'center',
          }}
        >
          MYSTERY
        </div>
      </motion.div>

      {/* Card front (face révélée) */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}CC 100%)`,
          border: `6px solid ${getRarityBorder()}`,
          borderRadius: '20px',
          boxShadow: `0 10px 40px rgba(0,0,0,0.5), ${getRarityGlow()}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '30px 20px',
        }}
      >
        {/* Rarity badge */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '8px 16px',
            background: getRarityBorder(),
            borderRadius: '8px',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#FFF',
            textShadow: '2px 2px 0px #000',
          }}
        >
          {card.rarity.toUpperCase()}
        </div>

        {/* Icon */}
        <div
          style={{
            fontSize: '100px',
            marginTop: '40px',
            filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.8))',
          }}
        >
          {card.icon}
        </div>

        {/* Name */}
        <div
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '18px',
            color: '#FFF',
            textShadow: '3px 3px 0px #000',
            textAlign: 'center',
            lineHeight: '1.5',
            marginTop: '20px',
          }}
        >
          {card.name}
        </div>

        {/* Description */}
        <div
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#FFF',
            textShadow: '2px 2px 0px #000',
            textAlign: 'center',
            lineHeight: '1.8',
            marginTop: '10px',
            padding: '0 10px',
          }}
        >
          {card.description}
        </div>

        {/* Value indicator */}
        {card.value > 0 && (
          <div
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '8px',
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '24px',
              color: '#FFD700',
              textShadow: '3px 3px 0px #000',
            }}
          >
            {card.effect.includes('damage') && '💥'} {card.value}
            {card.effect.includes('heal') && ' HP'}
            {card.effect.includes('damage') && ' HP'}
            {card.effect === 'double_damage' && 'x DOUBLE'}
          </div>
        )}
      </motion.div>

      {/* Glow effect for legendary */}
      {card.rarity === 'legendary' && isRevealed && (
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          style={{
            position: 'absolute',
            inset: '-10px',
            background: 'radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%)',
            borderRadius: '30px',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
      )}
    </motion.div>
  );
}
