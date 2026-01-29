// ============================================
// TYPES DU JEU RAP BATTLE - 6 MODES
// ============================================

// ============================================
// ENUMS & BASE
// ============================================

export type Team = 'A' | 'B';
export type PlayerRole = 'player' | 'spectator' | 'host';

export type GameMode = 
  | 'roland_gamos'   // Chain de featurings
  | 'le_theme'       // Nommer X de catégorie Y
  | 'mytho_pas_mytho' // Vrai/Faux
  | 'encheres'       // Miser puis prouver
  | 'blind_test'     // Audio + buzzer
  | 'pixel_cover';   // Image floue

export type GamePhase = 
  | 'lobby'
  | 'vs_intro'
  | 'mode_roulette'
  | 'mode_intro'
  | 'playing'
  | 'round_result'
  | 'final_score';

export type Category = 
  | 'geography' 
  | 'label_crew' 
  | 'era' 
  | 'technique' 
  | 'artist' 
  | 'album';

// ============================================
// JOUEUR & ÉQUIPE
// ============================================

export interface Player {
  id: string;
  socketId: string;
  name: string;
  team: Team | null;
  role: PlayerRole;
  avatar?: string;
  isReady: boolean;
  lastAnswerAt?: number;
  isConnected: boolean;
  disconnectedAt?: number;
}

export interface TeamState {
  players: Player[];
  score: number;           // HP (0-100)
  currentInput: string;    // Input collaboratif
  isInputLocked: boolean;
  hasUsedVeto: boolean;
  combo: {
    count: number;
    multiplier: number;
  };
  roundStats: {
    correctAnswers: number;
    wrongAnswers: number;
    bestCombo: number;
  };
}

// ============================================
// ROOM CONFIG
// ============================================

export interface RoomConfig {
  maxPlayers: number;
  modes: GameMode[];
  roundTime: number;
  allowVeto: boolean;
  totalRounds: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
}

// ============================================
// DATA SPECIFIQUES AUX MODES
// ============================================

// --- Roland Gamos (VRAI - chain de featurings) ---
export interface ChainLink {
  artistId: string;
  artistName: string;
  answeredBy: Team;
  answerTime: number;
}

export interface RolandGamosData {
  type: 'roland_gamos';
  startingArtistId: string;
  startingArtistName: string;
  currentArtistId: string;
  currentArtistName: string;
  chain: ChainLink[];
  usedArtists: string[];
}

// --- Le Theme (ex-Roland Gamos simple) ---
export interface LeThemeData {
  type: 'le_theme';
  themeId: string;
  themeTitle: string;
  validAnswers: string[];
  aliases: Record<string, string[]>;
  usedAnswers: string[];
}

// --- Mytho/Pas Mytho ---
export interface MythoPasMythoData {
  type: 'mytho_pas_mytho';
  anecdotes: {
    id: string;
    statement: string;
    isTrue: boolean;
    explanation: string;
  }[];
  currentIndex: number;
  teamAAnswers: boolean[];  // true = vrai, false = faux
  teamBAnswers: boolean[];
}

// --- Enchères ---
export interface BetState {
  teamABet: number | null;
  teamBBet: number | null;
  revealed: boolean;
  winner: Team | null;
  targetCount: number;
}

export interface EncheresData {
  type: 'encheres';
  themeId: string;
  themeTitle: string;
  validAnswers: string[];
  aliases?: Record<string, string[]>;
  betState: BetState;
  currentCount: number;
  usedAnswers: string[];
}

// --- Blind Test ---
export interface BuzzState {
  buzzedTeam: Team | null;
  buzzedAt: number;
  audioPosition: number;
}

export interface BlindTestData {
  type: 'blind_test';
  tracks: {
    id: string;
    previewUrl: string;
    artistName: string;
    trackName: string;
    coverUrl?: string;
  }[];
  currentIndex: number;
  buzzState: BuzzState;
}

// --- Pixel Cover ---
export interface PixelState {
  currentBlur: number;
  maxBlur: number;
  startTime: number;
  duration: number;
  answered: boolean;
}

export interface PixelCoverData {
  type: 'pixel_cover';
  items: {
    id: string;
    imageUrl: string;
    artistName: string;
    albumName?: string;
  }[];
  currentIndex: number;
  pixelState: PixelState;
}

export type ModeData = 
  | RolandGamosData 
  | LeThemeData 
  | MythoPasMythoData 
  | EncheresData 
  | BlindTestData 
  | PixelCoverData;

// ============================================
// ÉTAT DU JEU
// ============================================

export interface RoundResult {
  roundNumber: number;
  mode: GameMode;
  winner: Team | null;
  teamADamage: number;
  teamBDamage: number;
  teamACombo: number;
  teamBCombo: number;
}

export interface GameState {
  phase: GamePhase;
  currentMode: GameMode | null;
  currentRound: number;
  totalRounds: number;
  modeQueue: GameMode[];
  currentData: ModeData | null;
  turn: Team | null;
  winner: Team | null;
  roundResults: RoundResult[];
  
  // Timer
  timerEndsAt: number | null;
  timerDuration: number;
  isTimerRunning: boolean;
  
  // Dispute
  dispute: DisputeState | null;
}

// ============================================
// ROOM
// ============================================

export interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Map<string, Player>;
  teamA: TeamState;
  teamB: TeamState;
  spectators: Player[];
  gameState: GameState;
  config: RoomConfig;
  createdAt: number;
}

export interface SerializedRoom {
  id: string;
  code: string;
  hostId: string;
  players: Player[];
  teamA: TeamState;
  teamB: TeamState;
  spectators: Player[];
  gameState: GameState;
  config: RoomConfig;
}

// ============================================
// RÉPONSES & LITIGE
// ============================================

export interface Answer {
  id: string;
  playerId: string;
  team: Team;
  value: string;
  normalizedValue: string;
  timestamp: number;
  isValid: boolean;
  isDuplicate: boolean;
  similarityScore: number;
  round: number;
}

export interface AnswerResult {
  answer: Answer;
  team: Team;
  damageDealt: number;
  newScore: number;
  opponentScore: number;
  feedback: 'valid' | 'invalid' | 'duplicate' | 'timeout';
  comboUpdated: boolean;
  newCombo: number;
}

export interface DisputeState {
  id: string;
  answer: Answer;
  proposingTeam: Team;
  votingTeam: Team;
  proposedAt: number;
  status: 'pending' | 'accepted' | 'rejected';
  votes: {
    yes: number;
    no: number;
  };
}

// ============================================
// TIMER SYNCHRO
// ============================================

export interface TimerSync {
  endsAt: number;
  duration: number;
  remaining: number;
  isRunning: boolean;
}

// ============================================
// SOCKET EVENTS - Server to Client
// ============================================

export interface ServerToClientEvents {
  // Room
  'room:joined': (room: SerializedRoom, player: Player) => void;
  'room:left': (playerId: string) => void;
  'room:updated': (room: SerializedRoom) => void;
  'player:moved': (playerId: string, team: Team | null, role: PlayerRole) => void;
  'player:disconnected': (playerId: string) => void;
  'player:reconnected': (player: Player) => void;
  
  // Game Flow
  'game:started': () => void;
  'game:phase_changed': (phase: GamePhase, data?: unknown) => void;
  'game:vs_intro': (teamAPlayers: Player[], teamBPlayers: Player[]) => void;
  'game:mode_roulette': (availableModes: GameMode[], selectedMode: GameMode, duration: number) => void;
  'game:mode_selected': (mode: GameMode, data: ModeData) => void;
  'game:round_started': (round: number, mode: GameMode, data: ModeData) => void;
  'game:round_ended': (result: RoundResult) => void;
  'game:ended': (winner: Team, finalScores: { A: number; B: number }, results: RoundResult[]) => void;
  
  // Timer
  'game:timer_sync': (sync: TimerSync) => void;
  'game:timer_tick': (remaining: number) => void;
  
  // Gameplay
  'game:answer_result': (result: AnswerResult) => void;
  'game:combo_update': (team: Team, combo: number, multiplier: number) => void;
  'game:chain_update': (chain: ChainLink[]) => void;
  'game:mytho_statement': (statement: string, index: number, total: number) => void;
  'game:mytho_result': (isTrue: boolean, explanation: string, teamAScore: number, teamBScore: number) => void;
  'game:bet_revealed': (bets: { A: number; B: number }, winner: Team, target: number) => void;
  'game:bet_phase_started': (themeTitle: string, duration: number) => void;
  'game:proof_phase_started': (targetCount: number, duration: number) => void;
  'game:buzz_result': (team: Team | null, timeLeft: number) => void;
  'game:pixel_blur_update': (blur: number, progress: number) => void;
  
  // Input
  'input:sync': (team: Team, value: string) => void;
  'input:locked': (team: Team, duration: number) => void;
  
  // Dispute
  'game:dispute_started': (dispute: DisputeState) => void;
  'game:dispute_resolved': (dispute: DisputeState, accepted: boolean) => void;
  
  // Effects
  'shake': (intensity: number) => void;
  'haptic': (pattern: number[]) => void;
  
  // Errors
  'error': (message: string) => void;
}

// ============================================
// SOCKET EVENTS - Client to Server
// ============================================

export interface ClientToServerEvents {
  // Room
  'room:create': (config: Partial<RoomConfig>, callback: (roomCode: string) => void) => void;
  'room:join': (roomCode: string, playerName: string, callback: (success: boolean, error?: string) => void) => void;
  'room:leave': () => void;
  'room:move_player': (playerId: string, team: Team | null, role: PlayerRole) => void;
  'room:set_ready': (ready: boolean) => void;
  'room:update_config': (config: Partial<RoomConfig>) => void;
  
  // Game
  'game:start': () => void;
  'game:request_revanche': () => void;
  'game:select_mode': (mode: string) => void;
  
  // Mode specific answers
  'game:submit_answer': (answer: string) => void;
  'game:submit_bet': (bet: number) => void;
  'game:submit_mytho': (isTrue: boolean) => void;
  'game:buzz': () => void;
  
  // Input
  'input:typing': (value: string) => void;
  
  // Dispute
  'game:request_dispute': (answerId: string) => void;
  'game:vote_dispute': (accept: boolean) => void;
}
