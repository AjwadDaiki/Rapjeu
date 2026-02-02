// @ts-nocheck
// ============================================
// EXTRA THEMES (MongoDB-driven)
// ============================================

import { Db } from 'mongodb';
import { Theme } from '../types';

export interface ThemeGenerator {
  id: string;
  category: 'geographie' | 'nombre' | 'lettres' | 'annee' | 'feat' | 'creativite' | 'popularite' | 'duree';
  generate: (db: Db) => Promise<Theme>;
}

// ==========================================
// POPULARITY THEMES
// ==========================================

export const popularityThemes: ThemeGenerator[] = [
  {
    id: 'artists_1M_followers',
    category: 'popularite',
    generate: async (db) => {
      const artists = await db.collection('artists')
        .find({ monthlyListeners: { $gte: 1000000 } })
        .sort({ monthlyListeners: -1 })
        .toArray();

      return {
        id: 'artists_1M_followers',
        title: 'Rappeurs avec + de 1M d\'auditeurs',
        description: 'Les plus populaires',
        type: 'open_answer',
        validAnswers: artists.map(a => a.name),
        aliases: artists.reduce((acc, a) => {
          if (a.aliases?.length > 0) acc[a.name] = a.aliases;
          return acc;
        }, {}),
        difficulty: 'easy',
        points: 5,
      };
    },
  },
  {
    id: 'artists_under_100k',
    category: 'popularite',
    generate: async (db) => {
      const artists = await db.collection('artists')
        .find({ monthlyListeners: { $lt: 100000, $gte: 10000 } })
        .sort({ monthlyListeners: -1 })
        .limit(100)
        .toArray();

      return {
        id: 'artists_under_100k',
        title: 'Rappeurs underground (<100k auditeurs)',
        description: 'Artistes moins connus',
        type: 'open_answer',
        validAnswers: artists.map(a => a.name),
        aliases: {},
        difficulty: 'hard',
        points: 20,
      };
    },
  },
  {
    id: 'top_10_popular',
    category: 'popularite',
    generate: async (db) => {
      const artists = await db.collection('artists')
        .find()
        .sort({ popularity: -1 })
        .limit(10)
        .toArray();

      return {
        id: 'top_10_popular',
        title: 'Top 10 des rappeurs les plus populaires',
        description: 'Les legendes',
        type: 'open_answer',
        validAnswers: artists.map(a => a.name),
        aliases: artists.reduce((acc, a) => {
          if (a.aliases?.length > 0) acc[a.name] = a.aliases;
          return acc;
        }, {}),
        difficulty: 'easy',
        points: 5,
      };
    },
  },
  {
    id: 'artists_top_100_listeners',
    category: 'popularite',
    generate: async (db) => {
      const artists = await db.collection('artists')
        .find({ monthlyListeners: { $gt: 0 } })
        .sort({ monthlyListeners: -1 })
        .limit(100)
        .toArray();

      return {
        id: 'artists_top_100_listeners',
        title: 'Top 100 des auditeurs mensuels',
        description: 'Classement par monthly listeners',
        type: 'open_answer',
        validAnswers: artists.map(a => a.name),
        aliases: artists.reduce((acc, a) => {
          if (a.aliases?.length > 0) acc[a.name] = a.aliases;
          return acc;
        }, {}),
        difficulty: 'easy',
        points: 5,
      };
    },
  },
  {
    id: 'artists_top_200_listeners',
    category: 'popularite',
    generate: async (db) => {
      const artists = await db.collection('artists')
        .find({ monthlyListeners: { $gt: 0 } })
        .sort({ monthlyListeners: -1 })
        .limit(200)
        .toArray();

      return {
        id: 'artists_top_200_listeners',
        title: 'Top 200 des auditeurs mensuels',
        description: 'Classement par monthly listeners',
        type: 'open_answer',
        validAnswers: artists.map(a => a.name),
        aliases: artists.reduce((acc, a) => {
          if (a.aliases?.length > 0) acc[a.name] = a.aliases;
          return acc;
        }, {}),
        difficulty: 'medium',
        points: 10,
      };
    },
  },
];

// ==========================================
// NAME PATTERN THEMES
// ==========================================

export const namePatternThemes: ThemeGenerator[] = [
  {
    id: 'artists_with_K',
    category: 'lettres',
    generate: async (db) => {
      const artists = await db.collection('artists')
        .find({ name: /k/i })
        .sort({ popularity: -1 })
        .limit(100)
        .toArray();

      return {
        id: 'artists_with_K',
        title: 'Rappeurs avec un "K" dans leur nom',
        description: 'Kaaris, Niska, PLK...',
        type: 'open_answer',
        validAnswers: artists.map(a => a.name),
        aliases: {},
        difficulty: 'easy',
        points: 5,
      };
    },
  },
  {
    id: 'artists_with_numbers',
    category: 'lettres',
    generate: async (db) => {
      const artists = await db.collection('artists')
        .find({ name: /\d/ })
        .sort({ popularity: -1 })
        .toArray();

      return {
        id: 'artists_with_numbers',
        title: 'Rappeurs avec des chiffres dans leur nom',
        description: '13Or, 4Keus, 47Ter...',
        type: 'open_answer',
        validAnswers: artists.map(a => a.name),
        aliases: {},
        difficulty: 'medium',
        points: 15,
      };
    },
  },
  {
    id: 'artists_one_word',
    category: 'lettres',
    generate: async (db) => {
      const artists = await db.collection('artists')
        .find()
        .toArray();

      const filtered = artists.filter(a => !a.name.includes(' '));

      return {
        id: 'artists_one_word',
        title: 'Rappeurs avec un nom d\'un seul mot',
        description: 'Booba, Jul, Ninho...',
        type: 'open_answer',
        validAnswers: filtered.map(a => a.name),
        aliases: {},
        difficulty: 'easy',
        points: 5,
      };
    },
  },
  {
    id: 'artists_long_name',
    category: 'lettres',
    generate: async (db) => {
      const artists = await db.collection('artists')
        .find()
        .toArray();

      const filtered = artists.filter(a => a.name.replace(/\s/g, '').length > 12);

      return {
        id: 'artists_long_name',
        title: 'Rappeurs avec un nom long (>12 lettres)',
        description: 'Noms compliques',
        type: 'open_answer',
        validAnswers: filtered.map(a => a.name),
        aliases: {},
        difficulty: 'hard',
        points: 15,
      };
    },
  },
  {
    id: 'artists_double_letter',
    category: 'lettres',
    generate: async (db) => {
      const artists = await db.collection('artists')
        .find({ name: /(.)\1/ })
        .sort({ popularity: -1 })
        .limit(100)
        .toArray();

      return {
        id: 'artists_double_letter',
        title: 'Rappeurs avec des lettres doublees',
        description: 'Kaaris, Nappy, Booba...',
        type: 'open_answer',
        validAnswers: artists.map(a => a.name),
        aliases: {},
        difficulty: 'medium',
        points: 10,
      };
    },
  },
];

// ==========================================
// ALBUM THEMES
// ==========================================

export const albumThemes: ThemeGenerator[] = [
  {
    id: 'albums_2020s',
    category: 'annee',
    generate: async (db) => {
      const albums = await db.collection('albums')
        .find({ year: { $gte: 2020 } })
        .sort({ year: -1 })
        .limit(150)
        .toArray();

      return {
        id: 'albums_2020s',
        title: 'Albums sortis depuis 2020',
        description: 'Les nouveautes',
        type: 'open_answer',
        validAnswers: albums.map(a => a.title),
        aliases: {},
        difficulty: 'easy',
        points: 5,
      };
    },
  },
  {
    id: 'albums_old_school',
    category: 'annee',
    generate: async (db) => {
      const albums = await db.collection('albums')
        .find({ year: { $lt: 2010 } })
        .sort({ year: 1 })
        .limit(100)
        .toArray();

      return {
        id: 'albums_old_school',
        title: 'Albums d\'avant 2010',
        description: 'Old school',
        type: 'open_answer',
        validAnswers: albums.map(a => a.title),
        aliases: {},
        difficulty: 'hard',
        points: 20,
      };
    },
  },
  {
    id: 'albums_one_word',
    category: 'creativite',
    generate: async (db) => {
      const albums = await db.collection('albums')
        .find()
        .toArray();

      const filtered = albums.filter(a => !a.title.includes(' '));

      return {
        id: 'albums_one_word',
        title: 'Albums avec un titre d\'un seul mot',
        description: 'Trone, Futur, Destin...',
        type: 'open_answer',
        validAnswers: filtered.map(a => a.title),
        aliases: {},
        difficulty: 'medium',
        points: 10,
      };
    },
  },
  {
    id: 'albums_long',
    category: 'creativite',
    generate: async (db) => {
      const albums = await db.collection('albums')
        .find({ totalTracks: { $gte: 18 } })
        .sort({ totalTracks: -1 })
        .limit(120)
        .toArray();

      return {
        id: 'albums_long',
        title: 'Albums longs (18 tracks ou plus)',
        description: 'Les albums bien charges',
        type: 'open_answer',
        validAnswers: albums.map(a => a.title),
        aliases: {},
        difficulty: 'medium',
        points: 10,
      };
    },
  },
];

// ==========================================
// TRACK THEMES
// ==========================================

export const trackThemes: ThemeGenerator[] = [
  {
    id: 'tracks_short_title',
    category: 'creativite',
    generate: async (db) => {
      const tracks = await db.collection('tracks')
        .find()
        .toArray();

      const filtered = tracks.filter(t => t.title.replace(/\s/g, '').length <= 4);

      return {
        id: 'tracks_short_title',
        title: 'Tracks avec un titre tres court (<=4 lettres)',
        description: 'DKR, Biff, A7...',
        type: 'open_answer',
        validAnswers: filtered.map(t => t.title).slice(0, 100),
        aliases: {},
        difficulty: 'hard',
        points: 20,
      };
    },
  },
  {
    id: 'tracks_long_duration',
    category: 'duree',
    generate: async (db) => {
      const tracks = await db.collection('tracks')
        .find({ durationMs: { $gte: 300000 } }) // 5+ minutes
        .sort({ durationMs: -1 })
        .limit(100)
        .toArray();

      return {
        id: 'tracks_long_duration',
        title: 'Tracks de plus de 5 minutes',
        description: 'Les morceaux longs',
        type: 'open_answer',
        validAnswers: tracks.map(t => t.title),
        aliases: {},
        difficulty: 'hard',
        points: 15,
      };
    },
  },
  {
    id: 'tracks_short_duration',
    category: 'duree',
    generate: async (db) => {
      const tracks = await db.collection('tracks')
        .find({ durationMs: { $lte: 120000, $gt: 0 } }) // <2 minutes
        .sort({ durationMs: 1 })
        .limit(100)
        .toArray();

      return {
        id: 'tracks_short_duration',
        title: 'Tracks de moins de 2 minutes',
        description: 'Les morceaux courts',
        type: 'open_answer',
        validAnswers: tracks.map(t => t.title),
        aliases: {},
        difficulty: 'medium',
        points: 10,
      };
    },
  },
  {
    id: 'tracks_with_feat',
    category: 'feat',
    generate: async (db) => {
      const tracks = await db.collection('tracks')
        .find({ 'featuring.0': { $exists: true } })
        .limit(150)
        .toArray();

      return {
        id: 'tracks_with_feat',
        title: 'Tracks avec des featurings',
        description: 'Collaborations',
        type: 'open_answer',
        validAnswers: tracks.map(t => t.title),
        aliases: {},
        difficulty: 'easy',
        points: 5,
      };
    },
  },
  {
    id: 'tracks_popular',
    category: 'popularite',
    generate: async (db) => {
      const tracks = await db.collection('tracks')
        .find({ popularity: { $gte: 60 } })
        .sort({ popularity: -1 })
        .limit(120)
        .toArray();

      return {
        id: 'tracks_popular',
        title: 'Tracks tres populaires',
        description: 'Popularite >= 60',
        type: 'open_answer',
        validAnswers: tracks.map(t => t.title),
        aliases: {},
        difficulty: 'easy',
        points: 5,
      };
    },
  },
];

// ==========================================
// COLLAB THEMES
// ==========================================

export const collabThemes: ThemeGenerator[] = [
  {
    id: 'most_collaborated',
    category: 'feat',
    generate: async (db) => {
      const artists = await db.collection('collaborations').aggregate([
        { $group: { _id: '$artistAName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]).toArray();

      return {
        id: 'most_collaborated',
        title: 'Rappeurs qui font le plus de featurings',
        description: 'Les collaborateurs',
        type: 'open_answer',
        validAnswers: artists.map(a => a._id),
        aliases: {},
        difficulty: 'medium',
        points: 10,
      };
    },
  },
  {
    id: 'solo_artists',
    category: 'feat',
    generate: async (db) => {
      const allArtists = await db.collection('artists').find().toArray();
      const artistsWithCollabs = new Set<string>();

      const collabs = await db.collection('collaborations').find().toArray();
      collabs.forEach(c => {
        artistsWithCollabs.add(c.artistAName);
        artistsWithCollabs.add(c.artistBName);
      });

      const soloArtists = allArtists.filter(a => !artistsWithCollabs.has(a.name));

      return {
        id: 'solo_artists',
        title: 'Rappeurs qui ne font jamais de featurings',
        description: 'Les solitaires',
        type: 'open_answer',
        validAnswers: soloArtists.map(a => a.name).slice(0, 50),
        aliases: {},
        difficulty: 'hard',
        points: 20,
      };
    },
  },
];

// ==========================================
// TAG THEMES (Last.fm)
// ==========================================

export const tagThemes: ThemeGenerator[] = [
  {
    id: 'tag_random',
    category: 'creativite',
    generate: async (db) => {
      const tags = await db.collection('artists').aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $match: { count: { $gte: 15 } } },
        { $sample: { size: 1 } },
      ]).toArray();

      const tag = tags[0]?._id;
      if (!tag) {
        return {
          id: 'tag_random',
          title: 'Tag indisponible',
          description: 'Aucun tag exploitable',
          type: 'open_answer',
          validAnswers: [],
          aliases: {},
          difficulty: 'medium',
          points: 10,
        };
      }

      const artists = await db.collection('artists')
        .find({ tags: tag })
        .project({ name: 1, aliases: 1 })
        .toArray();

      return {
        id: `tag_${String(tag).replace(/[^a-z0-9]+/gi, '_')}`,
        title: `Rappeurs tagges "${tag}"`,
        description: `Tag Last.fm: ${tag}`,
        type: 'open_answer',
        validAnswers: artists.map(a => a.name),
        aliases: artists.reduce((acc, a) => {
          if (a.aliases?.length > 0) acc[a.name] = a.aliases;
          return acc;
        }, {}),
        difficulty: 'medium',
        points: 10,
      };
    },
  },
];

// ==========================================
// EXPORT
// ==========================================

export const ALL_EXTRA_THEMES: ThemeGenerator[] = [
  ...popularityThemes,
  ...namePatternThemes,
  ...albumThemes,
  ...trackThemes,
  ...collabThemes,
  ...tagThemes,
];
