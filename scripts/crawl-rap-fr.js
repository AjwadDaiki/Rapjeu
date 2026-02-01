#!/usr/bin/env node

// ============================================
// CRAWLER RAP FRANÇAIS EXHAUSTIF
// Focus 100% rap FR avec TOUTES les données
// ============================================

const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// ==========================================
// CONFIG
// ==========================================

const MONGODB_URI = 'mongodb://127.0.0.1:27017/rapbattle';
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

// Focus RAP FR uniquement
const MIN_MONTHLY_LISTENERS = 10000; // Même les petits (baissé de 30k à 10k)
const BATCH_SIZE = 20; // Réduit pour éviter rate limit
const SPOTIFY_DELAY = 150; // ms entre requêtes
const LASTFM_DELAY = 250;

// Stats
let stats = {
  artistsDiscovered: 0,
  artistsCrawled: 0,
  albumsCrawled: 0,
  tracksCrawled: 0,
  collabsFound: 0,
  errors: 0,
};

// ==========================================
// SPOTIFY AUTH
// ==========================================

let spotifyAccessToken = null;
let tokenExpiresAt = 0;

async function getSpotifyToken() {
  if (spotifyAccessToken && Date.now() < tokenExpiresAt) {
    return spotifyAccessToken;
  }

  console.log('🔑 Obtention token Spotify...');

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
    console.log('✅ Token obtenu\n');

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
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '5', 10);
      console.warn(`⏳ Rate limit, attente ${retryAfter}s...`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return spotifyRequest(endpoint, params);
    }
    stats.errors++;
    throw error;
  }
}

// ==========================================
// LAST.FM API
// ==========================================

async function lastfmRequest(method, params = {}) {
  if (!LASTFM_API_KEY) return null;

  await new Promise((resolve) => setTimeout(resolve, LASTFM_DELAY));

  try {
    const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: {
        method,
        api_key: LASTFM_API_KEY,
        format: 'json',
        ...params,
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
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
  console.log('✅ Connecté à MongoDB local\n');
}

// ==========================================
// DÉCOUVERTE ARTISTES RAP FR
// ==========================================

async function discoverRapFrArtists() {
  console.log('🔍 === DÉCOUVERTE ARTISTES RAP FR ===\n');

  const artistsCol = db.collection('artists');
  const existingCount = await artistsCol.countDocuments();

  console.log(`📊 Artistes déjà en BDD: ${existingCount}\n`);

  const discoveredArtists = new Set();

  // GENRES RAP FRANÇAIS
  const genresFR = [
    'rap francais',
    'french hip hop',
    'trap francais',
    'drill francais',
    'afro trap',
    'cloud rap francais',
    'french rap',
    'hip hop francais',
  ];

  for (const genre of genresFR) {
    console.log(`🎵 Genre: "${genre}"`);

    try {
      for (let offset = 0; offset < 1000; offset += 50) {
        const data = await spotifyRequest('/search', {
          q: `genre:"${genre}"`,
          type: 'artist',
          limit: 50,
          offset,
          market: 'FR', // Important: marché français
        });

        if (!data.artists?.items || data.artists.items.length === 0) break;

        for (const artist of data.artists.items) {
          // Filtre: au moins 10k listeners
          if (artist.followers?.total >= MIN_MONTHLY_LISTENERS) {
            discoveredArtists.add(artist.id);
          }
        }

        console.log(`   Offset ${offset}: ${discoveredArtists.size} artistes`);
        stats.artistsDiscovered = discoveredArtists.size;

        if (offset >= 950) break; // Limite Spotify
      }
    } catch (error) {
      console.error(`❌ Erreur genre "${genre}":`, error.message);
    }

    console.log();
  }

  // SEARCH PAR ARTISTES CONNUS (seed)
  console.log('🌱 Seed artistes connus...\n');

  const seedArtists = [
    'Booba', 'Kaaris', 'Ninho', 'PNL', 'Orelsan', 'Nekfeu', 'SCH', 'Niska',
    'Jul', 'Damso', 'Freeze Corleone', 'Alpha Wann', 'Lomepal', 'Laylow',
    'Gazo', 'Tiakola', 'Koba LaD', 'Rim\'K', 'Rohff', 'Youssoupha',
    'Soprano', 'Maître Gims', 'Black M', 'Gradur', 'La Fouine', 'Lacrim',
    'Kalash Criminel', 'Sofiane', 'Bolemvn', 'Heuss l\'Enfoiré', 'Soso Maness',
    'Alonzo', 'Dosseh', 'Sneazzy', 'Siboy', 'Maes', 'Zola', 'SDM',
    'Hamza', 'Lefa', 'S.Pri Noir', 'JUL', 'Moha La Squale', 'Dinos',
    'Kekra', 'Vald', 'Josman', 'Houdi', 'PLK', 'Timal', 'RK', 'Lartiste',
  ];

  for (const name of seedArtists) {
    try {
      const data = await spotifyRequest('/search', {
        q: name,
        type: 'artist',
        limit: 1,
        market: 'FR',
      });

      if (data.artists?.items?.[0]) {
        const artist = data.artists.items[0];
        discoveredArtists.add(artist.id);

        // Get related artists (pour découvrir plus)
        const related = await spotifyRequest(`/artists/${artist.id}/related-artists`);
        if (related.artists) {
          for (const rel of related.artists) {
            if (rel.followers?.total >= MIN_MONTHLY_LISTENERS) {
              discoveredArtists.add(rel.id);
            }
          }
        }
      }

      console.log(`   ${name}: +${discoveredArtists.size - stats.artistsDiscovered} artistes`);
      stats.artistsDiscovered = discoveredArtists.size;
    } catch (error) {
      console.error(`❌ Seed "${name}":`, error.message);
    }
  }

  console.log(`\n✅ Découverte terminée: ${discoveredArtists.size} artistes RAP FR\n`);

  // Crawler tous les artistes
  const artistIds = Array.from(discoveredArtists);
  await crawlArtistsBatch(artistIds);
}

// ==========================================
// CRAWL ARTISTES
// ==========================================

async function crawlArtistsBatch(artistIds) {
  console.log(`🚀 Crawl de ${artistIds.length} artistes...\n`);

  for (let i = 0; i < artistIds.length; i += BATCH_SIZE) {
    const batch = artistIds.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(artistIds.length / BATCH_SIZE);

    console.log(`📦 Batch ${batchNum}/${totalBatches} (${i}-${Math.min(i + BATCH_SIZE, artistIds.length)}/${artistIds.length})`);

    await Promise.all(batch.map((id) => crawlArtist(id)));

    // Log stats
    console.log(`   ✅ Artistes: ${stats.artistsCrawled} | Albums: ${stats.albumsCrawled} | Tracks: ${stats.tracksCrawled} | Collabs: ${stats.collabsFound}\n`);
  }
}

async function crawlArtist(spotifyId) {
  const artistsCol = db.collection('artists');

  // Check si déjà crawlé récemment (< 7 jours)
  const existing = await artistsCol.findOne({ spotifyId });
  if (existing && Date.now() - new Date(existing.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000) {
    return;
  }

  try {
    const artist = await spotifyRequest(`/artists/${spotifyId}`);
    if (!artist) return;

    // Get location from Last.fm
    let location = { country: 'FR', city: null, department: null, region: null };
    if (LASTFM_API_KEY) {
      const lastfmArtist = await lastfmRequest('artist.getinfo', { artist: artist.name });
      if (lastfmArtist?.artist?.bio?.content) {
        location = extractLocationFR(lastfmArtist.artist.bio.content);
      }
    }

    // Aliases (variations du nom)
    const aliases = generateAliases(artist.name);

    // Save artist
    await artistsCol.updateOne(
      { spotifyId },
      {
        $set: {
          spotifyId,
          name: artist.name,
          aliases,
          monthlyListeners: artist.followers?.total || 0,
          popularity: artist.popularity || 0,
          location,
          genres: artist.genres || [],
          relatedArtists: [],
          image: artist.images?.[0]?.url || null,
          source: 'spotify',
          verified: true,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    stats.artistsCrawled++;

    // Crawler albums
    await crawlArtistAlbums(spotifyId, artist.name);
  } catch (error) {
    console.error(`❌ Artiste ${spotifyId}:`, error.message);
  }
}

// ==========================================
// CRAWL ALBUMS & TRACKS
// ==========================================

async function crawlArtistAlbums(artistId, artistName) {
  try {
    const data = await spotifyRequest(`/artists/${artistId}/albums`, {
      include_groups: 'album,single',
      limit: 50,
      market: 'FR',
    });

    if (!data.items) return;

    for (const albumSimple of data.items) {
      await crawlAlbum(albumSimple.id, artistId, artistName);
    }
  } catch (error) {
    console.error(`❌ Albums ${artistName}:`, error.message);
  }
}

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
      coverUrlHD: album.images?.[0]?.url || null,
      trackIds: [],
      trackCount: album.total_tracks,
      genres: album.genres || [],
      source: 'spotify',
      verified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    stats.albumsCrawled++;

    // Save tracks
    for (const track of album.tracks.items) {
      // Featurings
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
            popularity: 0,
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

      stats.tracksCrawled++;

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

        // Inverse
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

        stats.collabsFound++;
      }
    }
  } catch (error) {
    console.error(`❌ Album ${albumId}:`, error.message);
  }
}

// ==========================================
// HELPERS
// ==========================================

function generateAliases(name) {
  const aliases = [name];

  // Variations communes
  aliases.push(name.toLowerCase());
  aliases.push(name.toUpperCase());
  aliases.push(name.replace(/'/g, ''));
  aliases.push(name.replace(/'/g, '\''));
  aliases.push(name.replace(/\s+/g, ''));

  // Cas spéciaux
  if (name.includes('\'')) {
    aliases.push(name.replace(/'/g, ''));
  }

  return [...new Set(aliases)];
}

function extractLocationFR(bio) {
  const location = { country: 'FR', city: null, department: null, region: null };

  // Villes et départements français
  const locationsMap = {
    // Île-de-France
    'Paris': { city: 'Paris', department: '75', region: 'Île-de-France' },
    'Évry': { city: 'Évry', department: '91', region: 'Île-de-France' },
    'Essonnes': { city: 'Évry', department: '91', region: 'Île-de-France' },
    'Sevran': { city: 'Sevran', department: '93', region: 'Île-de-France' },
    'Nanterre': { city: 'Nanterre', department: '92', region: 'Île-de-France' },
    'Argenteuil': { city: 'Argenteuil', department: '95', region: 'Île-de-France' },
    'Créteil': { city: 'Créteil', department: '94', region: 'Île-de-France' },
    'Vitry': { city: 'Vitry-sur-Seine', department: '94', region: 'Île-de-France' },
    'Corbeil': { city: 'Corbeil-Essonnes', department: '91', region: 'Île-de-France' },
    'Meaux': { city: 'Meaux', department: '77', region: 'Île-de-France' },
    'Boulogne': { city: 'Boulogne-Billancourt', department: '92', region: 'Île-de-France' },

    // Provence
    'Marseille': { city: 'Marseille', department: '13', region: 'Provence-Alpes-Côte d\'Azur' },

    // Auvergne-Rhône-Alpes
    'Lyon': { city: 'Lyon', department: '69', region: 'Auvergne-Rhône-Alpes' },

    // Occitanie
    'Toulouse': { city: 'Toulouse', department: '31', region: 'Occitanie' },
    'Tarbes': { city: 'Tarbes', department: '65', region: 'Occitanie' },
  };

  for (const [cityName, data] of Object.entries(locationsMap)) {
    if (new RegExp(cityName, 'i').test(bio)) {
      Object.assign(location, data);
      break;
    }
  }

  // Départements Île-de-France (75, 77, 78, 91, 92, 93, 94, 95)
  const deptMatch = bio.match(/\b(7[5-8]|9[1-5])\b/);
  if (deptMatch) {
    location.department = deptMatch[1];
    location.region = 'Île-de-France';
  }

  return location;
}

// ==========================================
// STATS
// ==========================================

async function printStats() {
  console.log('\n📊 === STATISTIQUES FINALES ===\n');

  const collections = ['artists', 'tracks', 'albums', 'collaborations'];

  for (const colName of collections) {
    const count = await db.collection(colName).countDocuments();
    console.log(`   ${colName.padEnd(20)}: ${count.toLocaleString()}`);
  }

  console.log(`\n   Erreurs: ${stats.errors}\n`);
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  console.log('🇫🇷 === CRAWLER RAP FRANÇAIS ===\n');
  console.log(`📅 ${new Date().toLocaleString('fr-FR')}\n`);

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.error('❌ SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET requis dans .env.local');
    process.exit(1);
  }

  await connectDB();

  const startTime = Date.now();

  try {
    await discoverRapFrArtists();
    await printStats();

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`✅ Terminé en ${duration} minutes\n`);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}
