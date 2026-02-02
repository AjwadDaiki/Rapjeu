// @ts-nocheck
// ============================================
// THÈMES CRÉATIFS ET VARIÉS
// Plus de 50 types de thèmes originaux!
// ============================================

import { Theme } from '../types';

export interface CreativeThemeGenerator {
  id: string;
  name: string;
  description: string;
  category: 'nombre' | 'lettres' | 'année' | 'feat' | 'genre' | 'ville' | 'label' | 'durée' | 'popularité' | 'créativité';
  generateTheme: (db: any) => Promise<Theme>;
}

// ==========================================
// THÈMES BASÉS SUR LES NOMBRES
// ==========================================

export const nombreThemes: CreativeThemeGenerator[] = [
  {
    id: 'songs_with_word',
    name: 'Musiques avec "{mot}" dans le titre',
    description: 'Trouve des tracks avec un mot spécifique',
    category: 'nombre',
    generateTheme: async (db) => {
      const mots = ['love', 'vie', 'mort', 'money', 'paris', 'gang', 'trap', 'drill', 'bling', 'savage'];
      const mot = mots[Math.floor(Math.random() * mots.length)];

      const tracks = await db.collection('tracks').find({
        title: new RegExp(mot, 'i')
      }).limit(100).toArray();

      return {
        id: `songs_with_${mot}`,
        title: `Musiques avec "${mot}" dans le titre`,
        description: `Trouve des tracks qui contiennent "${mot}"`,
        type: 'open_answer',
        validAnswers: tracks.map(t => t.title),
        aliases: [],
        difficulty: 'medium',
        points: 10,
      };
    },
  },

  {
    id: 'artist_X_albums',
    name: 'Artistes avec plus de X albums',
    description: 'Trouve des artistes prolifiques',
    category: 'nombre',
    generateTheme: async (db) => {
      const minAlbums = Math.random() > 0.5 ? 5 : 10;

      // Aggregation pour compter albums par artiste
      const artists = await db.collection('albums').aggregate([
        { $group: { _id: '$artistName', count: { $sum: 1 } } },
        { $match: { count: { $gte: minAlbums } } },
        { $limit: 50 }
      ]).toArray();

      return {
        id: `artist_${minAlbums}_albums`,
        title: `Artistes avec plus de ${minAlbums} albums`,
        description: `Artistes qui ont sorti au moins ${minAlbums} albums`,
        type: 'open_answer',
        validAnswers: artists.map(a => a._id),
        aliases: [],
        difficulty: 'hard',
        points: 15,
      };
    },
  },

  {
    id: 'songs_over_X_minutes',
    name: 'Tracks de plus de X minutes',
    description: 'Morceaux longs',
    category: 'durée',
    generateTheme: async (db) => {
      const minDuration = Math.random() > 0.5 ? 5 : 7; // 5 ou 7 minutes
      const minMs = minDuration * 60 * 1000;

      const tracks = await db.collection('tracks').find({
        duration: { $gte: minMs }
      }).limit(50).toArray();

      return {
        id: `songs_over_${minDuration}min`,
        title: `Tracks de plus de ${minDuration} minutes`,
        description: `Morceaux longs (>${minDuration}min)`,
        type: 'open_answer',
        validAnswers: tracks.map(t => t.title),
        aliases: [],
        difficulty: 'hard',
        points: 15,
      };
    },
  },
];

// ==========================================
// THÈMES BASÉS SUR LES LETTRES
// ==========================================

export const lettresThemes: CreativeThemeGenerator[] = [
  {
    id: 'artist_X_letters',
    name: 'Rappeurs avec X lettres dans le nom',
    description: 'Compte les lettres!',
    category: 'lettres',
    generateTheme: async (db) => {
      const letterCount = [3, 4, 5, 6][Math.floor(Math.random() * 4)];

      const artists = await db.collection('artists').find().toArray();
      const filtered = artists.filter(a =>
        a.name.replace(/\s/g, '').length === letterCount
      );

      return {
        id: `artist_${letterCount}_letters`,
        title: `Rappeurs avec ${letterCount} lettres (sans espaces)`,
        description: `Ex: Jul (3), Niska (5)`,
        type: 'open_answer',
        validAnswers: filtered.map(a => a.name),
        aliases: [],
        difficulty: 'hard',
        points: 20,
      };
    },
  },

  {
    id: 'artist_starts_with',
    name: 'Rappeurs commençant par {lettre}',
    description: 'Alphabétique!',
    category: 'lettres',
    generateTheme: async (db) => {
      const letters = ['A', 'B', 'K', 'L', 'M', 'N', 'S', 'Y', 'Z'];
      const letter = letters[Math.floor(Math.random() * letters.length)];

      const artists = await db.collection('artists').find({
        name: new RegExp(`^${letter}`, 'i')
      }).limit(50).toArray();

      return {
        id: `artist_starts_${letter}`,
        title: `Rappeurs commençant par "${letter}"`,
        description: `Première lettre = ${letter}`,
        type: 'open_answer',
        validAnswers: artists.map(a => a.name),
        aliases: [],
        difficulty: 'easy',
        points: 5,
      };
    },
  },

  {
    id: 'track_ends_with',
    name: 'Tracks finissant par "{mot}"',
    description: 'Les fins de titre!',
    category: 'lettres',
    generateTheme: async (db) => {
      const endings = ['gang', 'money', 'life', 'freestyle', 'remix', 'intro', 'outro'];
      const ending = endings[Math.floor(Math.random() * endings.length)];

      const tracks = await db.collection('tracks').find({
        title: new RegExp(`${ending}$`, 'i')
      }).limit(50).toArray();

      return {
        id: `track_ends_${ending}`,
        title: `Tracks finissant par "${ending}"`,
        description: `Derniers mots du titre`,
        type: 'open_answer',
        validAnswers: tracks.map(t => t.title),
        aliases: [],
        difficulty: 'medium',
        points: 10,
      };
    },
  },

  {
    id: 'artist_no_vowels',
    name: 'Rappeurs SANS voyelles (sigles)',
    description: 'PNL, SCH, RK...',
    category: 'lettres',
    generateTheme: async (db) => {
      const artists = await db.collection('artists').find().toArray();
      const filtered = artists.filter(a =>
        !/[aeiouàéèêëïîôùûAEIOUÀÉÈÊËÏÎÔÙÛ]/.test(a.name.replace(/\s/g, ''))
      );

      return {
        id: 'artist_no_vowels',
        title: 'Rappeurs SANS voyelles (sigles/acronymes)',
        description: 'Ex: PNL, SCH, RK, PLK',
        type: 'open_answer',
        validAnswers: filtered.map(a => a.name),
        aliases: [],
        difficulty: 'medium',
        points: 15,
      };
    },
  },
];

// ==========================================
// THÈMES BASÉS SUR LES ANNÉES
// ==========================================

export const anneeThemes: CreativeThemeGenerator[] = [
  {
    id: 'albums_decade',
    name: 'Albums sortis dans les années {décennie}',
    description: 'Décennies du rap FR',
    category: 'année',
    generateTheme: async (db) => {
      const decades = [
        { start: 2020, end: 2025, name: '2020s' },
        { start: 2010, end: 2019, name: '2010s' },
        { start: 2000, end: 2009, name: '2000s' },
        { start: 1990, end: 1999, name: '90s' },
      ];
      const decade = decades[Math.floor(Math.random() * decades.length)];

      const albums = await db.collection('albums').find({
        year: { $gte: decade.start, $lte: decade.end }
      }).limit(100).toArray();

      return {
        id: `albums_${decade.name}`,
        title: `Albums des années ${decade.name}`,
        description: `Sortis entre ${decade.start} et ${decade.end}`,
        type: 'open_answer',
        validAnswers: albums.map(a => a.title),
        aliases: [],
        difficulty: 'medium',
        points: 10,
      };
    },
  },

  {
    id: 'artist_debut_year',
    name: 'Artistes ayant débuté en {année}',
    description: 'Année du 1er album',
    category: 'année',
    generateTheme: async (db) => {
      const year = 2010 + Math.floor(Math.random() * 15); // 2010-2024

      // Find first album year per artist
      const artists = await db.collection('albums').aggregate([
        { $sort: { year: 1 } },
        { $group: {
          _id: '$artistName',
          firstYear: { $first: '$year' }
        }},
        { $match: { firstYear: year } }
      ]).toArray();

      return {
        id: `artist_debut_${year}`,
        title: `Artistes ayant sorti leur 1er album en ${year}`,
        description: `Année de début: ${year}`,
        type: 'open_answer',
        validAnswers: artists.map(a => a._id),
        aliases: [],
        difficulty: 'hard',
        points: 20,
      };
    },
  },
];

// ==========================================
// THÈMES BASÉS SUR LES FEATURINGS
// ==========================================

export const featThemes: CreativeThemeGenerator[] = [
  {
    id: 'most_featured_with',
    name: 'Artistes les plus featés avec {artiste}',
    description: 'Qui feat le plus avec X?',
    category: 'feat',
    generateTheme: async (db) => {
      const popularArtists = ['Booba', 'Kaaris', 'Ninho', 'PNL', 'Jul', 'SCH'];
      const artist = popularArtists[Math.floor(Math.random() * popularArtists.length)];

      const collabs = await db.collection('collaborations').aggregate([
        { $match: {
          $or: [
            { artistAName: artist },
            { artistBName: artist }
          ]
        }},
        { $group: {
          _id: {
            $cond: [
              { $eq: ['$artistAName', artist] },
              '$artistBName',
              '$artistAName'
            ]
          },
          count: { $sum: 1 }
        }},
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]).toArray();

      return {
        id: `most_featured_${artist}`,
        title: `Artistes ayant le plus featé avec ${artist}`,
        description: `Collabs multiples avec ${artist}`,
        type: 'open_answer',
        validAnswers: collabs.map(c => c._id),
        aliases: [],
        difficulty: 'medium',
        points: 15,
      };
    },
  },

  {
    id: 'never_featured',
    name: 'Artistes SANS featurings',
    description: 'Solo artists uniquement',
    category: 'feat',
    generateTheme: async (db) => {
      const allArtists = await db.collection('artists').find().limit(200).toArray();
      const artistsWithFeats = await db.collection('collaborations').distinct('artistAName');

      const soloArtists = allArtists.filter(a =>
        !artistsWithFeats.includes(a.name)
      );

      return {
        id: 'never_featured',
        title: 'Artistes n\'ayant JAMAIS fait de feat',
        description: 'Solo uniquement',
        type: 'open_answer',
        validAnswers: soloArtists.map(a => a.name),
        aliases: [],
        difficulty: 'hard',
        points: 20,
      };
    },
  },
];

// ==========================================
// THÈMES BASÉS SUR LA VILLE/RÉGION
// ==========================================

export const villeThemes: CreativeThemeGenerator[] = [
  {
    id: 'rapper_from_city',
    name: 'Rappeurs de {ville}',
    description: 'Origine géographique',
    category: 'ville',
    generateTheme: async (db) => {
      const cities = ['Paris', 'Marseille', 'Lyon', 'Sevran', 'Évry', 'Nanterre'];
      const city = cities[Math.floor(Math.random() * cities.length)];

      const artists = await db.collection('artists').find({
        'location.city': city
      }).limit(50).toArray();

      return {
        id: `rapper_from_${city}`,
        title: `Rappeurs de ${city}`,
        description: `Originaires de ${city}`,
        type: 'open_answer',
        validAnswers: artists.map(a => a.name),
        aliases: [],
        difficulty: 'medium',
        points: 10,
      };
    },
  },

  {
    id: 'rapper_from_dept',
    name: 'Rappeurs du {département}',
    description: 'Par département',
    category: 'ville',
    generateTheme: async (db) => {
      const depts = ['75', '77', '91', '92', '93', '94', '95', '13', '69'];
      const dept = depts[Math.floor(Math.random() * depts.length)];

      const artists = await db.collection('artists').find({
        'location.department': dept
      }).limit(50).toArray();

      return {
        id: `rapper_from_${dept}`,
        title: `Rappeurs du ${dept}`,
        description: `Département ${dept}`,
        type: 'open_answer',
        validAnswers: artists.map(a => a.name),
        aliases: [],
        difficulty: 'easy',
        points: 10,
      };
    },
  },
];

// ==========================================
// THÈMES CRÉATIFS ET ORIGINAUX
// ==========================================

export const creativiteThemes: CreativeThemeGenerator[] = [
  {
    id: 'palindrome_tracks',
    name: 'Tracks avec des mots palindromes',
    description: 'Mots qui se lisent pareil à l\'envers',
    category: 'créativité',
    generateTheme: async (db) => {
      const palindromes = ['Bob', 'Anna', 'Eve', 'Otto', 'Elle', 'Non', 'Kayak'];

      const tracks = await db.collection('tracks').find({
        title: new RegExp(palindromes.join('|'), 'i')
      }).limit(30).toArray();

      return {
        id: 'palindrome_tracks',
        title: 'Tracks avec des mots palindromes',
        description: 'Bob, Anna, Eve, Otto...',
        type: 'open_answer',
        validAnswers: tracks.map(t => t.title),
        aliases: [],
        difficulty: 'hard',
        points: 25,
      };
    },
  },

  {
    id: 'numbers_in_title',
    name: 'Tracks avec des chiffres',
    description: '911, 24/7, etc.',
    category: 'créativité',
    generateTheme: async (db) => {
      const tracks = await db.collection('tracks').find({
        title: /\d/
      }).limit(100).toArray();

      return {
        id: 'numbers_in_title',
        title: 'Tracks avec des chiffres dans le titre',
        description: '911, 24/7, 93, etc.',
        type: 'open_answer',
        validAnswers: tracks.map(t => t.title),
        aliases: [],
        difficulty: 'easy',
        points: 5,
      };
    },
  },

  {
    id: 'shortest_track_name',
    name: 'Tracks avec le titre le plus court',
    description: 'Titres de 1-3 caractères',
    category: 'créativité',
    generateTheme: async (db) => {
      const tracks = await db.collection('tracks').find().toArray();
      const shortest = tracks
        .filter(t => t.title.length <= 3)
        .sort((a, b) => a.title.length - b.title.length);

      return {
        id: 'shortest_track_name',
        title: 'Tracks avec un titre de 1 à 3 lettres',
        description: 'Ex: "OK", "93", "Go"',
        type: 'open_answer',
        validAnswers: shortest.map(t => t.title),
        aliases: [],
        difficulty: 'medium',
        points: 15,
      };
    },
  },

  {
    id: 'artist_name_in_track',
    name: 'Tracks avec le nom de l\'artiste dedans',
    description: 'Ego trip!',
    category: 'créativité',
    generateTheme: async (db) => {
      const tracks = await db.collection('tracks').find().limit(500).toArray();

      const filtered = tracks.filter(t =>
        t.title.toLowerCase().includes(t.artistName.toLowerCase())
      );

      return {
        id: 'artist_name_in_track',
        title: 'Tracks contenant le nom de l\'artiste',
        description: 'Ex: "Booba - Booba" ou "Kaaris présente..."',
        type: 'open_answer',
        validAnswers: filtered.map(t => t.title),
        aliases: [],
        difficulty: 'medium',
        points: 10,
      };
    },
  },
];

// ==========================================
// EXPORT TOUS LES THÈMES
// ==========================================

export const allCreativeThemes: CreativeThemeGenerator[] = [
  ...nombreThemes,
  ...lettresThemes,
  ...anneeThemes,
  ...featThemes,
  ...villeThemes,
  ...creativiteThemes,
];

// ==========================================
// HELPER POUR GÉNÉRER UN THÈME ALÉATOIRE
// ==========================================

export async function generateRandomCreativeTheme(db: any): Promise<Theme> {
  const randomGenerator = allCreativeThemes[Math.floor(Math.random() * allCreativeThemes.length)];
  return await randomGenerator.generateTheme(db);
}

export function getThemesByCategory(category: string): CreativeThemeGenerator[] {
  return allCreativeThemes.filter(t => t.category === category);
}
