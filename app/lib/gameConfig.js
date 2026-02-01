// ============================================
// CONFIGURATION DES MODES DE JEU (Version JS pour backend)
// Permet de choisir quels modes sont actifs
// ============================================

// ==========================================
// CONFIGURATIONS PRÉDÉFINIES
// ==========================================

const DEFAULT_CONFIG = {
  enabledModes: {
    roland_gamos: true,
    le_theme: true,
    mytho_pas_mytho: true,
    encheres: true,
    blind_test: true,
    pixel_cover: true,
    devine_qui: true,
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
const QUICK_CONFIG = {
  enabledModes: {
    roland_gamos: true,
    le_theme: true,
    mytho_pas_mytho: true,
    encheres: false,
    blind_test: true,
    pixel_cover: true,
    devine_qui: false,
  },
  modesPerGame: 2,
  roundsPerMode: 3,
  randomModeOrder: true,
  enablePowerUps: false,
  vsIntroDuration: 2,
  rouletteDuration: 1,
  roundResultDuration: 2,
  challengeTime: 12,
  encheresTime: 30,
};

// Config "Marathon" (30-40 minutes)
const MARATHON_CONFIG = {
  enabledModes: {
    roland_gamos: true,
    le_theme: true,
    mytho_pas_mytho: true,
    encheres: true,
    blind_test: true,
    pixel_cover: true,
    devine_qui: true,
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
const BEGINNER_CONFIG = {
  enabledModes: {
    roland_gamos: true,
    le_theme: true,
    mytho_pas_mytho: true,
    encheres: false,
    blind_test: true,
    pixel_cover: true,
    devine_qui: false,
  },
  modesPerGame: 2,
  roundsPerMode: 2,
  randomModeOrder: true,
  enablePowerUps: false,
  vsIntroDuration: 4,
  rouletteDuration: 3,
  roundResultDuration: 4,
  challengeTime: 20,
  encheresTime: 45,
};

// Config "Culture" (modes basés sur connaissance)
const CULTURE_CONFIG = {
  enabledModes: {
    roland_gamos: true,
    le_theme: true,
    mytho_pas_mytho: true,
    encheres: true,
    blind_test: false,
    pixel_cover: false,
    devine_qui: true,
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
const SPEED_CONFIG = {
  enabledModes: {
    roland_gamos: false,
    le_theme: true,
    mytho_pas_mytho: true,
    encheres: false,
    blind_test: true,
    pixel_cover: true,
    devine_qui: false,
  },
  modesPerGame: 3,
  roundsPerMode: 5,
  randomModeOrder: true,
  enablePowerUps: false,
  vsIntroDuration: 2,
  rouletteDuration: 1,
  roundResultDuration: 2,
  challengeTime: 8,
  encheresTime: 30,
};

// Config "Soirée" (équilibré, 25-30 minutes)
const PARTY_CONFIG = {
  enabledModes: {
    roland_gamos: true,
    le_theme: true,
    mytho_pas_mytho: true,
    encheres: true,
    blind_test: true,
    pixel_cover: true,
    devine_qui: true,
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

function getActiveModes(config) {
  return Object.entries(config.enabledModes)
    .filter(([_, enabled]) => enabled)
    .map(([mode, _]) => mode);
}

function selectRandomModes(config) {
  const activeModes = getActiveModes(config);

  if (activeModes.length < config.modesPerGame) {
    console.warn(
      `Pas assez de modes actifs (${activeModes.length}) pour modesPerGame (${config.modesPerGame})`
    );
    return activeModes;
  }

  const shuffled = [...activeModes].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, config.modesPerGame);
}

function validateConfig(config) {
  const errors = [];

  const activeModes = getActiveModes(config);
  if (activeModes.length === 0) {
    errors.push('Au moins 1 mode doit être actif');
  }

  if (config.modesPerGame > activeModes.length) {
    errors.push(`modesPerGame (${config.modesPerGame}) > modes actifs (${activeModes.length})`);
  }

  if (config.modesPerGame < 1 || config.modesPerGame > 6) {
    errors.push('modesPerGame doit être entre 1 et 6');
  }

  if (config.roundsPerMode < 1 || config.roundsPerMode > 10) {
    errors.push('roundsPerMode doit être entre 1 et 10');
  }

  if (config.vsIntroDuration < 0 || config.vsIntroDuration > 10) {
    errors.push('vsIntroDuration doit être entre 0 et 10 secondes');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  DEFAULT_CONFIG,
  QUICK_CONFIG,
  MARATHON_CONFIG,
  BEGINNER_CONFIG,
  CULTURE_CONFIG,
  SPEED_CONFIG,
  PARTY_CONFIG,
  getActiveModes,
  selectRandomModes,
  validateConfig,
};
