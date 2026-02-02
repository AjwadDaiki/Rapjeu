// @ts-nocheck
// ============================================
// MONGODB SERVICE
// Remplace les données hardcodées par MongoDB
// ============================================

import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapbattle';
const DB_NAME = 'rapbattle';

let _client: MongoClient | null = null;
let _db: Db | null = null;

// ==========================================
// CONNECTION
// ==========================================

export async function getDb(): Promise<Db> {
  if (_db) return _db;

  if (!_client) {
    _client = new MongoClient(MONGODB_URI);
    await _client.connect();
    console.log('[MongoDB] Connecté à la base de données');
  }

  _db = _client.db(DB_NAME);
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_client) {
    await _client.close();
    _client = null;
    _db = null;
    console.log('[MongoDB] Connexion fermée');
  }
}

// ==========================================
// INTERFACES
// ==========================================

export interface MongoArtist {
  _id?: string;
  spotifyId: string;
  name: string;
  aliases: string[];
  monthlyListeners: number;
  popularity: number;
  genres: string[];
  imageUrl?: string;
  location?: {
    city?: string;
    department?: string;
    region?: string;
    country?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoTrack {
  _id?: string;
  spotifyId: string;
  title: string;
  artistId: string;
  artistName: string;
  albumId: string;
  albumName: string;
  featuring: Array<{
    artistId: string;
    artistName: string;
  }>;
  year: number;
  durationMs: number;
  popularity: number;
  previewUrl?: string;
  explicit: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoAlbum {
  _id?: string;
  spotifyId: string;
  title: string;
  artistId: string;
  artistName: string;
  year: number;
  coverUrl?: string;
  label?: string;
  totalTracks: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoCollaboration {
  _id?: string;
  artistAId: string;
  artistAName: string;
  artistBId: string;
  artistBName: string;
  trackId: string;
  trackTitle: string;
  verified: boolean;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// ARTIST QUERIES
// ==========================================

/**
 * Résoudre un artiste par nom ou alias (avec fuzzy matching)
 */
export async function resolveArtistByName(input: string): Promise<MongoArtist | null> {
  const db = await getDb();

  // Normaliser l'input
  const normalized = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (!normalized) return null;

  // 1. Chercher match exact sur nom
  let artist = await db.collection<MongoArtist>('artists').findOne({
    $expr: {
      $eq: [
        { $toLower: { $trim: { input: '$name' } } },
        normalized
      ]
    }
  });

  if (artist) return artist;

  // 2. Chercher dans les aliases
  artist = await db.collection<MongoArtist>('artists').findOne({
    aliases: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, 'i') }
  });

  if (artist) return artist;

  // 3. Fuzzy search avec MongoDB text search
  try {
    const results = await db.collection<MongoArtist>('artists')
      .find({ $text: { $search: input } })
      .limit(1)
      .toArray();

    if (results.length > 0) return results[0];
  } catch (e) {
    // Text index might not exist yet
  }

  return null;
}

/**
 * Vérifier si deux artistes ont un featuring ensemble
 */
export async function hasFeaturingWith(artistAId: string, artistBId: string): Promise<boolean> {
  const db = await getDb();

  const collab = await db.collection<MongoCollaboration>('collaborations').findOne({
    $or: [
      { artistAId, artistBId },
      { artistAId: artistBId, artistBId: artistAId }
    ]
  });

  return collab !== null;
}

/**
 * Obtenir les partenaires de featuring d'un artiste
 */
export async function getFeaturingPartners(artistId: string): Promise<string[]> {
  const db = await getDb();

  const collabs = await db.collection<MongoCollaboration>('collaborations')
    .find({
      $or: [
        { artistAId: artistId },
        { artistBId: artistId }
      ]
    })
    .toArray();

  const partners = new Set<string>();
  for (const collab of collabs) {
    if (collab.artistAId === artistId) {
      partners.add(collab.artistBId);
    } else {
      partners.add(collab.artistAId);
    }
  }

  return Array.from(partners);
}

/**
 * Obtenir les artistes avec un minimum de featurings (pour Roland Gamos)
 */
export async function getGoodStartingArtists(minFeats: number = 3): Promise<MongoArtist[]> {
  const db = await getDb();

  // Utiliser aggregation pour compter les collabs par artiste
  const pipeline = [
    {
      $group: {
        _id: '$artistAId',
        artistAName: { $first: '$artistAName' },
        count: { $sum: 1 }
      }
    },
    {
      $match: {
        count: { $gte: minFeats }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 100
    }
  ];

  const results = await db.collection('collaborations').aggregate(pipeline).toArray();

  // Récupérer les artistes complets
  const artistIds = results.map(r => r._id);
  const artists = await db.collection<MongoArtist>('artists')
    .find({ spotifyId: { $in: artistIds } })
    .toArray();

  return artists;
}

/**
 * Chercher des artistes par département
 */
export async function getArtistsByDepartment(department: string): Promise<MongoArtist[]> {
  const db = await getDb();

  const artists = await db.collection<MongoArtist>('artists')
    .find({ 'location.department': department })
    .sort({ popularity: -1 })
    .toArray();

  return artists;
}

/**
 * Chercher des artistes par ville
 */
export async function getArtistsByCity(city: string): Promise<MongoArtist[]> {
  const db = await getDb();

  // Normaliser la ville
  const normalized = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const artists = await db.collection<MongoArtist>('artists')
    .find({
      $expr: {
        $regexMatch: {
          input: { $toLower: { $ifNull: ['$location.city', ''] } },
          regex: escapeRegex(normalized),
          options: 'i'
        }
      }
    })
    .sort({ popularity: -1 })
    .toArray();

  return artists;
}

/**
 * Obtenir un artiste par Spotify ID
 */
export async function getArtistById(spotifyId: string): Promise<MongoArtist | null> {
  const db = await getDb();
  return db.collection<MongoArtist>('artists').findOne({ spotifyId });
}

// ==========================================
// TRACK QUERIES
// ==========================================

/**
 * Obtenir des tracks aléatoires (pour Blind Test)
 */
export async function getRandomTracks(count: number = 5): Promise<MongoTrack[]> {
  const db = await getDb();

  const basePipeline = [
    {
      $match: {
        previewUrl: { $exists: true, $ne: null },
        title: { $exists: true, $ne: null },
        artistName: { $exists: true, $ne: null },
      },
    },
    {
      $addFields: {
        titleLen: { $strLenCP: '$title' },
        artistLen: { $strLenCP: '$artistName' },
      },
    },
    {
      $match: {
        titleLen: { $lte: 28 },
        artistLen: { $lte: 22 },
      },
    },
  ];

  if (count <= 0) {
    const tracks = await db.collection<MongoTrack>('tracks')
      .aggregate(basePipeline)
      .toArray();
    return tracks;
  }

  const popularPipeline = [
    ...basePipeline,
    { $match: { popularity: { $gte: 35 } } },
    { $sort: { popularity: -1 } },
    { $limit: 800 },
    { $sample: { size: count } },
  ];

  let tracks = await db.collection<MongoTrack>('tracks')
    .aggregate(popularPipeline)
    .toArray();

  if (tracks.length < count) {
    const fallback = await db.collection<MongoTrack>('tracks')
      .aggregate([
        { $match: { previewUrl: { $exists: true, $ne: null } } },
        { $sample: { size: count } }
      ])
      .toArray();
    const merged = new Map<string, MongoTrack>();
    for (const t of tracks) merged.set(t.spotifyId, t);
    for (const t of fallback) merged.set(t.spotifyId, t);
    tracks = Array.from(merged.values()).slice(0, count);
  }

  return tracks;
}

/**
 * Obtenir des albums aléatoires (pour Pixel Cover)
 */
export async function getRandomAlbums(count: number = 5): Promise<MongoAlbum[]> {
  const db = await getDb();

  const basePipeline = [
    {
      $match: {
        coverUrl: { $exists: true, $ne: null },
        title: { $exists: true, $ne: null },
        artistName: { $exists: true, $ne: null },
      },
    },
    {
      $addFields: {
        titleLen: { $strLenCP: '$title' },
        artistLen: { $strLenCP: '$artistName' },
      },
    },
    {
      $match: {
        titleLen: { $lte: 28 },
        artistLen: { $lte: 22 },
      },
    },
    { $sample: { size: count } },
  ];

  if (count <= 0) {
    const albums = await db.collection<MongoAlbum>('albums')
      .aggregate(basePipeline)
      .toArray();
    return albums;
  }

  let albums = await db.collection<MongoAlbum>('albums')
    .aggregate([...basePipeline, { $sample: { size: count } }])
    .toArray();

  if (albums.length < count) {
    const fallback = await db.collection<MongoAlbum>('albums')
      .aggregate([
        { $match: { coverUrl: { $exists: true, $ne: null } } },
        { $sample: { size: count } }
      ])
      .toArray();
    const merged = new Map<string, MongoAlbum>();
    for (const a of albums) merged.set(a.spotifyId, a);
    for (const a of fallback) merged.set(a.spotifyId, a);
    albums = Array.from(merged.values()).slice(0, count);
  }

  return albums;
}

/**
 * Chercher des tracks par critères (pour thèmes créatifs)
 */
export async function searchTracks(query: Record<string, unknown>): Promise<MongoTrack[]> {
  const db = await getDb();
  return db.collection<MongoTrack>('tracks').find(query).toArray();
}

/**
 * Chercher des artistes par critères (pour thèmes créatifs)
 */
export async function searchArtists(query: Record<string, unknown>): Promise<MongoArtist[]> {
  const db = await getDb();
  return db.collection<MongoArtist>('artists').find(query).toArray();
}

// ==========================================
// THEME QUERIES
// ==========================================

/**
 * Obtenir tous les artistes d'un département (pour validation de thème)
 */
export async function getValidAnswersForDepartment(department: string): Promise<string[]> {
  const artists = await getArtistsByDepartment(department);
  return artists.map(a => a.name);
}

/**
 * Obtenir tous les artistes d'une ville (pour validation de thème)
 */
export async function getValidAnswersForCity(city: string): Promise<string[]> {
  const artists = await getArtistsByCity(city);
  return artists.map(a => a.name);
}

/**
 * Obtenir les artistes les plus featés avec un artiste donné
 */
export async function getMostCollaboratedWith(artistName: string, limit: number = 10): Promise<string[]> {
  const db = await getDb();

  // Résoudre l'artiste
  const artist = await resolveArtistByName(artistName);
  if (!artist) return [];

  // Compter les collabs
  const pipeline = [
    {
      $match: {
        $or: [
          { artistAId: artist.spotifyId },
          { artistBId: artist.spotifyId }
        ]
      }
    },
    {
      $project: {
        partnerId: {
          $cond: {
            if: { $eq: ['$artistAId', artist.spotifyId] },
            then: '$artistBId',
            else: '$artistAId'
          }
        },
        partnerName: {
          $cond: {
            if: { $eq: ['$artistAId', artist.spotifyId] },
            then: '$artistBName',
            else: '$artistAName'
          }
        }
      }
    },
    {
      $group: {
        _id: '$partnerId',
        partnerName: { $first: '$partnerName' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    }
  ];

  const results = await db.collection('collaborations').aggregate(pipeline).toArray();
  return results.map(r => r.partnerName);
}

/**
 * Obtenir des artistes par nombre de lettres dans leur nom
 */
export async function getArtistsByNameLength(length: number, includeSpaces: boolean = false): Promise<string[]> {
  const db = await getDb();

  const artists = await db.collection<MongoArtist>('artists').find({}).toArray();

  return artists
    .filter(a => {
      const name = includeSpaces ? a.name : a.name.replace(/\s/g, '');
      return name.length === length;
    })
    .map(a => a.name);
}

/**
 * Obtenir des artistes commençant par une lettre
 */
export async function getArtistsStartingWith(letter: string): Promise<string[]> {
  const db = await getDb();

  const artists = await db.collection<MongoArtist>('artists')
    .find({ name: { $regex: `^${escapeRegex(letter)}`, $options: 'i' } })
    .sort({ popularity: -1 })
    .toArray();

  return artists.map(a => a.name);
}

/**
 * Obtenir des artistes sans voyelles
 */
export async function getArtistsWithoutVowels(): Promise<string[]> {
  const db = await getDb();

  const artists = await db.collection<MongoArtist>('artists').find({}).toArray();

  return artists
    .filter(a => {
      const name = a.name.replace(/\s/g, '').toLowerCase();
      return !/[aeiouy]/.test(name);
    })
    .map(a => a.name);
}

/**
 * Obtenir des tracks avec des chiffres dans le titre
 */
export async function getTracksWithNumbers(): Promise<string[]> {
  const db = await getDb();

  const tracks = await db.collection<MongoTrack>('tracks')
    .find({ title: { $regex: /\d/ } })
    .limit(100)
    .toArray();

  return tracks.map(t => t.title);
}

/**
 * Obtenir des albums d'une décennie
 */
export async function getAlbumsFromDecade(startYear: number): Promise<string[]> {
  const db = await getDb();

  const albums = await db.collection<MongoAlbum>('albums')
    .find({
      year: { $gte: startYear, $lt: startYear + 10 }
    })
    .toArray();

  return albums.map(a => a.title);
}

// ==========================================
// STATISTICS
// ==========================================

/**
 * Obtenir les statistiques de la base de données
 */
export async function getDbStats(): Promise<{
  artists: number;
  tracks: number;
  albums: number;
  collaborations: number;
}> {
  const db = await getDb();

  const [artists, tracks, albums, collaborations] = await Promise.all([
    db.collection('artists').countDocuments(),
    db.collection('tracks').countDocuments(),
    db.collection('albums').countDocuments(),
    db.collection('collaborations').countDocuments(),
  ]);

  return { artists, tracks, albums, collaborations };
}

// ==========================================
// HELPERS
// ==========================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
