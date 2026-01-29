// ============================================
// LAST.FM API INTEGRATION
// ============================================

import { Track, Artist, Album } from './types';

const BASE_URL = 'https://ws.audioscrobbler.com/2.0';

// Cache simple en mémoire (30 minutes)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

function getApiKey(): string {
  const key = process.env.LASTFM_API_KEY;
  if (!key) {
    throw new Error('LASTFM_API_KEY not configured');
  }
  return key;
}

async function fetchLastFM(params: Record<string, string>): Promise<unknown> {
  const apiKey = getApiKey();

  const cacheKey = JSON.stringify(params);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const url = new URL(BASE_URL);
  url.searchParams.append('api_key', apiKey);
  url.searchParams.append('format', 'json');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Last.fm error: ${data.message}`);
  }

  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

// ============================================
// ARTISTES
// ============================================

export async function searchArtists(query: string, limit = 10): Promise<Artist[]> {
  const data = await fetchLastFM({
    method: 'artist.search',
    artist: query,
    limit: limit.toString(),
  });

  const artists = (data as { results?: { artistmatches?: { artist?: Array<{ name: string; listeners?: string; image?: Array<{ '#text': string; size: string }> }> } } }).results?.artistmatches?.artist || [];
  
  return artists.map((a): Artist => ({
    id: a.name.toLowerCase().replace(/\s+/g, '_'),
    name: a.name,
    imageUrl: a.image?.find(i => i.size === 'large')?.['#text'] || null,
    genres: [],
    listeners: parseInt(a.listeners || '0', 10),
  }));
}

export async function getArtistInfo(name: string): Promise<Artist> {
  const data = await fetchLastFM({
    method: 'artist.getinfo',
    artist: name,
  });

  const artist = (data as { artist?: { name: string; bio?: { content?: string }; tags?: { tag?: Array<{ name: string }> }; image?: Array<{ '#text': string; size: string }>; stats?: { listeners?: string; playcount?: string } } }).artist;
  
  if (!artist) {
    throw new Error(`Artist not found: ${name}`);
  }

  return {
    id: artist.name.toLowerCase().replace(/\s+/g, '_'),
    name: artist.name,
    imageUrl: artist.image?.find(i => i.size === 'extralarge')?.['#text'] || null,
    genres: artist.tags?.tag?.map(t => t.name) || [],
    bio: artist.bio?.content?.split('.')[0] + '.', // Première phrase
    listeners: parseInt(artist.stats?.listeners || '0', 10),
    playcount: parseInt(artist.stats?.playcount || '0', 10),
  };
}

// ============================================
// TOP TRACKS (Pour Blind Test)
// ============================================

export async function getArtistTopTracks(artist: string, limit = 10): Promise<Track[]> {
  const data = await fetchLastFM({
    method: 'artist.gettoptracks',
    artist,
    limit: limit.toString(),
  });

  const tracks = (data as { toptracks?: { track?: Array<{ name: string; playcount?: string; listeners?: string }> } }).toptracks?.track || [];
  
  return tracks.map((t): Track => ({
    id: `${artist.toLowerCase().replace(/\s+/g, '_')}_${t.name.toLowerCase().replace(/\s+/g, '_')}`,
    name: t.name,
    artistName: artist,
    albumName: '', // Last.fm ne fournit pas l'album ici
    previewUrl: null, // Last.fm n'a pas de previews audio
    coverUrl: null, // Nécessite un appel supplémentaire
    duration: 0,
  }));
}

// ============================================
// TOP ALBUMS (Pour Pixel Cover)
// ============================================

export async function getArtistTopAlbums(artist: string, limit = 10): Promise<Album[]> {
  const data = await fetchLastFM({
    method: 'artist.gettopalbums',
    artist,
    limit: limit.toString(),
  });

  const albums = (data as { topalbums?: { album?: Array<{ name: string; playcount?: string; image?: Array<{ '#text': string; size: string }> }> } }).topalbums?.album || [];
  
  return albums.map((a): Album => ({
    id: a.name.toLowerCase().replace(/\s+/g, '_'),
    name: a.name,
    artistName: artist,
    coverUrl: a.image?.find(i => i.size === 'extralarge')?.['#text'] || null,
  }));
}

// ============================================
// RAP FRançAIS - Playlists préconfigurées
// ============================================

const RAP_FR_ARTISTS = [
  'Booba', 'Kaaris', 'Ninho', 'Jul', 'Damso', 'PNL', 'SCH',
  'Orelsan', 'Vald', 'Freeze Corleone', 'Gazo', 'Tiakola',
  'Niska', 'Soprano', 'Lacrim', 'Rohff', 'Maitre Gims',
  'Gradur', 'Keblack', 'Naps', 'Sadek', 'Laylow', 'Lomepal',
];

export async function getRandomRapTracks(count = 10): Promise<Track[]> {
  const allTracks: Track[] = [];
  
  // Sélection aléatoire d'artistes
  const shuffled = [...RAP_FR_ARTISTS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  
  for (const artist of selected) {
    try {
      const tracks = await getArtistTopTracks(artist, 3);
      // Prendre le top track de chaque artiste
      if (tracks.length > 0) {
        allTracks.push({ ...tracks[0], artistName: artist });
      }
    } catch (e) {
      console.warn(`Failed to fetch tracks for ${artist}:`, e);
    }
  }
  
  return allTracks.slice(0, count);
}

export async function getRandomAlbumCovers(count = 10): Promise<Album[]> {
  const allAlbums: Album[] = [];
  
  const shuffled = [...RAP_FR_ARTISTS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  
  for (const artist of selected) {
    try {
      const albums = await getArtistTopAlbums(artist, 2);
      if (albums.length > 0) {
        allAlbums.push({ ...albums[0], artistName: artist });
      }
    } catch (e) {
      console.warn(`Failed to fetch albums for ${artist}:`, e);
    }
  }
  
  return allAlbums.slice(0, count);
}
