// ============================================
// THÈMES POUR "LE THÈME" ET "LES ENCHÈRES"
// Version JS minimale pour backend
// ============================================

// Thèmes basiques pour démarrer
const ALL_THEMES = [
  // Géographie
  { id: 'geo_93', title: 'Rappeurs du 93', description: 'Seine-Saint-Denis', category: 'geography', difficulty: 'easy', mongoQuery: { 'location.department': '93' } },
  { id: 'geo_92', title: 'Rappeurs du 92', description: 'Hauts-de-Seine', category: 'geography', difficulty: 'easy', mongoQuery: { 'location.department': '92' } },
  { id: 'geo_13', title: 'Rappeurs de Marseille', description: 'Bouches-du-Rhône', category: 'geography', difficulty: 'easy', mongoQuery: { 'location.department': '13' } },

  // Style
  { id: 'style_trap', title: 'Rappeurs Trap', description: 'Style trap français', category: 'style', difficulty: 'easy', mongoQuery: { tags: 'trap' } },
  { id: 'style_drill', title: 'Rappeurs Drill', description: 'Drill français', category: 'style', difficulty: 'medium', mongoQuery: { tags: 'drill' } },

  // Timeline
  { id: 'year_2020', title: 'Sorti en 2020', description: 'Albums sortis en 2020', category: 'timeline', difficulty: 'easy', mongoQuery: { firstReleaseYear: 2020 } },
  { id: 'year_2019', title: 'Sorti en 2019', description: 'Albums sortis en 2019', category: 'timeline', difficulty: 'easy', mongoQuery: { firstReleaseYear: 2019 } },

  // Stats
  { id: 'stats_5albums', title: '5+ albums', description: 'Rappeurs avec 5 albums ou plus', category: 'stats', difficulty: 'medium', mongoQuery: { totalAlbums: { $gte: 5 } } },
  { id: 'stats_popular', title: 'Top artistes', description: 'Artistes les plus populaires', category: 'stats', difficulty: 'easy', mongoQuery: { isTopArtist: true } },

  // Lettres
  { id: 'letter_k', title: 'Commence par K', description: 'Rappeurs commençant par K', category: 'letters', difficulty: 'medium', mongoQuery: { name: /^K/i } },
  { id: 'letter_b', title: 'Commence par B', description: 'Rappeurs commençant par B', category: 'letters', difficulty: 'easy', mongoQuery: { name: /^B/i } },
];

/**
 * Sélectionne un thème aléatoire selon la difficulté
 */
function selectRandomTheme(difficulty = 'medium') {
  const filtered = difficulty === 'mixed'
    ? ALL_THEMES
    : ALL_THEMES.filter(t => t.difficulty === difficulty);

  if (filtered.length === 0) {
    return ALL_THEMES[0]; // Fallback
  }

  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex];
}

/**
 * Obtenir un thème par ID
 */
function getThemeById(id) {
  return ALL_THEMES.find(t => t.id === id);
}

module.exports = {
  ALL_THEMES,
  selectRandomTheme,
  getThemeById,
};
