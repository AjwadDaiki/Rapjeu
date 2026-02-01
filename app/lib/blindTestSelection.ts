// ============================================
// SÉLECTION INTELLIGENTE POUR BLIND TEST
// Filtre les tracks populaires avec preview URL
// ============================================

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapbattle';

/**
 * Sélectionne une track aléatoire pour Blind Test
 *
 * Critères:
 * - DOIT avoir un previewUrl (obligatoire)
 * - Popularité élevée (les hits que tout le monde connaît)
 * - Pondération par popularité
 */
export async function selectBlindTestTrack(options?: {
  minPopularity?: number;  // Défaut: 40
  excludeTrackIds?: string[];
}) {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();
  const tracksCol = db.collection('tracks');

  try {
    const minPopularity = options?.minPopularity || 40;
    const excludeTrackIds = options?.excludeTrackIds || [];

    // Query: tracks avec preview + popularité élevée
    const query: any = {
      previewUrl: { $exists: true, $ne: null },  // ✅ OBLIGATOIRE
      popularity: { $gte: minPopularity },       // ✅ Hits seulement
    };

    // Exclure les tracks déjà jouées
    if (excludeTrackIds.length > 0) {
      query.spotifyId = { $nin: excludeTrackIds };
    }

    // Récupérer toutes les tracks valides
    const tracks = await tracksCol.find(query).toArray();

    if (tracks.length === 0) {
      throw new Error('Aucune track disponible pour Blind Test');
    }

    // Sélection pondérée par popularité
    // Plus la track est populaire, plus elle a de chances d'être choisie
    const totalWeight = tracks.reduce((sum: number, t: any) => sum + t.popularity, 0);
    const random = Math.random() * totalWeight;

    let cumulativeWeight = 0;
    for (const track of tracks) {
      cumulativeWeight += track.popularity;
      if (random <= cumulativeWeight) {
        return track;
      }
    }

    // Fallback (ne devrait jamais arriver)
    return tracks[tracks.length - 1];

  } finally {
    await client.close();
  }
}

/**
 * Sélectionne N tracks pour une session de Blind Test
 * Garantit variété (pas 2 tracks du même album)
 */
export async function selectBlindTestTracks(count: number, options?: {
  minPopularity?: number;
  ensureVariety?: boolean;  // Évite 2 tracks du même album
}) {
  const selected: any[] = [];
  const usedTrackIds: string[] = [];
  const usedAlbumIds = new Set<string>();

  const ensureVariety = options?.ensureVariety ?? true;

  while (selected.length < count) {
    const track = await selectBlindTestTrack({
      minPopularity: options?.minPopularity,
      excludeTrackIds: usedTrackIds,
    });

    // Si on veut de la variété, éviter 2 tracks du même album
    if (ensureVariety && usedAlbumIds.has(track.albumId)) {
      usedTrackIds.push(track.spotifyId);
      continue;
    }

    selected.push(track);
    usedTrackIds.push(track.spotifyId);
    usedAlbumIds.add(track.albumId);
  }

  return selected;
}

/**
 * Stats sur les tracks disponibles pour Blind Test
 */
export async function getBlindTestStats() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();
  const tracksCol = db.collection('tracks');

  try {
    const stats = {
      totalTracks: await tracksCol.countDocuments(),
      tracksWithPreview: await tracksCol.countDocuments({
        previewUrl: { $exists: true, $ne: null }
      }),
      tracksPopular: await tracksCol.countDocuments({
        previewUrl: { $exists: true, $ne: null },
        popularity: { $gte: 40 }
      }),
      tracksVeryPopular: await tracksCol.countDocuments({
        previewUrl: { $exists: true, $ne: null },
        popularity: { $gte: 60 }
      }),
      tracksHits: await tracksCol.countDocuments({
        previewUrl: { $exists: true, $ne: null },
        popularity: { $gte: 70 }
      }),
    };

    return {
      ...stats,
      percentWithPreview: ((stats.tracksWithPreview / stats.totalTracks) * 100).toFixed(1) + '%',
      percentPopular: ((stats.tracksPopular / stats.totalTracks) * 100).toFixed(1) + '%',
    };

  } finally {
    await client.close();
  }
}

/**
 * Exemples de popularité:
 *
 * 80-100: Mega hits (Tchiki Tchiki Gang, DKR, Au DD, etc.)
 * 60-79:  Hits connus (la plupart des singles)
 * 40-59:  Tracks d'albums populaires
 * 20-39:  Deep cuts
 * 0-19:   Tracks obscures
 */
