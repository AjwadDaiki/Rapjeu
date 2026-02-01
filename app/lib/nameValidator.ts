// ============================================
// VALIDATION DE NOMS D'ARTISTES
// Gère normalisation + alias pour fuzzy matching
// ============================================

/**
 * Normalise un nom d'artiste pour comparaison
 * Exemples:
 * - "Koba LaD" → "koba lad"
 * - "PNL" → "pnl"
 * - "L'Algerino" → "lalgerino"
 * - "Rim'K" → "rimk"
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')                    // Décompose les accents
    .replace(/[\u0300-\u036f]/g, '')     // Supprime les accents
    .replace(/[^a-z0-9\s]/g, '')         // Garde que lettres, chiffres, espaces
    .replace(/\s+/g, ' ')                // Normalise les espaces multiples
    .trim();
}

/**
 * Compacte un nom (supprime TOUS les espaces) pour comparaison souple
 * Corrige les cas "p n l" vs "pnl", "rim k" vs "rimk"
 */
function compactName(name: string): string {
  return normalizeName(name).replace(/\s/g, '');
}

/**
 * Valide si une réponse utilisateur correspond à un artiste
 * Gère les variantes, accents, casse, espaces
 *
 * Exemples:
 * - "kobald" correspond à "Koba LaD" ✅
 * - "koba" correspond à "Koba LaD" ✅
 * - "pnl" correspond à "PNL" ✅
 * - "p n l" correspond à "PNL" ✅
 * - "rim k" correspond à "Rim'K" ✅
 * - "lalgerino" correspond à "L'Algerino" ✅
 */
export function validateArtistName(
  userInput: string,
  artistData: {
    name: string;
    normalizedName: string;
    aliases: string[];
  }
): {
  valid: boolean;
  matchType?: 'exact' | 'normalized' | 'alias' | 'compact' | 'fuzzy';
  normalizedInput?: string;
} {
  const normalizedInput = normalizeName(userInput);

  // 1. Correspondance exacte (rare mais possible)
  if (userInput === artistData.name) {
    return { valid: true, matchType: 'exact', normalizedInput };
  }

  // 2. Correspondance normalisée (le plus courant)
  if (normalizedInput === artistData.normalizedName) {
    return { valid: true, matchType: 'normalized', normalizedInput };
  }

  // 3. Correspondance via alias
  if (artistData.aliases.includes(normalizedInput)) {
    return { valid: true, matchType: 'alias', normalizedInput };
  }

  // 4. Correspondance compacte (sans espaces)
  // Corrige: "p n l" → "pnl" == "pnl", "rim k" → "rimk" == "rimk"
  const compactInput = compactName(userInput);
  const compactArtist = compactName(artistData.name);
  if (compactInput === compactArtist) {
    return { valid: true, matchType: 'compact', normalizedInput };
  }

  // 5. Correspondance compacte via alias
  const compactAliases = artistData.aliases.map(a => a.replace(/\s/g, ''));
  if (compactAliases.includes(compactInput)) {
    return { valid: true, matchType: 'compact', normalizedInput };
  }

  // 6. Fuzzy match (Levenshtein distance <= 1) pour les fautes de frappe mineures
  // Seulement si l'input fait au moins 4 caractères (évite faux positifs sur noms courts)
  if (compactInput.length >= 4) {
    if (levenshteinDistance(compactInput, compactArtist) <= 1) {
      return { valid: true, matchType: 'fuzzy', normalizedInput };
    }
    // Aussi contre le nom normalisé avec espaces
    if (levenshteinDistance(normalizedInput, artistData.normalizedName) <= 1) {
      return { valid: true, matchType: 'fuzzy', normalizedInput };
    }
  }

  // 7. Pas de correspondance
  return { valid: false, normalizedInput };
}

/**
 * Trouve un artiste dans une liste en utilisant la normalisation
 */
export function findArtistByName(
  userInput: string,
  artists: Array<{
    name: string;
    normalizedName: string;
    aliases: string[];
    spotifyId?: string;
  }>
): {
  found: boolean;
  artist?: any;
  matchType?: 'exact' | 'normalized' | 'alias' | 'compact' | 'fuzzy';
} {
  for (const artist of artists) {
    const result = validateArtistName(userInput, artist);
    if (result.valid) {
      return {
        found: true,
        artist: artist,
        matchType: result.matchType,
      };
    }
  }

  return { found: false };
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 * Utilisé pour suggérer des corrections ("Vous vouliez dire...")
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

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
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Suggère des corrections si l'utilisateur s'est trompé de peu
 * Utilise Levenshtein sur les formes normalisée ET compacte
 * Distance max: 2 caractères
 */
export function suggestCorrection(
  userInput: string,
  artists: Array<{ name: string; normalizedName: string }>
): string | null {
  const normalizedInput = normalizeName(userInput);
  const compactInput = compactName(userInput);
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const artist of artists) {
    // Comparer sous forme normalisée
    const d1 = levenshteinDistance(normalizedInput, artist.normalizedName);
    // Comparer sous forme compacte (sans espaces)
    const d2 = levenshteinDistance(compactInput, compactName(artist.name));
    const distance = Math.min(d1, d2);

    if (distance <= 2 && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = artist.name;
    }
  }

  return bestMatch;
}

/**
 * Valide un nom de musique (titre de track)
 * Plus souple que la validation d'artiste car les titres sont plus variés
 */
export function validateTrackName(
  userInput: string,
  trackTitle: string
): boolean {
  const normalizedInput = normalizeName(userInput);
  const normalizedTitle = normalizeName(trackTitle);

  // Match exact normalisé
  if (normalizedInput === normalizedTitle) return true;

  // Match compact (sans espaces)
  if (compactName(userInput) === compactName(trackTitle)) return true;

  // Fuzzy (Levenshtein <= 2 pour les titres, plus tolérant)
  if (normalizedInput.length >= 4) {
    if (levenshteinDistance(normalizedInput, normalizedTitle) <= 2) return true;
    if (levenshteinDistance(compactName(userInput), compactName(trackTitle)) <= 2) return true;
  }

  return false;
}

/**
 * Exemples de validation (pour tests)
 */
export const VALIDATION_EXAMPLES = {
  // Koba LaD
  'koba lad': { expected: 'Koba LaD', valid: true },
  'kobald': { expected: 'Koba LaD', valid: true },
  'koba': { expected: 'Koba LaD', valid: true },
  'Koba LaD': { expected: 'Koba LaD', valid: true },

  // PNL - "p n l" doit matcher grâce au compact matching
  'pnl': { expected: 'PNL', valid: true },
  'PNL': { expected: 'PNL', valid: true },
  'p n l': { expected: 'PNL', valid: true },  // compact: "pnl" == "pnl"

  // Rim'K - "rim k" doit matcher grâce au compact matching
  "rim'k": { expected: "Rim'K", valid: true },
  'rimk': { expected: "Rim'K", valid: true },
  'rim k': { expected: "Rim'K", valid: true }, // compact: "rimk" == "rimk"

  // L'Algerino
  'lalgerino': { expected: "L'Algerino", valid: true },
  'algerino': { expected: "L'Algerino", valid: true },
  "l'algerino": { expected: "L'Algerino", valid: true },
  "L'Algerino": { expected: "L'Algerino", valid: true },

  // Heuss L'Enfoiré
  'heuss': { expected: "Heuss L'Enfoiré", valid: true },
  'heuss lenfoire': { expected: "Heuss L'Enfoiré", valid: true },
  'heusslenfoire': { expected: "Heuss L'Enfoiré", valid: true },

  // Freeze Corleone
  'freeze': { expected: 'Freeze Corleone', valid: true },
  'freeze corleone': { expected: 'Freeze Corleone', valid: true },
  'freezecorleone': { expected: 'Freeze Corleone', valid: true },

  // Fuzzy (fautes de frappe mineures)
  'boba': { expected: 'Booba', valid: true },     // Levenshtein 1
  'ninno': { expected: 'Ninho', valid: true },     // Levenshtein 1

  // Échecs attendus
  'booba': { expected: 'PNL', valid: false },
  'xyz': { expected: 'PNL', valid: false },
};
