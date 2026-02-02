// ============================================
// ARTIST SELECTION (Version JS pour backend)
// Sélection pondérée des artistes
// ============================================

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapbattle';

/**
 * Sélectionne un artiste aléatoire avec pondération
 * Top 100: 100x plus probable
 * Top 200: 50x plus probable
 * Autres: 1x
 */
async function selectRandomArtistWeighted() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();
  const artistsCol = db.collection('artists');

  try {
    // Récupérer tous les artistes avec leur poids
    const artists = await artistsCol.find({}).toArray();

    if (artists.length === 0) {
      await client.close();
      throw new Error('Aucun artiste dans la BDD');
    }

    // Calculer le poids total
    const totalWeight = artists.reduce((sum, a) => sum + (a.selectionWeight || 1), 0);

    // Sélection pondérée
    let random = Math.random() * totalWeight;
    let selectedArtist = null;

    for (const artist of artists) {
      const weight = artist.selectionWeight || 1;
      random -= weight;

      if (random <= 0) {
        selectedArtist = artist;
        break;
      }
    }

    await client.close();
    return selectedArtist || artists[0];

  } catch (error) {
    await client.close();
    throw error;
  }
}

module.exports = {
  selectRandomArtistWeighted,
};
