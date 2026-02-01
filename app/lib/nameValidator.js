// ============================================
// NAME VALIDATOR (Version JS pour backend)
// Fuzzy matching pour noms d'artistes
// ============================================

/**
 * Normalise un nom (enlève accents, minuscules, etc.)
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever accents
    .replace(/[^a-z0-9\s]/g, '')     // Garder lettres/chiffres
    .trim();
}

/**
 * Distance de Levenshtein (similarité entre 2 chaînes)
 */
function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Cherche un artiste par nom avec fuzzy matching
 */
function findArtistByName(userInput, artists) {
  const normalized = normalizeName(userInput);

  // 1. Exact match
  for (const artist of artists) {
    const artistNorm = normalizeName(artist.name);
    if (artistNorm === normalized) {
      return { found: true, artist, matchType: 'exact' };
    }
  }

  // 2. Alias match
  for (const artist of artists) {
    if (artist.aliases && Array.isArray(artist.aliases)) {
      for (const alias of artist.aliases) {
        if (normalizeName(alias) === normalized) {
          return { found: true, artist, matchType: 'alias' };
        }
      }
    }
  }

  // 3. Fuzzy match (distance <= 2)
  for (const artist of artists) {
    const artistNorm = normalizeName(artist.name);
    const distance = levenshteinDistance(normalized, artistNorm);

    if (distance <= 2) {
      return { found: true, artist, matchType: 'fuzzy' };
    }
  }

  return { found: false, artist: null };
}

/**
 * Suggère une correction si l'artiste n'est pas trouvé
 */
function suggestCorrection(userInput, artists) {
  const normalized = normalizeName(userInput);

  let bestMatch = null;
  let bestDistance = Infinity;

  for (const artist of artists) {
    const artistNorm = normalizeName(artist.name);
    const distance = levenshteinDistance(normalized, artistNorm);

    if (distance < bestDistance && distance <= 3) {
      bestDistance = distance;
      bestMatch = artist.name;
    }
  }

  return bestMatch;
}

module.exports = {
  normalizeName,
  levenshteinDistance,
  findArtistByName,
  suggestCorrection,
};
