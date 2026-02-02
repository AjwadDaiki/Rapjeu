// ============================================
// GENIUS API CLIENT
// Pour lyrics, punchlines et annotations
// Docs: https://docs.genius.com
// ============================================

import axios from 'axios';
import fs from 'fs';
import path from 'path';

const GENIUS_API_BASE = 'https://api.genius.com';

function getGeniusToken(): string {
  const token = process.env.GENIUS_ACCESS_TOKEN;
  if (!token) {
    throw new Error('GENIUS_ACCESS_TOKEN not configured');
  }
  return token;
}

interface GeniusSong {
  id: number;
  title: string;
  artist_names: string;
  primary_artist: {
    name: string;
  };
  url: string;
  lyrics_state: string;
}

interface LyricsSnippet {
  text: string;
  artist: string;
  title: string;
  songId: number;
  missingWord?: string; // Pour le mode "Complète les paroles"
}


const LOCAL_LYRICS_PATH = path.join(process.cwd(), 'app', 'data', 'continue_paroles.json');
let localLyricsCache: LyricsSnippet[] | null = null;
let localLyricsLoaded = false;

function loadLocalLyricsSnippets(): LyricsSnippet[] | null {
  if (localLyricsLoaded) return localLyricsCache;
  localLyricsLoaded = true;

  try {
    if (!fs.existsSync(LOCAL_LYRICS_PATH)) {
      localLyricsCache = null;
      return null;
    }

    const raw = fs.readFileSync(LOCAL_LYRICS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localLyricsCache = null;
      return null;
    }

    const normalized: LyricsSnippet[] = parsed
      .map((item: any) => {
        const text = typeof item?.text === 'string' ? item.text : (typeof item?.prompt === 'string' ? item.prompt : null);
        const missingWord = typeof item?.missingWord === 'string' ? item.missingWord : (typeof item?.answer === 'string' ? item.answer : null);
        const artist = typeof item?.artist === 'string' ? item.artist : (typeof item?.artistName === 'string' ? item.artistName : null);
        const title = typeof item?.title === 'string' ? item.title : (typeof item?.trackTitle === 'string' ? item.trackTitle : null);
        if (!text || !missingWord || !artist || !title) return null;
        return {
          text,
          artist,
          title,
          songId: typeof item?.songId === 'number' ? item.songId : 0,
          missingWord,
        } as LyricsSnippet;
      })
      .filter(Boolean) as LyricsSnippet[];

    localLyricsCache = normalized.length > 0 ? normalized : null;
    return localLyricsCache;
  } catch (error) {
    console.warn('Local continue_paroles.json invalide ou illisible:', error);
    localLyricsCache = null;
    return null;
  }
}interface Punchline {
  text: string;
  artist: string;
  title: string;
  year?: number;
}

// Cache simple
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ==========================================
// HELPERS
// ==========================================

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return cached.data as T;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

async function geniusRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
  try {
    const token = getGeniusToken();
    const response = await axios.get(`${GENIUS_API_BASE}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params,
      timeout: 10000,
    });

    return response.data.response;
  } catch (error) {
    console.error(`Genius API error on ${endpoint}:`, error);
    throw error;
  }
}

// ==========================================
// SEARCH
// ==========================================

export async function searchSong(query: string): Promise<GeniusSong | null> {
  const cacheKey = `search:${query}`;
  const cached = getCached<GeniusSong>(cacheKey);
  if (cached) return cached;

  try {
    const data = await geniusRequest<{ hits: Array<{ result: GeniusSong }> }>('/search', { q: query });

    if (!data.hits || data.hits.length === 0) {
      return null;
    }

    const song = data.hits[0].result;
    setCache(cacheKey, song);
    return song;
  } catch (error) {
    console.error('Search song error:', error);
    return null;
  }
}

export async function getSongById(songId: number): Promise<GeniusSong | null> {
  const cacheKey = `song:${songId}`;
  const cached = getCached<GeniusSong>(cacheKey);
  if (cached) return cached;

  try {
    const data = await geniusRequest<{ song: GeniusSong }>(`/songs/${songId}`);
    setCache(cacheKey, data.song);
    return data.song;
  } catch (error) {
    console.error('Get song error:', error);
    return null;
  }
}

// ==========================================
// LYRICS (Scraping required - Genius API doesn't provide lyrics directly)
// ==========================================

/**
 * NOTE: Genius API doesn't provide lyrics directly.
 * This would require web scraping from genius.com
 * For now, we'll use a fallback with hardcoded popular rap lyrics
 */
export async function getLyrics(songId: number): Promise<string | null> {
  // TODO: Implement web scraping or use a third-party lyrics API
  // For example: https://github.com/akashrchandran/spotify-lyrics-api
  console.warn('getLyrics not fully implemented - requires web scraping');
  return null;
}

// ==========================================
// RANDOM DATA GENERATION (For game modes)
// ==========================================

/**
 * Get random rap lyrics snippets (hardcoded popular lines for now)
 */
export async function getRandomRapLyrics(count: number = 10): Promise<LyricsSnippet[]> {
  const local = loadLocalLyricsSnippets();
  if (local && local.length > 0) {
    const shuffled = [...local].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  // Fallback data until proper scraping is implemented
  const hardcodedLyrics: LyricsSnippet[] = [
    { text: "J'arrive dans le game comme un ___ au Bataclan", artist: "Booba", title: "DKR", songId: 0, missingWord: "missile" },
    { text: "Ils m'appellent Orel, ___ dans la ville", artist: "Orelsan", title: "Basique", songId: 0, missingWord: "phénoménal" },
    { text: "On est ___ du quartier, pas des animaux", artist: "PNL", title: "Au DD", songId: 0, missingWord: "rescapés" },
    { text: "J'ai grandi dans la ___, maintenant j'compte mes Euros", artist: "Ninho", title: "Lettre à une femme", songId: 0, missingWord: "hess" },
    { text: "La vie de ma mère j'suis dans le ___, demande à Kaaris", artist: "Damso", title: "Macarena", songId: 0, missingWord: "tieks" },
    { text: "Toute ma vie j'ai ___ que j'aurai pas vingt ans", artist: "Nekfeu", title: "Écrire", songId: 0, missingWord: "cru" },
    { text: "J'suis qu'un ___ qui fait d'la musique", artist: "SCH", title: "Otto", songId: 0, missingWord: "voyou" },
    { text: "Ils veulent me test, j'fais des ___ en Vespa", artist: "Niska", title: "Réseaux", songId: 0, missingWord: "wheelings" },
    { text: "J'ai trop donné, maintenant j'vais ___", artist: "Freeze Corleone", title: "Drill FR 4", songId: 0, missingWord: "prendre" },
    { text: "On vit la ___ dans un film de Tarantino", artist: "Kaaris", title: "Chargé", songId: 0, missingWord: "mala" },
  ];

  // Shuffle and return requested count
  const shuffled = [...hardcodedLyrics].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get random punchlines (famous rap quotes)
 */
export async function getRandomPunchlines(count: number = 10): Promise<Punchline[]> {
  const hardcodedPunchlines: Punchline[] = [
    { text: "J'arrive dans le game comme un missile au Bataclan", artist: "Booba", title: "DKR", year: 2016 },
    { text: "Ils m'appellent Orel, phénoménal dans la ville", artist: "Orelsan", title: "Basique", year: 2017 },
    { text: "J'viens du tieks où ça brise", artist: "Ninho", title: "Mamacita", year: 2019 },
    { text: "Igo j'suis Parisien donc mon flow est parisien", artist: "PNL", title: "Naha", year: 2016 },
    { text: "La vie de ma mère j'suis dans le tieks, demande à Kaaris", artist: "Damso", title: "Macarena", year: 2018 },
    { text: "J'ai trop donné, maintenant j'vais prendre", artist: "Freeze Corleone", title: "Drill FR 4", year: 2020 },
    { text: "Ils veulent me test, j'fais des wheelings en Vespa", artist: "Niska", title: "Réseaux", year: 2017 },
    { text: "On vit la mala dans un film de Tarantino", artist: "Kaaris", title: "Chargé", year: 2013 },
    { text: "J'suis qu'un voyou qui fait d'la musique", artist: "SCH", title: "Otto", year: 2019 },
    { text: "Toute ma vie j'ai cru que j'aurai pas vingt ans", artist: "Nekfeu", title: "Écrire", year: 2015 },
    { text: "J'rappe pour mes potos qui bicravent", artist: "Jul", title: "Ma jolie", year: 2016 },
    { text: "Banlieusard dans la peau, jamais j'changerai", artist: "Soprano", title: "Fragile", year: 2007 },
    { text: "J'suis un patron, toi t'es qu'un stagiaire", artist: "Lacrim", title: "Parloir", year: 2015 },
    { text: "Au quartier j'suis connu comme Alibaba", artist: "Soolking", title: "Dalida", year: 2018 },
    { text: "Ils veulent nous dead, nous on veut des dineros", artist: "Gazo", title: "MOLLY", year: 2021 },
  ];

  const shuffled = [...hardcodedPunchlines].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get rap artists for searchartist-based queries
 */
export async function searchRapArtists(query: string): Promise<string[]> {
  try {
    const data = await geniusRequest<{ hits: Array<{ result: GeniusSong }> }>('/search', {
      q: query,
      per_page: 10,
    });

    const artists = data.hits
      .map(hit => hit.result.primary_artist.name)
      .filter((name, index, self) => self.indexOf(name) === index); // Unique

    return artists;
  } catch (error) {
    console.error('Search artists error:', error);
    return [];
  }
}

// ==========================================
// GAME MODE DATA GENERATORS
// ==========================================

/**
 * Generate data for "Complète les paroles" mode
 */
export async function getCompleteTheLyricsData(count: number = 5): Promise<LyricsSnippet[]> {
  return getRandomRapLyrics(count);
}

/**
 * Generate data for "Qui a dit ça ?" mode
 */
export interface WhoSaidItQuestion {
  punchline: string;
  correctArtist: string;
  wrongArtists: string[];
  title: string;
}

export async function getWhoSaidItData(count: number = 5): Promise<WhoSaidItQuestion[]> {
  const punchlines = await getRandomPunchlines(count * 2);
  const questions: WhoSaidItQuestion[] = [];

  for (let i = 0; i < Math.min(count, punchlines.length); i++) {
    const correct = punchlines[i];
    const wrongOptions = punchlines
      .filter(p => p.artist !== correct.artist)
      .map(p => p.artist)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    questions.push({
      punchline: correct.text,
      correctArtist: correct.artist,
      wrongArtists: wrongOptions,
      title: correct.title,
    });
  }

  return questions;
}

// ==========================================
// STATUS
// ==========================================

export function getGeniusStatus(): { configured: boolean; cacheSize: number } {
  return {
    configured: !!process.env.GENIUS_ACCESS_TOKEN,
    cacheSize: cache.size,
  };
}

