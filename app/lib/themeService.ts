// @ts-nocheck
// ============================================
// THEME SERVICE
// Selection et validation des themes de jeu
// ============================================

import { Theme } from '../types';
import { ALL_THEMES, selectRandomTheme } from './themes';
import { ALL_EXTRA_THEMES } from './themeService-extra';
import { getDb } from './mongoService';
import { validateArtistName, validateTrackName } from './nameValidator';

// ==========================================
// TYPES
// ==========================================

interface ThemeWithAnswers {
  id: string;
  title: string;
  description?: string;
  validAnswers: string[];
  aliases: Record<string, string[]>;
  difficulty: string;
  points: number;
  source?: 'artists' | 'albums' | 'tracks' | 'collaborations';
}

interface ValidationResult {
  isValid: boolean;
  matchedAnswer?: string;
  matchType?: 'exact' | 'normalized' | 'alias' | 'compact' | 'fuzzy';
}

// ==========================================
// MAIN
// ==========================================

/**
 * Selectionne N themes aleatoires et resolve les reponses valides via MongoDB
 */
export async function getRandomThemes(count: number): Promise<ThemeWithAnswers[]> {
  const db = await getDb();

  const results: ThemeWithAnswers[] = [];
  const usedIds = new Set<string>();
  const invalidIds = new Set<string>();
  let attempts = 0;
  const maxAttempts = Math.max(20, count * 12);

  while (results.length < count && attempts < maxAttempts) {
    attempts++;
    const useExtra = Math.random() < 0.45 && ALL_EXTRA_THEMES.length > 0;

    if (useExtra) {
      const extra = ALL_EXTRA_THEMES[Math.floor(Math.random() * ALL_EXTRA_THEMES.length)];
      if (usedIds.has(extra.id) || invalidIds.has(extra.id)) continue;
      const generated = await extra.generate(db);
      const validAnswers = (generated?.validAnswers || []).filter(Boolean);
      if (!validAnswers.length) {
        invalidIds.add(extra.id);
        continue;
      }

      usedIds.add(extra.id);
      const inferredSource = (generated as any).source
        || (generated.id?.startsWith('albums_') ? 'albums'
          : generated.id?.startsWith('tracks_') ? 'tracks'
          : 'artists');
      const aliases = (generated as any).aliases || {};

      results.push({
        id: generated.id,
        title: generated.title,
        description: generated.description,
        validAnswers,
        aliases,
        difficulty: generated.difficulty,
        points: generated.points,
        source: inferredSource,
      });
      continue;
    }

    let theme = selectRandomTheme();
    let selectAttempts = 0;
    while ((usedIds.has(theme.id) || invalidIds.has(theme.id)) && selectAttempts < 20) {
      theme = selectRandomTheme();
      selectAttempts++;
    }
    if (usedIds.has(theme.id) || invalidIds.has(theme.id)) continue;

    const source = (theme as any).source || 'artists';
    const limit = (theme as any).limit || null;

    if (source === 'albums') {
      const cursor = db.collection('albums')
        .find(theme.mongoQuery || {})
        .project({ title: 1 });
      if (limit) cursor.limit(limit);
      const albums = await cursor.toArray();

      const validAnswers = Array.from(
        new Set(albums.filter(a => a.title && a.title.length <= 28).map(a => a.title))
      ).filter(Boolean);
      if (!validAnswers.length) {
        invalidIds.add(theme.id);
        continue;
      }
      usedIds.add(theme.id);
      results.push({
        id: theme.id,
        title: theme.title,
        description: theme.description,
        validAnswers,
        aliases: {},
        difficulty: theme.difficulty,
        points: theme.difficulty === 'hard' ? 15 : theme.difficulty === 'medium' ? 10 : 5,
        source: 'albums',
      });
      continue;
    }

    if (source === 'tracks') {
      const cursor = db.collection('tracks')
        .find(theme.mongoQuery || {})
        .project({ title: 1, popularity: 1 });
      if (limit) cursor.limit(limit);
      const tracks = await cursor.toArray();

      const sorted = tracks
        .filter(t => t.title && t.title.length <= 28)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      const trimmed = sorted.slice(0, Math.min(300, sorted.length));
      const validAnswers = Array.from(new Set(trimmed.map(t => t.title))).filter(Boolean);
      if (!validAnswers.length) {
        invalidIds.add(theme.id);
        continue;
      }
      usedIds.add(theme.id);
      results.push({
        id: theme.id,
        title: theme.title,
        description: theme.description,
        validAnswers,
        aliases: {},
        difficulty: theme.difficulty,
        points: theme.difficulty === 'hard' ? 15 : theme.difficulty === 'medium' ? 10 : 5,
        source: 'tracks',
      });
      continue;
    }

    if (source === 'collaborations') {
      const collabArtist = (theme as any).collabArtist;
      if (!collabArtist) {
        invalidIds.add(theme.id);
        continue;
      }
      const cursor = db.collection('collaborations')
        .find({
          $or: [
            { artistAName: collabArtist },
            { artistBName: collabArtist },
          ],
        })
        .project({ artistAName: 1, artistBName: 1 });
      if (limit) cursor.limit(limit);
      const collabs = await cursor.toArray();

      const validAnswers = Array.from(new Set(
        collabs
          .map(c => (c.artistAName === collabArtist ? c.artistBName : c.artistAName))
          .filter(Boolean)
      ));
      if (!validAnswers.length) {
        invalidIds.add(theme.id);
        continue;
      }
      usedIds.add(theme.id);
      results.push({
        id: theme.id,
        title: theme.title,
        description: theme.description,
        validAnswers,
        aliases: {},
        difficulty: theme.difficulty,
        points: theme.difficulty === 'hard' ? 15 : theme.difficulty === 'medium' ? 10 : 5,
        source: 'collaborations',
      });
      continue;
    }

    // Default: artists
    const cursor = db.collection('artists')
      .find(theme.mongoQuery || {})
      .project({ name: 1, aliases: 1, normalizedName: 1, popularity: 1, monthlyListeners: 1, location: 1 });
    if (limit) cursor.limit(limit);
    const artists = await cursor.toArray();

    const scored = artists
      .filter(a => a.name)
      .map(a => ({
        ...a,
        score: (a.popularity || 0)
          + Math.min(50, Math.round((a.monthlyListeners || 0) / 1000000))
          + (a.location && (a.location.department || a.location.city || a.location.country) ? 8 : 0)
          + ((a.name || '').length <= 18 ? 4 : 0),
      }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    const trimmed = scored.slice(0, Math.min(300, scored.length));
    const validAnswers = Array.from(new Set(trimmed.map(a => a.name))).filter(Boolean);
    if (!validAnswers.length) {
      invalidIds.add(theme.id);
      continue;
    }
    const aliases: Record<string, string[]> = {};
    for (const artist of trimmed) {
      if (artist.aliases?.length > 0) {
        aliases[artist.name] = artist.aliases;
      }
    }

    usedIds.add(theme.id);
    results.push({
      id: theme.id,
      title: theme.title,
      description: theme.description,
      validAnswers,
      aliases,
      difficulty: theme.difficulty,
      points: theme.difficulty === 'hard' ? 15 : theme.difficulty === 'medium' ? 10 : 5,
      source: 'artists',
    });
    continue;
  }

  return results;
}

/**
 * Valide une reponse pour un theme donne
 */
export function validateThemeAnswer(
  theme: { validAnswers: string[]; aliases?: Record<string, string[]>; source?: string },
  answer: string
): ValidationResult {
  if (!answer || !answer.trim()) {
    return { isValid: false };
  }

  const source = theme.source || 'artists';

  if (source === 'albums' || source === 'tracks') {
    for (const title of theme.validAnswers) {
      if (validateTrackName(answer, title)) {
        return {
          isValid: true,
          matchedAnswer: title,
          matchType: 'normalized',
        };
      }
    }
    return { isValid: false };
  }

  const artistList = theme.validAnswers.map(name => ({
    name,
    normalizedName: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    aliases: theme.aliases?.[name] || [],
  }));

  for (const artist of artistList) {
    const match = validateArtistName(answer, artist);
    if (match.valid) {
      return {
        isValid: true,
        matchedAnswer: artist.name,
        matchType: match.matchType,
      };
    }
  }

  return { isValid: false };
}
