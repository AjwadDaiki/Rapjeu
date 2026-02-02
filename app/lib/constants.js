// ============================================
// CONSTANTES DU JEU (Version JS pour backend)
// ============================================

const GAME_MODES = [
  'roland_gamos',
  'le_theme',
  'mytho_pas_mytho',
  'encheres',
  'blind_test',
  'pixel_cover',
  'devine_qui',
];

const GAME_MODE_NAMES = {
  roland_gamos: 'Roland Gamos',
  le_theme: 'Le Thème',
  mytho_pas_mytho: 'Mytho / Pas Mytho',
  encheres: 'Les Enchères',
  blind_test: 'Blind Test',
  pixel_cover: 'Pixel Cover',
  devine_qui: 'Devine Qui',
};

const MODE_ICONS = {
  roland_gamos: '🔗',
  le_theme: '🎯',
  mytho_pas_mytho: '❓',
  encheres: '💰',
  blind_test: '🎵',
  pixel_cover: '🖼️',
  devine_qui: '🕵️',
};

module.exports = {
  GAME_MODES,
  GAME_MODE_NAMES,
  MODE_ICONS,
};
