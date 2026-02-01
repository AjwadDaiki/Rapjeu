// ============================================
// CONFIGURATION DES MODES DE JEU
// Permet de choisir quels modes sont actifs
// ============================================

import { GameMode } from './constants';

export interface GameConfig {
  // Modes actifs (true = activé dans la roulette)
  enabledModes: Record<GameMode, boolean>;

  // Rythme de la partie
  modesPerGame: number;        // 2-3 modes recommandés
  roundsPerMode: number;        // 3-5 rounds recommandés
  randomModeOrder: boolean;     // true = ordre aléatoire, false = ordre fixe

  // Power-ups entre manches
  enablePowerUps: boolean;      // true = power-ups aléatoires entre manches

  // Durées (en secondes)
  vsIntroDuration: number;      // Écran VS (défaut: 3s)
  rouletteDuration: number;     // Roulette mode (défaut: 2s)
  roundResultDuration: number;  // Résultat round (défaut: 3s)

  // Temps par épreuve (en secondes)
  challengeTime: number;        // Temps par défaut pour répondre (défaut: 15s)
  encheresTime: number;         // Temps pour les enchères (défaut: 45s)
}

// ==========================================
// CONFIGURATIONS PRÉDÉFINIES
// ==========================================

export const DEFAULT_CONFIG: GameConfig = {
  enabledModes: {
    roland_gamos: true,
    le_theme: true,
    mytho_pas_mytho: true,
    encheres: true,
    blind_test: true,
    pixel_cover: true,
    devine_qui: true,
    continue_paroles: true,
  },
  modesPerGame: 3,
  roundsPerMode: 3,
  randomModeOrder: true,
  enablePowerUps: true,
  vsIntroDuration: 3,
  rouletteDuration: 2,
  roundResultDuration: 3,
  challengeTime: 15,
  encheresTime: 45,
};

// Config "Rapide" (10-15 minutes)
export const QUICK_CONFIG: GameConfig = {
  enabledModes: {
    roland_gamos: true,
    le_theme: true,
    mytho_pas_mytho: true,
    encheres: false,
    blind_test: true,
    pixel_cover: true,
    devine_qui: false,   // Trop long pour mode rapide
    continue_paroles: true,
  },
  modesPerGame: 2,
  roundsPerMode: 3,
  randomModeOrder: true,
  enablePowerUps: false,  // Pas de power-ups en mode rapide
  vsIntroDuration: 2,
  rouletteDuration: 1,
  roundResultDuration: 2,
  challengeTime: 12,
  encheresTime: 30,
};

// Config "Marathon" (30-40 minutes)
export const MARATHON_CONFIG: GameConfig = {
  enabledModes: {
    roland_gamos: true,
    le_theme: true,
    mytho_pas_mytho: true,
    encheres: true,
    blind_test: true,
    pixel_cover: true,
    devine_qui: true,
    continue_paroles: true,
  },
  modesPerGame: 5,
  roundsPerMode: 5,
  randomModeOrder: true,
  enablePowerUps: true,
  vsIntroDuration: 4,
  rouletteDuration: 3,
  roundResultDuration: 4,
  challengeTime: 20,
  encheresTime: 60,
};

// Config "Débutant" (facile, 15-20 minutes)
export const BEGINNER_CONFIG: GameConfig = {
  enabledModes: {
    roland_gamos: true,
    le_theme: true,
    mytho_pas_mytho: true,
    encheres: false,      // Trop complexe pour débutants
    blind_test: true,
    pixel_cover: true,
    devine_qui: false,    // Trop complexe pour débutants
    continue_paroles: true,
  },
  modesPerGame: 2,
  roundsPerMode: 2,
  randomModeOrder: true,
  enablePowerUps: false,  // Pas de power-ups pour débutants
  vsIntroDuration: 4,     // Plus de temps pour comprendre
  rouletteDuration: 3,
  roundResultDuration: 4,
  challengeTime: 20,      // Plus de temps pour réfléchir
  encheresTime: 45,
};

// Config "Culture" (modes basés sur connaissance)
export const CULTURE_CONFIG: GameConfig = {
  enabledModes: {
    roland_gamos: true,  // Featurings
    le_theme: true,      // Thèmes
    mytho_pas_mytho: true, // Anecdotes
    encheres: true,      // Mise + preuve
    blind_test: false,   // ❌ Désactivé
    pixel_cover: false,  // ❌ Désactivé
    devine_qui: true,    // ✅ Parfait pour culture!
    continue_paroles: true,
  },
  modesPerGame: 3,
  roundsPerMode: 4,
  randomModeOrder: true,
  enablePowerUps: true,
  vsIntroDuration: 3,
  rouletteDuration: 2,
  roundResultDuration: 3,
  challengeTime: 18,
  encheresTime: 50,
};

// Config "Speed Run" (modes basés sur réflexes)
export const SPEED_CONFIG: GameConfig = {
  enabledModes: {
    roland_gamos: false,   // ❌ Désactivé
    le_theme: true,        // Thèmes (rapide)
    mytho_pas_mytho: true, // Vrai/Faux (rapide)
    encheres: false,       // ❌ Désactivé
    blind_test: true,      // Buzzer (rapide)
    pixel_cover: true,     // Image (rapide)
    devine_qui: false,     // ❌ Trop lent
    continue_paroles: false,
  },
  modesPerGame: 3,
  roundsPerMode: 5,
  randomModeOrder: true,
  enablePowerUps: false,   // Pas de power-ups en speed
  vsIntroDuration: 2,
  rouletteDuration: 1,
  roundResultDuration: 2,
  challengeTime: 8,       // Très rapide!
  encheresTime: 30,
};

// Config "Soirée" (équilibré, 25-30 minutes)
export const PARTY_CONFIG: GameConfig = {
  enabledModes: {
    roland_gamos: true,
    le_theme: true,
    mytho_pas_mytho: true,
    encheres: true,
    blind_test: true,
    pixel_cover: true,
    devine_qui: true,
    continue_paroles: true,
  },
  modesPerGame: 4,
  roundsPerMode: 4,
  randomModeOrder: true,
  enablePowerUps: true,
  vsIntroDuration: 3,
  rouletteDuration: 2,
  roundResultDuration: 3,
  challengeTime: 15,
  encheresTime: 45,
};

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Obtenir les modes actifs depuis la config
 */
export function getActiveModes(config: GameConfig): GameMode[] {
  return Object.entries(config.enabledModes)
    .filter(([_, enabled]) => enabled)
    .map(([mode, _]) => mode as GameMode);
}

/**
 * Sélectionner aléatoirement N modes depuis les modes actifs
 */
export function selectRandomModes(config: GameConfig): GameMode[] {
  const activeModes = getActiveModes(config);

  // Vérifier qu'on a assez de modes
  if (activeModes.length < config.modesPerGame) {
    console.warn(
      `Pas assez de modes actifs (${activeModes.length}) pour modesPerGame (${config.modesPerGame})`
    );
    return activeModes;
  }

  // Shuffle et prendre les N premiers
  const shuffled = [...activeModes].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, config.modesPerGame);
}

/**
 * Valider la configuration
 */
export function validateConfig(config: GameConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Au moins 1 mode actif
  const activeModes = getActiveModes(config);
  if (activeModes.length === 0) {
    errors.push('Au moins 1 mode doit être actif');
  }

  // modesPerGame pas trop grand
  if (config.modesPerGame > activeModes.length) {
    errors.push(`modesPerGame (${config.modesPerGame}) > modes actifs (${activeModes.length})`);
  }

  // Limites raisonnables
  if (config.modesPerGame < 1 || config.modesPerGame > 6) {
    errors.push('modesPerGame doit être entre 1 et 6');
  }

  if (config.roundsPerMode < 1 || config.roundsPerMode > 10) {
    errors.push('roundsPerMode doit être entre 1 et 10');
  }

  // Durées
  if (config.vsIntroDuration < 0 || config.vsIntroDuration > 10) {
    errors.push('vsIntroDuration doit être entre 0 et 10 secondes');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculer la durée estimée d'une partie (en minutes)
 */
export function estimateGameDuration(config: GameConfig): number {
  const activeModes = getActiveModes(config);

  // Durée moyenne par round selon le mode (en secondes)
  const avgRoundDurations: Record<GameMode, number> = {
    roland_gamos: 20,      // 15s + transitions
    le_theme: 15,          // 10s + transitions
    mytho_pas_mytho: 12,   // 10s + transitions
    encheres: 60,          // 10s bet + 45s proof + transitions
    blind_test: 15,        // Audio + 5s answer + transitions
    pixel_cover: 25,       // 20s + transitions
    devine_qui: 25,        // 20s + transitions
    continue_paroles: 20,  // 15s + transitions
  };

  // Durée totale
  let totalSeconds = 0;

  // VS Intro (1 fois)
  totalSeconds += config.vsIntroDuration;

  // Pour chaque mode
  const selectedModes = selectRandomModes(config);
  for (const mode of selectedModes) {
    // Roulette
    totalSeconds += config.rouletteDuration;

    // Rounds
    const avgDuration = avgRoundDurations[mode] || 20;
    totalSeconds += avgDuration * config.roundsPerMode;

    // Round results
    totalSeconds += config.roundResultDuration * config.roundsPerMode;
  }

  // Final score (10s)
  totalSeconds += 10;

  // Convertir en minutes
  return Math.ceil(totalSeconds / 60);
}

/**
 * Sauvegarder la config dans localStorage
 */
export function saveConfig(config: GameConfig): void {
  localStorage.setItem('gameConfig', JSON.stringify(config));
}

/**
 * Charger la config depuis localStorage (ou défaut)
 */
export function loadConfig(): GameConfig {
  try {
    const saved = localStorage.getItem('gameConfig');
    if (saved) {
      const config = JSON.parse(saved) as GameConfig;
      const validation = validateConfig(config);
      if (validation.valid) {
        return config;
      }
    }
  } catch (error) {
    console.error('Erreur chargement config:', error);
  }

  return DEFAULT_CONFIG;
}
