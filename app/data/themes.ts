// ============================================
// THÈMES pour "Le Theme" et "Les Enchères"
// 50+ thèmes avec réponses valides et aliases
// CORRECTIONS: départements exacts, villes réelles
// ============================================

import { fuzzyMatch } from '../lib/utils';

export interface Theme {
  id: string;
  title: string;
  validAnswers: string[];
  aliases: Record<string, string[]>; // mapping valeur -> aliases
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[]; // 'geography', 'crew', 'label', 'era', 'artist', etc.
}

export const THEMES: Theme[] = [
  // === GÉOGRAPHIE FR (départements corrigés) ===
  {
    id: 'theme_92',
    title: 'Rappeur du 92',
    validAnswers: ['Booba', 'SDM', 'Maes'],
    aliases: {
      'Booba': ['B2O', 'Kopp', 'Le Duc'],
      'SDM': ['Sauvage de la Maille'],
      'Maes': ['Walid Georgey'],
    },
    difficulty: 'easy',
    tags: ['geography', 'department'],
  },
  {
    id: 'theme_93',
    title: 'Rappeur du 93',
    validAnswers: ['Kaaris', 'Gazo', 'Ziak', 'JoeyStarr', 'Kool Shen'],
    aliases: {
      'Kaaris': ['Okou Gnakouri', 'Gnakouri'],
      'Gazo': ['Bendero', 'Gazoo'],
      'Ziak': [],
      'JoeyStarr': ['Joey', 'Didier Morville'],
      'Kool Shen': ['Bruno Lopes'],
    },
    difficulty: 'easy',
    tags: ['geography', 'department'],
  },
  {
    id: 'theme_91',
    title: 'Rappeur du 91',
    validAnswers: ['Ninho', 'Niska', 'Koba LaD', 'PLK', 'Ademo', 'N.O.S'],
    aliases: {
      'Ninho': ['N.I', 'NI'],
      'Niska': ['Niska Niska'],
      'Koba LaD': ['Koba'],
      'PLK': ['Polak'],
      'Ademo': ['Tarik'],
      'N.O.S': ['NOS', 'Nabil'],
    },
    difficulty: 'easy',
    tags: ['geography', 'department'],
  },
  {
    id: 'theme_94',
    title: 'Rappeur du 94',
    validAnswers: ['Lacrim', 'Rohff', 'Dinos', 'Rim\'K', 'Heuss', 'Leto', 'MC Solaar'],
    aliases: {
      'Lacrim': ['Slim Crim', 'Karim Zenati'],
      'Rohff': ['ROH2F', 'Housni Mkouboi'],
      'Dinos': ['Dinos Punchlinovic'],
      'Rim\'K': ['Rim K'],
      'Heuss': ['Heuss l\'Enfoiré', 'Le Tonton du Binks'],
      'Leto': [],
      'MC Solaar': ['Solaar', 'Claude M\'Barali'],
    },
    difficulty: 'medium',
    tags: ['geography', 'department'],
  },
  {
    id: 'theme_13',
    title: 'Rappeur de Marseille (13)',
    validAnswers: ['SCH', 'Jul', 'Alonzo', 'Soprano', 'Naps', 'Akhenaton', 'Shurik\'n'],
    aliases: {
      'SCH': ['Julien Schwarzer'],
      'Jul': ['Julien Mari', 'Le J'],
      'Alonzo': ['Zo'],
      'Soprano': ['Saïd M\'Roumbaba'],
      'Naps': [],
      'Akhenaton': ['AKH', 'Philippe Fragione'],
      'Shurik\'n': ['Geoffroy Mussard'],
    },
    difficulty: 'easy',
    tags: ['geography', 'city'],
  },
  {
    id: 'theme_75',
    title: 'Rappeur de Paris (75)',
    validAnswers: ['Nekfeu', 'Freeze Corleone', 'Alpha Wann', 'Vald', 'Gims', 'Tiakola', 'Lomepal'],
    aliases: {
      'Nekfeu': ['Nek', 'Ken Samaras'],
      'Freeze Corleone': ['Freeze', 'FC'],
      'Alpha Wann': ['Phénomène Biz', 'Wann'],
      'Vald': ['V.A.L.D', 'Valentin Le Du'],
      'Gims': ['Maître Gims', 'Gandhi Djuna'],
      'Tiakola': ['Tia'],
      'Lomepal': ['Antoine Valentinelli'],
    },
    difficulty: 'medium',
    tags: ['geography', 'department'],
  },
  {
    id: 'theme_77',
    title: 'Rappeur du 77',
    validAnswers: ['Vald', 'Zola'],
    aliases: {
      'Vald': ['V.A.L.D', 'Valentin Le Du'],
      'Zola': [],
    },
    difficulty: 'hard',
    tags: ['geography', 'department'],
  },
  {
    id: 'theme_95',
    title: 'Rappeur du 95',
    validAnswers: ['Werenoi'],
    aliases: {
      'Werenoi': [],
    },
    difficulty: 'hard',
    tags: ['geography', 'department'],
  },
  {
    id: 'theme_belgium',
    title: 'Rappeur belge',
    validAnswers: ['Damso', 'Hamza', 'Angèle'],
    aliases: {
      'Damso': ['Dems', 'William Kalubi'],
      'Hamza': ['Hamza El Fadly'],
      'Angèle': ['Angèle Van Laeken'],
    },
    difficulty: 'medium',
    tags: ['geography', 'country'],
  },

  // === ÉQUIPES / CREWS ===
  {
    id: 'theme_pnl',
    title: 'Membre de PNL',
    validAnswers: ['Ademo', 'N.O.S'],
    aliases: {
      'Ademo': ['Tarik', 'Tarik Andrieu'],
      'N.O.S': ['NOS', 'Nabil', 'Nabil Andrieu'],
    },
    difficulty: 'easy',
    tags: ['crew'],
  },
  {
    id: 'theme_entourage',
    title: 'Membre de L\'Entourage',
    validAnswers: ['Nekfeu', 'Alpha Wann', 'Sneazzy'],
    aliases: {
      'Nekfeu': ['Nek'],
      'Alpha Wann': ['Phénomène Biz', 'Wann'],
      'Sneazzy': ['Sneaz'],
    },
    difficulty: 'medium',
    tags: ['crew'],
  },
  {
    id: 'theme_92i',
    title: 'Membre du 92i',
    validAnswers: ['Booba', 'SDM', 'Damso'],
    aliases: {
      'Booba': ['B2O', 'Kopp'],
      'SDM': ['Sauvage de la Maille'],
      'Damso': ['Dems'],
    },
    difficulty: 'medium',
    tags: ['crew'],
  },
  {
    id: 'theme_casseurs_flowters',
    title: 'Membre des Casseurs Flowters',
    validAnswers: ['Orelsan', 'Gringe'],
    aliases: {
      'Orelsan': ['Orel', 'Aurélien Cotentin'],
      'Gringe': ['Guillaume Tranchant'],
    },
    difficulty: 'easy',
    tags: ['crew'],
  },
  {
    id: 'theme_667',
    title: 'Membre du 667',
    validAnswers: ['Freeze Corleone', 'Ashe 22'],
    aliases: {
      'Freeze Corleone': ['Freeze', 'FC'],
      'Ashe 22': ['Ashe'],
    },
    difficulty: 'medium',
    tags: ['crew'],
  },
  {
    id: 'theme_psy4',
    title: 'Membre de Psy 4 de la Rime',
    validAnswers: ['Alonzo', 'Soprano'],
    aliases: {
      'Alonzo': ['Zo'],
      'Soprano': ['Saïd M\'Roumbaba'],
    },
    difficulty: 'medium',
    tags: ['crew'],
  },
  {
    id: 'theme_mafia_k1_fry',
    title: 'Membre de la Mafia K\'1 Fry',
    validAnswers: ['Rohff', 'Rim\'K'],
    aliases: {
      'Rohff': ['ROH2F'],
      'Rim\'K': ['Rim K'],
    },
    difficulty: 'hard',
    tags: ['crew'],
  },
  {
    id: 'theme_ntm',
    title: 'Membre de NTM',
    validAnswers: ['JoeyStarr', 'Kool Shen'],
    aliases: {
      'JoeyStarr': ['Joey', 'Didier Morville'],
      'Kool Shen': ['Bruno Lopes'],
    },
    difficulty: 'easy',
    tags: ['crew'],
  },
  {
    id: 'theme_iam',
    title: 'Membre d\'IAM',
    validAnswers: ['Akhenaton', 'Shurik\'n'],
    aliases: {
      'Akhenaton': ['AKH', 'Philippe Fragione'],
      'Shurik\'n': ['Geoffroy Mussard'],
    },
    difficulty: 'medium',
    tags: ['crew'],
  },
  {
    id: 'theme_4keus',
    title: 'Membre des 4Keus',
    validAnswers: ['Tiakola'],
    aliases: {
      'Tiakola': ['Tia'],
    },
    difficulty: 'hard',
    tags: ['crew'],
  },

  // === LABELS ===
  {
    id: 'theme_rec118',
    title: 'Rappeur chez Rec. 118',
    validAnswers: ['Ninho', 'Ziak', 'Heuss', 'Leto'],
    aliases: {
      'Ninho': ['N.I'],
      'Ziak': [],
      'Heuss': ['Heuss l\'Enfoiré'],
      'Leto': [],
    },
    difficulty: 'medium',
    tags: ['label'],
  },
  {
    id: 'theme_92i_label',
    title: 'Rappeur chez 92i',
    validAnswers: ['Booba', 'SDM', 'Damso'],
    aliases: {
      'Booba': ['B2O'],
      'SDM': ['Sauvage de la Maille'],
      'Damso': ['Dems'],
    },
    difficulty: 'medium',
    tags: ['label'],
  },
  {
    id: 'theme_qalf',
    title: 'Rappeur chez QLF',
    validAnswers: ['Ademo', 'N.O.S'],
    aliases: {
      'Ademo': ['Tarik'],
      'N.O.S': ['NOS', 'Nabil'],
    },
    difficulty: 'medium',
    tags: ['label'],
  },
  {
    id: 'theme_def_jam',
    title: 'Rappeur chez Def Jam France',
    validAnswers: ['Koba LaD', 'Werenoi'],
    aliases: {
      'Koba LaD': ['Koba'],
      'Werenoi': [],
    },
    difficulty: 'hard',
    tags: ['label'],
  },

  // === ÉPOQUES ===
  {
    id: 'theme_90s',
    title: 'Rappeur des années 90',
    validAnswers: ['Booba', 'Rohff', 'JoeyStarr', 'Kool Shen', 'Akhenaton', 'Shurik\'n', 'MC Solaar', '2Pac', 'The Notorious B.I.G.', 'Nas', 'Jay-Z', 'Dr. Dre', 'Snoop Dogg'],
    aliases: {
      'Booba': ['B2O'],
      'Rohff': ['ROH2F'],
      'JoeyStarr': ['Joey'],
      'Kool Shen': [],
      'Akhenaton': ['AKH'],
      'Shurik\'n': [],
      'MC Solaar': ['Solaar'],
      '2Pac': ['Tupac', 'Makaveli'],
      'The Notorious B.I.G.': ['Biggie', 'Biggie Smalls'],
      'Nas': ['Nasty Nas'],
      'Jay-Z': ['Hova', 'Jigga'],
      'Dr. Dre': ['Dre'],
      'Snoop Dogg': ['Snoop'],
    },
    difficulty: 'medium',
    tags: ['era'],
  },
  {
    id: 'theme_2000s',
    title: 'Rappeur des années 2000',
    validAnswers: ['Booba', 'La Fouine', 'Orelsan', '50 Cent', 'Eminem', 'Kanye West', 'Lil Wayne'],
    aliases: {
      'Booba': ['B2O'],
      'La Fouine': ['Fouiny Baby'],
      'Orelsan': ['Orel'],
      '50 Cent': ['Fiddy'],
      'Eminem': ['Slim Shady'],
      'Kanye West': ['Ye', 'Yeezy'],
      'Lil Wayne': ['Weezy'],
    },
    difficulty: 'easy',
    tags: ['era'],
  },
  {
    id: 'theme_2010s',
    title: 'Rappeur révélé dans les années 2010',
    validAnswers: ['Kaaris', 'Nekfeu', 'Damso', 'Vald', 'Lomepal', 'Drake', 'Kendrick Lamar', 'Travis Scott', 'ASAP Rocky', 'Tyler, The Creator'],
    aliases: {
      'Kaaris': ['Okou Gnakouri'],
      'Nekfeu': ['Nek'],
      'Damso': ['Dems'],
      'Vald': ['V.A.L.D'],
      'Lomepal': ['Lome'],
      'Drake': ['Drizzy', '6 God'],
      'Kendrick Lamar': ['K-Dot'],
      'Travis Scott': ['La Flame'],
      'ASAP Rocky': ['Rocky'],
      'Tyler, The Creator': ['Tyler'],
    },
    difficulty: 'easy',
    tags: ['era'],
  },
  {
    id: 'theme_2020s',
    title: 'Rappeur révélé dans les années 2020',
    validAnswers: ['Ziak', 'Tiakola', 'Werenoi', 'Gazo', 'Freeze Corleone', 'Central Cee', 'Ice Spice'],
    aliases: {
      'Ziak': [],
      'Tiakola': ['Tia'],
      'Werenoi': [],
      'Gazo': ['Bendero'],
      'Freeze Corleone': ['Freeze'],
      'Central Cee': ['Cench'],
      'Ice Spice': [],
    },
    difficulty: 'medium',
    tags: ['era'],
  },

  // === STARTING LETTER ===
  {
    id: 'theme_start_b',
    title: 'Rappeur commençant par B',
    validAnswers: ['Booba', 'Bigflo & Oli', 'Biggie'],
    aliases: {
      'Booba': ['B2O'],
      'Bigflo & Oli': ['BFO'],
      'Biggie': ['The Notorious B.I.G.'],
    },
    difficulty: 'easy',
    tags: ['alphabet'],
  },
  {
    id: 'theme_start_n',
    title: 'Rappeur commençant par N',
    validAnswers: ['Ninho', 'Niska', 'Nekfeu', 'N.O.S', 'Nicki Minaj', 'Nas'],
    aliases: {
      'Ninho': ['N.I'],
      'Niska': [],
      'Nekfeu': ['Nek'],
      'N.O.S': ['NOS'],
      'Nicki Minaj': ['Nicki'],
      'Nas': ['Nasty Nas'],
    },
    difficulty: 'easy',
    tags: ['alphabet'],
  },
  {
    id: 'theme_start_k',
    title: 'Rappeur commençant par K',
    validAnswers: ['Kaaris', 'Koba LaD', 'Kendrick Lamar', 'Kanye West', 'Kool Shen'],
    aliases: {
      'Kaaris': ['Okou Gnakouri'],
      'Koba LaD': ['Koba'],
      'Kendrick Lamar': ['K-Dot'],
      'Kanye West': ['Ye'],
      'Kool Shen': [],
    },
    difficulty: 'medium',
    tags: ['alphabet'],
  },
  {
    id: 'theme_start_s',
    title: 'Rappeur commençant par S',
    validAnswers: ['SCH', 'SDM', 'Soprano', 'Sneazzy', 'Snoop Dogg', '50 Cent'],
    aliases: {
      'SCH': ['Julien Schwarzer'],
      'SDM': ['Sauvage de la Maille'],
      'Soprano': ['Saïd M\'Roumbaba'],
      'Sneazzy': ['Sneaz'],
      'Snoop Dogg': ['Snoop'],
      '50 Cent': ['Fiddy'],
    },
    difficulty: 'medium',
    tags: ['alphabet'],
  },

  // === GÉO US ===
  {
    id: 'theme_nyc',
    title: 'Rappeur de New York',
    validAnswers: ['Jay-Z', 'Nas', '50 Cent', 'Nicki Minaj', 'The Notorious B.I.G.', 'ASAP Rocky', 'Pop Smoke'],
    aliases: {
      'Jay-Z': ['Hova'],
      'Nas': ['Nasty Nas'],
      '50 Cent': ['Fiddy'],
      'Nicki Minaj': ['Nicki'],
      'The Notorious B.I.G.': ['Biggie'],
      'ASAP Rocky': ['Rocky'],
      'Pop Smoke': ['Pop'],
    },
    difficulty: 'easy',
    tags: ['geography', 'city'],
  },
  {
    id: 'theme_atlanta',
    title: 'Rappeur d\'Atlanta',
    validAnswers: ['Future', '21 Savage', 'Lil Baby', 'Gunna', 'Young Thug', 'Playboi Carti', 'Metro Boomin'],
    aliases: {
      'Future': ['Future Hendrix'],
      '21 Savage': ['21'],
      'Lil Baby': ['Baby'],
      'Gunna': ['Wunna'],
      'Young Thug': ['Thugger'],
      'Playboi Carti': ['Carti'],
      'Metro Boomin': ['Metro'],
    },
    difficulty: 'medium',
    tags: ['geography', 'city'],
  },
  {
    id: 'theme_la',
    title: 'Rappeur de Los Angeles',
    validAnswers: ['Kendrick Lamar', 'Dr. Dre', 'Snoop Dogg', 'Tyler, The Creator', '2Pac'],
    aliases: {
      'Kendrick Lamar': ['K-Dot'],
      'Dr. Dre': ['Dre'],
      'Snoop Dogg': ['Snoop'],
      'Tyler, The Creator': ['Tyler'],
      '2Pac': ['Tupac'],
    },
    difficulty: 'medium',
    tags: ['geography', 'city'],
  },
  {
    id: 'theme_chicago',
    title: 'Rappeur de Chicago',
    validAnswers: ['Kanye West', 'Lil Durk', 'G Herbo'],
    aliases: {
      'Kanye West': ['Ye', 'Yeezy'],
      'Lil Durk': ['Durk'],
      'G Herbo': [],
    },
    difficulty: 'hard',
    tags: ['geography', 'city'],
  },
  {
    id: 'theme_houston',
    title: 'Rappeur de Houston',
    validAnswers: ['Travis Scott', 'Megan Thee Stallion'],
    aliases: {
      'Travis Scott': ['La Flame'],
      'Megan Thee Stallion': ['Megan'],
    },
    difficulty: 'medium',
    tags: ['geography', 'city'],
  },
  {
    id: 'theme_detroit',
    title: 'Rappeur de Detroit',
    validAnswers: ['Eminem', '42 Dugg'],
    aliases: {
      'Eminem': ['Slim Shady'],
      '42 Dugg': [],
    },
    difficulty: 'medium',
    tags: ['geography', 'city'],
  },
  {
    id: 'theme_toronto',
    title: 'Rappeur de Toronto',
    validAnswers: ['Drake'],
    aliases: {
      'Drake': ['Drizzy', '6 God'],
    },
    difficulty: 'easy',
    tags: ['geography', 'city'],
  },
  {
    id: 'theme_compton',
    title: 'Rappeur de Compton',
    validAnswers: ['Kendrick Lamar', 'Dr. Dre'],
    aliases: {
      'Kendrick Lamar': ['K-Dot'],
      'Dr. Dre': ['Dre'],
    },
    difficulty: 'easy',
    tags: ['geography', 'city'],
  },

  // === SPÉCIAL ===
  {
    id: 'theme_dead',
    title: 'Rappeur décédé',
    validAnswers: ['2Pac', 'The Notorious B.I.G.', 'Pop Smoke', 'MF DOOM'],
    aliases: {
      '2Pac': ['Tupac', 'Makaveli'],
      'The Notorious B.I.G.': ['Biggie'],
      'Pop Smoke': ['Pop'],
      'MF DOOM': ['DOOM'],
    },
    difficulty: 'easy',
    tags: ['special'],
  },
  {
    id: 'theme_female',
    title: 'Rappeuse',
    validAnswers: ['Aya Nakamura', 'Nicki Minaj', 'Cardi B', 'Megan Thee Stallion', 'SZA', 'Ice Spice', 'Angèle'],
    aliases: {
      'Aya Nakamura': ['Aya'],
      'Nicki Minaj': ['Nicki'],
      'Cardi B': ['Cardi'],
      'Megan Thee Stallion': ['Megan'],
      'SZA': [],
      'Ice Spice': [],
      'Angèle': [],
    },
    difficulty: 'easy',
    tags: ['special'],
  },
  {
    id: 'theme_mask',
    title: 'Rappeur qui porte/portait un masque',
    validAnswers: ['MF DOOM', 'Freeze Corleone'],
    aliases: {
      'MF DOOM': ['DOOM'],
      'Freeze Corleone': ['Freeze'],
    },
    difficulty: 'medium',
    tags: ['special'],
  },
  {
    id: 'theme_mf_doom_aliases',
    title: 'Alias de MF DOOM',
    validAnswers: ['Metal Face', 'Viktor Vaughn', 'King Geedorah'],
    aliases: {},
    difficulty: 'hard',
    tags: ['special'],
  },
  {
    id: 'theme_young_money',
    title: 'Membre de Young Money',
    validAnswers: ['Lil Wayne', 'Nicki Minaj', 'Drake'],
    aliases: {
      'Lil Wayne': ['Weezy'],
      'Nicki Minaj': ['Nicki'],
      'Drake': ['Drizzy'],
    },
    difficulty: 'medium',
    tags: ['crew'],
  },
  {
    id: 'theme_tde',
    title: 'Membre de TDE',
    validAnswers: ['Kendrick Lamar', 'SZA', 'Jay Rock'],
    aliases: {
      'Kendrick Lamar': ['K-Dot'],
      'SZA': [],
      'Jay Rock': [],
    },
    difficulty: 'hard',
    tags: ['crew'],
  },
];

// Fonctions utilitaires
export function getRandomThemes(count: number = 10): Theme[] {
  const shuffled = [...THEMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getThemesByTag(tag: string): Theme[] {
  return THEMES.filter(t => t.tags.includes(tag));
}

export function getThemesByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Theme[] {
  return THEMES.filter(t => t.difficulty === difficulty);
}

export function validateAnswer(theme: Theme, input: string): { isValid: boolean; matchedAnswer: string | null } {
  // Use fuzzy matching with Levenshtein distance (≤2 errors) + alias support
  const match = fuzzyMatch(input, theme.validAnswers, theme.aliases);

  if (match.isValid) {
    // Always return canonical name to prevent duplicates with different aliases
    return {
      isValid: true,
      matchedAnswer: match.canonicalName || match.matchedAnswer
    };
  }

  return { isValid: false, matchedAnswer: null };
}
