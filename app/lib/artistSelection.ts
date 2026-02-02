// @ts-nocheck
// ============================================
// SÉLECTION D'ARTISTES PAR TIERS
// mainstream (60%) / mid (35%) / underground (5%)
// ============================================
// Approche: on tire d'abord le TIER, puis on pioche
// aléatoirement dans ce tier. Garantit exactement
// les probabilités voulues peu importe le nombre
// d'artistes par tier.
// ============================================

import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapbattle';

// ==========================================
// PROBABILITÉS PAR TIER
// ==========================================

export type Tier = 'mainstream' | 'mid' | 'underground';

export interface TierProbabilities {
  mainstream: number;  // 0-100
  mid: number;         // 0-100
  underground: number; // 0-100
}

// Presets de probabilités par mode de jeu
export const TIER_PRESETS: Record<string, TierProbabilities> = {
  // Standard: 60/35/5
  default: { mainstream: 60, mid: 35, underground: 5 },

  // Blind Test: standard
  blind_test: { mainstream: 60, mid: 35, underground: 5 },

  // Roland Gamos: standard (premier feat)
  roland_gamos: { mainstream: 60, mid: 35, underground: 5 },

  // Pixel Cover: standard
  pixel_cover: { mainstream: 60, mid: 35, underground: 5 },

  // Continue les paroles: plus mainstream (sinon trop frustrant)
  continue_paroles: { mainstream: 75, mid: 22, underground: 3 },

  // Devine Qui: un peu moins mainstream (les indices aident)
  devine_qui: { mainstream: 50, mid: 40, underground: 10 },

  // Le Thème: pas pertinent (thème = géo/genre, pas tier)
  le_theme: { mainstream: 60, mid: 35, underground: 5 },

  // Enchères: pas pertinent (basé sur les thèmes)
  encheres: { mainstream: 60, mid: 35, underground: 5 },
};

// ==========================================
// SÉLECTION PAR TIER
// ==========================================

/**
 * Tire un tier selon les probabilités données
 * Ex: { mainstream: 60, mid: 35, underground: 5 }
 * → 60% de chance de retourner 'mainstream'
 */
function rollTier(probs: TierProbabilities): Tier {
  const roll = Math.random() * 100;
  if (roll < probs.mainstream) return 'mainstream';
  if (roll < probs.mainstream + probs.mid) return 'mid';
  return 'underground';
}

/**
 * Sélectionne un artiste aléatoire selon le système de tiers
 *
 * 1. Tire un tier (mainstream/mid/underground) selon les probabilités
 * 2. Pioche un artiste aléatoire dans ce tier
 * 3. Si le tier est vide, fallback sur le tier suivant
 *
 * @param mode - Mode de jeu (pour choisir le preset de probabilités)
 * @param filter - Filtre MongoDB additionnel (ex: { tracksWithPreview: { $gt: 0 } })
 * @param excludeIds - IDs d'artistes à exclure (déjà utilisés)
 */
export async function selectArtistByTier(options?: {
  mode?: string;
  probabilities?: TierProbabilities;
  filter?: Record<string, any>;
  excludeIds?: string[];
}) {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();

  try {
    return await _selectArtistByTier(db, options);
  } finally {
    await client.close();
  }
}

async function _selectArtistByTier(db: Db, options?: {
  mode?: string;
  probabilities?: TierProbabilities;
  filter?: Record<string, any>;
  excludeIds?: string[];
}) {
  const artistsCol = db.collection('artists');

  // Déterminer les probabilités
  const probs = options?.probabilities ||
    TIER_PRESETS[options?.mode || 'default'] ||
    TIER_PRESETS.default;

  // Construire le filtre de base
  const baseFilter: Record<string, any> = { ...options?.filter };
  if (options?.excludeIds?.length) {
    baseFilter.spotifyId = { $nin: options.excludeIds };
  }

  // Tirer le tier
  let selectedTier = rollTier(probs);

  // Fallback: si le tier est vide, essayer les autres
  const tierOrder: Tier[] = [selectedTier];
  if (selectedTier === 'mainstream') tierOrder.push('mid', 'underground');
  else if (selectedTier === 'mid') tierOrder.push('mainstream', 'underground');
  else tierOrder.push('mid', 'mainstream');

  for (const tier of tierOrder) {
    const filter = { ...baseFilter, tier };
    const count = await artistsCol.countDocuments(filter);

    if (count === 0) continue;

    // Pioche aléatoire dans le tier
    const skip = Math.floor(Math.random() * count);
    const artist = await artistsCol.findOne(filter, { skip });

    if (artist) {
      return { ...artist, selectedTier: tier, requestedTier: selectedTier };
    }
  }

  // Fallback ultime: n'importe quel artiste
  const anyArtist = await artistsCol.findOne(baseFilter);
  if (!anyArtist) {
    throw new Error('Aucun artiste disponible avec les filtres donnés');
  }
  return { ...anyArtist, selectedTier: anyArtist.tier, requestedTier: selectedTier };
}

/**
 * Sélectionne N artistes uniques par tier
 */
export async function selectMultipleArtistsByTier(count: number, options?: {
  mode?: string;
  probabilities?: TierProbabilities;
  filter?: Record<string, any>;
}) {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();

  try {
    const results: any[] = [];
    const usedIds: string[] = [];

    for (let i = 0; i < count; i++) {
      const artist = await _selectArtistByTier(db, {
        ...options,
        excludeIds: usedIds,
      });
      results.push(artist);
      usedIds.push((artist as any).spotifyId || (artist as any)._id?.toString());
    }

    return results;
  } finally {
    await client.close();
  }
}

// ==========================================
// SÉLECTION DE TRACK PAR TIER (pour Blind Test)
// ==========================================

/**
 * Sélectionne une track avec preview selon le système de tiers
 * Assure que le blind test n'est pas toujours les mêmes artistes mainstream
 */
export async function selectBlindTestTrackByTier(options?: {
  probabilities?: TierProbabilities;
  excludeTrackIds?: string[];
  excludeArtistIds?: string[];
}) {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();

  try {
    const tracksCol = db.collection('tracks');
    const artistsCol = db.collection('artists');

    const probs = options?.probabilities || TIER_PRESETS.blind_test;
    const selectedTier = rollTier(probs);

    // Trouver les artistes du tier
    const tierOrder: Tier[] = [selectedTier];
    if (selectedTier === 'mainstream') tierOrder.push('mid', 'underground');
    else if (selectedTier === 'mid') tierOrder.push('mainstream', 'underground');
    else tierOrder.push('mid', 'mainstream');

    for (const tier of tierOrder) {
      // Artistes de ce tier
      const tierArtistIds = await artistsCol
        .find({ tier })
        .project({ spotifyId: 1 })
        .toArray()
        .then(artists => artists.map(a => a.spotifyId));

      if (tierArtistIds.length === 0) continue;

      // Tracks avec preview de ces artistes
      const trackFilter: Record<string, any> = {
        previewUrl: { $ne: null, $exists: true },
        artistId: { $in: tierArtistIds },
      };

      if (options?.excludeTrackIds?.length) {
        trackFilter.spotifyId = { $nin: options.excludeTrackIds };
      }
      if (options?.excludeArtistIds?.length) {
        trackFilter.artistId = {
          $in: tierArtistIds.filter(id => !options.excludeArtistIds!.includes(id)),
        };
      }

      const count = await tracksCol.countDocuments(trackFilter);
      if (count === 0) continue;

      // Pioche aléatoire pondérée par popularité
      const tracks = await tracksCol.find(trackFilter).toArray();
      const totalWeight = tracks.reduce((sum: number, t: any) => sum + Math.max(t.popularity || 1, 1), 0);
      const roll = Math.random() * totalWeight;

      let cumulative = 0;
      for (const track of tracks) {
        cumulative += Math.max(track.popularity || 1, 1);
        if (roll <= cumulative) {
          return { ...track, selectedTier: tier };
        }
      }

      return { ...tracks[tracks.length - 1], selectedTier: tier };
    }

    throw new Error('Aucune track avec preview disponible');
  } finally {
    await client.close();
  }
}

/**
 * Sélectionne N tracks pour une session de Blind Test avec variété par tier
 */
export async function selectBlindTestTracksByTier(count: number, options?: {
  probabilities?: TierProbabilities;
}) {
  const selected: any[] = [];
  const usedTrackIds: string[] = [];
  const usedArtistIds: string[] = [];
  const usedAlbumIds = new Set<string>();

  let retries = 0;
  const maxRetries = count * 3;

  while (selected.length < count && retries < maxRetries) {
    try {
      const track = await selectBlindTestTrackByTier({
        probabilities: options?.probabilities,
        excludeTrackIds: usedTrackIds,
        excludeArtistIds: [], // On permet le même artiste mais pas la même track
      });

      // Éviter le même album (variété)
      if (usedAlbumIds.has(track.albumId)) {
        usedTrackIds.push(track.spotifyId);
        retries++;
        continue;
      }

      selected.push(track);
      usedTrackIds.push(track.spotifyId);
      usedArtistIds.push(track.artistId);
      usedAlbumIds.add(track.albumId);
    } catch {
      retries++;
    }
  }

  return selected;
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Obtenir un artiste par ID avec toutes ses données
 */
export async function getArtistById(artistId: string) {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();
  const artistsCol = db.collection('artists');
  const albumsCol = db.collection('albums');

  try {
    const artist = await artistsCol.findOne({ spotifyId: artistId });
    if (!artist) return null;

    const albums = await albumsCol
      .find({ artistId: artistId })
      .sort({ year: 1 })
      .toArray();

    return { ...artist, albums };
  } finally {
    await client.close();
  }
}

/**
 * Stats de sélection par tier (pour debug/admin)
 */
export async function getSelectionStats() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();
  const artistsCol = db.collection('artists');

  try {
    const mainstream = await artistsCol.countDocuments({ tier: 'mainstream' });
    const mid = await artistsCol.countDocuments({ tier: 'mid' });
    const underground = await artistsCol.countDocuments({ tier: 'underground' });
    const total = mainstream + mid + underground;

    return {
      total,
      tiers: {
        mainstream: { count: mainstream, percentage: `${((mainstream / total) * 100).toFixed(1)}%` },
        mid: { count: mid, percentage: `${((mid / total) * 100).toFixed(1)}%` },
        underground: { count: underground, percentage: `${((underground / total) * 100).toFixed(1)}%` },
      },
      selectionProbabilities: TIER_PRESETS.default,
      explanation: `Avec le preset default (60/35/5):
        - Chaque partie: 60% de chance de tomber sur un artiste mainstream
        - 35% mid, 5% underground
        - Indépendant du nombre d'artistes par tier`,
    };
  } finally {
    await client.close();
  }
}
