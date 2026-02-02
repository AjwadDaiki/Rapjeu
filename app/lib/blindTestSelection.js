// ============================================
// BLIND TEST SELECTION (Version JS pour backend)
// Sélection intelligente de tracks pour blind test
// ============================================

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapbattle';

/**
 * Sélectionne une track aléatoire pour le blind test
 * Filtre: popularité >= 40, avec preview URL
 */
async function selectBlindTestTrack(options = {}) {
  const minPopularity = options.minPopularity || 40;
  const excludeTrackIds = options.excludeTrackIds || [];

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();
  const tracksCol = db.collection('tracks');

  try {
    const query = {
      previewUrl: { $exists: true, $ne: null },
      popularity: { $gte: minPopularity },
    };

    if (excludeTrackIds.length > 0) {
      query.spotifyId = { $nin: excludeTrackIds };
    }

    const tracks = await tracksCol.find(query).toArray();

    if (tracks.length === 0) {
      await client.close();
      throw new Error('Aucune track avec preview URL trouvée');
    }

    // Sélection pondérée par popularité
    const totalWeight = tracks.reduce((sum, t) => sum + t.popularity, 0);
    let random = Math.random() * totalWeight;

    let selectedTrack = null;
    for (const track of tracks) {
      random -= track.popularity;
      if (random <= 0) {
        selectedTrack = track;
        break;
      }
    }

    await client.close();
    return selectedTrack || tracks[0];

  } catch (error) {
    await client.close();
    throw error;
  }
}

module.exports = {
  selectBlindTestTrack,
};
