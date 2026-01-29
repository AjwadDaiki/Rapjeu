// ============================================
// ROOM MANAGER - FSM (Finite State Machine)
// Gestion des 6 modes de jeu
// ============================================

import {
  Room,
  Player,
  Team,
  TeamState,
  GameState,
  GameMode,
  GamePhase,
  ModeData,
  RolandGamosData,
  LeThemeData,
  MythoPasMythoData,
  EncheresData,
  BlindTestData,
  PixelCoverData,
  Answer,
  AnswerResult,
  DisputeState,
  SerializedRoom,
  RoundResult,
  RoomConfig,
  ChainLink,
} from '../types';
import { 
  resolveArtistByName,
  hasFeaturingWith,
  getGoodStartingArtists,
} from '../data/artists';
import { getRandomAnecdotes } from '../data/anecdotes';
import { getRandomThemes, validateAnswer, Theme } from '../data/themes';
import { generateId, fuzzyMatch, normalizeText } from './utils';
import { 
  TIMING, 
  SCORING, 
  calculateComboMultiplier,
  applyDamageWithCombo,
  DEFAULT_ROOM_CONFIG,
} from './constants';
import { getRandomTracks, getRandomAlbums } from './gameDataService';

// Types pour les événements à émettre par le serveur
type GameEvent =
  | { type: 'mytho_result'; isTrue: boolean; explanation: string; teamAScore: number; teamBScore: number }
  | { type: 'dispute_started'; dispute: DisputeState }
  | { type: 'dispute_resolved'; dispute: DisputeState; accepted: boolean; answerResult?: AnswerResult }
  | { type: 'pixel_blur_update'; blur: number; progress: number }
  | { type: 'encheres_failed'; team: Team; reason: 'timeout' | 'abandon' }
  | { type: 'chain_update'; chain: ChainLink[] }
  | { type: 'combo_update'; team: Team; combo: number; multiplier: number }
  | { type: 'room_update' };

// ============================================
// ROOM MANAGER CLASS
// ============================================

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private pixelBlurIntervals: Map<string, NodeJS.Timeout> = new Map();
  private pendingEvents: Map<string, GameEvent[]> = new Map();

  // ==========================================
  // ROOM LIFECYCLE
  // ==========================================

  createRoom(code: string, config: Partial<RoomConfig> = {}): Room {
    const roomConfig = { ...DEFAULT_ROOM_CONFIG, ...config };
    
    const room: Room = {
      id: generateId(),
      code,
      hostId: '',
      players: new Map(),
      teamA: this.createEmptyTeamState(),
      teamB: this.createEmptyTeamState(),
      spectators: [],
      gameState: {
        phase: 'lobby',
        currentMode: null,
        currentRound: 0,
        totalRounds: roomConfig.totalRounds,
        modeQueue: [],
        currentData: null,
        turn: 'A',
        winner: null,
        roundResults: [],
        timerEndsAt: null,
        timerDuration: 0,
        isTimerRunning: false,
        dispute: null,
      },
      config: roomConfig,
      createdAt: Date.now(),
    };

    this.rooms.set(code, room);
    this.pendingEvents.set(code, []);
    return room;
  }

  private createEmptyTeamState(): TeamState {
    return {
      players: [],
      score: SCORING.INITIAL_HP,
      currentInput: '',
      isInputLocked: false,
      hasUsedVeto: false,
      combo: { count: 0, multiplier: 1 },
      roundStats: { correctAnswers: 0, wrongAnswers: 0, bestCombo: 0 },
    };
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  setPlayerReady(code: string, playerId: string, ready: boolean): boolean {
    const room = this.rooms.get(code);
    if (!room) return false;
    
    const player = room.players.get(playerId);
    if (!player) return false;
    
    player.isReady = ready;
    return true;
  }

  deleteRoom(code: string): void {
    this.clearTimer(code);
    this.clearPixelBlurInterval(code);
    this.rooms.delete(code);
    this.pendingEvents.delete(code);
  }

  // Récupère et vide les événements en attente pour une room
  getAndClearPendingEvents(roomCode: string): GameEvent[] {
    const events = this.pendingEvents.get(roomCode) || [];
    this.pendingEvents.set(roomCode, []);
    return events;
  }

  serializeRoom(room: Room): SerializedRoom {
    return {
      id: room.id,
      code: room.code,
      hostId: room.hostId,
      players: Array.from(room.players.values()),
      teamA: room.teamA,
      teamB: room.teamB,
      spectators: room.spectators,
      gameState: room.gameState,
      config: room.config,
    };
  }

  private addEvent(roomCode: string, event: GameEvent): void {
    const events = this.pendingEvents.get(roomCode) || [];
    events.push(event);
    this.pendingEvents.set(roomCode, events);
  }

  // ==========================================
  // FSM - STATE TRANSITIONS
  // ==========================================

  transitionPhase(room: Room, newPhase: GamePhase, data?: unknown): void {
    const oldPhase = room.gameState.phase;
    room.gameState.phase = newPhase;
    
    console.log(`[Room ${room.code}] Phase: ${oldPhase} -> ${newPhase}`);
    
    switch (newPhase) {
      case 'vs_intro':
        this.handleVsIntro(room);
        break;
      case 'mode_roulette':
        this.handleModeRoulette(room);
        break;
      case 'mode_intro':
        this.handleModeIntro(room, data as GameMode);
        break;
      case 'playing':
        this.handlePlaying(room);
        break;
      case 'round_result':
        this.handleRoundResult(room);
        break;
      case 'final_score':
        this.handleFinalScore(room);
        break;
    }
  }

  private handleVsIntro(room: Room): void {
    // Auto-advance après 4s
    this.startTimer(room, TIMING.VS_INTRO_DURATION, () => {
      this.transitionPhase(room, 'mode_roulette');
    });
  }

  private handleModeRoulette(room: Room): void {
    // Sélectionner le prochain mode
    const nextMode = this.selectNextMode(room);
    
    // Auto-advance après 5s (temps de la roulette)
    this.startTimer(room, TIMING.MODE_ROULETTE_DURATION, () => {
      this.transitionPhase(room, 'mode_intro', nextMode);
    });
  }

  private handleModeIntro(room: Room, mode: GameMode): void {
    room.gameState.currentMode = mode;
    
    // Initialiser le mode
    this.initializeMode(room, mode);
    
    // Court délai pour lire l'intro puis jouer
    this.startTimer(room, 2000, () => {
      this.transitionPhase(room, 'playing');
    });
  }

  private handlePlaying(room: Room): void {
    const mode = room.gameState.currentMode;
    if (!mode) return;
    
    // Démarrer le timer selon le mode
    const duration = this.getModeTimerDuration(mode, room);
    this.startTimer(room, duration, () => {
      this.handleTimeout(room);
    });
  }

  private handleRoundResult(room: Room): void {
    // Nettoyer les intervals
    this.clearPixelBlurInterval(room.code);
    
    // Calculer le résultat du round
    const result = this.calculateRoundResult(room);
    room.gameState.roundResults.push(result);
    
    // Auto-advance après 5s
    this.startTimer(room, TIMING.ROUND_RESULT_DURATION, () => {
      if (room.gameState.currentRound >= room.config.totalRounds) {
        this.transitionPhase(room, 'final_score');
      } else {
        room.gameState.currentRound++;
        this.transitionPhase(room, 'mode_roulette');
      }
    });
  }

  private handleFinalScore(room: Room): void {
    const winner = room.teamA.score > room.teamB.score ? 'A' : 
                   room.teamB.score > room.teamA.score ? 'B' : null;
    room.gameState.winner = winner;
  }

  // ==========================================
  // MODE INITIALIZATION
  // ==========================================

  private initializeMode(room: Room, mode: GameMode): void {
    switch (mode) {
      case 'roland_gamos':
        this.initRolandGamos(room);
        break;
      case 'le_theme':
        this.initLeTheme(room);
        break;
      case 'mytho_pas_mytho':
        this.initMythoPasMytho(room);
        break;
      case 'encheres':
        this.initEncheres(room);
        break;
      case 'blind_test':
        this.initBlindTest(room);
        break;
      case 'pixel_cover':
        this.initPixelCover(room);
        break;
    }
  }

  // --- Roland Gamos (VRAI - chain de featurings) ---
  private initRolandGamos(room: Room): void {
    const goodArtists = getGoodStartingArtists(4);
    const startingArtist = goodArtists[Math.floor(Math.random() * Math.min(goodArtists.length, 20))];
    
    const data: RolandGamosData = {
      type: 'roland_gamos',
      startingArtistId: startingArtist.id,
      startingArtistName: startingArtist.name,
      currentArtistId: startingArtist.id,
      currentArtistName: startingArtist.name,
      chain: [],
      usedArtists: [startingArtist.id],
    };
    
    room.gameState.currentData = data;
    room.gameState.turn = 'A';
  }

  // --- Le Theme ---
  private initLeTheme(room: Room): void {
    const themes = getRandomThemes(1);
    const theme = themes[0];
    
    const data: LeThemeData = {
      type: 'le_theme',
      themeId: theme.id,
      themeTitle: theme.title,
      validAnswers: theme.validAnswers,
      aliases: theme.aliases,
      usedAnswers: [],
    };
    
    room.gameState.currentData = data;
    room.gameState.turn = 'A';
  }

  // --- Mytho/Pas Mytho ---
  private initMythoPasMytho(room: Room): void {
    const anecdotes = getRandomAnecdotes(5);
    
    const data: MythoPasMythoData = {
      type: 'mytho_pas_mytho',
      anecdotes: anecdotes.map(a => ({
        id: a.id,
        statement: a.statement,
        isTrue: a.isTrue,
        explanation: a.explanation,
      })),
      currentIndex: 0,
      teamAAnswers: [],
      teamBAnswers: [],
    };
    
    room.gameState.currentData = data;
    // Les deux équipes jouent simultanément
    room.gameState.turn = null;
  }

  // --- Enchères ---
  private initEncheres(room: Room): void {
    const themes = getRandomThemes(1);
    const theme = themes[0];
    
    const data: EncheresData = {
      type: 'encheres',
      themeId: theme.id,
      themeTitle: theme.title,
      validAnswers: theme.validAnswers,
      aliases: theme.aliases,
      betState: {
        teamABet: null,
        teamBBet: null,
        revealed: false,
        winner: null,
        targetCount: 0,
      },
      currentCount: 0,
      usedAnswers: [],
    };
    
    room.gameState.currentData = data;
    // Phase de mise d'abord
    room.gameState.turn = null;
  }

  // --- Blind Test ---
  private initBlindTest(room: Room): void {
    const tracks = getRandomTracks(5);
    
    const data: BlindTestData = {
      type: 'blind_test',
      tracks: tracks.map(t => ({
        id: t.id,
        previewUrl: t.previewUrl || '',
        artistName: t.artistName,
        trackName: t.name,
        coverUrl: t.coverUrl || undefined,
      })),
      currentIndex: 0,
      buzzState: {
        buzzedTeam: null,
        buzzedAt: 0,
        audioPosition: 0,
      },
    };
    
    room.gameState.currentData = data;
    room.gameState.turn = null; // Free for all jusqu'au buzz
  }

  // --- Pixel Cover ---
  private initPixelCover(room: Room): void {
    const albums = getRandomAlbums(5);
    
    const data: PixelCoverData = {
      type: 'pixel_cover',
      items: albums.map(a => ({
        id: a.id,
        imageUrl: a.coverUrl || '',
        artistName: a.artistName,
        albumName: a.name,
      })),
      currentIndex: 0,
      pixelState: {
        currentBlur: 30,
        maxBlur: 30,
        startTime: Date.now(),
        duration: TIMING.PIXEL_COVER_DURATION,
        answered: false,
      },
    };
    
    room.gameState.currentData = data;
    room.gameState.turn = null; // Free for all
    
    // Démarrer l'animation de blur
    this.startPixelBlurUpdate(room);
  }

  // ==========================================
  // GAMEPLAY - ANSWERS
  // ==========================================

  submitAnswer(roomCode: string, team: Team, answer: string, playerId: string): AnswerResult | null {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState.currentData) return null;
    
    const mode = room.gameState.currentMode;
    if (!mode) return null;
    
    // Vérifier anti-spam
    const player = room.players.get(playerId);
    if (player && Date.now() - (player.lastAnswerAt || 0) < TIMING.ANTI_SPAM_COOLDOWN) {
      return null;
    }
    if (player) player.lastAnswerAt = Date.now();
    
    switch (mode) {
      case 'roland_gamos':
        return this.submitRolandGamosAnswer(room, team, answer, playerId);
      case 'le_theme':
        return this.submitLeThemeAnswer(room, team, answer, playerId);
      case 'mytho_pas_mytho':
        return null; // Géré différemment
      case 'encheres':
        return this.submitEncheresAnswer(room, team, answer, playerId);
      case 'blind_test':
        return this.submitBlindTestAnswer(room, team, answer, playerId);
      case 'pixel_cover':
        return this.submitPixelCoverAnswer(room, team, answer, playerId);
      default:
        return null;
    }
  }

  // --- Roland Gamos Answer ---
  private submitRolandGamosAnswer(room: Room, team: Team, answer: string, playerId: string): AnswerResult | null {
    const data = room.gameState.currentData as RolandGamosData;
    
    // Vérifier que c'est le tour de l'équipe
    if (room.gameState.turn !== team) return null;
    
    // Résoudre l'artiste
    const artist = resolveArtistByName(answer);
    if (!artist) {
      return this.createInvalidResult(room, team, answer, playerId);
    }
    
    // Vérifier si l'artiste a déjà été utilisé
    if (data.usedArtists.includes(artist.id)) {
      return this.createDuplicateResult(room, team, answer, playerId);
    }
    
    // Vérifier si l'artiste a un featuring avec l'artiste courant
    if (!hasFeaturingWith(data.currentArtistId, artist.id)) {
      return this.createInvalidResult(room, team, answer, playerId);
    }
    
    // C'est valide !
    const chainLink: ChainLink = {
      artistId: artist.id,
      artistName: artist.name,
      answeredBy: team,
      answerTime: Date.now(),
    };
    
    data.chain.push(chainLink);
    data.usedArtists.push(artist.id);
    data.currentArtistId = artist.id;
    data.currentArtistName = artist.name;
    
    // Reset timer
    this.clearTimer(room.code);
    
    // Changer de tour
    room.gameState.turn = team === 'A' ? 'B' : 'A';
    
    // Redémarrer timer
    this.startTimer(room, TIMING.ROLAND_GAMOS_TURN_TIME, () => {
      this.handleTimeout(room);
    });
    
    // Émettre la mise à jour de la chaîne
    this.addEvent(room.code, { type: 'chain_update', chain: data.chain });
    
    return this.createValidResult(room, team, answer, playerId, SCORING.RG_VALID_ANSWER_DAMAGE);
  }

  // --- Le Theme Answer ---
  private submitLeThemeAnswer(room: Room, team: Team, answer: string, playerId: string): AnswerResult | null {
    const data = room.gameState.currentData as LeThemeData;
    
    if (room.gameState.turn !== team) return null;
    
    const validation = validateAnswer({ 
      validAnswers: data.validAnswers, 
      aliases: data.aliases 
    } as Theme, answer);
    
    if (!validation.isValid) {
      return this.createInvalidResult(room, team, answer, playerId);
    }
    
    // Vérifier doublon
    if (data.usedAnswers.includes(validation.matchedAnswer!)) {
      return this.createDuplicateResult(room, team, answer, playerId);
    }
    
    data.usedAnswers.push(validation.matchedAnswer!);
    
    // Reset timer et changer tour
    this.clearTimer(room.code);
    room.gameState.turn = team === 'A' ? 'B' : 'A';
    this.startTimer(room, TIMING.LE_THEME_TURN_TIME, () => {
      this.handleTimeout(room);
    });
    
    return this.createValidResult(room, team, answer, playerId, SCORING.THEME_VALID_ANSWER_DAMAGE);
  }

  // --- Enchères Answer ---
  private submitEncheresAnswer(room: Room, team: Team, answer: string, playerId: string): AnswerResult | null {
    const data = room.gameState.currentData as EncheresData;
    
    // Vérifier que c'est l'équipe qui a gagné les enchères
    if (data.betState.winner !== team) return null;
    
    const validation = validateAnswer({
      validAnswers: data.validAnswers,
      aliases: data.aliases,
    } as Theme, answer);
    
    if (!validation.isValid) {
      return this.createInvalidResult(room, team, answer, playerId);
    }
    
    if (data.usedAnswers.includes(validation.matchedAnswer!)) {
      return this.createDuplicateResult(room, team, answer, playerId);
    }
    
    data.usedAnswers.push(validation.matchedAnswer!);
    data.currentCount++;
    
    // Vérifier si objectif atteint
    if (data.currentCount >= data.betState.targetCount) {
      // Bonus pour avoir réussi
      const bonusResult = this.createValidResult(room, team, answer, playerId, SCORING.ENCHERES_SUCCESS_BONUS);
      this.endRound(room);
      return bonusResult;
    }
    
    return this.createValidResult(room, team, answer, playerId, SCORING.ENCHERES_VALID_DAMAGE);
  }

  // --- Blind Test Answer ---
  private submitBlindTestAnswer(room: Room, team: Team, answer: string, playerId: string): AnswerResult | null {
    const data = room.gameState.currentData as BlindTestData;
    
    // Vérifier que c'est l'équipe qui a buzzé
    if (data.buzzState.buzzedTeam !== team) return null;
    
    const currentTrack = data.tracks[data.currentIndex];
    if (!currentTrack) return null;
    
    // Validation: comparer avec artistName (fuzzy matching)
    const normalizedAnswer = normalizeText(answer);
    const normalizedArtist = normalizeText(currentTrack.artistName);
    
    // Accepter si le nom de l'artiste correspond (avec tolérance)
    const isCorrect = normalizedAnswer === normalizedArtist || 
                      normalizedAnswer.includes(normalizedArtist) || 
                      normalizedArtist.includes(normalizedAnswer) ||
                      fuzzyMatch(answer, [currentTrack.artistName], {}).isValid;
    
    if (isCorrect) {
      // Passer à la track suivante ou finir le round
      data.currentIndex++;
      data.buzzState.buzzedTeam = null;
      
      if (data.currentIndex >= data.tracks.length) {
        this.endRound(room);
      }
      
      return this.createValidResult(room, team, answer, playerId, SCORING.BT_CORRECT_DAMAGE);
    } else {
      // Mauvaise réponse: pénalité et reprendre le buzz
      data.buzzState.buzzedTeam = null;
      return this.createInvalidBlindTestResult(room, team, answer, playerId);
    }
  }

  // --- Pixel Cover Answer ---
  private submitPixelCoverAnswer(room: Room, team: Team, answer: string, playerId: string): AnswerResult | null {
    const data = room.gameState.currentData as PixelCoverData;
    
    if (data.pixelState.answered) return null;
    
    const currentItem = data.items[data.currentIndex];
    if (!currentItem) return null;
    
    // Validation: comparer avec artistName ou albumName
    const normalizedAnswer = normalizeText(answer);
    const normalizedArtist = normalizeText(currentItem.artistName);
    const normalizedAlbum = currentItem.albumName ? normalizeText(currentItem.albumName) : '';
    
    const isCorrect = 
      normalizedAnswer === normalizedArtist ||
      normalizedAnswer === normalizedAlbum ||
      normalizedAnswer.includes(normalizedArtist) ||
      normalizedArtist.includes(normalizedAnswer) ||
      (normalizedAlbum && (normalizedAnswer.includes(normalizedAlbum) || normalizedAlbum.includes(normalizedAnswer))) ||
      fuzzyMatch(answer, [currentItem.artistName, ...(currentItem.albumName ? [currentItem.albumName] : [])], {}).isValid;
    
    if (isCorrect) {
      data.pixelState.answered = true;
      this.clearTimer(room.code);
      this.clearPixelBlurInterval(room.code);
      
      // Calculer les points selon le blur restant (plus c'est flou = plus de points)
      const blurProgress = data.pixelState.currentBlur / data.pixelState.maxBlur;
      const points = Math.round(SCORING.PC_MIN_POINTS + (SCORING.PC_MAX_POINTS - SCORING.PC_MIN_POINTS) * blurProgress);
      
      // Passer à l'image suivante ou finir
      data.currentIndex++;
      if (data.currentIndex >= data.items.length) {
        this.endRound(room);
      } else {
        // Reset pour la prochaine image
        data.pixelState.answered = false;
        data.pixelState.currentBlur = 30;
        data.pixelState.startTime = Date.now();
        this.startPixelBlurUpdate(room);
        // Relancer le timer pour la prochaine cover
        this.startTimer(room, TIMING.PIXEL_COVER_DURATION, () => {
          this.handleTimeout(room);
        });
      }
      
      return this.createValidResult(room, team, answer, playerId, points);
    }
    
    return this.createInvalidResult(room, team, answer, playerId);
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private createValidResult(room: Room, team: Team, value: string, playerId: string, baseDamage: number): AnswerResult {
    const teamState = team === 'A' ? room.teamA : room.teamB;
    const opponentState = team === 'A' ? room.teamB : room.teamA;
    
    // Update combo
    teamState.combo.count++;
    teamState.combo.multiplier = calculateComboMultiplier(teamState.combo.count);
    teamState.roundStats.correctAnswers++;
    if (teamState.combo.count > teamState.roundStats.bestCombo) {
      teamState.roundStats.bestCombo = teamState.combo.count;
    }
    
    // Calculate damage with combo
    const damage = applyDamageWithCombo(baseDamage, teamState.combo.multiplier);
    
    // Apply damage to opponent
    opponentState.score = Math.max(SCORING.MIN_HP, opponentState.score - damage);
    
    // Émettre l'événement combo
    this.addEvent(room.code, { 
      type: 'combo_update', 
      team, 
      combo: teamState.combo.count, 
      multiplier: teamState.combo.multiplier 
    });
    this.addEvent(room.code, { type: 'room_update' });
    
    return {
      answer: this.createAnswer(value, playerId, team, true, false),
      team,
      damageDealt: damage,
      newScore: teamState.score,
      opponentScore: opponentState.score,
      feedback: 'valid',
      comboUpdated: true,
      newCombo: teamState.combo.count,
    };
  }

  private createInvalidResult(room: Room, team: Team, value: string, playerId: string): AnswerResult {
    const teamState = team === 'A' ? room.teamA : room.teamB;
    
    // Reset combo
    teamState.combo.count = 0;
    teamState.combo.multiplier = 1;
    teamState.roundStats.wrongAnswers++;
    
    // Self-damage
    const damage = SCORING.RG_INVALID_ANSWER_DAMAGE;
    teamState.score = Math.max(SCORING.MIN_HP, teamState.score - damage);
    
    // Émettre l'événement combo (reset)
    this.addEvent(room.code, { 
      type: 'combo_update', 
      team, 
      combo: 0, 
      multiplier: 1 
    });
    this.addEvent(room.code, { type: 'room_update' });
    
    return {
      answer: this.createAnswer(value, playerId, team, false, false),
      team,
      damageDealt: damage,
      newScore: teamState.score,
      opponentScore: team === 'A' ? room.teamB.score : room.teamA.score,
      feedback: 'invalid',
      comboUpdated: true,
      newCombo: 0,
    };
  }

  private createInvalidBlindTestResult(room: Room, team: Team, value: string, playerId: string): AnswerResult {
    const teamState = team === 'A' ? room.teamA : room.teamB;
    
    // Reset combo
    teamState.combo.count = 0;
    teamState.combo.multiplier = 1;
    teamState.roundStats.wrongAnswers++;
    
    // Self-damage spécifique Blind Test
    const damage = SCORING.BT_WRONG_DAMAGE;
    teamState.score = Math.max(SCORING.MIN_HP, teamState.score - damage);
    
    // Émettre l'événement combo (reset)
    this.addEvent(room.code, { 
      type: 'combo_update', 
      team, 
      combo: 0, 
      multiplier: 1 
    });
    this.addEvent(room.code, { type: 'room_update' });
    
    return {
      answer: this.createAnswer(value, playerId, team, false, false),
      team,
      damageDealt: damage,
      newScore: teamState.score,
      opponentScore: team === 'A' ? room.teamB.score : room.teamA.score,
      feedback: 'invalid',
      comboUpdated: true,
      newCombo: 0,
    };
  }

  private createDuplicateResult(room: Room, team: Team, value: string, playerId: string): AnswerResult {
    const teamState = team === 'A' ? room.teamA : room.teamB;
    
    return {
      answer: this.createAnswer(value, playerId, team, false, true),
      team,
      damageDealt: 0,
      newScore: teamState.score,
      opponentScore: team === 'A' ? room.teamB.score : room.teamA.score,
      feedback: 'duplicate',
      comboUpdated: false,
      newCombo: teamState.combo.count,
    };
  }

  private createAnswer(value: string, playerId: string, team: Team, isValid: boolean, isDuplicate: boolean): Answer {
    return {
      id: generateId(),
      playerId,
      team,
      value,
      normalizedValue: value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      timestamp: Date.now(),
      isValid,
      isDuplicate,
      similarityScore: 1,
      round: 0,
    };
  }

  // ==========================================
  // TIMER MANAGEMENT
  // ==========================================

  private startTimer(room: Room, duration: number, callback: () => void): void {
    this.clearTimer(room.code);
    
    room.gameState.timerEndsAt = Date.now() + duration;
    room.gameState.timerDuration = duration;
    room.gameState.isTimerRunning = true;
    
    const timer = setTimeout(() => {
      callback();
    }, duration);
    
    this.timers.set(room.code, timer);
  }

  private clearTimer(roomCode: string): void {
    const timer = this.timers.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(roomCode);
    }
  }

  private clearPixelBlurInterval(roomCode: string): void {
    const interval = this.pixelBlurIntervals.get(roomCode);
    if (interval) {
      clearInterval(interval);
      this.pixelBlurIntervals.delete(roomCode);
    }
  }

  private handleTimeout(room: Room): void {
    const mode = room.gameState.currentMode;
    if (!mode) return;
    
    // Apply timeout damage to team whose turn it was
    if (room.gameState.turn) {
      const teamState = room.gameState.turn === 'A' ? room.teamA : room.teamB;
      const damage = mode === 'roland_gamos' ? SCORING.RG_TIMEOUT_DAMAGE : SCORING.THEME_TIMEOUT_DAMAGE;
      teamState.score = Math.max(SCORING.MIN_HP, teamState.score - damage);
      teamState.combo.count = 0;
      teamState.combo.multiplier = 1;
    }
    
    // Gestion spéciale pour les enchères (échec si timeout pendant proof)
    if (mode === 'encheres') {
      const data = room.gameState.currentData as EncheresData;
      if (data.betState.winner && data.currentCount < data.betState.targetCount) {
        // Échec des enchères - gros dégâts pour l'équipe qui n'a pas tenu sa promesse
        const losingTeam = data.betState.winner;
        const teamState = losingTeam === 'A' ? room.teamA : room.teamB;
        teamState.score = Math.max(SCORING.MIN_HP, teamState.score - SCORING.ENCHERES_FAIL_DAMAGE);
        this.addEvent(room.code, { 
          type: 'encheres_failed', 
          team: losingTeam, 
          reason: 'timeout' 
        });
      }
    }
    
    // End round or switch turn depending on mode
    if (mode === 'roland_gamos' || mode === 'le_theme') {
      // Switch turn
      room.gameState.turn = room.gameState.turn === 'A' ? 'B' : 'A';
      const duration = mode === 'roland_gamos' ? TIMING.ROLAND_GAMOS_TURN_TIME : TIMING.LE_THEME_TURN_TIME;
      this.startTimer(room, duration, () => {
        this.handleTimeout(room);
      });
      this.addEvent(room.code, { type: 'room_update' });
    } else {
      this.endRound(room);
    }
  }

  private startPixelBlurUpdate(room: Room): void {
    this.clearPixelBlurInterval(room.code);
    
    const data = room.gameState.currentData as PixelCoverData;
    if (!data || data.pixelState.answered) return;
    
    const updateInterval = 500; // Update every 500ms
    const steps = TIMING.PIXEL_COVER_DURATION / updateInterval;
    const blurDecrement = data.pixelState.maxBlur / steps;
    
    const interval = setInterval(() => {
      if (data.pixelState.answered || data.pixelState.currentBlur <= 0) {
        clearInterval(interval);
        return;
      }
      
      data.pixelState.currentBlur = Math.max(0, data.pixelState.currentBlur - blurDecrement);
      const progress = 1 - (data.pixelState.currentBlur / data.pixelState.maxBlur);
      
      // Ajouter l'événement pour broadcast
      this.addEvent(room.code, {
        type: 'pixel_blur_update',
        blur: data.pixelState.currentBlur,
        progress: progress,
      });
    }, updateInterval);
    
    this.pixelBlurIntervals.set(room.code, interval);
  }

  // ==========================================
  // ROUND & MATCH MANAGEMENT
  // ==========================================

  startMatch(room: Room): void {
    // Shuffle modes
    room.gameState.modeQueue = [...room.config.modes].sort(() => Math.random() - 0.5);
    room.gameState.currentRound = 1;
    
    // Reset scores
    room.teamA.score = SCORING.INITIAL_HP;
    room.teamB.score = SCORING.INITIAL_HP;
    room.teamA.combo = { count: 0, multiplier: 1 };
    room.teamB.combo = { count: 0, multiplier: 1 };
    room.teamA.roundStats = { correctAnswers: 0, wrongAnswers: 0, bestCombo: 0 };
    room.teamB.roundStats = { correctAnswers: 0, wrongAnswers: 0, bestCombo: 0 };
    
    // Reset veto
    room.teamA.hasUsedVeto = false;
    room.teamB.hasUsedVeto = false;
    
    this.transitionPhase(room, 'vs_intro');
  }

  private selectNextMode(room: Room): GameMode {
    const roundIndex = room.gameState.currentRound - 1;
    if (roundIndex < room.gameState.modeQueue.length) {
      return room.gameState.modeQueue[roundIndex];
    }
    // Random if not enough modes in queue
    return room.config.modes[Math.floor(Math.random() * room.config.modes.length)];
  }

  private getModeTimerDuration(mode: GameMode, room: Room): number {
    switch (mode) {
      case 'roland_gamos': return TIMING.ROLAND_GAMOS_TURN_TIME;
      case 'le_theme': return TIMING.LE_THEME_TURN_TIME;
      case 'mytho_pas_mytho': return TIMING.MYTHO_PAS_MYTHO_TIME;
      case 'encheres': {
        const data = room.gameState.currentData as EncheresData;
        return data?.betState?.revealed ? TIMING.ENCHERES_PROOF_TIME : TIMING.ENCHERES_BET_TIME;
      }
      case 'blind_test': return TIMING.BLIND_TEST_ANSWER_TIME;
      case 'pixel_cover': return TIMING.PIXEL_COVER_DURATION;
      default: return 15000;
    }
  }

  private endRound(room: Room): void {
    this.transitionPhase(room, 'round_result');
  }

  private calculateRoundResult(room: Room): RoundResult {
    const mode = room.gameState.currentMode!;
    const teamAScore = room.teamA.score;
    const teamBScore = room.teamB.score;
    
    let winner: Team | null = null;
    if (teamAScore > teamBScore) winner = 'A';
    else if (teamBScore > teamAScore) winner = 'B';
    
    return {
      roundNumber: room.gameState.currentRound,
      mode,
      winner,
      teamADamage: SCORING.INITIAL_HP - teamAScore,
      teamBDamage: SCORING.INITIAL_HP - teamBScore,
      teamACombo: room.teamA.roundStats.bestCombo,
      teamBCombo: room.teamB.roundStats.bestCombo,
    };
  }

  // ==========================================
  // DISPUTE SYSTEM (VETO)
  // ==========================================

  startDispute(roomCode: string, answerId: string, proposingTeam: Team): DisputeState | null {
    const room = this.rooms.get(roomCode);
    if (!room || !room.config.allowVeto) return null;
    
    const teamState = proposingTeam === 'A' ? room.teamA : room.teamB;
    if (teamState.hasUsedVeto) return null;
    
    // Chercher la réponse dans l'historique (simplifié - on prend la dernière réponse adverse)
    const lastAnswer = this.findLastOpponentAnswer(room, proposingTeam);
    if (!lastAnswer) return null;
    
    // Créer le litige
    const dispute: DisputeState = {
      id: generateId(),
      answer: lastAnswer,
      proposingTeam,
      votingTeam: proposingTeam === 'A' ? 'B' : 'A',
      proposedAt: Date.now(),
      status: 'pending',
      votes: { yes: 0, no: 0 },
    };
    
    room.gameState.dispute = dispute;
    teamState.hasUsedVeto = true; // Consommer le veto
    
    // Timer pour auto-rejet après 10s si pas de vote
    this.startTimer(room, 10000, () => {
      if (room.gameState.dispute?.id === dispute.id) {
        this.resolveDispute(roomCode, false);
      }
    });
    
    this.addEvent(roomCode, { type: 'dispute_started', dispute });
    return dispute;
  }

  private findLastOpponentAnswer(room: Room, proposingTeam: Team): Answer | null {
    // Dans une implémentation réelle, on stockerait l'historique des réponses
    // Pour l'instant, on crée une réponse fictive basée sur la dernière action
    // Ceci est une simplification - idéalement il faudrait un historique complet
    return null;
  }

  voteDispute(roomCode: string, accept: boolean): DisputeState | null {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState.dispute) return null;
    
    const dispute = room.gameState.dispute;
    
    if (accept) {
      dispute.votes.yes++;
    } else {
      dispute.votes.no++;
    }
    
    // Si majorité de votes (simplifié: 1 vote suffit pour décider)
    // En vrai, il faudrait attendre que tous les joueurs de l'équipe votent
    const accepted = dispute.votes.yes > dispute.votes.no;
    this.resolveDispute(roomCode, accepted);
    
    return dispute;
  }

  private resolveDispute(roomCode: string, accepted: boolean): void {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState.dispute) return;
    
    const dispute = room.gameState.dispute;
    dispute.status = accepted ? 'accepted' : 'rejected';
    
    let answerResult: AnswerResult | undefined;
    
    if (accepted) {
      // La réponse contestée est invalidée
      // On inverse les dégâts (à implémenter selon la logique exacte)
      // Simplification: on enlève des HP à l'équipe qui avait réussi la réponse
      const cheatingTeam = dispute.answer.team;
      const damage = dispute.answer.isValid ? 15 : 0; // Dégâts à reverser
      if (damage > 0) {
        const teamState = cheatingTeam === 'A' ? room.teamA : room.teamB;
        teamState.score = Math.max(SCORING.MIN_HP, teamState.score - damage);
      }
    }
    
    this.addEvent(roomCode, { type: 'dispute_resolved', dispute, accepted, answerResult });
    
    // Nettoyer le litige après un délai
    setTimeout(() => {
      if (room.gameState.dispute?.id === dispute.id) {
        room.gameState.dispute = null;
      }
    }, 3000);
  }

  // ==========================================
  // OTHER METHODS
  // ==========================================

  submitBet(roomCode: string, team: Team, bet: number): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.gameState.currentMode !== 'encheres') return false;
    
    const data = room.gameState.currentData as EncheresData;
    
    if (team === 'A') {
      data.betState.teamABet = bet;
    } else {
      data.betState.teamBBet = bet;
    }
    this.addEvent(roomCode, { type: 'room_update' });
    
    // If both bets are in, reveal
    if (data.betState.teamABet !== null && data.betState.teamBBet !== null) {
      this.revealBets(room);
    }
    
    return true;
  }

  private revealBets(room: Room): void {
    const data = room.gameState.currentData as EncheresData;
    data.betState.revealed = true;
    
    const betA = data.betState.teamABet!;
    const betB = data.betState.teamBBet!;
    
    // Determine winner
    if (betA > betB) {
      data.betState.winner = 'A';
      data.betState.targetCount = betA;
    } else if (betB > betA) {
      data.betState.winner = 'B';
      data.betState.targetCount = betB;
    } else {
      // Tie - coin flip
      data.betState.winner = Math.random() > 0.5 ? 'A' : 'B';
      data.betState.targetCount = betA;
    }
    
    // Start proof phase
    room.gameState.turn = data.betState.winner;
    this.startTimer(room, TIMING.ENCHERES_PROOF_TIME, () => {
      this.handleTimeout(room);
    });
    this.addEvent(room.code, { type: 'room_update' });
  }

  submitMythoAnswer(roomCode: string, team: Team, isTrue: boolean): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.gameState.currentMode !== 'mytho_pas_mytho') return false;
    
    const data = room.gameState.currentData as MythoPasMythoData;
    
    if (team === 'A') {
      data.teamAAnswers[data.currentIndex] = isTrue;
    } else {
      data.teamBAnswers[data.currentIndex] = isTrue;
    }
    
    // Check if both answered
    if (data.teamAAnswers[data.currentIndex] !== undefined && 
        data.teamBAnswers[data.currentIndex] !== undefined) {
      this.advanceMytho(room);
    }
    
    return true;
  }

  private advanceMytho(room: Room): void {
    const data = room.gameState.currentData as MythoPasMythoData;
    const current = data.anecdotes[data.currentIndex];
    
    // Score answers
    const teamAAnswer = data.teamAAnswers[data.currentIndex];
    const teamBAnswer = data.teamBAnswers[data.currentIndex];
    
    if (teamAAnswer === current.isTrue) {
      room.teamB.score = Math.max(SCORING.MIN_HP, room.teamB.score - SCORING.MYTHO_CORRECT_DAMAGE);
    } else {
      room.teamA.score = Math.max(SCORING.MIN_HP, room.teamA.score - SCORING.MYTHO_WRONG_DAMAGE);
    }
    
    if (teamBAnswer === current.isTrue) {
      room.teamA.score = Math.max(SCORING.MIN_HP, room.teamA.score - SCORING.MYTHO_CORRECT_DAMAGE);
    } else {
      room.teamB.score = Math.max(SCORING.MIN_HP, room.teamB.score - SCORING.MYTHO_WRONG_DAMAGE);
    }
    
    // Émettre le résultat pour cette anecdote
    this.addEvent(room.code, {
      type: 'mytho_result',
      isTrue: current.isTrue,
      explanation: current.explanation,
      teamAScore: room.teamA.score,
      teamBScore: room.teamB.score,
    });
    this.addEvent(room.code, { type: 'room_update' });
    
    data.currentIndex++;
    
    if (data.currentIndex >= data.anecdotes.length) {
      this.endRound(room);
    }
  }

  handleBuzz(roomCode: string, team: Team): { buzzedTeam: Team; timeLeft: number } | null {
    const room = this.rooms.get(roomCode);
    if (!room || room.gameState.currentMode !== 'blind_test') return null;
    
    const data = room.gameState.currentData as BlindTestData;
    if (data.buzzState.buzzedTeam) return null;
    
    data.buzzState.buzzedTeam = team;
    data.buzzState.buzzedAt = Date.now();
    
    this.clearTimer(roomCode);
    
    // Démarrer le timer de réponse
    this.startTimer(room, TIMING.BLIND_TEST_ANSWER_TIME, () => {
      // Timeout sur la réponse = mauvaise réponse
      data.buzzState.buzzedTeam = null;
      this.handleTimeout(room);
    });
    
    return {
      buzzedTeam: team,
      timeLeft: TIMING.BLIND_TEST_ANSWER_TIME,
    };
  }
}
