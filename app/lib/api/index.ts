// ============================================
// EXPORTS API - Point d'entrée unique
// ============================================

export * from './types';
export * as lastfm from './lastfm';
export * as spotify from './spotify';
export * as genius from './genius';
export * as discogs from './discogs';
export * as musicbrainz from './musicbrainz';

// Fonction utilitaire pour fallback intelligent
import { Track, Album } from './types';
import * as lastfmModule from './lastfm';
import * as spotifyModule from './spotify';
import * as discogsModule from './discogs';

export async function getBlindTestTracks(count = 10): Promise<Track[]> {
  // Priorité Spotify (meilleure qualité previews)
  if (spotifyModule.isSpotifyConfigured()) {
    try {
      return await spotifyModule.getRandomRapTracks(count);
    } catch (e) {
      console.warn('Spotify failed, falling back to Last.fm:', e);
    }
  }
  
  // Fallback Last.fm (pas de previews mais données structurées)
  // Note: Last.fm n'a pas de previews audio, il faudra un autre fallback
  try {
    return await lastfmModule.getRandomRapTracks(count);
  } catch (e) {
    console.warn('Last.fm failed:', e);
  }
  
  throw new Error('No API available for blind test tracks');
}

export async function getPixelCoverItems(count = 10): Promise<Album[]> {
  // Try Discogs first (HD covers)
  try {
    const albums = await discogsModule.getPixelCoverDataHD(count);
    if (albums.length > 0) {
      return albums.map(album => ({
        id: album.id.toString(),
        name: album.name,
        artistName: album.artistName,
        coverUrl: album.coverUrlHD || album.coverUrl,
        year: album.year,
      }));
    }
  } catch (e) {
    console.warn('Discogs failed, falling back to Spotify:', e);
  }

  // Fallback to Spotify
  if (spotifyModule.isSpotifyConfigured()) {
    try {
      return await spotifyModule.getRandomAlbumCovers(count);
    } catch (e) {
      console.warn('Spotify failed, falling back to Last.fm:', e);
    }
  }

  // Fallback to Last.fm
  try {
    return await lastfmModule.getRandomAlbumCovers(count);
  } catch (e) {
    console.warn('Last.fm failed:', e);
  }

  throw new Error('No API available for pixel cover items');
}
