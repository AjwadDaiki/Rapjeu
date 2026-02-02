// ============================================
// CONSTANTES DU JEU - 8 MODES
// ============================================

// Types locaux pour �viter les imports circulaires
type GameModeLocal = 'roland_gamos' | 'le_theme' | 'mytho_pas_mytho' | 'encheres' | 'blind_test' | 'pixel_cover' | 'devine_qui' | 'continue_paroles';

interface RoomConfig {
  maxPlayers: number;
  modes: GameModeLocal[];
  roundTime: number;
  allowVeto: boolean;
  totalRounds: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  modeSelection?: 'random' | 'manual';
  teamNames?: {
    A: string;
    B: string;
  };
  timers?: {
    rolandGamosTurnTime: number;
    leThemeTurnTime: number;
    mythoTime: number;
    encheresBetTime: number;
    encheresProofTime: number;
    blindTestAnswerTime: number;
    pixelCoverTime: number;
    devineQuiTime: number;
    continueParolesTime: number;
  };
}

// ============================================
// TIMINGS (en millisecondes)
// ============================================

export const TIMING = {
  // Transitions
  VS_INTRO_DURATION: 4000,        // 4s - intro VS style fighting
  MODE_ROULETTE_DURATION: 5000,   // 5s - roulette qui tourne
  ROUND_RESULT_DURATION: 5000,    // 5s - r�sultat du round
  
  // Modes de jeu
  ROLAND_GAMOS_TURN_TIME: 18000,  // 18s par tour
  LE_THEME_TURN_TIME: 15000,      // 15s par tour
  MYTHO_PAS_MYTHO_TIME: 12000,    // 12s pour r?pondre Vrai/Faux
  ENCHERES_BET_TIME: 12000,       // 12s pour miser
  ENCHERES_PROOF_TIME: 45000,     // 45s pour prouver sa mise
  BLIND_TEST_ANSWER_TIME: 9000,   // 9s apr?s buzz pour r?pondre
  PIXEL_COVER_DURATION: 18000,    // 18s pour deviner l'image
  DEVINE_QUI_TURN_TIME: 20000,    // 20s par tentative (alternance ?quipes)
  CONTINUE_PAROLES_TIME: 18000,   // 18s pour continuer les paroles

  // Anti-spam & cooldowns
  ANTI_SPAM_COOLDOWN: 500,        // 500ms entre tentatives
  INPUT_LOCK_DURATION: 1000,      // 1s lock apr�s validation
  
  // Timer serveur tick rate
  TIMER_TICK_RATE: 250,           // 250ms entre chaque tick
 } as const;

export const VISUAL = {
  PIXEL_COVER_MAX_BLUR: 12,
} as const;

// ============================================
// SCORING SYSTEM (HP Fighting Game)
// ============================================

export const SCORING = {
  MAX_DAMAGE_PER_MODE: 20,
  MAX_DAMAGE_PER_ACTION: 20,
  // HP
  INITIAL_HP: 100,
  MAX_HP: 100,
  MIN_HP: 0,
  
  // Roland Gamos (chain de featurings)
  RG_VALID_ANSWER_DAMAGE: 10,
  RG_TIMEOUT_DAMAGE: 12,
  RG_INVALID_ANSWER_DAMAGE: 5,
  
  // Le Theme (ex-Roland Gamos simple)
  THEME_VALID_ANSWER_DAMAGE: 8,
  THEME_TIMEOUT_DAMAGE: 12,
  THEME_INVALID_ANSWER_DAMAGE: 5,
  
  // Mytho/Pas Mytho
  MYTHO_CORRECT_DAMAGE: 12,
  MYTHO_WRONG_DAMAGE: 8,
  MYTHO_TIMEOUT_DAMAGE: 10,
  
  // Ench�res
  ENCHERES_VALID_DAMAGE: 5,
  ENCHERES_FAIL_DAMAGE: 15,
  ENCHERES_SUCCESS_BONUS: 20,
  
  // Blind Test
  BT_CORRECT_DAMAGE: 20,
  BT_WRONG_DAMAGE: 8,
  
  // Pixel Cover (scoring bas� sur le temps/blur)
  PC_MAX_POINTS: 20,
  PC_MIN_POINTS: 5,
  PC_TIMEOUT_DAMAGE: 8,

  // Devine Qui (scoring bas� sur nombre de tentatives)
  DQ_CORRECT_1ST_TRY: 20,      // 30 HP si trouv� au 1er essai
  DQ_CORRECT_2ND_TRY: 15,      // 20 HP si trouv� au 2�me essai
  DQ_CORRECT_3RD_TRY: 10,      // 15 HP si trouv� au 3�me+ essai
  DQ_WRONG_ATTEMPT: 5,         // 5 HP � l'adversaire par mauvaise r�ponse
  DQ_TIMEOUT_DAMAGE: 8,       // 10 HP si timeout

  // Continue les paroles
  CP_CORRECT_DAMAGE: 18,       // 20 HP si bonne r�ponse
  CP_WRONG_DAMAGE: 5,          // 5 HP � l'adversaire si mauvaise r�ponse
  CP_TIMEOUT_DAMAGE: 8,       // 10 HP si timeout

  // Combo multipliers
  COMBO_2_MULTIPLIER: 1.5,  // x1.5 � 2 r�ponses cons�cutives
  COMBO_3_MULTIPLIER: 2.0,  // x2 � 3+ r�ponses cons�cutives
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
  'roland_gamos',        // VRAI - chain de featurings
  'le_theme',            // Ancien "Roland Gamos" - nommer X de cat�gorie Y
  'mytho_pas_mytho',     // Vrai/Faux anecdotes
  'encheres',            // Miser puis prouver
  'blind_test',          // Extrait audio + buzzer
  'pixel_cover',         // Pochette floue
  'devine_qui',          // Devinettes avec indices style Wordle
  'continue_paroles',    // Continue les paroles du morceau
] as const;

export type GameMode = typeof GAME_MODES[number];

export const GAME_MODE_NAMES: Record<GameMode, string> = {
  roland_gamos: 'Roland Gamos',
  le_theme: 'Le Thème',
  mytho_pas_mytho: 'Mytho / Pas Mytho',
  encheres: 'Les Enchères',
  blind_test: 'Blind Test',
  pixel_cover: 'Pixel Cover',
  devine_qui: 'Devine Qui',
  continue_paroles: 'Continue les Paroles',
};

export const GAME_MODE_DESCRIPTIONS: Record<GameMode, string> = {
  roland_gamos: 'Chaîne de featurings - Trouve qui a un feat avec l\'artiste courant',
  le_theme: 'Nomme les artistes du thème - Tour par tour',
  mytho_pas_mytho: 'Vrai ou Faux sur des anecdotes rap',
  encheres: 'Mise secrètement, le plus offrant doit prouver',
  blind_test: 'Extrait audio - Buzz et trouve l\'artiste et le titre',
  pixel_cover: 'Pochette d\'album floue qui se dévoile',
  devine_qui: 'Devine le rappeur avec 5 indices - Style Wordle',
  continue_paroles: 'On te donne le début, tu continues les paroles',
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
  devine_qui: '🕵️',
  continue_paroles: '📝',
};

export const MODE_COLORS: Record<GameMode, { bg: string; accent: string }> = {
  roland_gamos: { bg: 'bg-purple-900', accent: 'text-purple-400' },
  le_theme: { bg: 'bg-blue-900', accent: 'text-blue-400' },
  mytho_pas_mytho: { bg: 'bg-yellow-900', accent: 'text-yellow-400' },
  encheres: { bg: 'bg-green-900', accent: 'text-green-400' },
  blind_test: { bg: 'bg-pink-900', accent: 'text-pink-400' },
  pixel_cover: { bg: 'bg-cyan-900', accent: 'text-cyan-400' },
  devine_qui: { bg: 'bg-orange-900', accent: 'text-orange-400' },
  continue_paroles: { bg: 'bg-emerald-900', accent: 'text-emerald-400' },
};

// ============================================
// FUZZY MATCHING
// ============================================

export const FUZZY = {
  MAX_LEVENSHTEIN_DISTANCE: 2,
  MIN_SIMILARITY_RATIO: 0.7,
} as const;

// ============================================
// CONFIG PAR D�FAUT
// ============================================

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  maxPlayers: 8,
  modes: ['roland_gamos', 'le_theme', 'mytho_pas_mytho', 'encheres', 'blind_test', 'pixel_cover', 'devine_qui', 'continue_paroles'],
  roundTime: 15,
  allowVeto: true,
  totalRounds: 5,
  difficulty: 'mixed',
  modeSelection: 'random',
  teamNames: {
    A: 'Equipe A',
    B: 'Equipe B',
  },
  timers: {
    rolandGamosTurnTime: TIMING.ROLAND_GAMOS_TURN_TIME,
    leThemeTurnTime: TIMING.LE_THEME_TURN_TIME,
    mythoTime: TIMING.MYTHO_PAS_MYTHO_TIME,
    encheresBetTime: TIMING.ENCHERES_BET_TIME,
    encheresProofTime: TIMING.ENCHERES_PROOF_TIME,
    blindTestAnswerTime: TIMING.BLIND_TEST_ANSWER_TIME,
    pixelCoverTime: TIMING.PIXEL_COVER_DURATION,
    devineQuiTime: TIMING.DEVINE_QUI_TURN_TIME,
    continueParolesTime: TIMING.CONTINUE_PAROLES_TIME,
  },
};

// ============================================
// POWER-UPS SYSTEM (entre manches)
// ============================================

export const POWER_UPS = [
  'time_boost',      // +5s de temps
  'hint',            // R�v�le un indice
  'block',           // Bloque l'adversaire (1 tour)
  'double_damage',   // x2 HP damage
  'shield',          // Immunit� 1 round
  'steal_turn',      // Vole le tour de l'adversaire
] as const;

export type PowerUp = typeof POWER_UPS[number];

export const POWER_UP_NAMES: Record<PowerUp, string> = {
  time_boost: 'Time Boost',
  hint: 'Indice Gratuit',
  block: 'Blocage',
  double_damage: 'Damage x2',
  shield: 'Bouclier',
  steal_turn: 'Vol de Tour',
};

export const POWER_UP_DESCRIPTIONS: Record<PowerUp, string> = {
  time_boost: '+5 secondes pour répondre',
  hint: 'Révèle un indice ou filtre les réponses',
  block: 'L\'adversaire saute son prochain tour',
  double_damage: 'Tes dégâts sont doublés au prochain round',
  shield: 'Tu ne subis aucun dégât au prochain round',
  steal_turn: 'Tu joues 2 fois d\'affilée',
};

export const POWER_UP_ICONS: Record<PowerUp, string> = {
  time_boost: '⏱️',
  hint: '💡',
  block: '🚫',
  double_damage: '⚡',
  shield: '🛡️',
  steal_turn: '🔁',
};

// ============================================
// SOUNDS (URLs relatives � /sounds/)
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
    primary: '#2F80ED',    // Blue
    secondary: '#1F6CD2',
    accent: '#6EA8FF',
    dark: '#1B4F9E',
  },
  B: {
    primary: '#F2C94C',    // Yellow
    secondary: '#E1B83E',
    accent: '#F7DC7A',
    dark: '#B98913',
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

