// @ts-nocheck
// ============================================
// THÃˆMES POUR "LE THÃˆME" ET "LES ENCHÃˆRES"
// Plus de 100 thÃ¨mes diffÃ©rents!
// ============================================

export interface Theme {
  id: string;
  title: string;
  description: string;
  category: 'geography' | 'style' | 'timeline' | 'stats' | 'letters' | 'collab' | 'label';
  difficulty: 'easy' | 'medium' | 'hard';
  mongoQuery: any; // Query MongoDB pour filtrer les artistes
  estimatedCount?: number; // Nombre estimÃ© de rÃ©ponses possibles
  source?: 'artists' | 'albums' | 'tracks' | 'collaborations';
  collabArtist?: string;
  limit?: number;
}

// ==========================================
// ðŸ“ GÃ‰OGRAPHIE (30+ thÃ¨mes)
// ==========================================

export const GEOGRAPHY_THEMES: Theme[] = [
  // DÃ©partements
  { id: 'geo_91', title: 'Rappeurs du 91', description: 'Essonne represent', category: 'geography', difficulty: 'easy', mongoQuery: { 'location.department': '91' }, estimatedCount: 150 },
  { id: 'geo_92', title: 'Rappeurs du 92', description: 'Hauts-de-Seine', category: 'geography', difficulty: 'easy', mongoQuery: { 'location.department': '92' }, estimatedCount: 200 },
  { id: 'geo_93', title: 'Rappeurs du 93', description: 'Seine-Saint-Denis', category: 'geography', difficulty: 'easy', mongoQuery: { 'location.department': '93' }, estimatedCount: 300 },
  { id: 'geo_94', title: 'Rappeurs du 94', description: 'Val-de-Marne', category: 'geography', difficulty: 'easy', mongoQuery: { 'location.department': '94' }, estimatedCount: 120 },
  { id: 'geo_95', title: 'Rappeurs du 95', description: 'Val-d\'Oise', category: 'geography', difficulty: 'medium', mongoQuery: { 'location.department': '95' }, estimatedCount: 80 },
  { id: 'geo_75', title: 'Rappeurs de Paris', description: '75 intra-muros', category: 'geography', difficulty: 'medium', mongoQuery: { 'location.department': '75' }, estimatedCount: 100 },
  { id: 'geo_13', title: 'Rappeurs de Marseille', description: 'Bouches-du-RhÃ´ne', category: 'geography', difficulty: 'easy', mongoQuery: { 'location.department': '13' }, estimatedCount: 150 },
  { id: 'geo_69', title: 'Rappeurs de Lyon', description: 'RhÃ´ne', category: 'geography', difficulty: 'medium', mongoQuery: { 'location.department': '69' }, estimatedCount: 60 },
  { id: 'geo_59', title: 'Rappeurs de Lille', description: 'Nord', category: 'geography', difficulty: 'medium', mongoQuery: { 'location.department': '59' }, estimatedCount: 50 },
  { id: 'geo_33', title: 'Rappeurs de Bordeaux', description: 'Gironde', category: 'geography', difficulty: 'hard', mongoQuery: { 'location.department': '33' }, estimatedCount: 30 },

  // RÃ©gions/Zones
  { id: 'geo_idf', title: 'ÃŽle-de-France', description: 'Rappeurs d\'IdF', category: 'geography', difficulty: 'easy', mongoQuery: { 'location.department': { $in: ['75', '91', '92', '93', '94', '95'] } }, estimatedCount: 800 },
  { id: 'geo_sud', title: 'Sud de la France', description: 'Marseille, Nice, Toulouse...', category: 'geography', difficulty: 'medium', mongoQuery: { 'location.department': { $in: ['13', '06', '31', '34'] } }, estimatedCount: 200 },
];

// ==========================================
// ðŸŽ¨ STYLE MUSICAL (25+ thÃ¨mes)
// ==========================================

export const STYLE_THEMES: Theme[] = [
  // Sous-genres
  { id: 'style_trap', title: 'Rappeurs Trap', description: 'Style trap franÃ§ais', category: 'style', difficulty: 'easy', mongoQuery: { tags: 'trap' }, estimatedCount: 400 },
  { id: 'style_drill', title: 'Rappeurs Drill', description: 'Drill franÃ§ais', category: 'style', difficulty: 'medium', mongoQuery: { tags: 'drill' }, estimatedCount: 150 },
  { id: 'style_cloud', title: 'Cloud Rap', description: 'Cloud rap / autotune', category: 'style', difficulty: 'hard', mongoQuery: { tags: { $in: ['cloud rap', 'autotune'] } }, estimatedCount: 80 },
  { id: 'style_boom_bap', title: 'Boom Bap', description: 'Rap boom bap old school', category: 'style', difficulty: 'medium', mongoQuery: { tags: { $in: ['boom bap', 'old school'] } }, estimatedCount: 120 },
  { id: 'style_conscient', title: 'Rap Conscient', description: 'Rap conscient / engagÃ©', category: 'style', difficulty: 'medium', mongoQuery: { tags: { $in: ['conscious hip hop', 'political'] } }, estimatedCount: 100 },
  { id: 'style_hardcore', title: 'Rap Hardcore', description: 'Rap hardcore / street', category: 'style', difficulty: 'medium', mongoQuery: { tags: { $in: ['hardcore', 'street rap'] } }, estimatedCount: 200 },
  { id: 'style_rnb', title: 'Rap/RnB', description: 'MÃ©lange rap et RnB', category: 'style', difficulty: 'hard', mongoQuery: { tags: { $in: ['rnb', 'contemporary r&b'] } }, estimatedCount: 60 },
];

// ==========================================
// ðŸ“… CHRONOLOGIE (35+ thÃ¨mes)
// ==========================================

export const TIMELINE_THEMES: Theme[] = [
  // DÃ©cennies
  { id: 'time_90s', title: 'AnnÃ©es 90', description: 'DÃ©buts dans les 90s', category: 'timeline', difficulty: 'hard', mongoQuery: { firstReleaseYear: { $gte: 1990, $lte: 1999 } }, estimatedCount: 80 },
  { id: 'time_2000s', title: 'AnnÃ©es 2000', description: 'DÃ©buts dans les 2000s', category: 'timeline', difficulty: 'medium', mongoQuery: { firstReleaseYear: { $gte: 2000, $lte: 2009 } }, estimatedCount: 200 },
  { id: 'time_2010s', title: 'AnnÃ©es 2010', description: 'DÃ©buts dans les 2010s', category: 'timeline', difficulty: 'easy', mongoQuery: { firstReleaseYear: { $gte: 2010, $lte: 2019 } }, estimatedCount: 800 },
  { id: 'time_2020s', title: 'New Gen 2020+', description: 'DÃ©buts aprÃ¨s 2020', category: 'timeline', difficulty: 'easy', mongoQuery: { firstReleaseYear: { $gte: 2020 } }, estimatedCount: 500 },

  // Annees specifiques (albums)
  { id: 'time_2015', title: 'Albums sortis en 2015', description: 'Titres d\'albums de 2015', category: 'timeline', difficulty: 'medium', source: 'albums', mongoQuery: { year: 2015, albumType: 'album' }, estimatedCount: 100 },
  { id: 'time_2016', title: 'Albums sortis en 2016', description: 'Titres d\'albums de 2016', category: 'timeline', difficulty: 'medium', source: 'albums', mongoQuery: { year: 2016, albumType: 'album' }, estimatedCount: 120 },
  { id: 'time_2017', title: 'Albums sortis en 2017', description: 'Titres d\'albums de 2017', category: 'timeline', difficulty: 'medium', source: 'albums', mongoQuery: { year: 2017, albumType: 'album' }, estimatedCount: 150 },
  { id: 'time_2018', title: 'Albums sortis en 2018', description: 'Titres d\'albums de 2018', category: 'timeline', difficulty: 'easy', source: 'albums', mongoQuery: { year: 2018, albumType: 'album' }, estimatedCount: 180 },
  { id: 'time_2019', title: 'Albums sortis en 2019', description: 'Titres d\'albums de 2019', category: 'timeline', difficulty: 'easy', source: 'albums', mongoQuery: { year: 2019, albumType: 'album' }, estimatedCount: 200 },
  { id: 'time_2020', title: 'Albums sortis en 2020', description: 'Titres d\'albums de 2020', category: 'timeline', difficulty: 'easy', source: 'albums', mongoQuery: { year: 2020, albumType: 'album' }, estimatedCount: 220 },
  { id: 'time_2021', title: 'Albums sortis en 2021', description: 'Titres d\'albums de 2021', category: 'timeline', difficulty: 'easy', source: 'albums', mongoQuery: { year: 2021, albumType: 'album' }, estimatedCount: 230 },
  { id: 'time_2022', title: 'Albums sortis en 2022', description: 'Titres d\'albums de 2022', category: 'timeline', difficulty: 'easy', source: 'albums', mongoQuery: { year: 2022, albumType: 'album' }, estimatedCount: 240 },
  { id: 'time_2023', title: 'Albums sortis en 2023', description: 'Titres d\'albums de 2023', category: 'timeline', difficulty: 'easy', source: 'albums', mongoQuery: { year: 2023, albumType: 'album' }, estimatedCount: 250 },
  { id: 'time_2024', title: 'Albums sortis en 2024', description: 'Titres d\'albums de 2024', category: 'timeline', difficulty: 'easy', source: 'albums', mongoQuery: { year: 2024, albumType: 'album' }, estimatedCount: 200 },
  { id: 'time_2025', title: 'Albums sortis en 2025', description: 'Titres d\'albums de 2025', category: 'timeline', difficulty: 'medium', source: 'albums', mongoQuery: { year: 2025, albumType: 'album' }, estimatedCount: 50 },
];

// ==========================================
// ðŸ“Š STATISTIQUES (30+ thÃ¨mes)
// ==========================================

export const STATS_THEMES: Theme[] = [
  // Albums
  { id: 'stats_1_album', title: '1 seul album', description: 'Artistes avec 1 album', category: 'stats', difficulty: 'hard', mongoQuery: { totalAlbums: 1 }, estimatedCount: 400 },
  { id: 'stats_2_3_albums', title: '2-3 albums', description: 'Entre 2 et 3 albums', category: 'stats', difficulty: 'medium', mongoQuery: { totalAlbums: { $gte: 2, $lte: 3 } }, estimatedCount: 600 },
  { id: 'stats_4_5_albums', title: '4-5 albums', description: 'Entre 4 et 5 albums', category: 'stats', difficulty: 'medium', mongoQuery: { totalAlbums: { $gte: 4, $lte: 5 } }, estimatedCount: 400 },
  { id: 'stats_5plus_albums', title: '+5 albums', description: 'Au moins 5 albums', category: 'stats', difficulty: 'easy', mongoQuery: { totalAlbums: { $gte: 5 } }, estimatedCount: 300 },
  { id: 'stats_10plus_albums', title: '+10 albums', description: 'Au moins 10 albums', category: 'stats', difficulty: 'hard', mongoQuery: { totalAlbums: { $gte: 10 } }, estimatedCount: 50 },
  { id: 'stats_moins_5_albums', title: 'Moins de 5 albums', description: 'Moins de 5 albums', category: 'stats', difficulty: 'easy', mongoQuery: { totalAlbums: { $lt: 5 } }, estimatedCount: 1500 },

  // PopularitÃ©
  { id: 'stats_pop_70', title: 'Rappeurs tres populaires', description: 'Popularite >= 70', category: 'stats', difficulty: 'easy', mongoQuery: { popularity: { $gte: 70 } }, estimatedCount: 100 },
  { id: 'stats_pop_50', title: 'Rappeurs populaires', description: 'Popularite >= 50', category: 'stats', difficulty: 'easy', mongoQuery: { popularity: { $gte: 50 } }, estimatedCount: 200 },
  { id: 'stats_5m_listeners', title: '+5M listeners', description: 'Au moins 5M d\'auditeurs', category: 'stats', difficulty: 'medium', mongoQuery: { monthlyListeners: { $gte: 5000000 } }, estimatedCount: 50 },
  { id: 'stats_1m_listeners', title: '+1M listeners', description: 'Au moins 1M d\'auditeurs', category: 'stats', difficulty: 'easy', mongoQuery: { monthlyListeners: { $gte: 1000000 } }, estimatedCount: 200 },
  { id: 'stats_500k_listeners', title: '+500K listeners', description: 'Au moins 500K auditeurs', category: 'stats', difficulty: 'easy', mongoQuery: { monthlyListeners: { $gte: 500000 } }, estimatedCount: 400 },

  // Tracks
  { id: 'stats_50plus_tracks', title: '+50 tracks', description: 'Au moins 50 tracks', category: 'stats', difficulty: 'medium', mongoQuery: { totalTracks: { $gte: 50 } }, estimatedCount: 400 },
  { id: 'stats_100plus_tracks', title: '+100 tracks', description: 'Au moins 100 tracks', category: 'stats', difficulty: 'hard', mongoQuery: { totalTracks: { $gte: 100 } }, estimatedCount: 150 },
  { id: 'stats_mainstream', title: 'Rappeurs mainstream', description: 'Tier mainstream', category: 'stats', difficulty: 'easy', mongoQuery: { tier: 'mainstream' }, estimatedCount: 100 },
  { id: 'stats_mid', title: 'Rappeurs mid-tier', description: 'Tier mid', category: 'stats', difficulty: 'medium', mongoQuery: { tier: 'mid' }, estimatedCount: 200 },
  { id: 'stats_underground', title: 'Rappeurs underground', description: 'Tier underground', category: 'stats', difficulty: 'hard', mongoQuery: { tier: 'underground' }, estimatedCount: 400 },
  { id: 'stats_albums_numbers', title: 'Albums avec un chiffre', description: "Titres d'albums contenant un numero", category: 'stats', difficulty: 'medium', source: 'albums', mongoQuery: { title: /\d/ }, estimatedCount: 200 },
  { id: 'stats_tracks_numbers', title: 'Tracks avec un chiffre', description: 'Titres de tracks contenant un numero', category: 'stats', difficulty: 'medium', source: 'tracks', mongoQuery: { title: /\d/ }, estimatedCount: 300 },
  { id: 'stats_tracks_explicit', title: 'Tracks explicites', description: 'Morceaux explicit', category: 'stats', difficulty: 'hard', source: 'tracks', mongoQuery: { explicit: true }, estimatedCount: 300 },
  { id: 'stats_tracks_feat', title: 'Tracks avec feat', description: 'Morceaux avec featuring', category: 'stats', difficulty: 'easy', source: 'tracks', mongoQuery: { 'featuring.0': { $exists: true } }, estimatedCount: 400 },
  { id: 'stats_albums_labels', title: 'Albums de gros labels', description: 'Universal, Sony, Warner...', category: 'label', difficulty: 'medium', source: 'albums', mongoQuery: { label: /universal|sony|warner/i }, estimatedCount: 150 }
];

// ==========================================
// ðŸ”¤ LETTRES DANS LE PSEUDO (26 thÃ¨mes!)
// ==========================================

export const LETTER_THEMES: Theme[] = [
  { id: 'letter_a', title: 'Lettre A dans le pseudo', description: 'Contient un "A"', category: 'letters', difficulty: 'easy', mongoQuery: { name: /a/i }, estimatedCount: 800 },
  { id: 'letter_b', title: 'Lettre B dans le pseudo', description: 'Contient un "B"', category: 'letters', difficulty: 'medium', mongoQuery: { name: /b/i }, estimatedCount: 300 },
  { id: 'letter_c', title: 'Lettre C dans le pseudo', description: 'Contient un "C"', category: 'letters', difficulty: 'medium', mongoQuery: { name: /c/i }, estimatedCount: 400 },
  { id: 'letter_d', title: 'Lettre D dans le pseudo', description: 'Contient un "D"', category: 'letters', difficulty: 'medium', mongoQuery: { name: /d/i }, estimatedCount: 300 },
  { id: 'letter_e', title: 'Lettre E dans le pseudo', description: 'Contient un "E"', category: 'letters', difficulty: 'easy', mongoQuery: { name: /e/i }, estimatedCount: 900 },
  { id: 'letter_f', title: 'Lettre F dans le pseudo', description: 'Contient un "F"', category: 'letters', difficulty: 'hard', mongoQuery: { name: /f/i }, estimatedCount: 200 },
  { id: 'letter_g', title: 'Lettre G dans le pseudo', description: 'Contient un "G"', category: 'letters', difficulty: 'medium', mongoQuery: { name: /g/i }, estimatedCount: 300 },
  { id: 'letter_h', title: 'Lettre H dans le pseudo', description: 'Contient un "H"', category: 'letters', difficulty: 'medium', mongoQuery: { name: /h/i }, estimatedCount: 250 },
  { id: 'letter_i', title: 'Lettre I dans le pseudo', description: 'Contient un "I"', category: 'letters', difficulty: 'medium', mongoQuery: { name: /i/i }, estimatedCount: 600 },
  { id: 'letter_j', title: 'Lettre J dans le pseudo', description: 'Contient un "J"', category: 'letters', difficulty: 'hard', mongoQuery: { name: /j/i }, estimatedCount: 150 },
  { id: 'letter_k', title: 'Lettre K dans le pseudo', description: 'Contient un "K"', category: 'letters', difficulty: 'medium', mongoQuery: { name: /k/i }, estimatedCount: 350 },
  { id: 'letter_l', title: 'Lettre L dans le pseudo', description: 'Contient un "L"', category: 'letters', difficulty: 'easy', mongoQuery: { name: /l/i }, estimatedCount: 700 },
  { id: 'letter_m', title: 'Lettre M dans le pseudo', description: 'Contient un "M"', category: 'letters', difficulty: 'medium', mongoQuery: { name: /m/i }, estimatedCount: 500 },
  { id: 'letter_n', title: 'Lettre N dans le pseudo', description: 'Contient un "N"', category: 'letters', difficulty: 'medium', mongoQuery: { name: /n/i }, estimatedCount: 600 },
  { id: 'letter_o', title: 'Lettre O dans le pseudo', description: 'Contient un "O"', category: 'letters', difficulty: 'easy', mongoQuery: { name: /o/i }, estimatedCount: 700 },
  { id: 'letter_p', title: 'Lettre P dans le pseudo', description: 'Contient un "P"', category: 'letters', difficulty: 'medium', mongoQuery: { name: /p/i }, estimatedCount: 400 },
  { id: 'letter_q', title: 'Lettre Q dans le pseudo', description: 'Contient un "Q"', category: 'letters', difficulty: 'hard', mongoQuery: { name: /q/i }, estimatedCount: 100 },
  { id: 'letter_r', title: 'Lettre R dans le pseudo', description: 'Contient un "R"', category: 'letters', difficulty: 'easy', mongoQuery: { name: /r/i }, estimatedCount: 800 },
  { id: 'letter_s', title: 'Lettre S dans le pseudo', description: 'Contient un "S"', category: 'letters', difficulty: 'easy', mongoQuery: { name: /s/i }, estimatedCount: 700 },
  { id: 'letter_t', title: 'Lettre T dans le pseudo', description: 'Contient un "T"', category: 'letters', difficulty: 'medium', mongoQuery: { name: /t/i }, estimatedCount: 500 },
  { id: 'letter_u', title: 'Lettre U dans le pseudo', description: 'Contient un "U"', category: 'letters', difficulty: 'medium', mongoQuery: { name: /u/i }, estimatedCount: 400 },
  { id: 'letter_v', title: 'Lettre V dans le pseudo', description: 'Contient un "V"', category: 'letters', difficulty: 'hard', mongoQuery: { name: /v/i }, estimatedCount: 200 },
  { id: 'letter_w', title: 'Lettre W dans le pseudo', description: 'Contient un "W"', category: 'letters', difficulty: 'hard', mongoQuery: { name: /w/i }, estimatedCount: 150 },
  { id: 'letter_x', title: 'Lettre X dans le pseudo', description: 'Contient un "X"', category: 'letters', difficulty: 'hard', mongoQuery: { name: /x/i }, estimatedCount: 120 },
  { id: 'letter_y', title: 'Lettre Y dans le pseudo', description: 'Contient un "Y"', category: 'letters', difficulty: 'medium', mongoQuery: { name: /y/i }, estimatedCount: 350 },
  { id: 'letter_z', title: 'Lettre Z dans le pseudo', description: 'Contient un "Z"', category: 'letters', difficulty: 'hard', mongoQuery: { name: /z/i }, estimatedCount: 180 },

  // Variantes
  { id: 'letter_start_a', title: 'Commence par A', description: 'Pseudo commence par A', category: 'letters', difficulty: 'medium', mongoQuery: { name: /^a/i }, estimatedCount: 150 },
  { id: 'letter_start_l', title: 'Commence par L', description: 'Pseudo commence par L', category: 'letters', difficulty: 'medium', mongoQuery: { name: /^l/i }, estimatedCount: 180 },
  { id: 'letter_start_n', title: 'Commence par N', description: 'Pseudo commence par N', category: 'letters', difficulty: 'medium', mongoQuery: { name: /^n/i }, estimatedCount: 150 },
  { id: 'letter_start_s', title: 'Commence par S', description: 'Pseudo commence par S', category: 'letters', difficulty: 'medium', mongoQuery: { name: /^s/i }, estimatedCount: 200 },
];


// ==========================================
// COLLABORATIONS (15+ themes)
// ==========================================
export const COLLAB_THEMES: Theme[] = [
  { id: 'collab_booba', title: 'Featurings avec Booba', description: 'A feat avec Booba', category: 'collab', difficulty: 'easy', source: 'collaborations', collabArtist: 'Booba', mongoQuery: {}, estimatedCount: 100 },
  { id: 'collab_ninho', title: 'Featurings avec Ninho', description: 'A feat avec Ninho', category: 'collab', difficulty: 'easy', source: 'collaborations', collabArtist: 'Ninho', mongoQuery: {}, estimatedCount: 80 },
  { id: 'collab_pnl', title: 'Featurings avec PNL', description: 'A feat avec PNL', category: 'collab', difficulty: 'hard', source: 'collaborations', collabArtist: 'PNL', mongoQuery: {}, estimatedCount: 20 },
  { id: 'collab_jul', title: 'Featurings avec Jul', description: 'A feat avec Jul', category: 'collab', difficulty: 'easy', source: 'collaborations', collabArtist: 'Jul', mongoQuery: {}, estimatedCount: 150 },
  { id: 'collab_sch', title: 'Featurings avec SCH', description: 'A feat avec SCH', category: 'collab', difficulty: 'medium', source: 'collaborations', collabArtist: 'SCH', mongoQuery: {}, estimatedCount: 60 },
  { id: 'collab_damso', title: 'Featurings avec Damso', description: 'A feat avec Damso', category: 'collab', difficulty: 'medium', source: 'collaborations', collabArtist: 'Damso', mongoQuery: {}, estimatedCount: 50 },
  { id: 'collab_kaaris', title: 'Featurings avec Kaaris', description: 'A feat avec Kaaris', category: 'collab', difficulty: 'medium', source: 'collaborations', collabArtist: 'Kaaris', mongoQuery: {}, estimatedCount: 70 },
  { id: 'collab_freeze', title: 'Featurings avec Freeze Corleone', description: 'A feat avec Freeze', category: 'collab', difficulty: 'hard', source: 'collaborations', collabArtist: 'Freeze Corleone', mongoQuery: {}, estimatedCount: 40 },
];


// ==========================================
// EXPORT GLOBAL
// ==========================================

export const ALL_THEMES = [
  ...GEOGRAPHY_THEMES,
  ...STYLE_THEMES,
  ...TIMELINE_THEMES,
  ...STATS_THEMES,
  ...LETTER_THEMES,
  ...COLLAB_THEMES,
];

// Total: 150+ thÃ¨mes diffÃ©rents!

/**
 * SÃ©lectionne un thÃ¨me alÃ©atoire selon la difficultÃ©
 */
export function selectRandomTheme(difficulty?: 'easy' | 'medium' | 'hard'): Theme {
  const filteredThemes = difficulty
    ? ALL_THEMES.filter(t => t.difficulty === difficulty)
    : ALL_THEMES;

  return filteredThemes[Math.floor(Math.random() * filteredThemes.length)];
}

/**
 * SÃ©lectionne un thÃ¨me par catÃ©gorie
 */
export function selectThemeByCategory(category: Theme['category']): Theme {
  const filtered = ALL_THEMES.filter(t => t.category === category);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/**
 * Obtenir un thÃ¨me par ID
 */
export function getThemeById(id: string): Theme | undefined {
  return ALL_THEMES.find(t => t.id === id);
}

/**
 * Stats des thÃ¨mes
 */
export function getThemeStats() {
  return {
    total: ALL_THEMES.length,
    byCategory: {
      geography: GEOGRAPHY_THEMES.length,
      style: STYLE_THEMES.length,
      timeline: TIMELINE_THEMES.length,
      stats: STATS_THEMES.length,
      letters: LETTER_THEMES.length,
      collab: COLLAB_THEMES.length,
    },
    byDifficulty: {
      easy: ALL_THEMES.filter(t => t.difficulty === 'easy').length,
      medium: ALL_THEMES.filter(t => t.difficulty === 'medium').length,
      hard: ALL_THEMES.filter(t => t.difficulty === 'hard').length,
    }
  };
}
