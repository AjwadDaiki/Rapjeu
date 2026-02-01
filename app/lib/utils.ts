// ============================================
// UTILITAIRES GÉNÉRAUX
// ============================================

const FUZZY = {
  MAX_LEVENSHTEIN_DISTANCE: 3,
  MIN_SIMILARITY_RATIO: 0.65,
};

// Alias communs pour les artistes (pour la résolution de noms)
const ARTIST_ALIASES: Record<string, string[]> = {
  'PNL': ['pnl', 'peace n lovés'],
  'Booba': ['booba', 'b2oba', '92i'],
  'Jul': ['jul', 'juel'],
  'Ninho': ['ninho', 'ni'],
  'Damso': ['damso', 'dams'],
  'Orelsan': ['orelsan', 'orel'],
  'Vald': ['vald', 'valdshadows'],
  'Freeze Corleone': ['freeze corleone', 'freeze', '671'],
  'Gazo': ['gazo', 'gazo gz', 'gk'],
  'SDM': ['sdm', 'sd'],
  'Niska': ['niska', 'nisk'],
  'Kaaris': ['kaaris', 'kalash', 'kalash criminel'],
  'SCH': ['sch', 's c h'],
  'Lacrim': ['lacrim', 'la crim'],
  'Rohff': ['rohff', 'rohf'],
  'Soprano': ['soprano', 'sopra'],
  'Maitre Gims': ['maitre gims', 'gims', 'maitre'],
};

// Alias pour les labels
const LABEL_ALIASES: Record<string, string[]> = {
  '92i': ['92i', '92 i', 'neuf deux i'],
  'SEXION DASSAUT': ['sexion dassaut', 'sexion'],
  'QNTMQMP': ['qntmqmp', 'quinte'], 
  'LDO': ['ldo', 'l d o'],
};

// ============================================
// NORMALISATION DE TEXTE
// ============================================

/**
 * Normalise une chaîne pour la comparaison
 * - Minuscules
 * - Sans accents
 * - Sans ponctuation
 * - Trim espaces
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlève les accents
    .replace(/[^\w\s]/g, '') // Enlève la ponctuation
    .replace(/\s+/g, ' ') // Normalise les espaces multiples
    .trim();
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 * Nombre minimal de modifications (insertion, suppression, substitution)
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
          matrix[i - 1][j] + 1      // suppression
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calcule le ratio de similarité (0-1) entre deux chaînes
 */
export function similarityRatio(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(a, b);
  return (longer.length - distance) / longer.length;
}

// ============================================
// FUZZY MATCHING
// ============================================

export interface MatchResult {
  isValid: boolean;
  matchedAnswer: string | null;
  similarityScore: number;
  isAlias: boolean;
  canonicalName: string | null;
}

/**
 * Vérifie si une réponse correspond à une liste de réponses valides
 * avec tolérance pour les fautes de frappe et les alias
 */
export function fuzzyMatch(
  input: string,
  validAnswers: string[],
  aliases: Record<string, string[]> = {}
): MatchResult {
  const normalizedInput = normalizeText(input);
  
  if (!normalizedInput) {
    return { isValid: false, matchedAnswer: null, similarityScore: 0, isAlias: false, canonicalName: null };
  }
  
  // 1. Vérification exacte d'abord
  for (const answer of validAnswers) {
    const normalizedAnswer = normalizeText(answer);
    if (normalizedInput === normalizedAnswer) {
      return { 
        isValid: true, 
        matchedAnswer: answer, 
        similarityScore: 1, 
        isAlias: false, 
        canonicalName: answer 
      };
    }
  }
  
  // 2. Vérification des alias
  for (const [canonical, aliasList] of Object.entries(aliases)) {
    const normalizedCanonical = normalizeText(canonical);
    
    // Vérifie si l'input correspond au nom canonique
    if (normalizedInput === normalizedCanonical) {
      return { 
        isValid: true, 
        matchedAnswer: canonical, 
        similarityScore: 1, 
        isAlias: true, 
        canonicalName: canonical 
      };
    }
    
    // Vérifie les alias
    for (const alias of aliasList) {
      const normalizedAlias = normalizeText(alias);
      if (normalizedInput === normalizedAlias) {
        return { 
          isValid: true, 
          matchedAnswer: alias, 
          similarityScore: 1, 
          isAlias: true, 
          canonicalName: canonical 
        };
      }
    }
  }
  
  // 3. Vérification floue avec Levenshtein
  let bestMatch: { answer: string; score: number } | null = null;
  
  for (const answer of validAnswers) {
    const normalizedAnswer = normalizeText(answer);
    const distance = levenshteinDistance(normalizedInput, normalizedAnswer);
    const ratio = similarityRatio(normalizedInput, normalizedAnswer);
    
    // Distance acceptable OU ratio suffisant
    if (distance <= FUZZY.MAX_LEVENSHTEIN_DISTANCE || ratio >= FUZZY.MIN_SIMILARITY_RATIO) {
      if (!bestMatch || ratio > bestMatch.score) {
        bestMatch = { answer, score: ratio };
      }
    }
  }
  
  // Vérification floue des alias
  for (const [canonical, aliasList] of Object.entries(aliases)) {
    for (const alias of aliasList) {
      const normalizedAlias = normalizeText(alias);
      const distance = levenshteinDistance(normalizedInput, normalizedAlias);
      const ratio = similarityRatio(normalizedInput, normalizedAlias);
      
      if (distance <= FUZZY.MAX_LEVENSHTEIN_DISTANCE || ratio >= FUZZY.MIN_SIMILARITY_RATIO) {
        if (!bestMatch || ratio > bestMatch.score) {
          return { 
            isValid: true, 
            matchedAnswer: alias, 
            similarityScore: ratio, 
            isAlias: true, 
            canonicalName: canonical 
          };
        }
      }
    }
    
    // Vérifie aussi le nom canonique avec fuzzy
    const normalizedCanonical = normalizeText(canonical);
    const distance = levenshteinDistance(normalizedInput, normalizedCanonical);
    const ratio = similarityRatio(normalizedInput, normalizedCanonical);
    
    if (distance <= FUZZY.MAX_LEVENSHTEIN_DISTANCE || ratio >= FUZZY.MIN_SIMILARITY_RATIO) {
      if (!bestMatch || ratio > bestMatch.score) {
        return { 
          isValid: true, 
          matchedAnswer: canonical, 
          similarityScore: ratio, 
          isAlias: true, 
          canonicalName: canonical 
        };
      }
    }
  }
  
  if (bestMatch) {
    return { 
      isValid: true, 
      matchedAnswer: bestMatch.answer, 
      similarityScore: bestMatch.score, 
      isAlias: false, 
      canonicalName: bestMatch.answer 
    };
  }
  
  return { 
    isValid: false, 
    matchedAnswer: null, 
    similarityScore: 0, 
    isAlias: false, 
    canonicalName: null 
  };
}

/**
 * Résout un alias vers son nom canonique
 */
export function resolveAlias(input: string): string | null {
  const normalizedInput = normalizeText(input);
  
  const allAliases = { ...ARTIST_ALIASES, ...LABEL_ALIASES };
  
  for (const [canonical, aliases] of Object.entries(allAliases)) {
    if (normalizeText(canonical) === normalizedInput) return canonical;
    for (const alias of aliases) {
      if (normalizeText(alias) === normalizedInput) return canonical;
    }
  }
  
  return null;
}

// ============================================
// GÉNÉRATEURS
// ============================================

/**
 * Génère un code de room aléatoire (4 caractères alphanumériques)
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans I, O, 0, 1 pour éviter confusion
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Génère un ID unique
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// TEMPS & FORMATAGE
// ============================================

/**
 * Formate un temps en millisecondes en MM:SS.ms
 */
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

/**
 * Formate un temps en millisecondes en SS seulement
 */
export function formatTimeSeconds(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return seconds.toString();
}

// ============================================
// COULEURS & STYLES
// ============================================

export const TEAM_COLORS = {
  A: {
    primary: '#2EC4B6', // Teal
    secondary: '#249E92',
    accent: '#6FE6DA',
    dark: '#1E7B71',
  },
  B: {
    primary: '#F08C3A', // Burnt orange
    secondary: '#C6712B',
    accent: '#F6D069',
    dark: '#9E5A21',
  },
} as const;

/**
 * Retourne la couleur associée à une équipe
 */
export function getTeamColor(team: 'A' | 'B', shade: keyof typeof TEAM_COLORS['A'] = 'primary'): string {
  return TEAM_COLORS[team][shade];
}

// ============================================
// VALIDATIONS
// ============================================

/**
 * Vérifie si un nom de joueur est valide
 */
export function isValidPlayerName(name: string): boolean {
  return name.length >= 2 && name.length <= 20 && /^[\w\s\-_.]+$/.test(name);
}

/**
 * Vérifie si un code de room est valide
 */
export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{4}$/.test(code);
}

// ============================================
// CLASSEMENT & SCORES
// ============================================

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  correctAnswers: number;
  bestTime: number;
}

/**
 * Trie un classement par score décroissant
 */
export function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
    return a.bestTime - b.bestTime;
  });
}
