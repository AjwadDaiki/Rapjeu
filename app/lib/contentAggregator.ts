// @ts-nocheck
// ============================================
// CONTENT AGGREGATOR
// PrÃ©charge et agrÃ¨ge le contenu de TOUTES les APIs
// pour avoir 100k+ questions disponibles
// ============================================

import * as spotify from './api/spotify';
import * as lastfm from './api/lastfm';
import * as genius from './api/genius';
import * as discogs from './api/discogs';
import * as musicbrainz from './api/musicbrainz';
import * as mongo from './mongoService';
import { Track, Album } from './api/types';

// ==========================================
// CONTENT POOLS
// ==========================================

interface ContentPools {
  // Existing modes
  blindTestTracks: Track[];
  pixelCoverAlbums: Album[];

  // New modes
  lyricsSnippets: genius.LyricsSnippet[];
  punchlines: genius.Punchline[];
  whoProducedQuestions: musicbrainz.WhoProducedQuestion[];
  featureOrNotQuestions: musicbrainz.FeatureOrNotQuestion[];
  guessTheYearQuestions: discogs.GuessTheYearQuestion[];
  whoSaidItQuestions: genius.WhoSaidItQuestion[];
}

const pools: ContentPools = {
  blindTestTracks: [],
  pixelCoverAlbums: [],
  lyricsSnippets: [],
  punchlines: [],
  whoProducedQuestions: [],
  featureOrNotQuestions: [],
  guessTheYearQuestions: [],
  whoSaidItQuestions: [],
};

let isPreloading = false;
let lastPreloadTime = 0;
const PRELOAD_INTERVAL = 6 * 60 * 60 * 1000; // 6 heures
const MONGO_POOL_LIMIT = Number.parseInt(process.env.MONGO_POOL_LIMIT || '0', 10);
const MONGO_POOL_SIZE = Number.isFinite(MONGO_POOL_LIMIT) ? MONGO_POOL_LIMIT : 0;

// ==========================================
// PRELOAD ALL CONTENT
// ==========================================

export async function preloadAllContent(): Promise<void> {
  if (isPreloading) {
    console.log('â³ Preload already in progress...');
    return;
  }

  const now = Date.now();
  if (now - lastPreloadTime < PRELOAD_INTERVAL && pools.blindTestTracks.length > 0) {
    console.log('âœ… Content cache still valid');
    return;
  }

  isPreloading = true;
  console.log('ðŸš€ Starting content aggregation from all APIs...');

  const startTime = Date.now();

  try {
    // Load everything in parallel for speed
    await Promise.allSettled([
      loadBlindTestTracks(),
      loadPixelCoverAlbums(),
      loadLyricsContent(),
      loadProducerContent(),
      loadYearContent(),
    ]);

    lastPreloadTime = Date.now();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('âœ… Content aggregation complete!');
    console.log(`ðŸ“Š Total content loaded in ${duration}s:`);
    console.log(`   - Blind Test: ${pools.blindTestTracks.length} tracks`);
    console.log(`   - Pixel Cover: ${pools.pixelCoverAlbums.length} albums`);
    console.log(`   - Lyrics: ${pools.lyricsSnippets.length} snippets`);
    console.log(`   - Punchlines: ${pools.punchlines.length} quotes`);
    console.log(`   - Producers: ${pools.whoProducedQuestions.length} questions`);
    console.log(`   - Features: ${pools.featureOrNotQuestions.length} pairs`);
    console.log(`   - Years: ${pools.guessTheYearQuestions.length} albums`);
    console.log(`   - Who Said It: ${pools.whoSaidItQuestions.length} questions`);

    const totalQuestions = Object.values(pools).reduce((sum, pool) => sum + pool.length, 0);
    console.log(`ðŸŽ¯ TOTAL: ${totalQuestions} pieces of content ready!`);
  } catch (error) {
    console.error('âŒ Content aggregation error:', error);
  } finally {
    isPreloading = false;
  }
}

// ==========================================
// INDIVIDUAL LOADERS
// ==========================================

async function loadBlindTestTracks(): Promise<void> {
  try {
    console.log('ðŸŽµ Loading Blind Test tracks...');


    // Try MongoDB first (crawler data)
    try {
      const mongoTracks = await mongo.getRandomTracks(MONGO_POOL_SIZE);
      if (mongoTracks.length > 0) {
        pools.blindTestTracks = mongoTracks.map(t => ({
          id: t.spotifyId,
          name: t.title,
          artistName: t.artistName,
          albumName: t.albumName,
          previewUrl: t.previewUrl || null,
          coverUrl: null,
          duration: t.durationMs,
        }));
        console.log('   âœ… MongoDB: ' + pools.blindTestTracks.length + ' tracks');
        return;
      }
      console.warn('   âš ï¸ MongoDB: 0 tracks (previewUrl manquant)');
    } catch (e) {
      console.warn('   âš ï¸ MongoDB failed:', e);
    }

    // Try Spotify first (has previews)
    if (spotify.isSpotifyConfigured()) {
      try {
        const tracks = await spotify.getRandomRapTracks(500);
        pools.blindTestTracks = tracks;
        console.log(`   âœ… Spotify: ${tracks.length} tracks`);
        return;
      } catch (e) {
        console.warn('   âš ï¸ Spotify failed:', e);
      }
    }

    // Fallback to Last.fm
    try {
      const tracks = await lastfm.getRandomRapTracks(500);
      pools.blindTestTracks = tracks;
      console.log(`   âœ… Last.fm: ${tracks.length} tracks`);
    } catch (e) {
      console.error('   âŒ Last.fm failed:', e);
      pools.blindTestTracks = [];
    }
  } catch (error) {
    console.error('   âŒ Failed to load blind test tracks:', error);
    pools.blindTestTracks = [];
  }
}

async function loadPixelCoverAlbums(): Promise<void> {
  try {
    console.log('ðŸ–¼ï¸ Loading Pixel Cover albums...');


    // Try MongoDB first (crawler data)
    try {
      const mongoAlbums = await mongo.getRandomAlbums(MONGO_POOL_SIZE);
      if (mongoAlbums.length > 0) {
        pools.pixelCoverAlbums = mongoAlbums.map(a => ({
          id: a.spotifyId,
          name: a.title,
          artistName: a.artistName,
          coverUrl: a.coverUrl || null,
          year: a.year,
        }));
        console.log('   âœ… MongoDB: ' + pools.pixelCoverAlbums.length + ' albums');
        return;
      }
      console.warn('   âš ï¸ MongoDB: 0 albums (coverUrl manquant)');
    } catch (e) {
      console.warn('   âš ï¸ MongoDB failed:', e);
    }

    // Try Discogs first (HD covers)
    try {
      const discogsAlbums = await discogs.getPixelCoverDataHD(500);
      if (discogsAlbums.length > 0) {
        pools.pixelCoverAlbums = discogsAlbums.map(album => ({
          id: album.id.toString(),
          name: album.name,
          artistName: album.artistName,
          coverUrl: album.coverUrlHD || album.coverUrl,
          year: album.year,
        }));
        console.log(`   âœ… Discogs: ${pools.pixelCoverAlbums.length} albums (HD)`);
        return;
      }
      console.warn('   âš ï¸ Discogs: 0 albums (skip -> fallback)');
    } catch (e) {
      console.warn('   âš ï¸ Discogs failed:', e);
    }

    // Fallback to Spotify
    if (spotify.isSpotifyConfigured()) {
      try {
        const albums = await spotify.getRandomAlbumCovers(500);
        pools.pixelCoverAlbums = albums;
        console.log(`   âœ… Spotify: ${albums.length} albums`);
        return;
      } catch (e) {
        console.warn('   âš ï¸ Spotify failed:', e);
      }
    }

    // Fallback to Last.fm
    try {
      const albums = await lastfm.getRandomAlbumCovers(500);
      pools.pixelCoverAlbums = albums;
      console.log(`   âœ… Last.fm: ${albums.length} albums`);
    } catch (e) {
      console.error('   âŒ Last.fm failed:', e);
      pools.pixelCoverAlbums = [];
    }
  } catch (error) {
    console.error('   âŒ Failed to load pixel cover albums:', error);
    pools.pixelCoverAlbums = [];
  }
}

async function loadLyricsContent(): Promise<void> {
  try {
    console.log('ðŸ“ Loading lyrics content...');

    // Load lyrics snippets
    const snippets = await genius.getRandomRapLyrics(100);
    pools.lyricsSnippets = snippets;
    console.log(`   âœ… Lyrics snippets: ${snippets.length}`);

    // Load punchlines
    const punchlines = await genius.getRandomPunchlines(50);
    pools.punchlines = punchlines;
    console.log(`   âœ… Punchlines: ${punchlines.length}`);

    // Generate "Who Said It" questions
    const whoSaidIt = await genius.getWhoSaidItData(30);
    pools.whoSaidItQuestions = whoSaidIt;
    console.log(`   âœ… Who Said It: ${whoSaidIt.length} questions`);
  } catch (error) {
    console.error('   âŒ Failed to load lyrics content:', error);
    pools.lyricsSnippets = [];
    pools.punchlines = [];
    pools.whoSaidItQuestions = [];
  }
}

async function loadProducerContent(): Promise<void> {
  try {
    console.log('ðŸŽ§ Loading producer content...');

    const questions = await musicbrainz.getWhoProducedData(20);
    pools.whoProducedQuestions = questions;
    console.log(`   âœ… Producer questions: ${questions.length}`);

    const features = await musicbrainz.getFeatureOrNotData(30);
    pools.featureOrNotQuestions = features;
    console.log(`   âœ… Feature questions: ${features.length}`);
  } catch (error) {
    console.error('   âŒ Failed to load producer content:', error);
    pools.whoProducedQuestions = [];
    pools.featureOrNotQuestions = [];
  }
}

async function loadYearContent(): Promise<void> {
  try {
    console.log('ðŸ“… Loading year content...');


    // Try MongoDB first
    try {
      const mongoAlbums = await mongo.getRandomAlbums(200);
      const withYear = mongoAlbums.filter(a => !!a.year).slice(0, 30);
      if (withYear.length > 0) {
        pools.guessTheYearQuestions = withYear.map(a => ({
          albumName: a.title,
          artistName: a.artistName,
          coverUrl: a.coverUrl || '',
          year: a.year,
          albumId: a.spotifyId,
        })) as any;
        console.log('   âœ… MongoDB: ' + withYear.length + ' year questions');
        return;
      }
      console.warn('   âš ï¸ MongoDB: 0 albums avec annÃ©e');
    } catch (e) {
      console.warn('   âš ï¸ MongoDB failed:', e);
    }

    const questions = await discogs.getGuessTheYearData(30);
    pools.guessTheYearQuestions = questions;
    console.log(`   âœ… Year questions: ${questions.length}`);
  } catch (error) {
    console.error('   âŒ Failed to load year content:', error);
    pools.guessTheYearQuestions = [];
  }
}

// ==========================================
// AUTO-REFRESH
// ==========================================

let refreshInterval: NodeJS.Timeout | null = null;

export function startAutoRefresh(): void {
  if (refreshInterval) {
    console.log('â³ Auto-refresh already running');
    return;
  }

  console.log('ðŸ”„ Starting auto-refresh (every 6 hours)');
  refreshInterval = setInterval(() => {
    console.log('ðŸ”„ Auto-refreshing content...');
    preloadAllContent();
  }, PRELOAD_INTERVAL);
}

export function stopAutoRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('â¹ï¸ Auto-refresh stopped');
  }
}

// ==========================================
// GETTERS (for game modes)
// ==========================================

export function getRandomTracks(count: number): Track[] {
  const shuffled = [...pools.blindTestTracks].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getRandomAlbums(count: number): Album[] {
  const shuffled = [...pools.pixelCoverAlbums].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getRandomLyricsSnippets(count: number): genius.LyricsSnippet[] {
  const shuffled = [...pools.lyricsSnippets].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getRandomPunchlines(count: number): genius.Punchline[] {
  const shuffled = [...pools.punchlines].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getRandomWhoProducedQuestions(count: number): musicbrainz.WhoProducedQuestion[] {
  const shuffled = [...pools.whoProducedQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getRandomFeatureOrNotQuestions(count: number): musicbrainz.FeatureOrNotQuestion[] {
  const shuffled = [...pools.featureOrNotQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getRandomGuessTheYearQuestions(count: number): discogs.GuessTheYearQuestion[] {
  const shuffled = [...pools.guessTheYearQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getRandomWhoSaidItQuestions(count: number): genius.WhoSaidItQuestion[] {
  const shuffled = [...pools.whoSaidItQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ==========================================
// STATUS
// ==========================================

export function getContentStatus() {
  return {
    isPreloading,
    lastPreloadTime: lastPreloadTime ? new Date(lastPreloadTime) : null,
    nextPreload: lastPreloadTime ? new Date(lastPreloadTime + PRELOAD_INTERVAL) : null,
    autoRefreshActive: !!refreshInterval,
    pools: {
      blindTestTracks: pools.blindTestTracks.length,
      pixelCoverAlbums: pools.pixelCoverAlbums.length,
      lyricsSnippets: pools.lyricsSnippets.length,
      punchlines: pools.punchlines.length,
      whoProducedQuestions: pools.whoProducedQuestions.length,
      featureOrNotQuestions: pools.featureOrNotQuestions.length,
      guessTheYearQuestions: pools.guessTheYearQuestions.length,
      whoSaidItQuestions: pools.whoSaidItQuestions.length,
    },
    total: Object.values(pools).reduce((sum, pool) => sum + pool.length, 0),
  };
}
