// ============================================
// EXPORTS API - Point d'entrée unique
// ============================================

export * from './types';
export * as lastfm from './lastfm';
export * as spotify from './spotify';

// Fonction utilitaire pour fallback intelligent
import { Track, Album } from './types';
import * as lastfmModule from './lastfm';
import * as spotifyModule from './spotify';

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
  if (spotifyModule.isSpotifyConfigured()) {
    try {
      return await spotifyModule.getRandomAlbumCovers(count);
    } catch (e) {
      console.warn('Spotify failed, falling back to Last.fm:', e);
    }
  }
  
  try {
    return await lastfmModule.getRandomAlbumCovers(count);
  } catch (e) {
    console.warn('Last.fm failed:', e);
  }
  
  throw new Error('No API available for pixel cover items');
}
