// @ts-nocheck
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
  DevineQuiData,
  DevineQuiAttempt,
  ContinueParolesData,
  Answer,
  AnswerResult,
  DisputeState,
  SerializedRoom,
  RoundResult,
  RoomConfig,
  ChainLink,
} from '../types';
import { getRandomAnecdotes } from './mythoService';
import { generateId, fuzzyMatch, normalizeText } from './utils';
import {
  TIMING,
  SCORING,
  VISUAL,
  calculateComboMultiplier,
  applyDamageWithCombo,
  DEFAULT_ROOM_CONFIG,
} from './constants';
import { getRandomTracks, getRandomAlbums } from './gameDataService';
import { getRandomLyricsSnippets } from './contentAggregator';
import * as mongo from './mongoService';
import * as themeService from './themeService';
import { Theme } from '../types';

const MAX_RG_CHAIN = 999;
const MAX_THEME_ANSWERS = 12;
const MAX_DEVINE_QUI_ATTEMPTS = 5;
const MAX_CONTINUE_PAROLES = 5;
const QUICK_REVEAL_DURATION = 2000;

// Types pour les Ã©vÃ©nements Ã  Ã©mettre par le serveur
type GameEvent =
  | { type: 'mytho_result'; isTrue: boolean; explanation: string; teamAScore: number; teamBScore: number }
  | { type: 'dispute_started'; dispute: DisputeState }
  | { type: 'dispute_resolved'; dispute: DisputeState; accepted: boolean; answerResult?: AnswerResult }
  | { type: 'pixel_blur_update'; blur: number; progress: number }
  | { type: 'encheres_failed'; team: Team; reason: 'timeout' | 'abandon' }
  | { type: 'chain_update'; chain: ChainLink[] }
  | { type: 'combo_update'; team: Team; combo: number; multiplier: number }
  | { type: 'notice'; message: string; tone?: 'info' | 'warning' | 'error' }
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
    const roomConfig = {
      ...DEFAULT_ROOM_CONFIG,
      ...config,
      teamNames: {
        ...(DEFAULT_ROOM_CONFIG.teamNames || { A: 'Equipe A', B: 'Equipe B' }),
        ...(config.teamNames || {}),
      },
      timers: {
        ...DEFAULT_ROOM_CONFIG.timers,
        ...(config.timers || {}),
      },
    };
    
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
        roundDamage: { A: 0, B: 0, cap: SCORING.MAX_DAMAGE_PER_MODE },
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

  private resetRoundDamage(room: Room): void {
    room.gameState.roundDamage = {
      A: 0,
      B: 0,
      cap: SCORING.MAX_DAMAGE_PER_MODE,
    };
  }

  private applyRoundDamage(room: Room, team: Team, damage: number): number {
    if (!room.gameState.roundDamage) {
      this.resetRoundDamage(room);
    }

    const cap = room.gameState.roundDamage.cap ?? SCORING.MAX_DAMAGE_PER_MODE;
    const current = room.gameState.roundDamage[team] ?? 0;
    const remaining = Math.max(0, cap - current);
    const applied = Math.max(0, Math.min(damage, remaining));

    room.gameState.roundDamage[team] = current + applied;

    const teamState = team === 'A' ? room.teamA : room.teamB;
    teamState.score = Math.max(SCORING.MIN_HP, teamState.score - applied);

    if (room.teamA.score <= 0 || room.teamB.score <= 0) {
      this.checkForKnockout(room);
      return applied;
    }

    if (room.gameState.roundDamage[team] >= cap) {
      this.endRound(room);
    }

    return applied;
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

  // RÃ©cupÃ¨re et vide les Ã©vÃ©nements en attente pour une room
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

  async transitionPhase(room: Room, newPhase: GamePhase, data?: unknown): Promise<void> {
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
        await this.handleModeIntro(room, data as GameMode);
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
    // Auto-advance aprÃ¨s 4s
    this.startTimer(room, TIMING.VS_INTRO_DURATION, () => {
      this.transitionPhase(room, 'mode_roulette');
    });
  }

  private handleModeRoulette(room: Room): void {
    // SÃ©lectionner le prochain mode
    const nextMode = this.selectNextMode(room);
    
    // Auto-advance aprÃ¨s 5s (temps de la roulette)
    this.startTimer(room, TIMING.MODE_ROULETTE_DURATION, () => {
      this.transitionPhase(room, 'mode_intro', nextMode);
    });
  }

  private async handleModeIntro(room: Room, mode: GameMode): Promise<void> {
    room.gameState.currentMode = mode;
    this.resetRoundDamage(room);

    // Initialiser le mode
    await this.initializeMode(room, mode);

    // Court dÃ©lai pour lire l'intro puis jouer
    this.startTimer(room, 2000, () => {
      this.transitionPhase(room, 'playing');
    });
  }

  private handlePlaying(room: Room): void {
    const mode = room.gameState.currentMode;
    if (!mode) return;
    
    // DÃ©marrer le timer selon le mode
    const duration = this.getModeTimerDuration(mode, room);
    this.startTimer(room, duration, () => {
      void this.handleTimeout(room);
    });
  }

  private handleRoundResult(room: Room): void {
    // Nettoyer les intervals
    this.clearPixelBlurInterval(room.code);
    
    // Calculer le rÃ©sultat du round
    const result = this.calculateRoundResult(room);
    room.gameState.roundResults.push(result);
    
    // Auto-advance aprÃ¨s 5s
    this.startTimer(room, TIMING.ROUND_RESULT_DURATION, () => {
      if (room.gameState.currentRound >= room.gameState.totalRounds) {
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

  private async initializeMode(room: Room, mode: GameMode): Promise<void> {
    switch (mode) {
      case 'roland_gamos':
        await this.initRolandGamos(room);
        break;
      case 'le_theme':
        await this.initLeTheme(room);
        break;
      case 'mytho_pas_mytho':
        this.initMythoPasMytho(room);
        break;
      case 'encheres':
        await this.initEncheres(room);
        break;
      case 'blind_test':
        await this.initBlindTest(room);
        break;
      case 'pixel_cover':
        await this.initPixelCover(room);
        break;
      case 'devine_qui':
        await this.initDevineQui(room);
        break;
      case 'continue_paroles':
        await this.initContinueParoles(room);
        break;
    }
  }

  // --- Roland Gamos (VRAI - chain de featurings) ---
  private async initRolandGamos(room: Room): Promise<void> {
    const goodArtists = await mongo.getGoodStartingArtists(4);
    if (!goodArtists.length) {
      console.warn('[RolandGamos] Aucun artiste de dÃ©part trouvÃ©.');
      return;
    }
    const startingArtist = this.pickRolandGamosStarter(goodArtists);
    if (!startingArtist) {
      console.warn('[RolandGamos] Aucun artiste de d?part filtr?.');
      return;
    }

    const data: RolandGamosData = {
      type: 'roland_gamos',
      startingArtistId: startingArtist.spotifyId,
      startingArtistName: startingArtist.name,
      currentArtistId: startingArtist.spotifyId,
      currentArtistName: startingArtist.name,
      chain: [],
      usedArtists: [startingArtist.spotifyId],
      noAnswerStreak: 0,
      maxChain: MAX_RG_CHAIN,
    };

    room.gameState.currentData = data;
    room.gameState.turn = 'A';
  }

  // --- Le Theme ---
  private async initLeTheme(room: Room): Promise<void> {
    const themes = await themeService.getRandomThemes(1);
    const theme = themes[0];
    if (!theme) {
      console.warn('[LeTheme] Aucun thÃ¨me disponible.');
      return;
    }

    const data: LeThemeData = {
      type: 'le_theme',
      themeId: theme.id,
      themeTitle: theme.title,
      validAnswers: theme.validAnswers,
      aliases: theme.aliases || {},
      usedAnswers: [],
      noAnswerStreak: 0,
      maxAnswers: Math.min(MAX_THEME_ANSWERS, theme.validAnswers.length || MAX_THEME_ANSWERS),
    };

    room.gameState.currentData = data;
    room.gameState.turn = 'A';
  }

  // --- Mytho/Pas Mytho ---
  private initMythoPasMytho(room: Room): void {
    const anecdotes = getRandomAnecdotes(15);
    if (!anecdotes.length) {
      console.warn('[Mytho] Aucune anecdote chargee depuis le JSON.');
    }
    
    const data: MythoPasMythoData = {
      type: 'mytho_pas_mytho',
      anecdotes: anecdotes.map(a => ({
        id: a.id,
        statement: a.statement,
        isTrue: a.isTrue,
        explanation: a.explanation || '',
      })),
      currentIndex: 0,
      teamAAnswers: [],
      teamBAnswers: [],
    };
    
    room.gameState.currentData = data;
    // Les deux Ã©quipes jouent simultanÃ©ment
    room.gameState.turn = null;
  }

  // --- EnchÃ¨res ---
  private async initEncheres(room: Room): Promise<void> {
    let theme = null;
    for (let i = 0; i < 3 && !theme; i++) {
      const themes = await themeService.getRandomThemes(1);
      if (themes[0]) theme = themes[0];
    }
    if (!theme) {
      console.warn('[Encheres] Aucun th??me disponible, fallback minimal.');
      theme = {
        id: 'fallback',
        title: 'Theme indisponible',
        validAnswers: [],
        aliases: {},
        difficulty: 'easy',
        points: 5,
      } as any;
    }

    const data: EncheresData = {
      type: 'encheres',
      themeId: theme.id,
      themeTitle: theme.title,
      validAnswers: theme.validAnswers,
      aliases: theme.aliases || {},
      betState: {
        teamABet: null,
        teamBBet: null,
        revealed: false,
        winner: null,
        targetCount: 0,
      },
      currentCount: 0,
      usedAnswers: [],
      responderOrder: [],
      currentResponderId: null,
      currentResponderIndex: 0,
    };

    room.gameState.currentData = data;
    // Phase de mise d'abord
    room.gameState.turn = null;
  }

  // --- Blind Test ---
  private async initBlindTest(room: Room): Promise<void> {
    const tracks = await getRandomTracks(6);

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
      noAnswerStreak: 0,
    };

    room.gameState.currentData = data;
    room.gameState.turn = null; // Free for all jusqu'au buzz
  }

  // --- Pixel Cover ---
  private async initPixelCover(room: Room): Promise<void> {
    const albums = await getRandomAlbums(6);
    const pixelDuration = this.getModeTimerDuration('pixel_cover', room);

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
        currentBlur: VISUAL.PIXEL_COVER_MAX_BLUR,
        maxBlur: VISUAL.PIXEL_COVER_MAX_BLUR,
        startTime: Date.now(),
        duration: pixelDuration,
        answered: false,
      },
      noAnswerStreak: 0,
    };

    room.gameState.currentData = data;
    room.gameState.turn = null; // Free for all

    // DÃ©marrer l'animation de blur
    this.startPixelBlurUpdate(room);
  }

  // --- Devine Qui ---
  private async initDevineQui(room: Room): Promise<void> {
    try {
      const db = await mongo.getDb();
      const candidates = await db.collection('artists').aggregate([
        {
          $match: {
            name: { $ne: null },
            totalAlbums: { $exists: true },
            monthlyListeners: { $exists: true },
            firstReleaseYear: { $exists: true },
            popularity: { $gte: 40 },
            $or: [
              { 'location.department': { $exists: true, $ne: null } },
              { 'location.city': { $exists: true, $ne: null } },
              { 'location.country': { $exists: true, $ne: null } },
            ],
          },
        },
        { $sample: { size: 1 } },
      ]).toArray();

      const artist = candidates[0];
      if (!artist) {
        console.warn('[DevineQui] Aucun artiste disponible.');
        return;
      }

      const data: DevineQuiData = {
        type: 'devine_qui',
        targetArtist: {
          id: artist.spotifyId,
          name: artist.name,
          clues: {
            albums: artist.totalAlbums || 0,
            streams: Math.round((artist.monthlyListeners || 0) / 1000000),
            letters: (artist.name || '').length,
            yearDebut: artist.firstReleaseYear || 0,
            origin: artist.location?.department || artist.location?.city || artist.location?.country || '?',
          },
        },
        attempts: [],
        currentTurn: 'A',
        maxAttempts: MAX_DEVINE_QUI_ATTEMPTS,
        foundBy: null,
      };

      room.gameState.currentData = data;
      room.gameState.turn = 'A';
    } catch (error) {
      console.error('[DevineQui] Erreur init:', error);
    }
  }

  // --- Continue les paroles ---
  private async initContinueParoles(room: Room): Promise<void> {
    const raw = getRandomLyricsSnippets(MAX_CONTINUE_PAROLES * 2);
    const snippets = raw
      .filter(s => s.missingWord)
      .map(s => ({
        prompt: s.text,
        answer: s.missingWord || '',
        artistName: s.artist,
        trackTitle: s.title,
      }))
      .slice(0, MAX_CONTINUE_PAROLES);

    if (snippets.length === 0) {
      console.warn('[ContinueParoles] Aucun snippet disponible.');
    }

    const data: ContinueParolesData = {
      type: 'continue_paroles',
      snippets,
      currentIndex: 0,
      currentTurn: 'A',
      revealed: false,
      teamAAnswers: [],
      teamBAnswers: [],
    };

    room.gameState.currentData = data;
    room.gameState.turn = 'A';
  }

  // ==========================================
  // GAMEPLAY - ANSWERS
  // ==========================================

  async submitAnswer(roomCode: string, team: Team, answer: string, playerId: string): Promise<AnswerResult | null> {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState.currentData) return null;

    const mode = room.gameState.currentMode;
    if (!mode) return null;

    // Validate answer length (1-100 characters)
    if (!answer || answer.length < 1 || answer.length > 100) {
      console.warn(`Invalid answer length: ${answer?.length} chars`);
      return null;
    }

    // VÃ©rifier anti-spam
    const player = room.players.get(playerId);
    if (player && Date.now() - (player.lastAnswerAt || 0) < TIMING.ANTI_SPAM_COOLDOWN) {
      return null;
    }
    if (player) player.lastAnswerAt = Date.now();

    switch (mode) {
      case 'roland_gamos':
        return await this.submitRolandGamosAnswer(room, team, answer, playerId);
      case 'le_theme':
        return this.submitLeThemeAnswer(room, team, answer, playerId);
      case 'mytho_pas_mytho':
        return null; // GÃ©rÃ© diffÃ©remment
      case 'encheres':
        return this.submitEncheresAnswer(room, team, answer, playerId);
      case 'blind_test':
        return this.submitBlindTestAnswer(room, team, answer, playerId);
      case 'pixel_cover':
        return this.submitPixelCoverAnswer(room, team, answer, playerId);
      case 'devine_qui':
        return await this.submitDevineQuiAnswer(room, team, answer, playerId);
      case 'continue_paroles':
        return this.submitContinueParolesAnswer(room, team, answer, playerId);
      default:
        return null;
    }
  }

  // --- Roland Gamos Answer ---
  private async submitRolandGamosAnswer(room: Room, team: Team, answer: string, playerId: string): Promise<AnswerResult | null> {
    const data = room.gameState.currentData as RolandGamosData;

    // VÃ©rifier que c'est le tour de l'Ã©quipe
    if (room.gameState.turn !== team) return null;

    // RÃ©soudre l'artiste depuis MongoDB
    const artist = await mongo.resolveArtistByName(answer);
    if (!artist) {
      return this.createInvalidResult(room, team, answer, playerId);
    }

    // VÃ©rifier si l'artiste a dÃ©jÃ  Ã©tÃ© utilisÃ©
    if (data.usedArtists.includes(artist.spotifyId)) {
      return this.createDuplicateResult(room, team, answer, playerId);
    }

    // VÃ©rifier si l'artiste a un featuring avec l'artiste courant
    const hasFeat = await mongo.hasFeaturingWith(data.currentArtistId, artist.spotifyId);
    if (!hasFeat) {
      return this.createInvalidResult(room, team, answer, playerId);
    }

    // C'est valide !
    const chainLink: ChainLink = {
      artistId: artist.spotifyId,
      artistName: artist.name,
      answeredBy: team,
      answerTime: Date.now(),
    };

    data.chain.push(chainLink);
    data.usedArtists.push(artist.spotifyId);
    data.currentArtistId = artist.spotifyId;
    data.currentArtistName = artist.name;
    data.noAnswerStreak = 0;

    // Reset timer
    this.clearTimer(room.code);

    // ?mettre la mise ? jour de la cha?ne
    this.addEvent(room.code, { type: 'chain_update', chain: data.chain });

    const result = this.createValidResult(room, team, answer, playerId, SCORING.RG_VALID_ANSWER_DAMAGE);

    if (room.gameState.phase !== 'playing') {
      return result;
    }

    // Changer de tour
    room.gameState.turn = team === 'A' ? 'B' : 'A';

    // Red?marrer timer
    const duration = this.getModeTimerDuration('roland_gamos', room);
    this.startTimer(room, duration, () => {
      void this.handleTimeout(room);
    });

    return result;
  }

  // --- Le Theme Answer ---
  private submitLeThemeAnswer(room: Room, team: Team, answer: string, playerId: string): AnswerResult | null {
    const data = room.gameState.currentData as LeThemeData;

    if (room.gameState.turn !== team) return null;

    const theme: Theme = {
      id: data.themeId,
      title: data.themeTitle,
      description: '',
      type: 'open_answer',
      validAnswers: data.validAnswers,
      aliases: data.aliases,
      difficulty: 'medium',
      points: 10,
    };

    const validation = themeService.validateThemeAnswer(theme, answer);

    if (!validation.isValid) {
      return this.createInvalidResult(room, team, answer, playerId);
    }

    // VÃ©rifier doublon
    if (data.usedAnswers.includes(validation.matchedAnswer!)) {
      return this.createDuplicateResult(room, team, answer, playerId);
    }

    data.usedAnswers.push(validation.matchedAnswer!);
    data.noAnswerStreak = 0;

    // Reset timer
    this.clearTimer(room.code);

    const result = this.createValidResult(room, team, answer, playerId, SCORING.THEME_VALID_ANSWER_DAMAGE);

    if (room.gameState.phase !== 'playing') {
      return result;
    }

    if (data.usedAnswers.length >= data.maxAnswers) {
      this.endRound(room);
      return result;
    }

    // Changer de tour
    room.gameState.turn = team === 'A' ? 'B' : 'A';
    const duration = this.getModeTimerDuration('le_theme', room);
    this.startTimer(room, duration, () => {
      void this.handleTimeout(room);
    });

    return result;
  }

  // --- EnchÃ¨res Answer ---
  private submitEncheresAnswer(room: Room, team: Team, answer: string, playerId: string): AnswerResult | null {
    const data = room.gameState.currentData as EncheresData;

    // V?rifier que c'est l'?quipe qui a gagn? les ench?res
    if (data.betState.winner !== team) return null;
    if (!data.betState.revealed) return null;

    this.syncEncheresResponder(room, data);
    if (data.currentResponderId && data.currentResponderId !== playerId) {
      return null;
    }

    const theme: Theme = {
      id: data.themeId,
      title: data.themeTitle,
      description: '',
      type: 'open_answer',
      validAnswers: data.validAnswers,
      aliases: data.aliases,
      difficulty: 'medium',
      points: 10,
    };

    const validation = themeService.validateThemeAnswer(theme, answer);

    if (!validation.isValid) {
      const result = this.createInvalidResult(room, team, answer, playerId);
      if (room.gameState.phase === 'playing') {
        this.advanceEncheresResponder(room, data);
        this.addEvent(room.code, { type: 'room_update' });
      }
      return result;
    }

    if (data.usedAnswers.includes(validation.matchedAnswer!)) {
      const result = this.createDuplicateResult(room, team, answer, playerId);
      if (room.gameState.phase === 'playing') {
        this.advanceEncheresResponder(room, data);
        this.addEvent(room.code, { type: 'room_update' });
      }
      return result;
    }

    data.usedAnswers.push(validation.matchedAnswer!);
    data.currentCount++;

    // V?rifier si objectif atteint
    if (data.currentCount >= data.betState.targetCount) {
      // Bonus pour avoir r?ussi
      const bonusResult = this.createValidResult(room, team, answer, playerId, SCORING.ENCHERES_SUCCESS_BONUS);
      this.endRound(room);
      return bonusResult;
    }

    const result = this.createValidResult(room, team, answer, playerId, SCORING.ENCHERES_VALID_DAMAGE);
    if (room.gameState.phase === 'playing') {
      this.advanceEncheresResponder(room, data);
      this.addEvent(room.code, { type: 'room_update' });
    }
    return result;
  }

  // --- Blind Test Answer ---
  private submitBlindTestAnswer(room: Room, team: Team, answer: string, playerId: string): AnswerResult | null {
    const data = room.gameState.currentData as BlindTestData;

    // Verifier que c'est l'equipe qui a buzz
    if (data.buzzState.buzzedTeam !== team) return null;

    const currentTrack = data.tracks[data.currentIndex];
    if (!currentTrack) return null;

    // Validation: comparer avec artistName (fuzzy matching)
    const normalizedAnswer = normalizeText(answer);
    const normalizedArtist = normalizeText(currentTrack.artistName);

    // Accepter si le nom de l'artiste correspond (avec tolerance)
    const isCorrect = normalizedAnswer === normalizedArtist ||
                      normalizedAnswer.includes(normalizedArtist) ||
                      normalizedArtist.includes(normalizedAnswer) ||
                      fuzzyMatch(answer, [currentTrack.artistName], {}).isValid;

    // Stop current answer timer before moving on
    this.clearTimer(room.code);

    if (isCorrect) {
      data.currentIndex++;
      data.buzzState.buzzedTeam = null;
      data.buzzState.buzzedAt = 0;

      const result = this.createValidResult(room, team, answer, playerId, SCORING.BT_CORRECT_DAMAGE);
      if (room.gameState.phase !== 'playing') return result;

      if (data.currentIndex >= data.tracks.length) {
        this.endRound(room);
        return result;
      }

      const duration = this.getModeTimerDuration('blind_test', room);
      this.startTimer(room, duration, () => {
        void this.handleTimeout(room);
      });

      return result;
    }

    // Mauvaise reponse: penalite et passer a la track suivante
    data.currentIndex++;
    data.buzzState.buzzedTeam = null;
    data.buzzState.buzzedAt = 0;

    const result = this.createInvalidBlindTestResult(room, team, answer, playerId);
    if (room.gameState.phase !== 'playing') return result;

    if (data.currentIndex >= data.tracks.length) {
      this.endRound(room);
      return result;
    }

    const duration = this.getModeTimerDuration('blind_test', room);
    this.startTimer(room, duration, () => {
      void this.handleTimeout(room);
    });

    return result;
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
      const result = this.createValidResult(room, team, answer, playerId, points);
      if (room.gameState.phase !== 'playing') return result;

      // Passer a l'image suivante ou finir
      data.currentIndex++;
      if (data.currentIndex >= data.items.length) {
        this.endRound(room);
        return result;
      }

      // Reset pour la prochaine image
      data.pixelState.answered = false;
      data.pixelState.currentBlur = VISUAL.PIXEL_COVER_MAX_BLUR;
      data.pixelState.startTime = Date.now();
      this.startPixelBlurUpdate(room);
      // Relancer le timer pour la prochaine cover
      const duration = this.getModeTimerDuration('pixel_cover', room);
      this.startTimer(room, duration, () => {
        void this.handleTimeout(room);
      });

      return result;
    }

    return this.createInvalidResult(room, team, answer, playerId);
  }

  // --- Devine Qui Answer ---
  private async submitDevineQuiAnswer(room: Room, team: Team, answer: string, playerId: string): Promise<AnswerResult | null> {
    const data = room.gameState.currentData as DevineQuiData;
    if (room.gameState.turn !== team || data.foundBy) return null;

    const attemptNumber = data.attempts.length + 1;
    const guessed = await mongo.resolveArtistByName(answer);

    const targetClues = data.targetArtist.clues;
    const normalizeOrigin = (value: string | undefined) => (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const statusForNumber = (guess: number, target: number, tolerance: number) => {
      if (guess === target) return 'correct';
      if (Math.abs(guess - target) <= tolerance) return 'close';
      return 'wrong';
    };

    const guessClues = guessed ? {
      albums: guessed.totalAlbums || 0,
      streams: Math.round((guessed.monthlyListeners || 0) / 1000000),
      letters: (guessed.name || '').length,
      yearDebut: guessed.firstReleaseYear || 0,
      origin: guessed.location?.department || guessed.location?.city || guessed.location?.country || '?',
    } : null;

    const attempt: DevineQuiAttempt = {
      team,
      artistName: guessed?.name || answer,
      clues: guessClues || {
        albums: 0,
        streams: 0,
        letters: (answer || '').length,
        yearDebut: 0,
        origin: '?',
      },
      cluesStatus: {
        albums: guessClues ? statusForNumber(guessClues.albums, targetClues.albums, 2) : 'wrong',
        streams: guessClues ? statusForNumber(guessClues.streams, targetClues.streams, 1) : 'wrong',
        letters: guessClues ? statusForNumber(guessClues.letters, targetClues.letters, 1) : 'wrong',
        yearDebut: guessClues ? statusForNumber(guessClues.yearDebut, targetClues.yearDebut, 2) : 'wrong',
        origin: guessClues && normalizeOrigin(guessClues.origin) === normalizeOrigin(targetClues.origin) ? 'correct' : 'wrong',
      },
      attemptNumber,
    };

    data.attempts.push(attempt);

    if (guessed && guessed.spotifyId === data.targetArtist.id) {
      data.foundBy = team;
      const points = attemptNumber === 1
        ? SCORING.DQ_CORRECT_1ST_TRY
        : attemptNumber === 2
          ? SCORING.DQ_CORRECT_2ND_TRY
          : SCORING.DQ_CORRECT_3RD_TRY;
      const result = this.createValidResult(room, team, answer, playerId, points);
      this.endRound(room);
      return result;
    }

    const result = this.createInvalidResult(room, team, answer, playerId);

    if (room.gameState.phase !== 'playing') {
      return result;
    }

    if (data.attempts.length >= data.maxAttempts) {
      this.endRound(room);
      return result;
    }

    // Switch turn
    data.currentTurn = team === 'A' ? 'B' : 'A';
    room.gameState.turn = data.currentTurn;

    const duration = this.getModeTimerDuration('devine_qui', room);
    this.startTimer(room, duration, () => {
      void this.handleTimeout(room);
    });

    return result;
  }

  // --- Continue les paroles Answer ---
  private submitContinueParolesAnswer(room: Room, team: Team, answer: string, playerId: string): AnswerResult | null {
    const data = room.gameState.currentData as ContinueParolesData;
    if (room.gameState.turn !== team || data.revealed) return null;

    const currentSnippet = data.snippets[data.currentIndex];
    if (!currentSnippet) return null;

    const normalizedAnswer = normalizeText(answer);
    const normalizedExpected = normalizeText(currentSnippet.answer);
    const isCorrect = normalizedAnswer === normalizedExpected ||
      fuzzyMatch(answer, [currentSnippet.answer], {}).isValid;

    if (team === 'A') {
      data.teamAAnswers[data.currentIndex] = isCorrect;
    } else {
      data.teamBAnswers[data.currentIndex] = isCorrect;
    }

    data.revealed = true;
    this.clearTimer(room.code);

    const result = isCorrect
      ? this.createValidResult(room, team, answer, playerId, SCORING.CP_CORRECT_DAMAGE)
      : this.createInvalidResult(room, team, answer, playerId);

    if (room.gameState.phase !== 'playing') {
      return result;
    }

    this.startTimer(room, QUICK_REVEAL_DURATION, () => {
      this.advanceContinueParoles(room);
    });

    return result;
  }

  private advanceContinueParoles(room: Room): void {
    const data = room.gameState.currentData as ContinueParolesData;
    if (!data) return;

    data.revealed = false;
    data.currentIndex++;

    if (data.currentIndex >= data.snippets.length) {
      this.endRound(room);
      return;
    }

    data.currentTurn = data.currentTurn === 'A' ? 'B' : 'A';
    room.gameState.turn = data.currentTurn;

    const duration = this.getModeTimerDuration('continue_paroles', room);
    this.startTimer(room, duration, () => {
      void this.handleTimeout(room);
    });
    this.addEvent(room.code, { type: 'room_update' });
  }

  private pickRolandGamosStarter(artists: any[]): any | null {
    if (!artists.length) return null;
    const withLocation = artists.filter(a => a?.location && (a.location.department || a.location.city || a.location.country));
    const popular = withLocation.filter(a => (a.popularity || 0) >= 45 || (a.monthlyListeners || 0) >= 1000000);
    const shortNames = popular.filter(a => (a.name || '').length <= 18);
    const pool = shortNames.length ? shortNames : popular.length ? popular : withLocation.length ? withLocation : artists;
    const sorted = [...pool].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    const pickFrom = sorted.slice(0, Math.min(sorted.length, 25));
    return pickFrom[Math.floor(Math.random() * pickFrom.length)];
  }

  private getEncheresResponderOrder(room: Room, team: Team): string[] {
    return Array.from(room.players.values())
      .filter(p => p.team === team && p.isConnected)
      .map(p => p.id);
  }

  private syncEncheresResponder(room: Room, data: EncheresData): void {
    const winner = data.betState.winner;
    if (!winner) {
      data.responderOrder = [];
      data.currentResponderId = null;
      data.currentResponderIndex = 0;
      return;
    }

    const order = this.getEncheresResponderOrder(room, winner);
    if (!order.length) {
      data.responderOrder = [];
      data.currentResponderId = null;
      data.currentResponderIndex = 0;
      return;
    }

    const currentOrder = data.responderOrder || [];
    const sameOrder = currentOrder.length === order.length && currentOrder.every((id, idx) => id === order[idx]);
    if (!sameOrder) {
      data.responderOrder = order;
      data.currentResponderIndex = Math.min(data.currentResponderIndex || 0, order.length - 1);
    }

    if (data.currentResponderIndex === undefined || data.currentResponderIndex === null) {
      data.currentResponderIndex = 0;
    }
    data.currentResponderId = data.responderOrder[data.currentResponderIndex] || null;
  }

  private advanceEncheresResponder(room: Room, data: EncheresData): void {
    this.syncEncheresResponder(room, data);
    if (!data.responderOrder || data.responderOrder.length === 0) {
      return;
    }
    data.currentResponderIndex = ((data.currentResponderIndex || 0) + 1) % data.responderOrder.length;
    data.currentResponderId = data.responderOrder[data.currentResponderIndex];
  }

  private async resetRolandGamosQuestion(room: Room): Promise<void> {
    const data = room.gameState.currentData as RolandGamosData;
    const goodArtists = await mongo.getGoodStartingArtists(4);
    if (!goodArtists.length) return;
    const startingArtist = this.pickRolandGamosStarter(goodArtists);
    if (!startingArtist) return;

    data.startingArtistId = startingArtist.spotifyId;
    data.startingArtistName = startingArtist.name;
    data.currentArtistId = startingArtist.spotifyId;
    data.currentArtistName = startingArtist.name;
    data.chain = [];
    data.usedArtists = [startingArtist.spotifyId];
    data.noAnswerStreak = 0;
    this.addEvent(room.code, { type: 'chain_update', chain: data.chain });
    this.addEvent(room.code, { type: 'room_update' });
  }

  private async resetLeThemeQuestion(room: Room): Promise<void> {
    const data = room.gameState.currentData as LeThemeData;
    const themes = await themeService.getRandomThemes(1);
    const theme = themes[0];
    if (!theme) return;

    data.themeId = theme.id;
    data.themeTitle = theme.title;
    data.validAnswers = theme.validAnswers;
    data.aliases = theme.aliases || {};
    data.usedAnswers = [];
    data.noAnswerStreak = 0;
    data.maxAnswers = Math.min(MAX_THEME_ANSWERS, theme.validAnswers.length || MAX_THEME_ANSWERS);
    this.addEvent(room.code, { type: 'room_update' });
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private checkForKnockout(room: Room): boolean {
    if (room.gameState.phase !== 'playing') return false;
    const isKO = room.teamA.score <= 0 || room.teamB.score <= 0;
    if (!isKO) return false;
    room.teamA.score = Math.max(0, room.teamA.score);
    room.teamB.score = Math.max(0, room.teamB.score);
    room.gameState.currentRound = room.gameState.totalRounds;
    this.endRound(room);
    return true;
  }

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
    const damage = Math.min(
      SCORING.MAX_DAMAGE_PER_ACTION,
      applyDamageWithCombo(baseDamage, teamState.combo.multiplier)
    );
    
    // Apply damage to opponent (cap per mode)
    const appliedDamage = this.applyRoundDamage(room, team === 'A' ? 'B' : 'A', damage);
    
    // Ã‰mettre l'Ã©vÃ©nement combo
    this.addEvent(room.code, { 
      type: 'combo_update', 
      team, 
      combo: teamState.combo.count, 
      multiplier: teamState.combo.multiplier 
    });
    this.addEvent(room.code, { type: 'room_update' });
    this.checkForKnockout(room);
    
    return {
      answer: this.createAnswer(value, playerId, team, true, false),
      team,
      damageDealt: appliedDamage,
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
    const appliedDamage = this.applyRoundDamage(room, team, damage);
    
    // Ã‰mettre l'Ã©vÃ©nement combo (reset)
    this.addEvent(room.code, { 
      type: 'combo_update', 
      team, 
      combo: 0, 
      multiplier: 1 
    });
    this.addEvent(room.code, { type: 'room_update' });
    this.checkForKnockout(room);
    
    return {
      answer: this.createAnswer(value, playerId, team, false, false),
      team,
      damageDealt: appliedDamage,
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
    
    // Self-damage spÃ©cifique Blind Test
    const damage = SCORING.BT_WRONG_DAMAGE;
    const appliedDamage = this.applyRoundDamage(room, team, damage);
    
    // Ã‰mettre l'Ã©vÃ©nement combo (reset)
    this.addEvent(room.code, { 
      type: 'combo_update', 
      team, 
      combo: 0, 
      multiplier: 1 
    });
    this.addEvent(room.code, { type: 'room_update' });
    this.checkForKnockout(room);
    
    return {
      answer: this.createAnswer(value, playerId, team, false, false),
      team,
      damageDealt: appliedDamage,
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

  skipCurrentTurn(roomCode: string, team: Team): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.gameState.phase !== 'playing') return false;
    if (!room.gameState.currentMode) return false;

    // ArrÃªter le timer courant et forcer un timeout immÃ©diat
    this.clearTimer(room.code);
    room.gameState.timerEndsAt = Date.now();
    room.gameState.isTimerRunning = true;

    (room.gameState as any).skipTeam = team;
    void this.handleTimeout(room);
    return true;
  }

  private async handleTimeout(room: Room): Promise<void> {
    const mode = room.gameState.currentMode;
    if (!mode) return;
    const skipTeam = (room.gameState as any).skipTeam as Team | undefined;
    if (skipTeam) {
      (room.gameState as any).skipTeam = undefined;
    }
    const noticePrefix = skipTeam ? `Equipe ${skipTeam} passe` : 'Temps écoulé';

    switch (mode) {
      case 'roland_gamos': {
        const data = room.gameState.currentData as RolandGamosData;
        const currentTurn = room.gameState.turn;
        if (currentTurn) {
          const teamState = currentTurn === 'A' ? room.teamA : room.teamB;
          const appliedDamage = this.applyRoundDamage(room, currentTurn, SCORING.RG_TIMEOUT_DAMAGE);
          this.addEvent(room.code, {
            type: 'notice',
            message: `${noticePrefix} — Equipe ${currentTurn} -${appliedDamage} HP`,
            tone: 'warning',
          });
          teamState.combo.count = 0;
          teamState.combo.multiplier = 1;
        }
        if (this.checkForKnockout(room) || room.gameState.phase !== 'playing') return;
        data.noAnswerStreak = (data.noAnswerStreak || 0) + 1;
        room.gameState.turn = currentTurn === 'A' ? 'B' : 'A';

        if (data.noAnswerStreak >= 2) {
          await this.resetRolandGamosQuestion(room);
        }

        const duration = this.getModeTimerDuration('roland_gamos', room);
        this.startTimer(room, duration, () => {
          void this.handleTimeout(room);
        });
        this.addEvent(room.code, { type: 'room_update' });
        return;
      }
      case 'le_theme': {
        const data = room.gameState.currentData as LeThemeData;
        const currentTurn = room.gameState.turn;
        if (currentTurn) {
          const teamState = currentTurn === 'A' ? room.teamA : room.teamB;
          const appliedDamage = this.applyRoundDamage(room, currentTurn, SCORING.THEME_TIMEOUT_DAMAGE);
          this.addEvent(room.code, {
            type: 'notice',
            message: `${noticePrefix} — Equipe ${currentTurn} -${appliedDamage} HP`,
            tone: 'warning',
          });
          teamState.combo.count = 0;
          teamState.combo.multiplier = 1;
        }
        if (this.checkForKnockout(room) || room.gameState.phase !== 'playing') return;
        data.noAnswerStreak = (data.noAnswerStreak || 0) + 1;
        room.gameState.turn = currentTurn === 'A' ? 'B' : 'A';

        if (data.noAnswerStreak >= 2) {
          await this.resetLeThemeQuestion(room);
        }

        const duration = this.getModeTimerDuration('le_theme', room);
        this.startTimer(room, duration, () => {
          void this.handleTimeout(room);
        });
        this.addEvent(room.code, { type: 'room_update' });
        return;
      }
      case 'mytho_pas_mytho': {
        const data = room.gameState.currentData as MythoPasMythoData;
        const idx = data.currentIndex;
        if (data.teamAAnswers[idx] === undefined) data.teamAAnswers[idx] = null;
        if (data.teamBAnswers[idx] === undefined) data.teamBAnswers[idx] = null;
        this.addEvent(room.code, {
          type: 'notice',
          message: `${noticePrefix} — question suivante`,
          tone: 'warning',
        });
        this.advanceMytho(room);
        return;
      }
      case 'encheres': {
        const data = room.gameState.currentData as EncheresData;
        if (!data.betState.revealed) {
          if (data.betState.teamABet === null) data.betState.teamABet = 5;
          if (data.betState.teamBBet === null) data.betState.teamBBet = 5;
          this.addEvent(room.code, {
            type: 'notice',
            message: `${noticePrefix} — mises révélées`,
            tone: 'warning',
          });
          this.revealBets(room);
          return;
        }
        if (data.betState.winner && data.currentCount < data.betState.targetCount) {
          const losingTeam = data.betState.winner;
          this.applyRoundDamage(room, losingTeam, SCORING.ENCHERES_FAIL_DAMAGE);
          if (this.checkForKnockout(room) || room.gameState.phase !== 'playing') return;
          this.addEvent(room.code, {
            type: 'encheres_failed',
            team: losingTeam,
            reason: 'timeout',
          });
        }
        this.endRound(room);
        return;
      }
      case 'blind_test': {
        const data = room.gameState.currentData as BlindTestData;
        if (data.buzzState.buzzedTeam) {
          const teamState = data.buzzState.buzzedTeam === 'A' ? room.teamA : room.teamB;
          const appliedDamage = this.applyRoundDamage(room, data.buzzState.buzzedTeam, SCORING.BT_WRONG_DAMAGE);
          this.addEvent(room.code, {
            type: 'notice',
            message: `${noticePrefix} — Equipe ${data.buzzState.buzzedTeam} -${appliedDamage} HP`,
            tone: 'warning',
          });
          if (room.gameState.phase !== 'playing') return;
          teamState.combo.count = 0;
          teamState.combo.multiplier = 1;
        } else {
          this.addEvent(room.code, {
            type: 'notice',
            message: `${noticePrefix} — morceau suivant`,
            tone: 'warning',
          });
        }
        if (this.checkForKnockout(room)) return;
        data.buzzState.buzzedTeam = null;
        data.currentIndex++;
        if (data.currentIndex >= data.tracks.length) {
          this.endRound(room);
          return;
        }
        const duration = this.getModeTimerDuration('blind_test', room);
        this.startTimer(room, duration, () => {
          void this.handleTimeout(room);
        });
        this.addEvent(room.code, { type: 'room_update' });
        return;
      }
      case 'pixel_cover': {
        const data = room.gameState.currentData as PixelCoverData;
        const appliedA = this.applyRoundDamage(room, 'A', SCORING.PC_TIMEOUT_DAMAGE);
        if (room.gameState.phase !== 'playing') return;
        const appliedB = this.applyRoundDamage(room, 'B', SCORING.PC_TIMEOUT_DAMAGE);
        if (this.checkForKnockout(room) || room.gameState.phase !== 'playing') return;
        this.addEvent(room.code, {
          type: 'notice',
          message: `${noticePrefix} — cover suivante (A -${appliedA} HP / B -${appliedB} HP)`,
          tone: 'warning',
        });
        data.pixelState.answered = true;
        this.clearPixelBlurInterval(room.code);
        data.currentIndex++;
        if (data.currentIndex >= data.items.length) {
          this.endRound(room);
          return;
        }
        data.pixelState.answered = false;
        data.pixelState.currentBlur = VISUAL.PIXEL_COVER_MAX_BLUR;
        data.pixelState.startTime = Date.now();
        data.pixelState.duration = this.getModeTimerDuration('pixel_cover', room);
        this.startPixelBlurUpdate(room);
        const duration = this.getModeTimerDuration('pixel_cover', room);
        this.startTimer(room, duration, () => {
          void this.handleTimeout(room);
        });
        this.addEvent(room.code, { type: 'room_update' });
        return;
      }
      case 'devine_qui': {
        const data = room.gameState.currentData as DevineQuiData;
        const currentTurn = room.gameState.turn;
        if (!currentTurn) return;
        const teamState = currentTurn === 'A' ? room.teamA : room.teamB;
        const appliedDamage = this.applyRoundDamage(room, currentTurn, SCORING.DQ_TIMEOUT_DAMAGE);
        this.addEvent(room.code, {
          type: 'notice',
          message: `${noticePrefix} — Equipe ${currentTurn} -${appliedDamage} HP`,
          tone: 'warning',
        });
        teamState.combo.count = 0;
        teamState.combo.multiplier = 1;
        if (this.checkForKnockout(room) || room.gameState.phase !== 'playing') return;

        data.attempts.push({
          team: currentTurn,
          artistName: 'Timeout',
          cluesStatus: {
            albums: 'wrong',
            streams: 'wrong',
            letters: 'wrong',
            yearDebut: 'wrong',
            origin: 'wrong',
          },
          attemptNumber: data.attempts.length + 1,
        });

        if (data.attempts.length >= data.maxAttempts) {
          this.endRound(room);
          return;
        }

        data.currentTurn = currentTurn === 'A' ? 'B' : 'A';
        room.gameState.turn = data.currentTurn;
        const duration = this.getModeTimerDuration('devine_qui', room);
        this.startTimer(room, duration, () => {
          void this.handleTimeout(room);
        });
        this.addEvent(room.code, { type: 'room_update' });
        return;
      }
      case 'continue_paroles': {
        const data = room.gameState.currentData as ContinueParolesData;
        const currentTurn = room.gameState.turn || data.currentTurn;
        if (data.revealed || data.currentIndex >= data.snippets.length) return;

        if (currentTurn === 'A') {
          data.teamAAnswers[data.currentIndex] = false;
        } else {
          data.teamBAnswers[data.currentIndex] = false;
        }

        const teamState = currentTurn === 'A' ? room.teamA : room.teamB;
        const appliedDamage = this.applyRoundDamage(room, currentTurn, SCORING.CP_TIMEOUT_DAMAGE);
        this.addEvent(room.code, {
          type: 'notice',
          message: `${noticePrefix} — Equipe ${currentTurn} -${appliedDamage} HP`,
          tone: 'warning',
        });
        teamState.combo.count = 0;
        teamState.combo.multiplier = 1;
        if (this.checkForKnockout(room) || room.gameState.phase !== 'playing') return;

        data.revealed = true;
        this.addEvent(room.code, { type: 'room_update' });

        this.startTimer(room, QUICK_REVEAL_DURATION, () => {
          this.advanceContinueParoles(room);
        });
        return;
      }
      default:
        this.endRound(room);
    }
  }

  private startPixelBlurUpdate(room: Room): void {
    this.clearPixelBlurInterval(room.code);
    
    const data = room.gameState.currentData as PixelCoverData;
    if (!data || data.pixelState.answered) return;
    
    const updateInterval = 500; // Update every 500ms
    const totalDuration = data.pixelState.duration || TIMING.PIXEL_COVER_DURATION;
    const steps = totalDuration / updateInterval;
    const blurDecrement = data.pixelState.maxBlur / steps;
    
    const interval = setInterval(() => {
      if (data.pixelState.answered || data.pixelState.currentBlur <= 0) {
        clearInterval(interval);
        return;
      }
      
      data.pixelState.currentBlur = Math.max(0, data.pixelState.currentBlur - blurDecrement);
      const progress = 1 - (data.pixelState.currentBlur / data.pixelState.maxBlur);
      
      // Ajouter l'Ã©vÃ©nement pour broadcast
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
    // Match rules: 1 round = 1 mode, HP loss capped per round.
    const baseModes = (room.config.modes && room.config.modes.length > 0)
      ? room.config.modes
      : [...DEFAULT_ROOM_CONFIG.modes];
    const uniqueModes = Array.from(new Set(baseModes));
    if (uniqueModes.length === 0) {
      uniqueModes.push(...DEFAULT_ROOM_CONFIG.modes);
    }

    const desiredRounds = room.config.totalRounds || 1;
    let totalRounds = Math.max(1, desiredRounds);
    if (uniqueModes.length === 1) {
      totalRounds = 1;
    }

    // Shuffle modes
    room.gameState.modeQueue = [...uniqueModes].sort(() => Math.random() - 0.5);
    room.gameState.currentRound = 1;
    room.gameState.totalRounds = totalRounds;
    room.config.totalRounds = totalRounds;
    room.config.modes = uniqueModes;
    
    // Reset scores
    room.teamA.score = SCORING.INITIAL_HP;
    room.teamB.score = SCORING.INITIAL_HP;
    room.teamA.combo = { count: 0, multiplier: 1 };
    room.teamB.combo = { count: 0, multiplier: 1 };
    room.teamA.roundStats = { correctAnswers: 0, wrongAnswers: 0, bestCombo: 0 };
    room.teamB.roundStats = { correctAnswers: 0, wrongAnswers: 0, bestCombo: 0 };

    this.resetRoundDamage(room);
    
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
    const timers = room.config?.timers;
    switch (mode) {
      case 'roland_gamos': return timers?.rolandGamosTurnTime ?? TIMING.ROLAND_GAMOS_TURN_TIME;
      case 'le_theme': return timers?.leThemeTurnTime ?? TIMING.LE_THEME_TURN_TIME;
      case 'mytho_pas_mytho': return timers?.mythoTime ?? TIMING.MYTHO_PAS_MYTHO_TIME;
      case 'encheres': {
        const data = room.gameState.currentData as EncheresData;
        return data?.betState?.revealed
          ? (timers?.encheresProofTime ?? TIMING.ENCHERES_PROOF_TIME)
          : (timers?.encheresBetTime ?? TIMING.ENCHERES_BET_TIME);
      }
      case 'blind_test': return timers?.blindTestAnswerTime ?? TIMING.BLIND_TEST_ANSWER_TIME;
      case 'pixel_cover': return timers?.pixelCoverTime ?? TIMING.PIXEL_COVER_DURATION;
      case 'devine_qui': return timers?.devineQuiTime ?? TIMING.DEVINE_QUI_TURN_TIME;
      case 'continue_paroles': return timers?.continueParolesTime ?? TIMING.CONTINUE_PAROLES_TIME;
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
    
    // Chercher la rÃ©ponse dans l'historique (simplifiÃ© - on prend la derniÃ¨re rÃ©ponse adverse)
    const lastAnswer = this.findLastOpponentAnswer(room, proposingTeam);
    if (!lastAnswer) return null;
    
    // CrÃ©er le litige
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
    
    // Timer pour auto-rejet aprÃ¨s 10s si pas de vote
    this.startTimer(room, 10000, () => {
      if (room.gameState.dispute?.id === dispute.id) {
        this.resolveDispute(roomCode, false);
      }
    });
    
    this.addEvent(roomCode, { type: 'dispute_started', dispute });
    return dispute;
  }

  private findLastOpponentAnswer(room: Room, proposingTeam: Team): Answer | null {
    // Dans une implÃ©mentation rÃ©elle, on stockerait l'historique des rÃ©ponses
    // Pour l'instant, on crÃ©e une rÃ©ponse fictive basÃ©e sur la derniÃ¨re action
    // Ceci est une simplification - idÃ©alement il faudrait un historique complet
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
    
    // Si majoritÃ© de votes (simplifiÃ©: 1 vote suffit pour dÃ©cider)
    // En vrai, il faudrait attendre que tous les joueurs de l'Ã©quipe votent
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
      // La rÃ©ponse contestÃ©e est invalidÃ©e
      // On inverse les dÃ©gÃ¢ts (Ã  implÃ©menter selon la logique exacte)
      // Simplification: on enlÃ¨ve des HP Ã  l'Ã©quipe qui avait rÃ©ussi la rÃ©ponse
      const cheatingTeam = dispute.answer.team;
      const damage = dispute.answer.isValid ? 15 : 0; // DÃ©gÃ¢ts Ã  reverser
      if (damage > 0) {
        this.applyRoundDamage(room, cheatingTeam, damage);
      }
    }
    
    this.addEvent(roomCode, { type: 'dispute_resolved', dispute, accepted, answerResult });
    
    // Nettoyer le litige aprÃ¨s un dÃ©lai
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

    // Validate bet range (1-20 valid answers)
    if (!Number.isInteger(bet) || bet < 1 || bet > 20) {
      console.warn(`Invalid bet: ${bet} (must be 1-20)`);
      return false;
    }

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

    this.syncEncheresResponder(room, data);
    
    // Start proof phase
    room.gameState.turn = data.betState.winner;
    const duration = this.getModeTimerDuration('encheres', room);
    this.startTimer(room, duration, () => {
      void this.handleTimeout(room);
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
      this.applyRoundDamage(room, 'B', SCORING.MYTHO_CORRECT_DAMAGE);
    } else {
      this.applyRoundDamage(room, 'A', SCORING.MYTHO_WRONG_DAMAGE);
    }
    
    if (teamBAnswer === current.isTrue) {
      this.applyRoundDamage(room, 'A', SCORING.MYTHO_CORRECT_DAMAGE);
    } else {
      this.applyRoundDamage(room, 'B', SCORING.MYTHO_WRONG_DAMAGE);
    }
    
    // Ã‰mettre le rÃ©sultat pour cette anecdote
    this.addEvent(room.code, {
      type: 'mytho_result',
      isTrue: current.isTrue,
      explanation: current.explanation,
      teamAScore: room.teamA.score,
      teamBScore: room.teamB.score,
    });
    this.addEvent(room.code, { type: 'room_update' });
    if (this.checkForKnockout(room) || room.gameState.phase !== 'playing') {
      return;
    }
    
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
    
    // DÃ©marrer le timer de rÃ©ponse
    this.startTimer(room, TIMING.BLIND_TEST_ANSWER_TIME, () => {
      // Timeout sur la rÃ©ponse = mauvaise rÃ©ponse
      data.buzzState.buzzedTeam = null;
      void this.handleTimeout(room);
    });
    
    return {
      buzzedTeam: team,
      timeLeft: TIMING.BLIND_TEST_ANSWER_TIME,
    };
  }
}









