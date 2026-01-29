// ============================================
// GAME DATA SERVICE
// Préchargement et cache des données API
// ============================================

import { Track, Album } from './api/types';
import { getBlindTestTracks, getPixelCoverItems } from './api';

// Pools de données préchargées
let blindTestPool: Track[] = [];
let pixelCoverPool: Album[] = [];
let lastFetchTime = 0;
const POOL_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 heure

// ============================================
// PRÉCHARGEMENT
// ============================================

export async function preloadGameData(): Promise<void> {
  const now = Date.now();
  if (now - lastFetchTime < POOL_REFRESH_INTERVAL && blindTestPool.length > 0) {
    return; // Cache encore valide
  }

  console.log('🎵 Préchargement des données API...');

  // Blind Test tracks
  try {
    blindTestPool = await getBlindTestTracks(50); // Pool de 50 tracks
    console.log(`✅ ${blindTestPool.length} tracks préchargés`);
  } catch (e) {
    console.error('❌ Erreur préchargement tracks:', e);
    blindTestPool = getFallbackTracks();
  }

  // Pixel Cover albums
  try {
    pixelCoverPool = await getPixelCoverItems(50); // Pool de 50 albums
    console.log(`✅ ${pixelCoverPool.length} albums préchargés`);
  } catch (e) {
    console.error('❌ Erreur préchargement albums:', e);
    pixelCoverPool = getFallbackAlbums();
  }

  lastFetchTime = now;
}

// ============================================
// RÉCUPÉRATION
// ============================================

export function getRandomTracks(count: number): Track[] {
  if (blindTestPool.length === 0) {
    return getFallbackTracks().slice(0, count);
  }
  
  const shuffled = [...blindTestPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getRandomAlbums(count: number): Album[] {
  if (pixelCoverPool.length === 0) {
    return getFallbackAlbums().slice(0, count);
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
