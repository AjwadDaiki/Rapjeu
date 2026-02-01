'use client';

// ============================================
// GAME INPUT - Champ de saisie collaboratif
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Team } from '../types';

interface GameInputProps {
  team: Team;
  value: string;
  isLocked: boolean;
  isMyTurn: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export function GameInput({ 
  team, 
  value, 
  isLocked, 
  isMyTurn,
  placeholder = 'Tapez votre réponse...',
  onChange, 
  onSubmit 
}: GameInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  // Sync with external value (pour input collaboratif)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  }, [onChange]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // Anti-spam 500ms
    const now = Date.now();
    if (now - lastSubmitTime < 500) return;
    if (!localValue.trim() || isLocked || !isMyTurn) return;
    
    setLastSubmitTime(now);
    onSubmit(localValue.trim());
    setLocalValue('');
  }, [localValue, isLocked, isMyTurn, lastSubmitTime, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as unknown as React.FormEvent);
    }
  }, [handleSubmit]);

  const isTeamA = team === 'A';
  const borderColor = isTeamA ? 'border-blue-500' : 'border-yellow-500';
  const bgColor = isTeamA ? 'bg-blue-950/50' : 'bg-yellow-950/50';
  const focusRing = isTeamA ? 'focus:ring-blue-500' : 'focus:ring-yellow-500';

  return (
    <motion.form 
      onSubmit={handleSubmit}
      className="relative w-full"
      animate={isLocked ? { opacity: 0.5 } : { opacity: 1 }}
    >
      <div className={`relative flex items-center ${bgColor} rounded-xl border-2 ${borderColor} overflow-hidden`}>
        {/* Team indicator */}
        <div className={`px-4 py-3 font-bold ${isTeamA ? 'text-blue-400' : 'text-yellow-400'}`}>
          {team}
        </div>

        {/* Input */}
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isLocked || !isMyTurn}
          placeholder={isMyTurn ? placeholder : 'En attente...'}
          className={`flex-1 bg-transparent px-4 py-3 text-white placeholder-gray-500 outline-none ${focusRing} focus:ring-2 disabled:cursor-not-allowed`}
          autoFocus={isMyTurn}
        />

        {/* Submit button */}
        <motion.button
          type="submit"
          disabled={isLocked || !isMyTurn || !localValue.trim()}
          className={`px-6 py-3 font-bold transition-colors ${
            isTeamA 
              ? 'bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900' 
              : 'bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-900'
          } disabled:cursor-not-allowed`}
          whileHover={!isLocked && isMyTurn ? { scale: 1.05 } : {}}
          whileTap={!isLocked && isMyTurn ? { scale: 0.95 } : {}}
        >
          {isLocked ? '🔒' : '➤'}
        </motion.button>
      </div>

      {/* Lock indicator */}
      {isLocked && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-500 text-white text-sm rounded-full"
        >
          Verrouillé !
        </motion.div>
      )}

      {/* Collaborative indicator */}
      {isMyTurn && (
        <div className="mt-2 text-center text-xs text-gray-500">
          Tous les joueurs de votre équipe voient ce que vous tapez
        </div>
      )}
    </motion.form>
  );
}
