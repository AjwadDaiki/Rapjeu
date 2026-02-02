// @ts-nocheck
// ============================================
// SERVICE MYTHO / PAS MYTHO
// Source: JSON externe (edite par toi)
// ============================================

export type MythoDifficulty = 'easy' | 'medium' | 'hard';
export type MythoCategory = 'collab' | 'album' | 'popularite' | 'geo' | 'annee' | 'general';

export interface MythoAnecdote {
  id: string;
  statement: string;
  isTrue: boolean;
  explanation: string;
  difficulty: MythoDifficulty;
  category: MythoCategory;
}

type RawAnecdote = {
  id?: string;
  text?: string;
  statement?: string;
  isTrue?: boolean;
  difficulty?: string;
  category?: string;
  explanation?: string;
};

// ==========================================
// CHARGEMENT ANECDOTES DEPUIS JSON
// ==========================================

import anecdotesData from '../data/mytho-anecdotes.json';

function normalizeCategory(raw?: string): MythoCategory {
  if (!raw) return 'general';
  const normalized = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');

  if (normalized.startsWith('geo')) return 'geo';
  if (normalized.startsWith('collab') || normalized.startsWith('feat')) return 'collab';
  if (normalized.startsWith('album')) return 'album';
  if (normalized.startsWith('popularite') || normalized.startsWith('pop')) return 'popularite';
  if (normalized.startsWith('annee') || normalized.startsWith('year')) return 'annee';
  return 'general';
}

function normalizeDifficulty(raw?: string): MythoDifficulty {
  if (raw === 'easy' || raw === 'medium' || raw === 'hard') return raw;
  return 'medium';
}

const HARDCODED_ANECDOTES: MythoAnecdote[] = (anecdotesData?.anecdotes || [])
  .map((a: RawAnecdote, index: number) => {
    const statement = (a.statement || a.text || '').trim();
    if (!statement) return null;

    return {
      id: a.id || `anecdote_${index}`,
      statement,
      isTrue: !!a.isTrue,
      explanation: (a.explanation || '').trim(),
      difficulty: normalizeDifficulty(a.difficulty),
      category: normalizeCategory(a.category),
    } as MythoAnecdote;
  })
  .filter(Boolean) as MythoAnecdote[];

// ==========================================
// API PUBLIQUE
// ==========================================

/**
 * Obtenir un melange d'anecdotes depuis le JSON
 */
export function getRandomAnecdotes(count: number = 15): MythoAnecdote[] {
  if (!HARDCODED_ANECDOTES.length) {
    console.warn('[Mytho] JSON vide: ../data/mytho-anecdotes.json');
    return [];
  }
  const shuffled = [...HARDCODED_ANECDOTES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Validation de reponse (Vrai = true, Faux = false)
 */
export function validateMythoAnswer(anecdote: MythoAnecdote, userAnswer: boolean): boolean {
  return anecdote.isTrue === userAnswer;
}
