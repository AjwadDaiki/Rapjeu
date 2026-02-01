// ============================================
// QUERIES COMPLEXES POUR LES THÈMES
// Gère les jointures MongoDB pour années et collabs
// ============================================

import { MongoClient } from 'mongodb';
import { Theme } from './themes';
import { findArtistByName, suggestCorrection } from './nameValidator';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapbattle';

/**
 * Exécute la query d'un thème et retourne les artistes correspondants
 */
export async function getArtistsForTheme(theme: Theme): Promise<any[]> {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();

  try {
    // Thèmes basés sur les années d'albums (nécessitent jointure)
    if (theme.id.startsWith('time_') && theme.id.match(/time_20\d{2}/)) {
      return await getArtistsByAlbumYear(theme, db);
    }

    // Thèmes basés sur les collaborations (nécessitent jointure)
    if (theme.id.startsWith('collab_')) {
      return await getArtistsByCollab(theme, db);
    }

    // Thèmes standards (query directe sur artists)
    const artistsCol = db.collection('artists');
    const artists = await artistsCol.find(theme.mongoQuery).toArray();

    return artists;

  } finally {
    await client.close();
  }
}

/**
 * Récupère les artistes ayant sorti un album une année donnée
 */
async function getArtistsByAlbumYear(theme: Theme, db: any): Promise<any[]> {
  // Extraire l'année du theme.id (ex: "time_2019" => 2019)
  const year = parseInt(theme.id.split('_')[1]);

  // Récupérer tous les albums de cette année
  const albumsCol = db.collection('albums');
  const albums = await albumsCol.find({ year: year }).toArray();

  // Extraire les artistIds uniques
  const artistIds = [...new Set(albums.map((a: any) => a.artistId))];

  // Récupérer les artistes correspondants
  const artistsCol = db.collection('artists');
  const artists = await artistsCol.find({ spotifyId: { $in: artistIds } }).toArray();

  return artists;
}

/**
 * Récupère les artistes ayant collaboré avec un artiste donné
 */
async function getArtistsByCollab(theme: Theme, db: any): Promise<any[]> {
  // Mapping des IDs de thème vers les Spotify IDs des artistes
  const COLLAB_ARTIST_IDS: Record<string, string> = {
    'collab_booba': '0VBc83GX4gb0l2sEfkLVWC',     // Booba
    'collab_ninho': '6LuN9FCkKOtWwN1qSd9GxI',      // Ninho
    'collab_pnl': '1EjVjU6dG4n3k7Fje03L3E',        // PNL
    'collab_jul': '6fcTRFPq8YC3Ah0rKKWJcw',        // Jul
    'collab_sch': '5E4f6QYMjZQqtQG3VdPE9j',        // SCH
    'collab_damso': '5kXdMDEsJiLXKx36FBpKoN',      // Damso
    'collab_kaaris': '2O93DbmXQDPXdjZT9y0Nfx',     // Kaaris
    'collab_freeze': '7kL1rDuIU1TmvMb5lLjlJ6',     // Freeze Corleone
  };

  const targetArtistId = COLLAB_ARTIST_IDS[theme.id];
  if (!targetArtistId) {
    console.warn(`Pas de Spotify ID pour le thème ${theme.id}`);
    return [];
  }

  // Récupérer les collaborations
  const collabsCol = db.collection('collaborations');
  const collabs = await collabsCol.find({
    $or: [
      { artist1Id: targetArtistId },
      { artist2Id: targetArtistId },
    ]
  }).toArray();

  // Extraire les IDs des artistes collaborateurs
  const collaboratorIds = collabs.map((c: any) =>
    c.artist1Id === targetArtistId ? c.artist2Id : c.artist1Id
  );

  const uniqueIds = [...new Set(collaboratorIds)];

  // Récupérer les artistes
  const artistsCol = db.collection('artists');
  const artists = await artistsCol.find({ spotifyId: { $in: uniqueIds } }).toArray();

  return artists;
}

/**
 * Valide si une réponse correspond au thème
 * Utilise la normalisation et les alias pour fuzzy matching
 */
export async function validateAnswer(
  theme: Theme,
  artistName: string,
  usedAnswers: string[] = []
): Promise<{
  valid: boolean;
  normalizedName?: string;
  artist?: any;
  reason?: string;
  suggestion?: string;
  matchType?: 'exact' | 'normalized' | 'alias' | 'compact' | 'fuzzy';
}> {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();

  try {
    // Récupérer tous les artistes valides pour ce thème
    const validArtists = await getArtistsForTheme(theme);

    // Chercher une correspondance avec normalisation + alias
    const result = findArtistByName(artistName, validArtists);

    if (!result.found) {
      // Suggérer une correction si l'utilisateur s'est trompé de peu
      const suggestion = suggestCorrection(artistName, validArtists);

      return {
        valid: false,
        reason: 'Artiste invalide pour ce thème',
        suggestion: suggestion || undefined,
      };
    }

    const match = result.artist;

    // Vérifier si déjà utilisé (comparer les noms normalisés)
    const alreadyUsed = usedAnswers.some(used => {
      const usedResult = findArtistByName(used, [match]);
      return usedResult.found;
    });

    if (alreadyUsed) {
      return {
        valid: false,
        reason: 'Artiste déjà nommé',
        normalizedName: match.name,
        matchType: result.matchType,
      };
    }

    return {
      valid: true,
      normalizedName: match.name,
      artist: match,
      matchType: result.matchType,
    };

  } finally {
    await client.close();
  }
}

/**
 * Obtient des indices pour un thème (pour power-up "hint")
 */
export async function getThemeHints(theme: Theme, count: number = 3): Promise<string[]> {
  const artists = await getArtistsForTheme(theme);

  // Trier par popularité et prendre les premiers
  const sorted = artists.sort((a: any, b: any) =>
    (b.monthlyListeners || 0) - (a.monthlyListeners || 0)
  );

  // Retourner les noms des N premiers
  return sorted.slice(0, count).map((a: any) => a.name);
}

/**
 * Compte le nombre d'artistes valides pour un thème
 */
export async function countArtistsForTheme(theme: Theme): Promise<number> {
  const artists = await getArtistsForTheme(theme);
  return artists.length;
}
