// ============================================
// DISCOGS API CLIENT
// Pour covers HD, métadonnées albums, années de sortie
// Docs: https://www.discogs.com/developers
// ============================================

import axios from 'axios';

const DISCOGS_API_BASE = 'https://api.discogs.com';

function getDiscogsCredentials(): { key: string; secret: string } {
  const key = process.env.DISCOGS_CONSUMER_KEY || '';
  const secret = process.env.DISCOGS_CONSUMER_SECRET || '';
  if (!key || !secret) {
    throw new Error('Discogs credentials not configured');
  }
  return { key, secret };
}

interface DiscogsRelease {
  id: number;
  title: string;
  year: number;
  thumb: string;
  cover_image: string;
  resource_url: string;
  artists: Array<{
    name: string;
    id: number;
  }>;
  formats: Array<{
    name: string;
    qty: string;
  }>;
  genres: string[];
  styles: string[];
}

interface DiscogsSearchResult {
  results: Array<{
    id: number;
    title: string;
    year: string;
    thumb: string;
    cover_image: string;
    type: string;
  }>;
}

interface AlbumDetails {
  id: number;
  name: string;
  artistName: string;
  year: number;
  coverUrl: string;
  coverUrlHD: string;
  genres: string[];
  styles: string[];
}

// Cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 heure

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

async function discogsRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
  try {
    const { key, secret } = getDiscogsCredentials();
    const response = await axios.get(`${DISCOGS_API_BASE}${endpoint}`, {
      params: {
        ...params,
        key,
        secret,
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'RapBattleGame/1.0',
      },
    });

    return response.data;
  } catch (error) {
    console.error(`Discogs API error on ${endpoint}:`, error);
    throw error;
  }
}

// ==========================================
// SEARCH
// ==========================================

export async function searchAlbum(query: string, artist?: string): Promise<DiscogsRelease[]> {
  const cacheKey = `search:${query}:${artist || ''}`;
  const cached = getCached<DiscogsRelease[]>(cacheKey);
  if (cached) return cached;

  try {
    const searchQuery = artist ? `${artist} ${query}` : query;
    const data = await discogsRequest<DiscogsSearchResult>('/database/search', {
      q: searchQuery,
      type: 'release',
      format: 'album',
      genre: 'Hip Hop',
      per_page: 10,
    });

    const releases: DiscogsRelease[] = [];

    // Fetch details for each result to get full info
    for (const result of data.results.slice(0, 5)) {
      try {
        const release = await getRelease(result.id);
        if (release) releases.push(release);
      } catch (e) {
        console.warn(`Failed to fetch release ${result.id}:`, e);
      }
    }

    setCache(cacheKey, releases);
    return releases;
  } catch (error) {
    console.error('Search album error:', error);
    return [];
  }
}

export async function getRelease(releaseId: number): Promise<DiscogsRelease | null> {
  const cacheKey = `release:${releaseId}`;
  const cached = getCached<DiscogsRelease>(cacheKey);
  if (cached) return cached;

  try {
    const release = await discogsRequest<DiscogsRelease>(`/releases/${releaseId}`);
    setCache(cacheKey, release);
    return release;
  } catch (error) {
    console.error('Get release error:', error);
    return null;
  }
}

// ==========================================
// RANDOM DATA GENERATION
// ==========================================

/**
 * Get random rap albums for Pixel Cover mode
 */
export async function getRandomRapAlbums(count: number = 50): Promise<AlbumDetails[]> {
  const rapArtists = [
    'Booba', 'PNL', 'Ninho', 'Damso', 'Orelsan', 'Kaaris', 'SCH',
    'Niska', 'Jul', 'Nekfeu', 'Freeze Corleone', 'Gazo', 'Lacrim',
    'Soprano', 'Maitre Gims', 'Vald', 'Laylow', 'Rim\'K', 'Soolking',
    'Kendrick Lamar', 'Drake', 'J. Cole', 'Travis Scott', 'Kanye West',
    'Jay-Z', 'Eminem', 'Nas', '50 Cent', 'Lil Wayne', 'Future',
  ];

  const albums: AlbumDetails[] = [];

  // Search for albums from each artist
  for (const artist of rapArtists.slice(0, count / 2)) {
    try {
      const results = await searchAlbum('', artist);

      for (const release of results.slice(0, 2)) {
        albums.push({
          id: release.id,
          name: release.title,
          artistName: release.artists[0]?.name || artist,
          year: release.year,
          coverUrl: release.thumb,
          coverUrlHD: release.cover_image,
          genres: release.genres || [],
          styles: release.styles || [],
        });

        if (albums.length >= count) break;
      }

      if (albums.length >= count) break;
    } catch (e) {
      console.warn(`Failed to fetch albums for ${artist}:`, e);
    }
  }

  return albums;
}

/**
 * Get album cover URL (HD version)
 */
export async function getAlbumCover(albumName: string, artistName: string): Promise<string | null> {
  try {
    const results = await searchAlbum(albumName, artistName);
    if (results.length === 0) return null;

    return results[0].cover_image || results[0].thumb || null;
  } catch (error) {
    console.error('Get album cover error:', error);
    return null;
  }
}

/**
 * Get album release year
 */
export async function getAlbumYear(albumName: string, artistName: string): Promise<number | null> {
  try {
    const results = await searchAlbum(albumName, artistName);
    if (results.length === 0) return null;

    return results[0].year || null;
  } catch (error) {
    console.error('Get album year error:', error);
    return null;
  }
}

// ==========================================
// GAME MODE DATA GENERATORS
// ==========================================

/**
 * Generate data for "Devine l'année" mode
 */
export interface GuessTheYearQuestion {
  albumName: string;
  artistName: string;
  coverUrl: string;
  year: number;
  albumId: number;
}

export async function getGuessTheYearData(count: number = 5): Promise<GuessTheYearQuestion[]> {
  const albums = await getRandomRapAlbums(count);

  return albums.map(album => ({
    albumName: album.name,
    artistName: album.artistName,
    coverUrl: album.coverUrlHD || album.coverUrl,
    year: album.year,
    albumId: album.id,
  }));
}

/**
 * Generate HD covers for Pixel Cover mode (upgrade from Spotify)
 */
export async function getPixelCoverDataHD(count: number = 50): Promise<AlbumDetails[]> {
  return getRandomRapAlbums(count);
}

// ==========================================
// STATUS
// ==========================================

export function getDiscogsStatus(): { configured: boolean; cacheSize: number } {
  const key = process.env.DISCOGS_CONSUMER_KEY || '';
  const secret = process.env.DISCOGS_CONSUMER_SECRET || '';
  return {
    configured: !!(key && secret),
    cacheSize: cache.size,
  };
}
