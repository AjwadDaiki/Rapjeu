// ============================================
// SPOTIFY WEB API INTEGRATION
// ============================================

import { Track, Artist, Album } from './types';

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }
  return { clientId, clientSecret };
}

let accessToken: string | null = null;
let tokenExpiresAt = 0;

// Cache
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

// ============================================
// AUTHENTIFICATION (Client Credentials)
// ============================================

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  const { clientId, clientSecret } = getCredentials();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify access token');
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000; // 1 min marge
  
  return accessToken;
}

async function fetchSpotify(endpoint: string): Promise<unknown> {
  const cacheKey = endpoint;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const token = await getAccessToken();
  
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Spotify rate limit exceeded');
    }
    throw new Error(`Spotify API error: ${response.status}`);
  }

  const data = await response.json();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

// ============================================
// SEARCH
// ============================================

export async function searchTracks(query: string, limit = 10): Promise<Track[]> {
  const data = await fetchSpotify(`/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`);
  const tracks = (data as { tracks?: { items?: Array<{ id: string; name: string; artists: Array<{ name: string }>; album: { name: string; images: Array<{ url: string }> }; preview_url: string | null; duration_ms: number }> } }).tracks?.items || [];
  
  return tracks.map((t): Track => ({
    id: t.id,
    name: t.name,
    artistName: t.artists[0]?.name || 'Unknown',
    albumName: t.album.name,
    previewUrl: t.preview_url,
    coverUrl: t.album.images[0]?.url || null,
    duration: t.duration_ms,
  }));
}

export async function searchArtists(query: string, limit = 10): Promise<Artist[]> {
  const data = await fetchSpotify(`/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`);
  const artists = (data as { artists?: { items?: Array<{ id: string; name: string; images: Array<{ url: string }>; genres: string[] }> } }).artists?.items || [];
  
  return artists.map((a): Artist => ({
    id: a.id,
    name: a.name,
    imageUrl: a.images[0]?.url || null,
    genres: a.genres,
  }));
}

// ============================================
// ARTIST TOP TRACKS (Blind Test)
// ============================================

export async function getArtistTopTracks(artistId: string, country = 'FR'): Promise<Track[]> {
  const data = await fetchSpotify(`/artists/${artistId}/top-tracks?market=${country}`);
  const tracks = (data as { tracks?: Array<{ id: string; name: string; artists: Array<{ name: string }>; album: { name: string; images: Array<{ url: string }> }; preview_url: string | null; duration_ms: number }> }).tracks || [];
  
  return tracks.map((t): Track => ({
    id: t.id,
    name: t.name,
    artistName: t.artists[0]?.name || 'Unknown',
    albumName: t.album.name,
    previewUrl: t.preview_url,
    coverUrl: t.album.images[0]?.url || null,
    duration: t.duration_ms,
  }));
}

// ============================================
// ARTIST ALBUMS (Pixel Cover)
// ============================================

export async function getArtistAlbums(artistId: string, limit = 10): Promise<Album[]> {
  const data = await fetchSpotify(`/artists/${artistId}/albums?include_groups=album&limit=${limit}`);
  const albums = (data as { items?: Array<{ id: string; name: string; artists: Array<{ name: string }>; images: Array<{ url: string }>; release_date: string }> }).items || [];
  
  return albums.map((a): Album => ({
    id: a.id,
    name: a.name,
    artistName: a.artists[0]?.name || 'Unknown',
    coverUrl: a.images[0]?.url || null,
    year: parseInt(a.release_date?.split('-')[0] || '0', 10),
  }));
}

// ============================================
// RAP FRANÇAIS PRÉCONFIGURÉ
// ============================================

// Noms des artistes rap FR pour recherche
const RAP_FR_ARTISTS = [
  'Booba', 'Kaaris', 'Ninho', 'Jul', 'Damso', 'PNL', 'SCH',
  'Orelsan', 'Vald', 'Freeze Corleone', 'Gazo', 'Tiakola',
  'Niska', 'Soprano', 'Lacrim', 'Rohff', 'Maître Gims',
  'Gradur', 'Keblack', 'Naps', 'Sadek', 'Laylow', 'Lomepal',
];

export async function getRandomRapTracks(count = 10): Promise<Track[]> {
  const allTracks: Track[] = [];
  
  // Sélection aléatoire d'artistes
  const shuffled = [...RAP_FR_ARTISTS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  
  for (const artistName of selected) {
    try {
      // Rechercher l'artiste
      const artists = await searchArtists(artistName, 1);
      if (artists.length === 0) continue;
      
      // Récupérer ses top tracks
      const tracks = await getArtistTopTracks(artists[0].id);
      if (tracks.length > 0) {
        allTracks.push(tracks[0]); // Prendre le top track
      }
    } catch (e) {
      console.warn(`Failed to fetch tracks for ${artistName}:`, e);
    }
  }
  
  return allTracks.slice(0, count);
}

export async function getRandomAlbumCovers(count = 10): Promise<Album[]> {
  const allAlbums: Album[] = [];
  
  const shuffled = [...RAP_FR_ARTISTS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  
  for (const artistName of selected) {
    try {
      // Rechercher l'artiste
      const artists = await searchArtists(artistName, 1);
      if (artists.length === 0) continue;
      
      // Récupérer ses albums
      const albums = await getArtistAlbums(artists[0].id, 3);
      if (albums.length > 0) {
        allAlbums.push(albums[0]); // Prendre le premier album
      }
    } catch (e) {
      console.warn(`Failed to fetch albums for ${artistName}:`, e);
    }
  }
  
  return allAlbums.slice(0, count);
}

// ============================================
// UTILITAIRE : Vérifier si Spotify est configuré
// ============================================

export function isSpotifyConfigured(): boolean {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}
