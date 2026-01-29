'use client';

// ============================================
// PAGE GAME - Interface principale de jeu
// ============================================

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { useGameContext } from '../hooks/useGameContext';
import { useRouter } from 'next/navigation';
import { ScreenShake } from '../components/ScreenShake';
import { HPBar } from '../components/HPBar';
import { DisputeModal } from '../components/DisputeModal';
import { VSIntro, ModeRoulette } from './phases';
import {
  RolandGamosMode,
  LeThemeMode,
  MythoPasMythoMode,
  EncheresMode,
  BlindTestMode,
  PixelCoverMode,
} from './modes';
import { GamePhase, GameMode, ModeData, Team, Player, RoundResult } from '../types';
import { TIMING } from '../lib/constants';

export default function GamePage() {
  const router = useRouter();
  const { 
    room, 
    currentPlayer, 
    submitAnswer, 
    submitBet, 
    buzz,
    submitMytho,
    onAnswerResult, 
    onDisputeStarted, 
    onDisputeResolved, 
    onShake,
    onVSIntro,
    onModeRoulette,
    onModeSelected,
    onRoundStarted,
    onRoundEnded,
    onGameEnded,
    onTimerTick,
    onComboUpdate,
    onChainUpdate,
    onMythoStatement,
    onMythoResult,
    onBetRevealed,
    onBuzzResult,
    onPixelBlurUpdate,
  } = useSocket();
  
  const { triggerShake, showDispute, setAnswerResult, setBgmTrack } = useGameContext();

  // Phase state
  const [currentPhase, setCurrentPhase] = useState<GamePhase>('lobby');
  // Les joueurs sont calculés à partir de room pour la reconnexion
  const teamAPlayers = room?.players.filter(p => p.team === 'A') || [];
  const teamBPlayers = room?.players.filter(p => p.team === 'B') || [];
  const [availableModes, setAvailableModes] = useState<GameMode[]>([]);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [rouletteDuration, setRouletteDuration] = useState(5000);
  const [modeData, setModeData] = useState<ModeData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [chain, setChain] = useState<Array<{ artistId: string; artistName: string; answeredBy: Team; answerTime: number }>>([]);
  const [mythoStatement, setMythoStatement] = useState<{ statement: string; index: number; total: number } | null>(null);
  const [encheresPhase, setEncheresPhase] = useState<'betting' | 'proof'>('betting');
  const [encheresWinner, setEncheresWinner] = useState<Team | null>(null);
  const [buzzedTeam, setBuzzedTeam] = useState<Team | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [gameWinner, setGameWinner] = useState<Team | null>(null);

  // Stocker le roomCode quand on a une room
  useEffect(() => {
    if (room) {
      localStorage.setItem('currentRoomCode', room.code);
      console.log('💾 Room code stocké:', room.code);
    }
  }, [room]);

  // Redirection si pas de room
  useEffect(() => {
    if (!room) {
      const savedRoomCode = sessionStorage.getItem('currentRoomCode') || localStorage.getItem('currentRoomCode');
      console.log('🎮 Game page - pas de room, savedRoomCode:', savedRoomCode);
      
      if (!savedRoomCode) {
        console.log('🎮 Pas de savedRoomCode, redirection immédiate');
        router.push('/lobby');
        return;
      }
      
      // Attendre la reconnexion (max 5s)
      console.log('🎮 Attente reconnexion...');
      const timeout = setTimeout(() => {
        if (!room) {
          console.log('🎮 Timeout reconnexion, redirection vers lobby');
          localStorage.removeItem('currentRoomCode');
          router.push('/lobby');
        }
      }, 5000);
      return () => clearTimeout(timeout);
    }
    setBgmTrack('game');
    
    // Set initial phase
    setCurrentPhase(room.gameState.phase);
    setModeData(room.gameState.currentData);
  }, [room, router, setBgmTrack]);

  // Listen for phase changes from server
  useEffect(() => {
    if (!room) return;
    setCurrentPhase(room.gameState.phase);
    setModeData(room.gameState.currentData);
  }, [room?.gameState.phase, room?.gameState.currentData]);

  // Socket event listeners
  useEffect(() => {
    const cleanupVSIntro = onVSIntro((teamA, teamB) => {
      // Les joueurs sont maintenant calculés à partir de room
      setCurrentPhase('vs_intro');
    });

    const cleanupModeRoulette = onModeRoulette((modes, selected, duration) => {
      setAvailableModes(modes);
      setSelectedMode(selected);
      setRouletteDuration(duration);
      setCurrentPhase('mode_roulette');
    });

    const cleanupModeSelected = onModeSelected((mode, data) => {
      setSelectedMode(mode);
      setModeData(data);
      setCurrentPhase('mode_intro');
      
      // Auto-advance to playing after 2s
      setTimeout(() => {
        setCurrentPhase('playing');
      }, 2000);
    });

    const cleanupRoundStarted = onRoundStarted((round, mode, data) => {
      setModeData(data);
      setCurrentPhase('playing');
      setChain([]);
      setBuzzedTeam(null);
      
      // Set timer based on mode
      const duration = getModeDuration(mode, data);
      setTotalTime(duration);
      setTimeLeft(duration);
    });

    const cleanupRoundEnded = onRoundEnded((result) => {
      setRoundResult(result);
      setCurrentPhase('round_result');
    });

    const cleanupGameEnded = onGameEnded((winner, scores, results) => {
      setGameWinner(winner);
      setCurrentPhase('final_score');
    });

    const cleanupTimerTick = onTimerTick((remaining) => {
      setTimeLeft(remaining);
    });

    const cleanupAnswer = onAnswerResult((result) => {
      setAnswerResult(result);
      if (result.feedback === 'invalid' || result.feedback === 'duplicate') {
        triggerShake(0.5);
      }
    });

    const cleanupChainUpdate = onChainUpdate((newChain) => {
      setChain(newChain);
    });

    const cleanupMythoStatement = onMythoStatement((statement, index, total) => {
      setMythoStatement({ statement, index, total });
    });

    const cleanupBetRevealed = onBetRevealed((bets, winner, target) => {
      setEncheresPhase('proof');
      setEncheresWinner(winner);
    });

    const cleanupBuzzResult = onBuzzResult((team, timeLeft) => {
      setBuzzedTeam(team);
      setTimeLeft(timeLeft);
    });

    const cleanupDispute = onDisputeStarted((dispute) => {
      showDispute(dispute);
    });

    const cleanupResolved = onDisputeResolved((dispute, accepted) => {
      // Feedback du litige
    });

    const cleanupShake = onShake((intensity) => {
      triggerShake(intensity);
    });

    return () => {
      cleanupVSIntro?.();
      cleanupModeRoulette?.();
      cleanupModeSelected?.();
      cleanupRoundStarted?.();
      cleanupRoundEnded?.();
      cleanupGameEnded?.();
      cleanupTimerTick?.();
      cleanupAnswer?.();
      cleanupChainUpdate?.();
      cleanupMythoStatement?.();
      cleanupBetRevealed?.();
      cleanupBuzzResult?.();
      cleanupDispute?.();
      cleanupResolved?.();
      cleanupShake?.();
    };
  }, [
    onVSIntro, onModeRoulette, onModeSelected, onRoundStarted, onRoundEnded, onGameEnded,
    onTimerTick, onAnswerResult, onChainUpdate, onMythoStatement, onBetRevealed, onBuzzResult,
    onDisputeStarted, onDisputeResolved, onShake, triggerShake, showDispute, setAnswerResult,
  ]);

  function getModeDuration(mode: GameMode, data: ModeData): number {
    switch (mode) {
      case 'roland_gamos': return TIMING.ROLAND_GAMOS_TURN_TIME;
      case 'le_theme': return TIMING.LE_THEME_TURN_TIME;
      case 'mytho_pas_mytho': return TIMING.MYTHO_PAS_MYTHO_TIME;
      case 'encheres': 
        return data.type === 'encheres' && data.betState.revealed 
          ? TIMING.ENCHERES_PROOF_TIME 
          : TIMING.ENCHERES_BET_TIME;
      case 'blind_test': return TIMING.BLIND_TEST_ANSWER_TIME;
      case 'pixel_cover': return TIMING.PIXEL_COVER_DURATION;
      default: return 15000;
    }
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  const { gameState, teamA, teamB } = room;
  const currentMode = gameState.currentMode;
  const isMyTurn = currentPlayer?.team === gameState.turn;

  // Rendu selon la phase
  const renderPhase = () => {
    switch (currentPhase) {
      case 'vs_intro':
        return (
          <VSIntro
            teamAPlayers={teamAPlayers}
            teamBPlayers={teamBPlayers}
            onComplete={() => {}}
          />
        );

      case 'mode_roulette':
        if (!selectedMode) return null;
        return (
          <ModeRoulette
            availableModes={availableModes}
            selectedMode={selectedMode}
            duration={rouletteDuration}
            onComplete={() => {}}
          />
        );

      case 'mode_intro':
        if (!selectedMode) return null;
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <p className="text-gray-400 mb-4">Mode sélectionné</p>
              <h2 className="text-4xl font-bold text-white capitalize">
                {selectedMode.replace('_', ' ')}
              </h2>
            </motion.div>
          </div>
        );

      case 'playing':
        if (!currentMode || !modeData) return null;
        return renderMode();

      case 'round_result':
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold mb-4">Round Terminé</h2>
              {roundResult?.winner ? (
                <p className="text-xl text-green-400">
                  Équipe {roundResult.winner} gagne !
                </p>
              ) : (
                <p className="text-xl text-gray-400">Égalité</p>
              )}
              <div className="mt-6 flex justify-center gap-8">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Équipe A</p>
                  <p className="text-2xl font-bold text-blue-400">
                    -{roundResult?.teamADamage || 0} HP
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Équipe B</p>
                  <p className="text-2xl font-bold text-red-400">
                    -{roundResult?.teamBDamage || 0} HP
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        );

      case 'final_score':
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <h2 className="text-4xl font-bold mb-6">Partie Terminée</h2>
              {gameWinner ? (
                <>
                  <p className="text-2xl mb-4">Vainqueur</p>
                  <p className={`text-5xl font-bold ${gameWinner === 'A' ? 'text-blue-400' : 'text-red-400'}`}>
                    ÉQUIPE {gameWinner}
                  </p>
                </>
              ) : (
                <p className="text-3xl text-gray-400">Match nul</p>
              )}
              <div className="mt-8 flex justify-center gap-12">
                <div className="text-center">
                  <p className="text-gray-500">Équipe A</p>
                  <p className="text-3xl font-bold">{teamA.score} HP</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500">Équipe B</p>
                  <p className="text-3xl font-bold">{teamB.score} HP</p>
                </div>
              </div>
            </motion.div>
          </div>
        );

      default:
        return <div className="text-center text-white">En attente...</div>;
    }
  };

  // Rendu du mode actif
  const renderMode = () => {
    if (!currentMode || !modeData) return null;

    switch (currentMode) {
      case 'roland_gamos':
        return modeData.type === 'roland_gamos' ? (
          <RolandGamosMode
            data={modeData}
            isMyTurn={isMyTurn}
            team={currentPlayer?.team || 'A'}
            onSubmit={submitAnswer}
            timeLeft={timeLeft}
            totalTime={totalTime}
            chain={chain}
          />
        ) : null;

      case 'le_theme':
        return modeData.type === 'le_theme' ? (
          <LeThemeMode
            data={modeData}
            isMyTurn={isMyTurn}
            team={currentPlayer?.team || 'A'}
            onSubmit={submitAnswer}
            timeLeft={timeLeft}
            totalTime={totalTime}
            usedAnswers={modeData.usedAnswers}
          />
        ) : null;

      case 'mytho_pas_mytho':
        return modeData.type === 'mytho_pas_mytho' ? (
          <MythoPasMythoMode
            data={modeData}
            onSubmit={submitMytho}
            timeLeft={timeLeft}
            totalTime={totalTime}
            currentStatement={mythoStatement || undefined}
          />
        ) : null;

      case 'encheres':
        return modeData.type === 'encheres' ? (
          <EncheresMode
            data={modeData}
            team={currentPlayer?.team || 'A'}
            onSubmitBet={submitBet}
            onSubmitAnswer={submitAnswer}
            timeLeft={timeLeft}
            totalTime={totalTime}
            phase={encheresPhase}
            winner={encheresWinner}
          />
        ) : null;

      case 'blind_test':
        return modeData.type === 'blind_test' ? (
          <BlindTestMode
            data={modeData}
            team={currentPlayer?.team || 'A'}
            onBuzz={buzz}
            onSubmitAnswer={submitAnswer}
            buzzedTeam={buzzedTeam}
            timeLeft={timeLeft}
          />
        ) : null;

      case 'pixel_cover':
        return modeData.type === 'pixel_cover' ? (
          <PixelCoverMode
            data={modeData}
            onSubmitAnswer={submitAnswer}
            timeLeft={timeLeft}
            totalTime={totalTime}
          />
        ) : null;

      default:
        return (
          <div className="text-center text-white">
            <p className="text-xl mb-4">Mode: {currentMode}</p>
            <p className="text-gray-400">Chargement...</p>
          </div>
        );
    }
  };

  return (
    <ScreenShake>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white overflow-hidden">
        {/* Header avec les HP bars */}
        <header className="p-4 border-b border-gray-800">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HPBar 
                team="A" 
                hp={teamA.score} 
                isActive={gameState.turn === 'A'}
                label="ÉQUIPE A"
              />
              <HPBar 
                team="B" 
                hp={teamB.score} 
                isActive={gameState.turn === 'B'}
                label="ÉQUIPE B"
              />
            </div>
          </div>
        </header>

        {/* Zone de jeu principale */}
        <main className="flex-1 p-4">
          <div className="max-w-4xl mx-auto">
            {/* Info round */}
            <div className="text-center mb-6">
              <span className="inline-block px-4 py-2 bg-gray-800 rounded-full text-sm text-gray-400">
                Round {gameState.currentRound} / {gameState.totalRounds}
              </span>
              {currentMode && (
                <h2 className="text-2xl font-bold mt-2 capitalize">
                  {currentMode.replace(/_/g, ' ')}
                </h2>
              )}
            </div>

            {/* Contenu selon la phase */}
            {renderPhase()}
          </div>
        </main>

        {/* Modal de litige */}
        <DisputeModal />
      </div>
    </ScreenShake>
  );
}
