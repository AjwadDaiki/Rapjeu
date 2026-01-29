// ============================================
// CONSTANTES DU JEU - 6 MODES
// ============================================

// Types locaux pour éviter les imports circulaires
type GameModeLocal = 'roland_gamos' | 'le_theme' | 'mytho_pas_mytho' | 'encheres' | 'blind_test' | 'pixel_cover';

interface RoomConfig {
  maxPlayers: number;
  modes: GameModeLocal[];
  roundTime: number;
  allowVeto: boolean;
  totalRounds: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
}

// ============================================
// TIMINGS (en millisecondes)
// ============================================

export const TIMING = {
  // Transitions
  VS_INTRO_DURATION: 4000,        // 4s - intro VS style fighting
  MODE_ROULETTE_DURATION: 5000,   // 5s - roulette qui tourne
  ROUND_RESULT_DURATION: 5000,    // 5s - résultat du round
  
  // Modes de jeu
  ROLAND_GAMOS_TURN_TIME: 15000,  // 15s par tour
  LE_THEME_TURN_TIME: 10000,      // 10s par tour
  MYTHO_PAS_MYTHO_TIME: 10000,    // 10s pour répondre Vrai/Faux
  ENCHERES_BET_TIME: 10000,       // 10s pour miser
  ENCHERES_PROOF_TIME: 45000,     // 45s pour prouver sa mise
  BLIND_TEST_ANSWER_TIME: 5000,   // 5s après buzz pour répondre
  PIXEL_COVER_DURATION: 20000,    // 20s pour deviner l'image
  
  // Anti-spam & cooldowns
  ANTI_SPAM_COOLDOWN: 500,        // 500ms entre tentatives
  INPUT_LOCK_DURATION: 1000,      // 1s lock après validation
  
  // Timer serveur tick rate
  TIMER_TICK_RATE: 250,           // 250ms entre chaque tick
} as const;

// ============================================
// SCORING SYSTEM (HP Fighting Game)
// ============================================

export const SCORING = {
  // HP
  INITIAL_HP: 100,
  MAX_HP: 100,
  MIN_HP: 0,
  
  // Roland Gamos (chain de featurings)
  RG_VALID_ANSWER_DAMAGE: 10,
  RG_TIMEOUT_DAMAGE: 15,
  RG_INVALID_ANSWER_DAMAGE: 5,
  
  // Le Theme (ex-Roland Gamos simple)
  THEME_VALID_ANSWER_DAMAGE: 8,
  THEME_TIMEOUT_DAMAGE: 15,
  THEME_INVALID_ANSWER_DAMAGE: 5,
  
  // Mytho/Pas Mytho
  MYTHO_CORRECT_DAMAGE: 15,
  MYTHO_WRONG_DAMAGE: 10,
  MYTHO_TIMEOUT_DAMAGE: 10,
  
  // Enchères
  ENCHERES_VALID_DAMAGE: 5,
  ENCHERES_FAIL_DAMAGE: 20,
  ENCHERES_SUCCESS_BONUS: 25,
  
  // Blind Test
  BT_CORRECT_DAMAGE: 25,
  BT_WRONG_DAMAGE: 10,
  
  // Pixel Cover (scoring basé sur le temps/blur)
  PC_MAX_POINTS: 30,
  PC_MIN_POINTS: 5,
  
  // Combo multipliers
  COMBO_2_MULTIPLIER: 1.5,  // x1.5 à 2 réponses consécutives
  COMBO_3_MULTIPLIER: 2.0,  // x2 à 3+ réponses consécutives
} as const;

// ============================================
// COMBO SYSTEM
// ============================================

export interface ComboState {
  teamA: {
    count: number;
    multiplier: number;
  };
  teamB: {
    count: number;
    multiplier: number;
  };
}

export function calculateComboMultiplier(comboCount: number): number {
  if (comboCount >= 3) return SCORING.COMBO_3_MULTIPLIER;
  if (comboCount >= 2) return SCORING.COMBO_2_MULTIPLIER;
  return 1.0;
}

export function applyDamageWithCombo(baseDamage: number, comboMultiplier: number): number {
  return Math.round(baseDamage * comboMultiplier);
}

// ============================================
// GAME PHASES
// ============================================

export const GAME_PHASES = [
  'lobby',
  'vs_intro',
  'mode_roulette',
  'mode_intro',
  'playing',
  'round_result',
  'final_score',
] as const;

export type GamePhase = typeof GAME_PHASES[number];

// ============================================
// GAME MODES
// ============================================

export const GAME_MODES = [
  'roland_gamos',      // VRAI - chain de featurings
  'le_theme',          // Ancien "Roland Gamos" - nommer X de catégorie Y
  'mytho_pas_mytho',   // Vrai/Faux anecdotes
  'encheres',          // Miser puis prouver
  'blind_test',        // Extrait audio + buzzer
  'pixel_cover',       // Pochette floue
] as const;

export type GameMode = typeof GAME_MODES[number];

export const GAME_MODE_NAMES: Record<GameMode, string> = {
  roland_gamos: 'Roland Gamos',
  le_theme: 'Le Thème',
  mytho_pas_mytho: 'Mytho / Pas Mytho',
  encheres: 'Les Enchères',
  blind_test: 'Blind Test',
  pixel_cover: 'Pixel Cover',
};

export const GAME_MODE_DESCRIPTIONS: Record<GameMode, string> = {
  roland_gamos: 'Chaîne de featurings - Trouve qui a un feat avec l\'artiste courant',
  le_theme: 'Nomme les artistes du thème - Tour par tour',
  mytho_pas_mytho: 'Vrai ou Faux sur des anecdotes rap',
  encheres: 'Mise secretement, le plus offrant doit prouver',
  blind_test: 'Extrait audio - Buzz et trouve le titre',
  pixel_cover: 'Pochette d\'album floue qui se dévoile',
};

// ============================================
// MODE DISPLAY INFO (pour UI)
// ============================================

export const MODE_ICONS: Record<GameMode, string> = {
  roland_gamos: '🔗',
  le_theme: '🎯',
  mytho_pas_mytho: '❓',
  encheres: '💰',
  blind_test: '🎵',
  pixel_cover: '🖼️',
};

export const MODE_COLORS: Record<GameMode, { bg: string; accent: string }> = {
  roland_gamos: { bg: 'bg-purple-900', accent: 'text-purple-400' },
  le_theme: { bg: 'bg-blue-900', accent: 'text-blue-400' },
  mytho_pas_mytho: { bg: 'bg-yellow-900', accent: 'text-yellow-400' },
  encheres: { bg: 'bg-green-900', accent: 'text-green-400' },
  blind_test: { bg: 'bg-pink-900', accent: 'text-pink-400' },
  pixel_cover: { bg: 'bg-cyan-900', accent: 'text-cyan-400' },
};

// ============================================
// FUZZY MATCHING
// ============================================

export const FUZZY = {
  MAX_LEVENSHTEIN_DISTANCE: 2,
  MIN_SIMILARITY_RATIO: 0.7,
} as const;

// ============================================
// CONFIG PAR DÉFAUT
// ============================================

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  maxPlayers: 8,
  modes: ['roland_gamos', 'le_theme', 'mytho_pas_mytho', 'encheres', 'blind_test', 'pixel_cover'],
  roundTime: 15,
  allowVeto: true,
  totalRounds: 5,
  difficulty: 'mixed',
};

// ============================================
// SOUNDS (URLs relatives à /sounds/)
// ============================================

export const SOUNDS = {
  // UI
  CLICK: '/sounds/click.mp3',
  HOVER: '/sounds/hover.mp3',
  ERROR: '/sounds/error.mp3',
  SUCCESS: '/sounds/success.mp3',
  
  // Combat
  HIT: '/sounds/hit.mp3',
  HEAVY_HIT: '/sounds/heavy_hit.mp3',
  BLOCK: '/sounds/block.mp3',
  KO: '/sounds/ko.mp3',
  
  // Game
  BUZZ: '/sounds/buzz.mp3',
  TIMER_WARNING: '/sounds/timer_warning.mp3',
  ROUND_START: '/sounds/round_start.mp3',
  ROUND_END: '/sounds/round_end.mp3',
  VICTORY: '/sounds/victory.mp3',
  DEFEAT: '/sounds/defeat.mp3',
  
  // Transitions
  VS_SLAM: '/sounds/vs_slam.mp3',
  ROULETTE_SPIN: '/sounds/roulette_spin.mp3',
  MODE_REVEAL: '/sounds/mode_reveal.mp3',
  
  // Music
  BGM_MENU: '/sounds/bgm_menu.mp3',
  BGM_GAME: '/sounds/bgm_game.mp3',
  BGM_TENSION: '/sounds/bgm_tension.mp3',
  BGM_VICTORY: '/sounds/bgm_victory.mp3',
} as const;

// ============================================
// COLORS & STYLES
// ============================================

export const TEAM_COLORS = {
  A: {
    primary: '#3B82F6',    // Blue-500
    secondary: '#1D4ED8',  // Blue-700
    accent: '#60A5FA',     // Blue-400
    dark: '#1E3A8A',       // Blue-900
  },
  B: {
    primary: '#EAB308',    // Yellow-500
    secondary: '#A16207',  // Yellow-700
    accent: '#FDE047',     // Yellow-300
    dark: '#713F12',       // Yellow-900
  },
} as const;

export function getTeamColor(team: 'A' | 'B', shade: keyof typeof TEAM_COLORS['A'] = 'primary'): string {
  return TEAM_COLORS[team][shade];
}

// ============================================
// HAPTIC PATTERNS (pour mobile)
// ============================================

export const HAPTIC_PATTERNS = {
  LIGHT: [10],
  MEDIUM: [20],
  HEAVY: [30],
  SUCCESS: [10, 50, 10],
  ERROR: [50, 30, 50],
  BUZZ: [5, 5, 5, 5, 5],
  KO: [100, 50, 100],
} as const;

// ============================================
// ANIMATION DURATIONS
// ============================================

export const ANIMATIONS = {
  SHAKE_DURATION: 500,
  HIT_STOP_DURATION: 100,
  FLASH_DURATION: 300,
  COMBO_POP_DURATION: 600,
  HP_DRAIN_DURATION: 500,
  CONFETTI_DURATION: 2000,
} as const;
