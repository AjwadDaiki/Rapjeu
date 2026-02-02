#!/usr/bin/env node

// ============================================
// CRAWLER RAP FRANÇAIS - VERSION COMPLÈTE
// Toutes les données pour les 6 modes de jeu
// ============================================

const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config();

// ==========================================
// CONFIG
// ==========================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapbattle';
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const GENIUS_ACCESS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;

const MIN_FOLLOWERS = 5000;
const TARGET_ARTISTS = 3000;
const SPOTIFY_DELAY = 100;
const LASTFM_DELAY = 250;
const GENIUS_DELAY = 500;

// Stats
let stats = {
  artistsDiscovered: 0,
  artistsCrawled: 0,
  artistsWithBio: 0,
  artistsWithTags: 0,
  albumsCrawled: 0,
  tracksCrawled: 0,
  tracksWithPreview: 0,
  tracksWithLyrics: 0,
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
}

async function spotifyRequest(endpoint, params = {}) {
  const token = await getSpotifyToken();
  await new Promise((resolve) => setTimeout(resolve, SPOTIFY_DELAY));

  try {
    const response = await axios.get(`https://api.spotify.com/v1${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
      timeout: 15000,
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
    if (error.response?.status === 429) {
      console.warn('⏳ Rate limit Last.fm, attente 5s...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return lastfmRequest(method, params);
    }
    return null;
  }
}

// Récupérer bio complète + tags + location
async function getArtistEnrichedData(artistName) {
  try {
    const data = await lastfmRequest('artist.getInfo', { artist: artistName });
    const tagsData = await lastfmRequest('artist.getTopTags', { artist: artistName });

    const artist = data?.artist;
    if (!artist) return null;

    const bio = artist.bio?.content || artist.bio?.summary || '';
    const bioClean = bio.replace(/<a[^>]*>.*?<\/a>/gi, '').trim();

    // Tags détaillés (trap, drill, cloud rap, boom bap, etc.)
    const tags = (tagsData?.toptags?.tag || [])
      .slice(0, 10)
      .map(t => t.name.toLowerCase())
      .filter(t => t !== 'seen live' && t !== 'albums i own');

    // Location patterns
    const patterns = {
      '91': /91|Essonne|Évry|Corbeil/i,
      '92': /92|Hauts-de-Seine|Boulogne|Nanterre/i,
      '93': /93|Seine-Saint-Denis|Sevran|Bondy|Montreuil|Bobigny/i,
      '94': /94|Val-de-Marne|Créteil|Ivry|Vitry/i,
      '95': /95|Val-d'Oise|Argenteuil|Cergy/i,
      '75': /Paris|75/i,
      '13': /Marseille|13|Bouches-du-Rhône/i,
      '69': /Lyon|69|Rhône/i,
      '59': /Lille|59|Nord/i,
      '33': /Bordeaux|33|Gironde/i,
    };

    let location = {};
    for (const [dept, regex] of Object.entries(patterns)) {
      if (regex.test(bio)) {
        location = { department: dept, city: null, country: 'FR' };
        break;
      }
    }

    if (!location.country && /france|french|français/i.test(bio)) {
      location = { country: 'FR' };
    }

    return {
      bio: bioClean,
      tags,
      location,
      listeners: parseInt(artist.stats?.listeners) || 0,
      playcount: parseInt(artist.stats?.playcount) || 0,
    };
  } catch (error) {
    return null;
  }
}

// ==========================================
// GENIUS API (pour lyrics)
// ==========================================

async function searchGeniusSong(artist, title) {
  if (!GENIUS_ACCESS_TOKEN) return null;

  await new Promise((resolve) => setTimeout(resolve, GENIUS_DELAY));

  try {
    const response = await axios.get('https://api.genius.com/search', {
      params: { q: `${artist} ${title}` },
      headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` },
      timeout: 10000,
    });

    const hits = response.data?.response?.hits || [];
    if (hits.length === 0) return null;

    // Prendre le premier résultat (meilleur match)
    const song = hits[0].result;
    return {
      geniusId: song.id,
      geniusUrl: song.url,
      geniusTitle: song.title,
      geniusArtist: song.primary_artist.name,
    };
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn('⏳ Rate limit Genius, skip...');
    }
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
// CRAWL UN ARTISTE (VERSION ENRICHIE)
// ==========================================

async function crawlArtistEnriched(artistId, artistsCol, albumsCol, tracksCol, collabsCol) {
  try {
    // Vérifier si déjà crawlé
    const existing = await artistsCol.findOne({ spotifyId: artistId });
    if (existing) {
      return { alreadyCrawled: true, name: existing.name, newArtists: [] };
    }

    // Récupérer artiste Spotify
    const artist = await spotifyRequest(`/artists/${artistId}`);

    // Filtrer par followers
    if (artist.followers?.total < MIN_FOLLOWERS) {
      return { skipped: true, reason: 'not_enough_followers', newArtists: [] };
    }

    // 🆕 ENRICHISSEMENT LAST.FM (bio + tags + location)
    console.log(`   🔍 Enrichissement Last.fm pour ${artist.name}...`);
    const enrichedData = await getArtistEnrichedData(artist.name);

    // Insérer artiste avec données enrichies
    await artistsCol.insertOne({
      spotifyId: artist.id,
      name: artist.name,
      aliases: [],
      monthlyListeners: artist.followers?.total || 0,
      popularity: artist.popularity || 0,
      genres: artist.genres || [],
      imageUrl: artist.images?.[0]?.url || null,

      // 🆕 DONNÉES ENRICHIES
      bio: enrichedData?.bio || null,
      tags: enrichedData?.tags || [],
      location: enrichedData?.location || {},
      lastfmListeners: enrichedData?.listeners || 0,
      lastfmPlaycount: enrichedData?.playcount || 0,

      createdAt: new Date(),
      updatedAt: new Date(),
    });

    stats.artistsCrawled++;
    if (enrichedData?.bio) stats.artistsWithBio++;
    if (enrichedData?.tags?.length > 0) stats.artistsWithTags++;

    // Récupérer albums
    const albumsData = await spotifyRequest(`/artists/${artistId}/albums`, {
      include_groups: 'album,single',
      limit: 50,
      market: 'FR',
    });

    let albumCount = 0;
    let trackCount = 0;
    let collabCount = 0;
    let tracksWithPreview = 0;
    let tracksWithLyrics = 0;
    const newArtistIds = new Set();

    for (const albumSimple of albumsData.items || []) {
      try {
        // Album complet
        const album = await spotifyRequest(`/albums/${albumSimple.id}`);

        // Insérer album
        await albumsCol.updateOne(
          { spotifyId: album.id },
          {
            $set: {
              spotifyId: album.id,
              title: album.name,
              artistId: artist.id,
              artistName: artist.name,
              year: parseInt(album.release_date.split('-')[0]) || 2020,
              coverUrl: album.images?.[0]?.url || null,
              label: album.label || null,
              totalTracks: album.total_tracks || 0,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );

        albumCount++;
        stats.albumsCrawled++;

        // Tracks
        for (const track of album.tracks?.items || []) {
          // Détecter featurings
          const featuring = track.artists
            .filter(a => a.id !== artist.id)
            .map(a => ({ artistId: a.id, artistName: a.name }));

          // Collecter les nouveaux artistes
          featuring.forEach(f => newArtistIds.add(f.artistId));

          // 🆕 GENIUS LYRICS (seulement pour tracks populaires)
          let geniusData = null;
          if (track.popularity > 50 && GENIUS_ACCESS_TOKEN) {
            geniusData = await searchGeniusSong(artist.name, track.name);
            if (geniusData) tracksWithLyrics++;
          }

          // Compter preview URLs
          if (track.preview_url) tracksWithPreview++;

          // Insérer track
          await tracksCol.updateOne(
            { spotifyId: track.id },
            {
              $set: {
                spotifyId: track.id,
                title: track.name,
                artistId: artist.id,
                artistName: artist.name,
                albumId: album.id,
                albumName: album.name,
                featuring,
                year: parseInt(album.release_date.split('-')[0]) || 2020,
                durationMs: track.duration_ms || 0,
                popularity: track.popularity || 0,
                previewUrl: track.preview_url || null,
                explicit: track.explicit || false,

                // 🆕 GENIUS DATA
                geniusId: geniusData?.geniusId || null,
                geniusUrl: geniusData?.geniusUrl || null,

                updatedAt: new Date(),
              },
              $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true }
          );

          trackCount++;
          stats.tracksCrawled++;

          // Créer collaborations
          for (const feat of featuring) {
            // A -> B
            await collabsCol.updateOne(
              { artistAId: artist.id, artistBId: feat.artistId, trackId: track.id },
              {
                $set: {
                  artistAId: artist.id,
                  artistAName: artist.name,
                  artistBId: feat.artistId,
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

            // B -> A (bidirectionnel)
            await collabsCol.updateOne(
              { artistAId: feat.artistId, artistBId: artist.id, trackId: track.id },
              {
                $set: {
                  artistAId: feat.artistId,
                  artistAName: feat.artistName,
                  artistBId: artist.id,
                  artistBName: artist.name,
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

            collabCount++;
            stats.collabsFound++;
          }
        }

      } catch (error) {
        stats.errors++;
      }
    }

    stats.tracksWithPreview += tracksWithPreview;
    stats.tracksWithLyrics += tracksWithLyrics;

    return {
      success: true,
      name: artist.name,
      albumCount,
      trackCount,
      collabCount,
      tracksWithPreview,
      tracksWithLyrics,
      hasBio: !!enrichedData?.bio,
      tagsCount: enrichedData?.tags?.length || 0,
      newArtists: Array.from(newArtistIds),
    };

  } catch (error) {
    stats.errors++;
    throw error;
  }
}

// ==========================================
// DÉCOUVERTE RÉCURSIVE
// ==========================================

async function discoverAndCrawl() {
  console.log('🔍 === DÉCOUVERTE VIA COLLABORATIONS (ENRICHIE) ===\n');

  const artistsCol = db.collection('artists');
  const albumsCol = db.collection('albums');
  const tracksCol = db.collection('tracks');
  const collabsCol = db.collection('collaborations');

  // Seeds initiaux
  console.log('🌱 Recherche de seeds initiaux...\n');

  const seedNames = [
    'Booba', 'Kaaris', 'Ninho', 'SCH', 'Jul', 'Niska', 'PNL',
    'Damso', 'Orelsan', 'Nekfeu', 'Freeze Corleone', 'Alpha Wann',
    'Laylow', 'Hamza', 'Lomepal', 'Rim\'K', 'Sofiane'
  ];

  const toExplore = [];
  const discovered = new Set();

  for (const name of seedNames) {
    try {
      const data = await spotifyRequest('/search', {
        q: name,
        type: 'artist',
        limit: 1,
        market: 'FR',
      });

      if (data.artists?.items?.[0]) {
        const artist = data.artists.items[0];
        if (artist.followers?.total >= MIN_FOLLOWERS) {
          toExplore.push(artist.id);
          discovered.add(artist.id);
          console.log(`   ✅ Seed: ${artist.name} (${artist.followers.total.toLocaleString()} followers)`);
        }
      }
    } catch (error) {
      console.log(`   ❌ ${name}: ${error.message}`);
    }
  }
  console.log();

  // Exploration récursive
  console.log(`🚀 Exploration récursive (target: ${TARGET_ARTISTS} artistes)\n`);

  let roundNumber = 0;

  while (toExplore.length > 0 && discovered.size < TARGET_ARTISTS) {
    roundNumber++;
    const artistId = toExplore.shift();

    console.log(`📦 Round ${roundNumber}: Crawl artiste (découverts: ${discovered.size}/${TARGET_ARTISTS}, queue: ${toExplore.length})`);

    try {
      const result = await crawlArtistEnriched(artistId, artistsCol, albumsCol, tracksCol, collabsCol);

      if (result.alreadyCrawled) {
        console.log(`   ⏭️  Skip ${result.name} (déjà crawlé)`);
      } else if (result.skipped) {
        console.log(`   ⏭️  Skip ${artistId.substring(0, 8)} (${result.reason})`);
      } else if (result.success) {
        console.log(`   ✅ ${result.name}: ${result.albumCount} albums, ${result.trackCount} tracks, ${result.collabCount} collabs`);
        console.log(`      📊 Preview URLs: ${result.tracksWithPreview}, Lyrics: ${result.tracksWithLyrics}, Bio: ${result.hasBio ? 'Oui' : 'Non'}, Tags: ${result.tagsCount}`);

        // Ajouter les nouveaux artistes découverts
        let addedCount = 0;
        for (const newArtistId of result.newArtists) {
          if (!discovered.has(newArtistId)) {
            discovered.add(newArtistId);
            toExplore.push(newArtistId);
            addedCount++;
          }
        }

        if (addedCount > 0) {
          console.log(`      🔍 +${addedCount} nouveaux artistes découverts`);
        }
      }

      // Stop si target atteint
      if (discovered.size >= TARGET_ARTISTS) {
        console.log(`\n✅ Target atteint: ${discovered.size} artistes\n`);
        break;
      }

    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
    }

    // Stats intermédiaires tous les 10 rounds
    if (roundNumber % 10 === 0) {
      const counts = {
        artists: await artistsCol.countDocuments(),
        albums: await albumsCol.countDocuments(),
        tracks: await tracksCol.countDocuments(),
        collabs: await collabsCol.countDocuments(),
      };

      console.log(`      📊 BDD: ${counts.artists} artistes | ${counts.albums} albums | ${counts.tracks} tracks | ${counts.collabs} collabs\n`);
    }
  }

  console.log(`✅ Découverte terminée: ${discovered.size} artistes\n`);
  stats.artistsDiscovered = discovered.size;
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  console.log('🇫🇷 === CRAWLER RAP FRANÇAIS (VERSION COMPLÈTE) ===\n');
  console.log(`📅 ${new Date().toLocaleString('fr-FR')}\n`);

  const startTime = Date.now();

  try {
    await connectDB();
    await discoverAndCrawl();

    // Stats finales
    const artistsCol = db.collection('artists');
    const albumsCol = db.collection('albums');
    const tracksCol = db.collection('tracks');
    const collabsCol = db.collection('collaborations');

    const finalCounts = {
      artists: await artistsCol.countDocuments(),
      albums: await albumsCol.countDocuments(),
      tracks: await tracksCol.countDocuments(),
      collabs: await collabsCol.countDocuments(),
      artistsWithBio: await artistsCol.countDocuments({ bio: { $ne: null, $exists: true } }),
      artistsWithTags: await artistsCol.countDocuments({ tags: { $exists: true, $not: { $size: 0 } } }),
      tracksWithPreview: await tracksCol.countDocuments({ previewUrl: { $ne: null, $exists: true } }),
      tracksWithGenius: await tracksCol.countDocuments({ geniusId: { $ne: null, $exists: true } }),
    };

    console.log('\n📊 === STATISTIQUES FINALES ===\n');
    console.log(`   Artistes                : ${finalCounts.artists.toLocaleString()}`);
    console.log(`   - Avec bio Last.fm      : ${finalCounts.artistsWithBio.toLocaleString()}`);
    console.log(`   - Avec tags détaillés   : ${finalCounts.artistsWithTags.toLocaleString()}`);
    console.log();
    console.log(`   Tracks                  : ${finalCounts.tracks.toLocaleString()}`);
    console.log(`   - Avec preview Spotify  : ${finalCounts.tracksWithPreview.toLocaleString()}`);
    console.log(`   - Avec Genius link      : ${finalCounts.tracksWithGenius.toLocaleString()}`);
    console.log();
    console.log(`   Albums                  : ${finalCounts.albums.toLocaleString()}`);
    console.log(`   Collaborations          : ${finalCounts.collabs.toLocaleString()}`);
    console.log();
    console.log(`   Erreurs: ${stats.errors}\n`);

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`✅ Terminé en ${duration} minutes\n`);

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
