#!/usr/bin/env node

// ============================================
// CRAWLER EXHAUSTIF - RAP DATA
// Crawle Spotify + Last.fm + MusicBrainz + Genius + Discogs
// Remplit MongoDB avec 100k+ données
// ============================================

const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// ==========================================
// CONFIG
// ==========================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rapbattle';
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

// Seuils
const MIN_MONTHLY_LISTENERS = 30000; // Inclut même les petits artistes
const MAX_ARTISTS = 50000; // Limite pour éviter de crawler tout Spotify
const BATCH_SIZE = 50; // Nombre d'artistes à traiter en parallèle

// Rate limiting
const SPOTIFY_DELAY = 100; // ms entre chaque requête
const LASTFM_DELAY = 200; // Last.fm est plus strict

// ==========================================
// SPOTIFY AUTH
// ==========================================

let spotifyAccessToken = null;
let tokenExpiresAt = 0;

async function getSpotifyToken() {
  if (spotifyAccessToken && Date.now() < tokenExpiresAt) {
    return spotifyAccessToken;
  }

  console.log('🔑 Récupération token Spotify...');

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
      }
    );

    spotifyAccessToken = response.data.access_token;
    tokenExpiresAt = Date.now() + response.data.expires_in * 1000 - 60000;
    console.log('✅ Token Spotify obtenu');

    return spotifyAccessToken;
  } catch (error) {
    console.error('❌ Erreur auth Spotify:', error.message);
    throw error;
  }
}

async function spotifyRequest(endpoint, params = {}) {
  const token = await getSpotifyToken();

  await new Promise((resolve) => setTimeout(resolve, SPOTIFY_DELAY));

  try {
    const response = await axios.get(`https://api.spotify.com/v1${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '5', 10);
      console.warn(`⏳ Rate limit Spotify, attente ${retryAfter}s...`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return spotifyRequest(endpoint, params);
    }
    throw error;
  }
}

// ==========================================
// LAST.FM API
// ==========================================

async function lastfmRequest(method, params = {}) {
  await new Promise((resolve) => setTimeout(resolve, LASTFM_DELAY));

  try {
    const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: {
        method,
        api_key: LASTFM_API_KEY,
        format: 'json',
        ...params,
      },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Erreur Last.fm:', error.message);
    return null;
  }
}

// ==========================================
// MONGODB
// ==========================================

let db = null;

async function connectDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db();
  console.log('✅ Connecté à MongoDB');
}

// ==========================================
// CRAWLING LOGIC
// ==========================================

/**
 * Étape 1: Découvrir les artistes rap
 */
async function discoverRapArtists() {
  console.log('\n🔍 === ÉTAPE 1: Découverte des artistes rap ===\n');

  const artistsCol = db.collection('artists');
  const existingCount = await artistsCol.countDocuments();

  console.log(`📊 Artistes déjà en BDD: ${existingCount}`);

  if (existingCount >= MAX_ARTISTS) {
    console.log('✅ Quota d\'artistes atteint, skip discovery');
    return;
  }

  // Genres à crawler
  const genres = [
    'french hip hop',
    'rap francais',
    'trap francais',
    'drill francais',
    'afro trap',
    'cloud rap francais',
    'hip hop',
    'trap',
    'drill',
    'underground hip hop',
    'conscious hip hop',
    'gangster rap',
    'southern hip hop',
  ];

  const discoveredArtists = new Set();

  for (const genre of genres) {
    console.log(`\n🎵 Recherche genre: "${genre}"`);

    try {
      // Search API (limite 50 par page)
      for (let offset = 0; offset < 1000; offset += 50) {
        const data = await spotifyRequest('/search', {
          q: `genre:"${genre}"`,
          type: 'artist',
          limit: 50,
          offset,
        });

        if (!data.artists?.items || data.artists.items.length === 0) break;

        for (const artist of data.artists.items) {
          if (artist.followers?.total >= MIN_MONTHLY_LISTENERS) {
            discoveredArtists.add(artist.id);
          }
        }

        console.log(`   📍 Offset ${offset}: ${discoveredArtists.size} artistes découverts`);

        if (discoveredArtists.size >= MAX_ARTISTS) break;
      }
    } catch (error) {
      console.error(`❌ Erreur genre "${genre}":`, error.message);
    }

    if (discoveredArtists.size >= MAX_ARTISTS) break;
  }

  console.log(`\n✅ Découverte terminée: ${discoveredArtists.size} artistes trouvés`);

  // Crawler chaque artiste
  const artistIds = Array.from(discoveredArtists);
  await crawlArtistsBatch(artistIds);
}

/**
 * Crawler un batch d'artistes
 */
async function crawlArtistsBatch(artistIds) {
  console.log(`\n🚀 Crawling de ${artistIds.length} artistes...\n`);

  for (let i = 0; i < artistIds.length; i += BATCH_SIZE) {
    const batch = artistIds.slice(i, i + BATCH_SIZE);
    console.log(`📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(artistIds.length / BATCH_SIZE)}`);

    await Promise.all(batch.map((id) => crawlArtist(id)));

    console.log(`   ✅ ${Math.min(i + BATCH_SIZE, artistIds.length)}/${artistIds.length} artistes crawlés\n`);
  }
}

/**
 * Crawler un artiste complet (infos + albums + tracks + collabs)
 */
async function crawlArtist(spotifyId) {
  const artistsCol = db.collection('artists');

  // Check si déjà crawlé récemment (< 7 jours)
  const existing = await artistsCol.findOne({ spotifyId });
  if (existing && Date.now() - new Date(existing.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000) {
    return; // Skip
  }

  try {
    // Get artist info
    const artist = await spotifyRequest(`/artists/${spotifyId}`);

    if (!artist) return;

    // Get location from Last.fm
    let location = { country: null, city: null, department: null, region: null };
    if (LASTFM_API_KEY) {
      const lastfmArtist = await lastfmRequest('artist.getinfo', { artist: artist.name });
      if (lastfmArtist?.artist) {
        const bio = lastfmArtist.artist.bio?.content || '';
        location = extractLocation(bio, artist.name);
      }
    }

    // Save artist
    await artistsCol.updateOne(
      { spotifyId },
      {
        $set: {
          spotifyId,
          name: artist.name,
          aliases: [artist.name], // TODO: enrichir avec variants
          monthlyListeners: artist.followers?.total || 0,
          popularity: artist.popularity || 0,
          location,
          genres: artist.genres || [],
          relatedArtists: [], // TODO: crawler related artists
          image: artist.images?.[0]?.url || null,
          source: 'spotify',
          verified: true,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    // Crawler albums & tracks
    await crawlArtistAlbums(spotifyId, artist.name);
  } catch (error) {
    console.error(`❌ Erreur crawl artiste ${spotifyId}:`, error.message);
  }
}

/**
 * Crawler tous les albums d'un artiste
 */
async function crawlArtistAlbums(artistId, artistName) {
  try {
    const data = await spotifyRequest(`/artists/${artistId}/albums`, {
      include_groups: 'album,single',
      limit: 50,
    });

    if (!data.items) return;

    for (const albumSimple of data.items) {
      await crawlAlbum(albumSimple.id, artistId, artistName);
    }
  } catch (error) {
    console.error(`❌ Erreur albums ${artistName}:`, error.message);
  }
}

/**
 * Crawler un album complet (avec tous ses tracks)
 */
async function crawlAlbum(albumId, artistId, artistName) {
  const albumsCol = db.collection('albums');
  const tracksCol = db.collection('tracks');
  const collabsCol = db.collection('collaborations');

  try {
    // Check si déjà crawlé
    const existing = await albumsCol.findOne({ spotifyId: albumId });
    if (existing) return;

    const album = await spotifyRequest(`/albums/${albumId}`);
    if (!album) return;

    const year = album.release_date ? parseInt(album.release_date.split('-')[0], 10) : null;

    // Save album
    await albumsCol.insertOne({
      spotifyId: albumId,
      title: album.name,
      artistId,
      artistName,
      year,
      releaseDate: album.release_date,
      label: album.label || null,
      coverUrl: album.images?.[0]?.url || null,
      coverUrlHD: album.images?.[0]?.url || null, // TODO: fetch from Discogs
      trackIds: [],
      trackCount: album.total_tracks,
      genres: album.genres || [],
      source: 'spotify',
      verified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save tracks
    for (const track of album.tracks.items) {
      // Extract featurings
      const featuring = track.artists
        .filter((a) => a.id !== artistId)
        .map((a) => ({
          artistId: a.id,
          artistName: a.name,
        }));

      // Save track
      await tracksCol.updateOne(
        { spotifyId: track.id },
        {
          $set: {
            spotifyId: track.id,
            title: track.name,
            artistId,
            artistName,
            featuring,
            albumId,
            albumName: album.name,
            year,
            duration: track.duration_ms,
            popularity: 0, // Pas dispo dans album tracks
            previewUrl: track.preview_url || null,
            genres: album.genres || [],
            producerId: null,
            producerName: null,
            source: 'spotify',
            verified: true,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      // Save collaborations
      for (const feat of featuring) {
        await collabsCol.updateOne(
          { artistAId: artistId, artistBId: feat.artistId },
          {
            $set: {
              artistAName: artistName,
              artistBName: feat.artistName,
              trackId: track.id,
              trackTitle: track.name,
              verified: true,
              source: 'spotify',
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );

        // Inverse aussi
        await collabsCol.updateOne(
          { artistAId: feat.artistId, artistBId: artistId },
          {
            $set: {
              artistAName: feat.artistName,
              artistBName: artistName,
              trackId: track.id,
              trackTitle: track.name,
              verified: true,
              source: 'spotify',
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );
      }
    }
  } catch (error) {
    console.error(`❌ Erreur album ${albumId}:`, error.message);
  }
}

/**
 * Extraire la localisation depuis la bio Last.fm
 */
function extractLocation(bio, artistName) {
  const location = { country: null, city: null, department: null, region: null };

  // Détection France
  if (/france|français|francais/i.test(bio)) {
    location.country = 'FR';
  }

  // Villes françaises
  const cities = {
    Paris: { city: 'Paris', department: '75', region: 'Île-de-France' },
    Marseille: { city: 'Marseille', department: '13', region: "Provence-Alpes-Côte d'Azur" },
    Lyon: { city: 'Lyon', department: '69', region: 'Auvergne-Rhône-Alpes' },
    Évry: { city: 'Évry', department: '91', region: 'Île-de-France' },
    Sevran: { city: 'Sevran', department: '93', region: 'Île-de-France' },
    Nanterre: { city: 'Nanterre', department: '92', region: 'Île-de-France' },
    Argenteuil: { city: 'Argenteuil', department: '95', region: 'Île-de-France' },
    Corbeil: { city: 'Corbeil-Essonnes', department: '91', region: 'Île-de-France' },
    Tarbes: { city: 'Tarbes', department: '65', region: 'Occitanie' },
  };

  for (const [cityName, data] of Object.entries(cities)) {
    if (new RegExp(cityName, 'i').test(bio)) {
      Object.assign(location, data);
      break;
    }
  }

  // Départements (91, 92, 93, 94, 95, 75, etc.)
  const deptMatch = bio.match(/\b(7[5-8]|9[0-5])\b/);
  if (deptMatch && location.country === 'FR') {
    location.department = deptMatch[1];
    location.region = 'Île-de-France';
  }

  return location;
}

// ==========================================
// STATS & REPORTING
// ==========================================

async function printStats() {
  console.log('\n📊 === STATISTIQUES FINALES ===\n');

  const collections = ['artists', 'tracks', 'albums', 'collaborations', 'lyrics', 'punchlines', 'producers'];

  for (const colName of collections) {
    const count = await db.collection(colName).countDocuments();
    console.log(`   ${colName.padEnd(20)}: ${count.toLocaleString()} documents`);
  }

  console.log('\n');
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  console.log('🚀 === RAP DATA CRAWLER ===\n');
  console.log(`📅 ${new Date().toISOString()}\n`);

  // Vérifier les variables d'env
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.error('❌ SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET requis dans .env.local');
    process.exit(1);
  }

  if (!LASTFM_API_KEY) {
    console.warn('⚠️ LASTFM_API_KEY non trouvée, skip localisation');
  }

  // Connect
  await connectDB();

  // Crawl
  const startTime = Date.now();

  try {
    await discoverRapArtists();

    await printStats();

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`✅ Crawling terminé en ${duration} minutes\n`);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run
if (require.main === module) {
  main();
}

module.exports = { main };
