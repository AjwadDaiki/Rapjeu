#!/usr/bin/env node

// ============================================
// CRAWLER RAP FRANÇAIS AMÉLIORÉ
// Découverte récursive via related artists
// Target: 2000-5000 artistes rap FR
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

const MIN_FOLLOWERS = 5000; // Minimum 5k followers (plus inclusif)
const TARGET_ARTISTS = 3000; // Objectif: 3000 artistes
const BATCH_SIZE = 20;
const SPOTIFY_DELAY = 100;
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
      console.warn(`⏳ Rate limit, attente ${retryAfter}s...`);
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
    return null;
  }
}

async function getArtistLocation(artistName) {
  try {
    const data = await lastfmRequest('artist.getInfo', { artist: artistName });
    const bio = data?.artist?.bio?.content || '';

    // Patterns pour détecter ville/département
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

    for (const [dept, regex] of Object.entries(patterns)) {
      if (regex.test(bio)) {
        return { department: dept, city: null, country: 'FR' };
      }
    }

    // Check si français
    if (/france|french|français/i.test(bio)) {
      return { country: 'FR' };
    }

    return null;
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
// DÉCOUVERTE RÉCURSIVE D'ARTISTES
// ==========================================

async function discoverArtistsRecursive() {
  console.log('🔍 === DÉCOUVERTE RÉCURSIVE RAP FR ===\n');

  const artistsCol = db.collection('artists');

  // 1. Récupérer les artistes déjà en BDD comme seeds
  const existingArtists = await artistsCol.find({}).toArray();
  console.log(`📊 Seeds depuis BDD: ${existingArtists.length} artistes\n`);

  const discoveredIds = new Set(existingArtists.map(a => a.spotifyId));
  const toExplore = [...discoveredIds];
  const explored = new Set();

  // Si pas de seeds, chercher quelques artistes connus
  if (toExplore.length === 0) {
    console.log('🌱 Recherche de seeds initiaux...\n');

    const seedNames = [
      'Booba', 'Kaaris', 'Ninho', 'SCH', 'Jul', 'Niska', 'PNL',
      'Damso', 'Orelsan', 'Nekfeu', 'Freeze Corleone', 'Alpha Wann'
    ];

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
            console.log(`   🔍 DEBUG Seed ${name}: ID='${artist.id}' Name='${artist.name}'`);
            toExplore.push(artist.id);
            discoveredIds.add(artist.id);
            console.log(`   ✅ Seed: ${artist.name} (${artist.followers.total.toLocaleString()} followers)`);
          }
        }
      } catch (error) {
        console.log(`   ❌ ${name}: ${error.message}`);
      }
    }
    console.log();
  }

  // 2. Exploration récursive via related artists
  console.log(`🚀 Exploration récursive (target: ${TARGET_ARTISTS} artistes)\n`);
  console.log(`🔍 DEBUG: toExplore contient ${toExplore.length} IDs`);
  console.log(`🔍 DEBUG: Premiers IDs: ${toExplore.slice(0, 3).join(', ')}\n`);

  let roundNumber = 0;

  while (toExplore.length > 0 && discoveredIds.size < TARGET_ARTISTS) {
    roundNumber++;
    const currentBatch = toExplore.splice(0, 50); // Traiter par batch de 50

    console.log(`📦 Round ${roundNumber}: ${currentBatch.length} artistes à explorer (découverts: ${discoveredIds.size}/${TARGET_ARTISTS})`);

    for (const artistId of currentBatch) {
      if (explored.has(artistId)) continue;
      explored.add(artistId);

      try {
        // Récupérer related artists
        const data = await spotifyRequest(`/artists/${artistId}/related-artists`, { market: 'FR' });

        if (data.artists) {
          let addedCount = 0;
          let totalRelated = data.artists.length;
          let filteredByFollowers = 0;
          let filteredByDuplicate = 0;
          let filteredByGenre = 0;

          for (const related of data.artists) {
            // Filtre: followers
            if (related.followers?.total < MIN_FOLLOWERS) {
              filteredByFollowers++;
              continue;
            }

            // Filtre: doublon
            if (discoveredIds.has(related.id)) {
              filteredByDuplicate++;
              continue;
            }

            // Filtre: genre
            if (!isRapArtist(related)) {
              filteredByGenre++;
              continue;
            }

            discoveredIds.add(related.id);
            toExplore.push(related.id);
            addedCount++;
          }

          if (addedCount > 0) {
            console.log(`   +${addedCount} artistes depuis ${artistId.substring(0, 8)}...`);
          } else {
            // Debug: pourquoi aucun artiste ajouté?
            console.log(`   ⚠️  ${artistId.substring(0, 8)}: ${totalRelated} related → ${filteredByFollowers} trop peu followers, ${filteredByDuplicate} doublons, ${filteredByGenre} pas rap`);
          }
        }

        // Stop si target atteint
        if (discoveredIds.size >= TARGET_ARTISTS) {
          console.log(`\n✅ Target atteint: ${discoveredIds.size} artistes\n`);
          break;
        }

      } catch (error) {
        stats.errors++;
        console.log(`   ❌ Erreur pour ${artistId} (${artistId.length} chars): ${error.message}`);
      }
    }

    console.log(`   Total découvert: ${discoveredIds.size}\n`);
  }

  console.log(`✅ Découverte terminée: ${discoveredIds.size} artistes RAP FR\n`);
  stats.artistsDiscovered = discoveredIds.size;

  return Array.from(discoveredIds);
}

function isRapArtist(artist) {
  // ACCEPTER TOUS LES ARTISTES pour avoir plus de données
  // On filtrera par genre plus tard si besoin
  return true;

  // Ancien filtre trop strict:
  // if (!artist.genres || artist.genres.length === 0) return true;
  // const rapGenres = ['rap', 'hip hop', 'trap', 'drill', 'afro', 'cloud rap', 'underground', 'grime', 'phonk', 'boom bap', 'gangsta', 'conscious', 'francais', 'french'];
  // return artist.genres.some(genre => rapGenres.some(rapKeyword => genre.toLowerCase().includes(rapKeyword)));
}

// ==========================================
// CRAWL ARTISTES
// ==========================================

async function crawlArtists(artistIds) {
  console.log(`🚀 Crawl de ${artistIds.length} artistes...\n`);

  const artistsCol = db.collection('artists');
  const albumsCol = db.collection('albums');
  const tracksCol = db.collection('tracks');
  const collabsCol = db.collection('collaborations');

  const batchCount = Math.ceil(artistIds.length / BATCH_SIZE);

  for (let i = 0; i < artistIds.length; i += BATCH_SIZE) {
    const batch = artistIds.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`📦 Batch ${batchNum}/${batchCount} (${i}-${Math.min(i + BATCH_SIZE, artistIds.length)}/${artistIds.length})`);

    for (const artistId of batch) {
      try {
        // Vérifier si déjà crawlé
        const existing = await artistsCol.findOne({ spotifyId: artistId });
        if (existing) {
          console.log(`   ⏭️  Skip ${existing.name} (déjà crawlé)`);
          continue;
        }

        // Récupérer artiste
        const artist = await spotifyRequest(`/artists/${artistId}`);

        // Location depuis Last.fm
        const location = await getArtistLocation(artist.name);

        // Insérer artiste
        await artistsCol.insertOne({
          spotifyId: artist.id,
          name: artist.name,
          aliases: [],
          monthlyListeners: artist.followers?.total || 0,
          popularity: artist.popularity || 0,
          genres: artist.genres || [],
          imageUrl: artist.images?.[0]?.url || null,
          location: location || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        stats.artistsCrawled++;

        // Récupérer albums
        const albumsData = await spotifyRequest(`/artists/${artistId}/albums`, {
          include_groups: 'album,single',
          limit: 50,
          market: 'FR',
        });

        let albumCount = 0;
        let trackCount = 0;
        let collabCount = 0;

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

        console.log(`   ✅ ${artist.name}: ${albumCount} albums, ${trackCount} tracks, ${collabCount} collabs`);

      } catch (error) {
        stats.errors++;
        console.log(`   ❌ Erreur: ${error.message}`);
      }
    }

    // Stats intermédiaires
    const counts = {
      artists: await artistsCol.countDocuments(),
      albums: await albumsCol.countDocuments(),
      tracks: await tracksCol.countDocuments(),
      collabs: await collabsCol.countDocuments(),
    };

    console.log(`   ✅ BDD: ${counts.artists} artistes | ${counts.albums} albums | ${counts.tracks} tracks | ${counts.collabs} collabs\n`);
  }
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  console.log('🇫🇷 === CRAWLER RAP FRANÇAIS AMÉLIORÉ ===\n');
  console.log(`📅 ${new Date().toLocaleString('fr-FR')}\n`);

  const startTime = Date.now();

  try {
    await connectDB();

    // 1. Découverte récursive
    const artistIds = await discoverArtistsRecursive();

    // 2. Crawl des artistes
    await crawlArtists(artistIds);

    // 3. Stats finales
    const artistsCol = db.collection('artists');
    const albumsCol = db.collection('albums');
    const tracksCol = db.collection('tracks');
    const collabsCol = db.collection('collaborations');

    const finalCounts = {
      artists: await artistsCol.countDocuments(),
      albums: await albumsCol.countDocuments(),
      tracks: await tracksCol.countDocuments(),
      collabs: await collabsCol.countDocuments(),
    };

    console.log('\n📊 === STATISTIQUES FINALES ===\n');
    console.log(`   artists             : ${finalCounts.artists.toLocaleString()}`);
    console.log(`   tracks              : ${finalCounts.tracks.toLocaleString()}`);
    console.log(`   albums              : ${finalCounts.albums.toLocaleString()}`);
    console.log(`   collaborations      : ${finalCounts.collabs.toLocaleString()}\n`);
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
