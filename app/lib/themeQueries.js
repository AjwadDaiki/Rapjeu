// ============================================
// THEME QUERIES (Version JS pour backend)
// Requêtes MongoDB pour valider les réponses
// ============================================

const { MongoClient } = require('mongodb');
const { findArtistByName } = require('./nameValidator');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapbattle';

/**
 * Récupère les artistes correspondant au thème
 */
async function getArtistsForTheme(theme) {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();
  const artistsCol = db.collection('artists');

  try {
    const artists = await artistsCol.find(theme.mongoQuery).toArray();
    await client.close();
    return artists;
  } catch (error) {
    await client.close();
    throw error;
  }
}

/**
 * Valide si un artiste correspond au thème
 */
async function validateAnswer(theme, artistName, usedAnswers = []) {
  const artists = await getArtistsForTheme(theme);

  // Chercher l'artiste avec fuzzy matching
  const result = findArtistByName(artistName, artists);

  if (!result.found) {
    return {
      valid: false,
      reason: 'Artiste introuvable ou ne correspond pas au thème',
      suggestion: null,
    };
  }

  const artist = result.artist;

  // Vérifier si déjà utilisé
  const normalized = artist.normalizedName || artist.name.toLowerCase();
  if (usedAnswers.some(used => used.toLowerCase() === normalized)) {
    return {
      valid: false,
      reason: 'Artiste déjà donné',
      artist: artist,
    };
  }

  return {
    valid: true,
    normalizedName: artist.name,
    artist: artist,
    matchType: result.matchType || 'exact',
  };
}

module.exports = {
  getArtistsForTheme,
  validateAnswer,
};
