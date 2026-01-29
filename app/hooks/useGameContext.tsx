'use client';

// ============================================
// CONTEXT GAME - État global du jeu
// ============================================

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { AnswerResult, DisputeState } from '../types';

interface GameContextState {
  // UI State
  shakeIntensity: number;
  isShaking: boolean;
  showDisputeModal: boolean;
  currentDispute: DisputeState | null;
  lastAnswerResult: AnswerResult | null;
  
  // Audio State
  bgmTrack: 'menu' | 'game' | 'tension' | null;
  
  // Timer State
  localTimeLeft: number;
  isTimerRunning: boolean;
}

interface GameContextValue extends GameContextState {
  // Actions UI
  triggerShake: (intensity?: number) => void;
  showDispute: (dispute: DisputeState) => void;
  hideDispute: () => void;
  setAnswerResult: (result: AnswerResult | null) => void;
  
  // Actions Audio
  setBgmTrack: (track: 'menu' | 'game' | 'tension' | null) => void;
  
  // Actions Timer
  setLocalTimeLeft: (time: number) => void;
  startLocalTimer: (duration: number) => void;
  stopLocalTimer: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  // UI State
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [currentDispute, setCurrentDispute] = useState<DisputeState | null>(null);
  const [lastAnswerResult, setLastAnswerResult] = useState<AnswerResult | null>(null);
  
  // Audio State
  const [bgmTrack, setBgmTrack] = useState<'menu' | 'game' | 'tension' | null>('menu');
  
  // Timer State
  const [localTimeLeft, setLocalTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Actions
  const triggerShake = useCallback((intensity: number = 0.5) => {
    setShakeIntensity(intensity);
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
      setShakeIntensity(0);
    }, 500);
  }, []);

  const showDispute = useCallback((dispute: DisputeState) => {
    setCurrentDispute(dispute);
    setShowDisputeModal(true);
  }, []);

  const hideDispute = useCallback(() => {
    setShowDisputeModal(false);
    setCurrentDispute(null);
  }, []);

  const setAnswerResult = useCallback((result: AnswerResult | null) => {
    setLastAnswerResult(result);
  }, []);

  const startLocalTimer = useCallback((duration: number) => {
    setLocalTimeLeft(duration);
    setIsTimerRunning(true);
    
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    const interval = setInterval(() => {
      setLocalTimeLeft(prev => {
        if (prev <= 10) {
          // Bientôt la fin - switch BGM tension
          setBgmTrack('tension');
        }
        if (prev <= 0) {
          clearInterval(interval);
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimerInterval(interval);
  }, [timerInterval]);

  const stopLocalTimer = useCallback(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    setIsTimerRunning(false);
  }, [timerInterval]);

  const value: GameContextValue = {
    shakeIntensity,
    isShaking,
    showDisputeModal,
    currentDispute,
    lastAnswerResult,
    bgmTrack,
    localTimeLeft,
    isTimerRunning,
    triggerShake,
    showDispute,
    hideDispute,
    setAnswerResult,
    setBgmTrack,
    setLocalTimeLeft,
    startLocalTimer,
    stopLocalTimer,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}
