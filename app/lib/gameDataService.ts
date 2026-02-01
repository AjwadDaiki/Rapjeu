// ============================================
// GAME DATA SERVICE
// Utilise MongoDB pour récupérer les données
// ============================================

import { Track, Album } from './api/types';
import * as mongo from './mongoService';

// Pools de données en cache (optionnel, pour performance)
let blindTestPool: Track[] = [];
let pixelCoverPool: Album[] = [];
let lastFetchTime = 0;
const POOL_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 heure
const MONGO_POOL_LIMIT = Number.parseInt(process.env.MONGO_POOL_LIMIT || '0', 10);
const MONGO_POOL_SIZE = Number.isFinite(MONGO_POOL_LIMIT) ? MONGO_POOL_LIMIT : 0;

// ============================================
// PRÉCHARGEMENT (optionnel)
// ============================================

export async function preloadGameData(): Promise<void> {
  const now = Date.now();
  if (now - lastFetchTime < POOL_REFRESH_INTERVAL && blindTestPool.length > 0) {
    return; // Cache encore valide
  }

  console.log('🎵 Préchargement des données MongoDB...');

  // Blind Test tracks
  try {
    const mongoTracks = await mongo.getRandomTracks(MONGO_POOL_SIZE);
    blindTestPool = mongoTracks.map(t => ({
      id: t.spotifyId,
      name: t.title,
      artistName: t.artistName,
      albumName: t.albumName,
      previewUrl: t.previewUrl || null,
      coverUrl: null,
      duration: t.durationMs,
    }));
    console.log(`✅ ${blindTestPool.length} tracks préchargés depuis MongoDB`);
  } catch (e) {
    console.error('❌ Erreur préchargement tracks MongoDB:', e);
    blindTestPool = getFallbackTracks();
  }

  // Pixel Cover albums
  try {
    const mongoAlbums = await mongo.getRandomAlbums(MONGO_POOL_SIZE);
    pixelCoverPool = mongoAlbums.map(a => ({
      id: a.spotifyId,
      name: a.title,
      artistName: a.artistName,
      coverUrl: a.coverUrl || null,
      year: a.year,
    }));
    console.log(`✅ ${pixelCoverPool.length} albums préchargés depuis MongoDB`);
  } catch (e) {
    console.error('❌ Erreur préchargement albums MongoDB:', e);
    pixelCoverPool = getFallbackAlbums();
  }

  lastFetchTime = now;
}

// ============================================
// RÉCUPÉRATION
// ============================================

export async function getRandomTracks(count: number): Promise<Track[]> {
  // Si cache vide, récupérer depuis MongoDB directement
  if (blindTestPool.length === 0) {
    try {
      const mongoTracks = await mongo.getRandomTracks(count);
      return mongoTracks.map(t => ({
        id: t.spotifyId,
        name: t.title,
        artistName: t.artistName,
        albumName: t.albumName,
        previewUrl: t.previewUrl || null,
        coverUrl: null,
        duration: t.durationMs,
      }));
    } catch (e) {
      console.error('❌ Erreur MongoDB getRandomTracks:', e);
      return getFallbackTracks().slice(0, count);
    }
  }

  const shuffled = [...blindTestPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function getRandomAlbums(count: number): Promise<Album[]> {
  // Si cache vide, récupérer depuis MongoDB directement
  if (pixelCoverPool.length === 0) {
    try {
      const mongoAlbums = await mongo.getRandomAlbums(count);
      return mongoAlbums.map(a => ({
        id: a.spotifyId,
        name: a.title,
        artistName: a.artistName,
        coverUrl: a.coverUrl || null,
        year: a.year,
      }));
    } catch (e) {
      console.error('❌ Erreur MongoDB getRandomAlbums:', e);
      return getFallbackAlbums().slice(0, count);
    }
  }

  const shuffled = [...pixelCoverPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ============================================
// FALLBACK (si APIs indisponibles)
// ============================================

function getFallbackTracks(): Track[] {
  return [
    { id: '1', name: '91\'s', artistName: 'Ninho', albumName: 'M.I.L.S', previewUrl: null, coverUrl: null, duration: 180000 },
    { id: '2', name: 'DKR', artistName: 'Booba', albumName: 'Trône', previewUrl: null, coverUrl: null, duration: 200000 },
    { id: '3', name: 'Biff', artistName: 'SCH', albumName: 'JVLIVS', previewUrl: null, coverUrl: null, duration: 190000 },
    { id: '4', name: 'A7', artistName: 'Niska', albumName: 'Zifukoro', previewUrl: null, coverUrl: null, duration: 175000 },
    { id: '5', name: 'Basique', artistName: 'Orelsan', albumName: 'La fête est finie', previewUrl: null, coverUrl: null, duration: 210000 },
  ];
}

function getFallbackAlbums(): Album[] {
  return [
    { id: '1', name: 'M.I.L.S', artistName: 'Ninho', coverUrl: null, year: 2016 },
    { id: '2', name: 'Trône', artistName: 'Booba', coverUrl: null, year: 2017 },
    { id: '3', name: 'JVLIVS', artistName: 'SCH', coverUrl: null, year: 2018 },
    { id: '4', name: 'Deux frères', artistName: 'PNL', coverUrl: null, year: 2019 },
    { id: '5', name: 'QALF', artistName: 'Damso', coverUrl: null, year: 2020 },
  ];
}

// ============================================
// STATUT
// ============================================

export function getDataStatus(): { tracks: number; albums: number; lastFetch: Date | null } {
  return {
    tracks: blindTestPool.length,
    albums: pixelCoverPool.length,
    lastFetch: lastFetchTime ? new Date(lastFetchTime) : null,
  };
}
