'use client';

// ============================================
// PAGE GAME - Interface principale de jeu
// ============================================

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { useGameContext } from '../hooks/useGameContext';
import { useRouter } from 'next/navigation';
import { ScreenShake } from '../components/ScreenShake';
import { HPBar } from '../components/HPBar';
import { DisputeModal } from '../components/DisputeModal';
import { GameBackground } from '../components/RetrowaveBackground';
import { OpponentAnswerReveal } from '../components/OpponentAnswerReveal';
import { VSIntro, ModeRoulette } from './phases';
import {
  RolandGamosMode,
  LeThemeMode,
  MythoPasMythoMode,
  EncheresMode,
  BlindTestMode,
  PixelCoverMode,
  DevineQuiMode,
  ContinueParolesMode,
} from './modes';
import { GamePhase, GameMode, ModeData, Team, Player, RoundResult } from '../types';
import { TIMING, GAME_MODE_NAMES, GAME_MODE_DESCRIPTIONS, MODE_ICONS } from '../lib/constants';

type AnswerLogEntry = {
  id: string;
  team: Team;
  playerName: string;
  value: string;
  isValid: boolean;
  isDuplicate: boolean;
  timestamp: number;
};

export default function GamePage() {
  const router = useRouter();
  const { 
    room, 
    currentPlayer, 
    submitAnswer, 
    submitBet, 
    buzz,
    submitMytho,
    skipTurn,
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
    onNotice,
    onError,
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
  const [answerLog, setAnswerLog] = useState<AnswerLogEntry[]>([]);
  const [notice, setNotice] = useState<{ message: string; tone: 'info' | 'warning' | 'error' } | null>(null);
  const [eventLog, setEventLog] = useState<Array<{ id: string; message: string; tone: 'info' | 'warning' | 'error' }>>([]);
  const [lastMythoResult, setLastMythoResult] = useState<{ isTrue: boolean; explanation: string } | null>(null);
  const [answerPulse, setAnswerPulse] = useState<{ tone: 'good' | 'bad' | 'dup'; message: string; sub?: string } | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushEvent = useCallback((message: string, tone: 'info' | 'warning' | 'error' = 'info') => {
    setEventLog((prev) => {
      const next = [...prev, { id: `${Date.now()}-${Math.random()}`, message, tone }];
      return next.slice(-3);
    });
  }, []);

  const showNotice = useCallback((message: string, tone: 'info' | 'warning' | 'error' = 'warning') => {
    setNotice({ message, tone });
    pushEvent(message, tone);
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 2500);
  }, [pushEvent]);

  const triggerAnswerPulse = useCallback((tone: 'good' | 'bad' | 'dup', message: string, sub?: string) => {
    setAnswerPulse({ tone, message, sub });
    if (answerPulseTimerRef.current) {
      clearTimeout(answerPulseTimerRef.current);
    }
    answerPulseTimerRef.current = setTimeout(() => {
      setAnswerPulse(null);
      answerPulseTimerRef.current = null;
    }, 900);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
      if (answerPulseTimerRef.current) {
        clearTimeout(answerPulseTimerRef.current);
      }
    };
  }, []);

  // Opponent answer reveal
  const [showOpponentAnswer, setShowOpponentAnswer] = useState(false);
  const [opponentAnswerData, setOpponentAnswerData] = useState<{
    team: Team;
    answer: string;
    playerName: string;
    isCorrect: boolean;
  } | null>(null);

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
      setAnswerLog([]);
      setEventLog([]);
      setLastMythoResult(null);
      
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
      if (result.feedback === 'valid') {
        const teamLabel = teamNames[result.team];
        showNotice(`✅ ${teamLabel} inflige -${result.damageDealt} HP`, 'info');
        triggerAnswerPulse('good', 'BONNE RÉPONSE', `${teamLabel} • -${result.damageDealt} HP`);
      } else if (result.feedback === 'invalid') {
        triggerShake(0.5);
        showNotice(`❌ Mauvaise réponse (-${result.damageDealt} HP)`, 'error');
        triggerAnswerPulse('bad', 'MAUVAISE RÉPONSE', `-${result.damageDealt} HP`);
      } else if (result.feedback === 'duplicate') {
        triggerShake(0.5);
        showNotice('⚠️ Déjà dit', 'warning');
        triggerAnswerPulse('dup', 'DÉJÀ DIT');
      }

      const answeringPlayer = room?.players.find(p => p.id === result.answer.playerId);
      setAnswerLog(prev => ([
        ...prev,
        {
          id: result.answer.id,
          team: result.team,
          playerName: answeringPlayer?.name || 'Inconnu',
          value: result.answer.value,
          isValid: result.feedback === 'valid',
          isDuplicate: result.feedback === 'duplicate',
          timestamp: Date.now(),
        },
      ]));

      // Afficher la réponse de l'équipe adverse EN GRAND
      if (currentPlayer && result.team !== currentPlayer.team && result.feedback === 'valid') {
        // Trouver le nom du joueur qui a répondu
        const playerName = answeringPlayer?.name || 'Unknown';

        setOpponentAnswerData({
          team: result.team,
          answer: result.answer.value,
          playerName,
          isCorrect: result.feedback === 'valid',
        });
        setShowOpponentAnswer(true);

        // Masquer après 2.5 secondes
        setTimeout(() => {
          setShowOpponentAnswer(false);
          setTimeout(() => setOpponentAnswerData(null), 300);
        }, 2500);
      }
    });

    const cleanupChainUpdate = onChainUpdate((newChain) => {
      setChain(newChain);
    });

    const cleanupMythoStatement = onMythoStatement((statement, index, total) => {
      setMythoStatement({ statement, index, total });
    });

    const cleanupMythoResult = onMythoResult((isTrue, explanation) => {
      setLastMythoResult({ isTrue, explanation });
      showNotice(isTrue ? '✅ Vrai' : '❌ Faux', isTrue ? 'info' : 'error');
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

    const cleanupNotice = onNotice((message, tone) => {
      showNotice(message, tone ?? 'warning');
    });

    const cleanupError = onError((message) => {
      showNotice(message, 'error');
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
      cleanupMythoResult?.();
      cleanupBetRevealed?.();
      cleanupBuzzResult?.();
      cleanupDispute?.();
      cleanupResolved?.();
      cleanupShake?.();
      cleanupNotice?.();
      cleanupError?.();
    };
  }, [
    onVSIntro, onModeRoulette, onModeSelected, onRoundStarted, onRoundEnded, onGameEnded,
    onTimerTick, onAnswerResult, onChainUpdate, onMythoStatement, onMythoResult, onBetRevealed, onBuzzResult,
    onDisputeStarted, onDisputeResolved, onShake, onNotice, onError, triggerShake, showDispute, setAnswerResult,
    room, currentPlayer, showNotice, triggerAnswerPulse,
  ]);

  function getModeDuration(mode: GameMode, data: ModeData): number {
    const timers = room?.config?.timers;
    switch (mode) {
      case 'roland_gamos': return timers?.rolandGamosTurnTime ?? TIMING.ROLAND_GAMOS_TURN_TIME;
      case 'le_theme': return timers?.leThemeTurnTime ?? TIMING.LE_THEME_TURN_TIME;
      case 'mytho_pas_mytho': return timers?.mythoTime ?? TIMING.MYTHO_PAS_MYTHO_TIME;
      case 'encheres': 
        return data.type === 'encheres' && data.betState.revealed
          ? (timers?.encheresProofTime ?? TIMING.ENCHERES_PROOF_TIME)
          : (timers?.encheresBetTime ?? TIMING.ENCHERES_BET_TIME);
      case 'blind_test': return timers?.blindTestAnswerTime ?? TIMING.BLIND_TEST_ANSWER_TIME;
      case 'pixel_cover': return timers?.pixelCoverTime ?? TIMING.PIXEL_COVER_DURATION;
      case 'devine_qui': return timers?.devineQuiTime ?? TIMING.DEVINE_QUI_TURN_TIME;
      case 'continue_paroles': return timers?.continueParolesTime ?? TIMING.CONTINUE_PAROLES_TIME;
      default: return 15000;
    }
  }

  const handleSkip = useCallback(() => {
    skipTurn();
  }, [skipTurn]);

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  const { gameState, teamA, teamB } = room;
  const teamNames = room.config?.teamNames || { A: 'Equipe A', B: 'Equipe B' };
  const currentMode = gameState.currentMode;
  const isMyTurn = currentPlayer?.team === gameState.turn;
  const teamAHistory = answerLog.filter(entry => entry.team === 'A');
  const teamBHistory = answerLog.filter(entry => entry.team === 'B');
  const canSkip = (() => {
    if (currentPhase !== 'playing') return false;
    if (!currentPlayer || !currentPlayer.team || !currentMode) return false;

    if (currentMode === 'roland_gamos' || currentMode === 'le_theme' || currentMode === 'devine_qui' || currentMode === 'continue_paroles') {
      return gameState.turn === currentPlayer.team;
    }

    if (currentMode === 'encheres') {
      if (!modeData || modeData.type !== 'encheres') return false;
      if (!modeData.betState.revealed) {
        return true;
      }
      return modeData.betState.winner === currentPlayer.team;
    }

    if (currentMode === 'blind_test' || currentMode === 'pixel_cover' || currentMode === 'mytho_pas_mytho') {
      return true;
    }

    return false;
  })();

  const pulsePalette = {
    good: {
      glow: '0 0 40px rgba(34, 197, 94, 0.4), 0 20px 60px rgba(6, 8, 12, 0.6)',
      border: 'rgba(34, 197, 94, 0.6)',
      bg: 'linear-gradient(180deg, rgba(10, 30, 18, 0.96) 0%, rgba(6, 20, 12, 0.98) 100%)',
      text: '#ECFDF5',
    },
    bad: {
      glow: '0 0 40px rgba(239, 68, 68, 0.4), 0 20px 60px rgba(6, 8, 12, 0.6)',
      border: 'rgba(239, 68, 68, 0.6)',
      bg: 'linear-gradient(180deg, rgba(40, 10, 10, 0.96) 0%, rgba(25, 6, 6, 0.98) 100%)',
      text: '#FFF1F2',
    },
    dup: {
      glow: '0 0 40px rgba(242, 201, 76, 0.4), 0 20px 60px rgba(6, 8, 12, 0.6)',
      border: 'rgba(242, 201, 76, 0.65)',
      bg: 'linear-gradient(180deg, rgba(35, 28, 8, 0.96) 0%, rgba(22, 18, 4, 0.98) 100%)',
      text: '#FFFBEB',
    },
  } as const;

  const revealData = (() => {
    if (currentPhase !== 'round_result' || !currentMode || !modeData) return null;
    switch (currentMode) {
      case 'pixel_cover': {
        if (modeData.type !== 'pixel_cover' || modeData.items.length === 0) return null;
        const idx = Math.max(0, Math.min(modeData.currentIndex - 1, modeData.items.length - 1));
        const item = modeData.items[idx];
        return {
          title: 'Réponse Pixel Cover',
          lines: [
            `${item.artistName}${item.albumName ? ` — ${item.albumName}` : ''}`,
          ],
        };
      }
      case 'blind_test': {
        if (modeData.type !== 'blind_test' || modeData.tracks.length === 0) return null;
        const idx = Math.max(0, Math.min(modeData.currentIndex - 1, modeData.tracks.length - 1));
        const track = modeData.tracks[idx];
        return {
          title: 'Réponse Blind Test',
          lines: [`${track.artistName} — ${track.trackName}`],
        };
      }
      case 'devine_qui': {
        if (modeData.type !== 'devine_qui') return null;
        return {
          title: 'Rappeur à deviner',
          lines: [
            modeData.targetArtist.name,
            `Origine: ${modeData.targetArtist.clues.origin || '?'}`,
          ],
        };
      }
      case 'continue_paroles': {
        if (modeData.type !== 'continue_paroles' || modeData.snippets.length === 0) return null;
        const idx = Math.max(0, Math.min(modeData.currentIndex - 1, modeData.snippets.length - 1));
        const snippet = modeData.snippets[idx];
        return {
          title: 'Paroles',
          lines: [
            `${snippet.artistName} — ${snippet.trackTitle}`,
            snippet.answer,
          ],
        };
      }
      case 'mytho_pas_mytho': {
        if (!lastMythoResult || !mythoStatement) return null;
        return {
          title: 'Mytho / Pas Mytho',
          lines: [
            mythoStatement.statement,
            lastMythoResult.explanation,
          ],
        };
      }
      case 'le_theme': {
        if (modeData.type !== 'le_theme') return null;
        return {
          title: 'Thème',
          lines: [modeData.themeTitle],
        };
      }
      case 'encheres': {
        if (modeData.type !== 'encheres') return null;
        return {
          title: 'Thème Enchères',
          lines: [modeData.themeTitle],
        };
      }
      case 'roland_gamos': {
        if (modeData.type !== 'roland_gamos') return null;
        return {
          title: 'Dernier artiste',
          lines: [modeData.currentArtistName],
        };
      }
      default:
        return null;
    }
  })();

  // Rendu selon la phase
  const renderPhase = () => {
    switch (currentPhase) {
      case 'vs_intro':
        return (
          <VSIntro
            teamAPlayers={teamAPlayers}
            teamBPlayers={teamBPlayers}
            teamNames={teamNames}
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
              className="text-center max-w-lg"
            >
              <motion.div
                className="text-6xl mb-4"
                initial={{ y: -20 }}
                animate={{ y: 0 }}
              >
                {MODE_ICONS[selectedMode]}
              </motion.div>
              <p className="text-gray-400 mb-2 text-sm uppercase tracking-[0.2em]">Prochain mode</p>
              <h2 className="text-4xl font-bold text-white mb-4">
                {GAME_MODE_NAMES[selectedMode]}
              </h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-gray-300 text-lg leading-relaxed"
              >
                {GAME_MODE_DESCRIPTIONS[selectedMode]}
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-6"
              >
                <motion.p
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-gray-500 text-sm"
                >
                  {'Pr\u00e9parez-vous...'}
                </motion.p>
              </motion.div>
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
                <p className="rj-team-title rj-team-title-lg text-green-200">
                  {teamNames[roundResult.winner]} gagne !
                </p>
              ) : (
                <p className="text-xl text-gray-400">Égalité</p>
              )}
              <div className="mt-6 flex justify-center gap-8">
                <div className="text-center">
                  <p className="rj-team-title text-xs text-gray-300">{teamNames.A}</p>
                  <p className="text-2xl font-bold text-blue-400">
                    -{roundResult?.teamADamage || 0} HP
                  </p>
                </div>
                <div className="text-center">
                  <p className="rj-team-title text-xs text-gray-300">{teamNames.B}</p>
                  <p className="text-2xl font-bold text-red-400">
                    -{roundResult?.teamBDamage || 0} HP
                  </p>
                </div>
              </div>

              {revealData && (
                <div className="mt-8 mx-auto max-w-xl rounded-2xl border border-white/15 bg-black/30 p-4 text-left">
                  <div className="text-xs uppercase tracking-[0.2em] text-blue-200 mb-2">
                    {revealData.title}
                  </div>
                  <div className="space-y-2 text-sm text-white/90">
                    {revealData.lines.map((line, index) => (
                      <div key={`${revealData.title}-${index}`} className="font-semibold">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  <p className={`rj-team-title rj-team-title-xl ${gameWinner === 'A' ? 'text-blue-200' : 'text-amber-200'}`}>
                    {teamNames[gameWinner]}
                  </p>
                </>
              ) : (
                <p className="text-3xl text-gray-400">Match nul</p>
              )}
              <div className="mt-8 flex justify-center gap-12">
                <div className="text-center">
                  <p className="rj-team-title text-xs text-gray-300">{teamNames.A}</p>
                  <p className="text-3xl font-bold">{teamA.score} HP</p>
                </div>
                <div className="text-center">
                  <p className="rj-team-title text-xs text-gray-300">{teamNames.B}</p>
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
            lastResult={lastMythoResult}
          />
        ) : null;

      case 'encheres':
        if (modeData.type !== 'encheres') return null;
        const responderId = modeData.currentResponderId || null;
        const responderName = responderId
          ? room?.players.find(p => p.id === responderId)?.name
          : null;
        return (
          <EncheresMode
            data={modeData}
            team={currentPlayer?.team || 'A'}
            currentPlayerId={currentPlayer?.id}
            currentResponderId={responderId}
            currentResponderName={responderName}
            onSubmitBet={submitBet}
            onSubmitAnswer={submitAnswer}
            timeLeft={timeLeft}
            totalTime={totalTime}
            phase={encheresPhase}
            winner={encheresWinner}
          />
        );

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

      case 'devine_qui':
        return modeData.type === 'devine_qui' ? (
          <DevineQuiMode
            data={modeData}
            onSubmit={submitAnswer}
            timeLeft={timeLeft}
            totalTime={totalTime}
            currentTeam={gameState.turn || 'A'}
            isMyTurn={isMyTurn}
          />
        ) : null;

      case 'continue_paroles':
        return modeData.type === 'continue_paroles' ? (
          <ContinueParolesMode
            data={modeData}
            team={currentPlayer?.team || 'A'}
            turn={gameState.turn}
            onSubmitAnswer={submitAnswer}
            timeLeft={timeLeft}
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
      <div className="min-h-screen text-white overflow-hidden relative rj-game">
        {/* Retrowave Background */}
        <GameBackground />

        {/* Notice banner */}
        {notice && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4">
            <div
              className={`px-5 py-3 rounded-2xl border text-sm font-semibold shadow-lg backdrop-blur ${
                notice.tone === 'error'
                  ? 'bg-red-500/20 border-red-400/40 text-red-100'
                  : notice.tone === 'info'
                  ? 'bg-sky-500/20 border-sky-300/40 text-sky-100'
                  : 'bg-amber-400/20 border-amber-300/40 text-amber-100'
              }`}
            >
              {notice.message}
            </div>
          </div>
        )}

        {/* Header avec les HP bars */}
        <header className="p-4 border-b border-gray-800/50 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HPBar 
                team="A" 
                hp={teamA.score} 
                isActive={gameState.turn === 'A'}
                label={teamNames.A}
              />
              <HPBar 
                team="B" 
                hp={teamB.score} 
                isActive={gameState.turn === 'B'}
                label={teamNames.B}
              />
            </div>
          </div>
        </header>

        {/* Zone de jeu principale */}
        <main className="flex-1 p-4 relative z-10">
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

            {eventLog.length > 0 && (
              <div className="mb-6 flex flex-col items-center gap-3">
                {eventLog.slice().reverse().map((event) => {
                  const icon = event.tone === 'error' ? '❌' : event.tone === 'warning' ? '⚠️' : '✅';
                  return (
                    <div
                      key={event.id}
                      className={`px-5 py-3 rounded-2xl text-sm md:text-base font-semibold uppercase tracking-[0.18em] border backdrop-blur shadow-lg ${
                        event.tone === 'error'
                          ? 'bg-red-500/25 border-red-300/50 text-red-50'
                          : event.tone === 'warning'
                          ? 'bg-amber-400/25 border-amber-300/50 text-amber-50'
                          : 'bg-blue-400/25 border-blue-300/50 text-blue-50'
                      }`}
                    >
                      <span className="mr-2">{icon}</span>
                      {event.message}
                    </div>
                  );
                })}
              </div>
            )}

            {currentPhase === 'playing' && canSkip && (
              <div className="flex justify-center mb-4">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-5 py-2 rounded-full border border-amber-300/40 bg-amber-400/15 text-amber-100 text-sm font-semibold uppercase tracking-[0.2em] hover:bg-amber-400/25 transition"
                >
                  Je passe
                </button>
              </div>
            )}

            {/* Historique central */}
            {currentPhase === 'playing' && (teamAHistory.length > 0 || teamBHistory.length > 0) && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900/70 border border-cyan-500/20 rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-300 mb-3">
                    {teamNames.A}
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {teamAHistory.slice(-10).reverse().map((entry) => {
                      const statusLabel = entry.isValid ? 'BON' : entry.isDuplicate ? 'DEJA' : 'FAUX';
                      const statusIcon = entry.isValid ? '✅' : entry.isDuplicate ? '⚠️' : '❌';
                      const statusClass = entry.isValid
                        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-50'
                        : entry.isDuplicate
                        ? 'bg-amber-400/20 border-amber-300/40 text-amber-50'
                        : 'bg-red-500/20 border-red-300/40 text-red-50';
                      return (
                        <div key={entry.id} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border ${statusClass}`}>
                          <span className="text-base">{statusIcon}</span>
                          <span className="text-gray-100">{entry.playerName}:</span>
                          <span className="font-semibold">{entry.value}</span>
                          <span className="ml-auto text-[11px] font-bold tracking-[0.22em]">
                            {statusLabel}
                          </span>
                        </div>
                      );
                    })}
                    {teamAHistory.length === 0 && (
                      <div className="text-xs text-gray-500">Aucune reponse pour l'instant.</div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-900/70 border border-amber-500/20 rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-amber-300 mb-3">
                    {teamNames.B}
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {teamBHistory.slice(-10).reverse().map((entry) => {
                      const statusLabel = entry.isValid ? 'BON' : entry.isDuplicate ? 'DEJA' : 'FAUX';
                      const statusIcon = entry.isValid ? '✅' : entry.isDuplicate ? '⚠️' : '❌';
                      const statusClass = entry.isValid
                        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-50'
                        : entry.isDuplicate
                        ? 'bg-amber-400/20 border-amber-300/40 text-amber-50'
                        : 'bg-red-500/20 border-red-300/40 text-red-50';
                      return (
                        <div key={entry.id} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border ${statusClass}`}>
                          <span className="text-base">{statusIcon}</span>
                          <span className="text-gray-100">{entry.playerName}:</span>
                          <span className="font-semibold">{entry.value}</span>
                          <span className="ml-auto text-[11px] font-bold tracking-[0.22em]">
                            {statusLabel}
                          </span>
                        </div>
                      );
                    })}
                    {teamBHistory.length === 0 && (
                      <div className="text-xs text-gray-500">Aucune reponse pour l'instant.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Contenu selon la phase */}
            {renderPhase()}
          </div>
        </main>

        <AnimatePresence>
          {answerPulse && (
            <motion.div
              className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="absolute inset-0"
                style={{ background: answerPulse.tone === 'bad' ? 'rgba(239, 68, 68, 0.12)' : answerPulse.tone === 'dup' ? 'rgba(242, 201, 76, 0.12)' : 'rgba(34, 197, 94, 0.12)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              />
              <motion.div
                className="relative px-8 py-5 rounded-3xl border text-center"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                style={{
                  background: pulsePalette[answerPulse.tone].bg,
                  borderColor: pulsePalette[answerPulse.tone].border,
                  boxShadow: pulsePalette[answerPulse.tone].glow,
                  color: pulsePalette[answerPulse.tone].text,
                  backdropFilter: 'blur(10px)',
                  minWidth: '260px',
                }}
              >
                <div className="text-2xl md:text-3xl font-extrabold uppercase tracking-[0.2em]">
                  {answerPulse.message}
                </div>
                {answerPulse.sub && (
                  <div className="mt-2 text-xs md:text-sm font-semibold uppercase tracking-[0.24em] text-white/80">
                    {answerPulse.sub}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de litige */}
        <DisputeModal />

        {/* Révélation réponse adverse EN GRAND */}
        {showOpponentAnswer && opponentAnswerData && (
          <OpponentAnswerReveal
            show={showOpponentAnswer}
            team={opponentAnswerData.team}
            answer={opponentAnswerData.answer}
            playerName={opponentAnswerData.playerName}
            isCorrect={opponentAnswerData.isCorrect}
            onComplete={() => setShowOpponentAnswer(false)}
          />
        )}
      </div>
    </ScreenShake>
  );
}
