#!/usr/bin/env node

// ============================================
// CRAWLER RAP FRANÇAIS - VERSION OVERNIGHT
// Ultra-lent mais stable - utilise TOUTES les APIs
// Durée estimée: 10-15h pour 3000 artistes
// ============================================

const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config();

// ==========================================
// CONFIG ULTRA-SLOW (évite les rate limits)
// ==========================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapbattle';
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const GENIUS_ACCESS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;
const DISCOGS_CONSUMER_KEY = process.env.DISCOGS_CONSUMER_KEY;

const MIN_FOLLOWERS = 5000;
const TARGET_ARTISTS = 3000;

// DÉLAIS ULTRA-LONGS pour éviter rate limits
const SPOTIFY_DELAY = 800;      // 800ms entre chaque requête Spotify
const LASTFM_DELAY = 600;       // 600ms entre chaque requête Last.fm
const GENIUS_DELAY = 1000;      // 1s entre chaque requête Genius
const DISCOGS_DELAY = 1500;     // 1.5s entre chaque requête Discogs
const ARTIST_PAUSE = 15000;     // 15s de pause tous les 5 artistes
const BATCH_PAUSE = 5000;       // 5s de pause entre chaque batch d'albums

// Limites de batch réduites
const MAX_ALBUMS_PER_ARTIST = 15;  // Max 15 albums par artiste (au lieu de 50)

// Stats enrichies
let stats = {
  artistsDiscovered: 0,
  artistsCrawled: 0,
  artistsWithBio: 0,
  artistsWithTags: 0,
  artistsWithDiscogs: 0,
  albumsCrawled: 0,
  albumsWithDiscogs: 0,
  tracksCrawled: 0,
  tracksWithPreview: 0,
  tracksWithLyrics: 0,
  collabsFound: 0,
  errors: 0,
  spotifyRateLimits: 0,
  lastfmRateLimits: 0,
  geniusRateLimits: 0,
};

// Timer pour calcul de vitesse
let crawlStartTime = 0;

// ==========================================
// HELPERS - PROGRESS DISPLAY
// ==========================================

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function getProgressBar(current, total, width = 30) {
  const percentage = Math.min(100, (current / total) * 100);
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percentage.toFixed(1)}%`;
}

function getETA(startTime, current, total) {
  const elapsed = Date.now() - startTime;
  const rate = current / elapsed; // artistes par ms
  const remaining = total - current;
  const eta = remaining / rate;

  return formatDuration(eta);
}

function getCrawlSpeed(startTime, count) {
  const elapsed = Date.now() - startTime;
  const minutes = elapsed / 1000 / 60;
  const speed = count / minutes;
  return speed.toFixed(2);
}

function logProgress(current, total, startTime) {
  const bar = getProgressBar(current, total);
  const eta = current > 0 ? getETA(startTime, current, total) : '???';
  const speed = current > 0 ? getCrawlSpeed(startTime, current) : '0';
  const elapsed = formatDuration(Date.now() - startTime);

  console.log(`\n┌─────────────────────────────────────────────────────────┐`);
  console.log(`│ 📊 PROGRESSION: ${current}/${total} artistes`);
  console.log(`│ ${bar}`);
  console.log(`│ ⏱️  Temps écoulé: ${elapsed} | ETA: ${eta}`);
  console.log(`│ ⚡ Vitesse: ${speed} artistes/min`);
  console.log(`└─────────────────────────────────────────────────────────┘\n`);
}

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
      timeout: 20000,
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      stats.spotifyRateLimits++;
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
      console.warn(`⏳ Rate limit Spotify! Attente ${retryAfter}s... (occurrence #${stats.spotifyRateLimits})`);
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
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      stats.lastfmRateLimits++;
      console.warn(`⏳ Rate limit Last.fm! Attente 10s... (occurrence #${stats.lastfmRateLimits})`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
      return lastfmRequest(method, params);
    }
    return null;
  }
}

async function getArtistEnrichedData(artistName) {
  try {
    const data = await lastfmRequest('artist.getInfo', { artist: artistName });
    const tagsData = await lastfmRequest('artist.getTopTags', { artist: artistName });
    const topTracksData = await lastfmRequest('artist.getTopTracks', { artist: artistName, limit: 10 });

    const artist = data?.artist;
    if (!artist) return null;

    const bio = artist.bio?.content || artist.bio?.summary || '';
    const bioClean = bio.replace(/<a[^>]*>.*?<\/a>/gi, '').trim();

    // Tags détaillés (trap, drill, cloud rap, boom bap, etc.)
    const tags = (tagsData?.toptags?.tag || [])
      .slice(0, 15)
      .map(t => t.name.toLowerCase())
      .filter(t => !['seen live', 'albums i own', 'favorite', 'favourites'].includes(t));

    // Top tracks Last.fm (pour pondération)
    const topTracks = (topTracksData?.toptracks?.track || [])
      .slice(0, 10)
      .map(t => ({
        name: t.name,
        playcount: parseInt(t.playcount) || 0,
        listeners: parseInt(t.listeners) || 0,
      }));

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
      topTracks,
      location,
      listeners: parseInt(artist.stats?.listeners) || 0,
      playcount: parseInt(artist.stats?.playcount) || 0,
    };
  } catch (error) {
    return null;
  }
}

// ==========================================
// WIKIDATA API (pour localisation structurée)
// ==========================================

async function getLocationFromWikidata(artistName) {
  await new Promise((resolve) => setTimeout(resolve, 500)); // Rate limit respectueux

  try {
    // Query SPARQL pour trouver le lieu de naissance
    const query = `
      SELECT ?item ?birthPlaceLabel ?countryLabel ?coords WHERE {
        ?item wdt:P31 wd:Q5 .
        ?item ?label "${artistName}"@fr .
        OPTIONAL { ?item wdt:P19 ?birthPlace . }
        OPTIONAL { ?item wdt:P27 ?country . }
        OPTIONAL { ?birthPlace wdt:P625 ?coords . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en" }
      }
      LIMIT 1
    `;

    const response = await axios.get('https://query.wikidata.org/sparql', {
      params: { query, format: 'json' },
      headers: { 'User-Agent': 'RapBattleGame/1.0' },
      timeout: 10000,
    });

    const bindings = response.data?.results?.bindings || [];
    if (bindings.length === 0) return null;

    const result = bindings[0];
    const birthPlace = result.birthPlaceLabel?.value;
    const country = result.countryLabel?.value;

    if (!birthPlace) return null;

    // Parser le lieu de naissance pour extraire département
    const locationMap = {
      'Boulogne-Billancourt': { department: '92', city: 'Boulogne-Billancourt' },
      'Nanterre': { department: '92', city: 'Nanterre' },
      'Sevran': { department: '93', city: 'Sevran' },
      'Bondy': { department: '93', city: 'Bondy' },
      'Montreuil': { department: '93', city: 'Montreuil' },
      'Bobigny': { department: '93', city: 'Bobigny' },
      'Corbeil-Essonnes': { department: '91', city: 'Corbeil-Essonnes' },
      'Évry': { department: '91', city: 'Évry' },
      'Longjumeau': { department: '91', city: 'Longjumeau' },
      'Créteil': { department: '94', city: 'Créteil' },
      'Ivry-sur-Seine': { department: '94', city: 'Ivry-sur-Seine' },
      'Vitry-sur-Seine': { department: '94', city: 'Vitry-sur-Seine' },
      'Argenteuil': { department: '95', city: 'Argenteuil' },
      'Cergy': { department: '95', city: 'Cergy' },
      'Paris': { department: '75', city: 'Paris' },
      'Marseille': { department: '13', city: 'Marseille' },
      'Lyon': { department: '69', city: 'Lyon' },
      'Lille': { department: '59', city: 'Lille' },
      'Bordeaux': { department: '33', city: 'Bordeaux' },
      'Toulouse': { department: '31', city: 'Toulouse' },
      'Nice': { department: '06', city: 'Nice' },
      'Nantes': { department: '44', city: 'Nantes' },
      'Strasbourg': { department: '67', city: 'Strasbourg' },
      'Roubaix': { department: '59', city: 'Roubaix' },
      'Caen': { department: '14', city: 'Caen' },
    };

    // Chercher correspondance exacte
    for (const [ville, loc] of Object.entries(locationMap)) {
      if (birthPlace.includes(ville)) {
        return { ...loc, country: 'FR', source: 'wikidata' };
      }
    }

    // Sinon, juste le pays
    if (country) {
      const countryCode = country === 'France' ? 'FR' :
                         country === 'Belgique' || country === 'Belgium' ? 'BE' :
                         country === 'Algérie' || country === 'Algeria' ? 'DZ' :
                         country === 'Maroc' || country === 'Morocco' ? 'MA' : null;

      if (countryCode) {
        return { country: countryCode, city: birthPlace, source: 'wikidata' };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

// ==========================================
// NORMALISATION & ALIAS AUTOMATIQUES
// ==========================================

/**
 * Normalise un nom d'artiste pour comparaison
 * Exemples:
 * - "Koba LaD" → "kobala d"
 * - "PNL" → "pnl"
 * - "L'Algerino" → "lalgerino"
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')                    // Décompose les accents
    .replace(/[\u0300-\u036f]/g, '')     // Supprime les accents
    .replace(/[^a-z0-9\s]/g, '')         // Garde que lettres, chiffres, espaces
    .replace(/\s+/g, ' ')                // Normalise les espaces multiples
    .trim();
}

/**
 * Génère des alias automatiques pour un nom d'artiste
 * Exemples:
 * - "Koba LaD" → ["koba", "kobala", "koba lad", "kobala d"]
 * - "L'Algerino" → ["algerino", "lalgerino"]
 * - "Heuss L'Enfoiré" → ["heuss", "heuss lenfoirе"]
 */
function generateAliases(name) {
  const normalized = normalizeName(name);
  const aliases = new Set([normalized]);

  // Sans espaces
  aliases.add(normalized.replace(/\s/g, ''));

  // Premier mot seulement (pour "Koba LaD" → "koba")
  const words = normalized.split(' ');
  if (words.length > 1) {
    aliases.add(words[0]);
  }

  // Sans apostrophes/tirets (pour "L'Algerino" → "algerino")
  const withoutSpecial = name.toLowerCase().replace(/['\-]/g, '');
  aliases.add(normalizeName(withoutSpecial));

  // Variantes courantes
  const variations = {
    'lad': 'la d',
    'la d': 'lad',
    'lenfoirе': 'l enfoirе',
    'l enfoirе': 'lenfoirе',
  };

  for (const [from, to] of Object.entries(variations)) {
    if (normalized.includes(from)) {
      aliases.add(normalized.replace(from, to));
    }
  }

  // Retirer le nom original normalisé de la liste des alias
  const result = Array.from(aliases).filter(a => a !== normalized);
  return result;
}

// ==========================================
// DISCOGS API (pour labels, crédits albums)
// ==========================================

async function discogsSearchAlbum(artistName, albumTitle) {
  if (!DISCOGS_CONSUMER_KEY) return null;

  await new Promise((resolve) => setTimeout(resolve, DISCOGS_DELAY));

  try {
    const response = await axios.get('https://api.discogs.com/database/search', {
      params: {
        artist: artistName,
        release_title: albumTitle,
        type: 'release',
        per_page: 1,
      },
      headers: {
        'User-Agent': 'RapBattleGame/1.0',
        Authorization: `Discogs key=${DISCOGS_CONSUMER_KEY}`,
      },
      timeout: 15000,
    });

    const results = response.data?.results || [];
    if (results.length === 0) return null;

    const release = results[0];
    return {
      discogsId: release.id,
      discogsUrl: `https://www.discogs.com${release.uri}`,
      label: release.label?.[0] || null,
      year: release.year || null,
      country: release.country || null,
      formats: release.format || [],
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
      timeout: 15000,
    });

    const hits = response.data?.response?.hits || [];
    if (hits.length === 0) return null;

    const song = hits[0].result;
    return {
      geniusId: song.id,
      geniusUrl: song.url,
      geniusTitle: song.title,
      geniusArtist: song.primary_artist.name,
    };
  } catch (error) {
    if (error.response?.status === 429) {
      stats.geniusRateLimits++;
      console.warn(`⏳ Rate limit Genius! Skip... (occurrence #${stats.geniusRateLimits})`);
    }
    return null;
  }
}

// ==========================================
// MONGODB
// ==========================================

let db = null;

async function connectDB() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           🔌 VÉRIFICATION MONGODB                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('📍 URI:', MONGODB_URI);
  console.log('⏳ Tentative de connexion...\n');

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();

    console.log('✅ Connexion réussie!\n');

    // Vérifier les collections existantes
    const collections = await db.listCollections().toArray();
    console.log('📦 Collections existantes:');
    if (collections.length === 0) {
      console.log('   (Aucune - Seront créées automatiquement)\n');
    } else {
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`   - ${col.name}: ${count.toLocaleString()} documents`);
      }
      console.log();
    }

    // Test d'écriture
    console.log('🧪 Test d\'écriture dans la BDD...');
    const testCol = db.collection('_test');
    await testCol.insertOne({ test: true, timestamp: new Date() });
    await testCol.deleteOne({ test: true });
    console.log('✅ Écriture OK!\n');

    // Vérifier les index
    console.log('🔍 Vérification des index...');
    const artistsCol = db.collection('artists');
    const indexes = await artistsCol.listIndexes().toArray();
    if (indexes.length > 0) {
      console.log(`   ${indexes.length} index(es) trouvé(s)`);
    } else {
      console.log('   Aucun index (seront créés pendant le crawl)');
    }
    console.log();

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ MONGODB PRÊT À RECEVOIR LES DONNÉES         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ ERREUR DE CONNEXION MONGODB!\n');
    console.error('Détails:', error.message);
    console.error('\n💡 Solutions possibles:');
    console.error('   1. Vérifie que MongoDB est lancé: mongod');
    console.error('   2. Vérifie l\'URI:', MONGODB_URI);
    console.error('   3. Sur Windows: Lance "MongoDB Compass" ou vérifie le service\n');
    throw error;
  }
}

// ==========================================
// CRAWL UN ARTISTE (VERSION ENRICHIE ULTRA)
// ==========================================

async function crawlArtistUltraEnriched(artistId, artistsCol, albumsCol, tracksCol, collabsCol) {
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

    // 🆕 ENRICHISSEMENT LAST.FM (bio + tags + top tracks + location)
    console.log(`   🔍 Enrichissement Last.fm pour ${artist.name}...`);
    const enrichedData = await getArtistEnrichedData(artist.name);

    // 🆕 FALLBACK WIKIDATA pour location si Last.fm n'a rien trouvé
    let location = enrichedData?.location || {};
    if (!location.department && !location.city) {
      console.log(`   🔍 Fallback Wikidata pour localisation...`);
      const wikidataLocation = await getLocationFromWikidata(artist.name);
      if (wikidataLocation) {
        location = wikidataLocation;
        console.log(`      ✅ Location Wikidata: ${wikidataLocation.city || wikidataLocation.country}`);
      }
    }

    // 🆕 GÉNÉRATION AUTOMATIQUE D'ALIAS
    const aliases = generateAliases(artist.name);
    const normalizedName = normalizeName(artist.name);

    // Calculer le score de popularité (pour probabilité)
    // Score = (monthlyListeners / 10000) + (popularity * 10)
    // Ex: 1M listeners + 80 popularity = (1000000/10000) + (80*10) = 100 + 800 = 900
    const popularityScore = Math.floor((artist.followers?.total || 0) / 10000) + ((artist.popularity || 0) * 10);

    // Insérer artiste avec données enrichies
    await artistsCol.insertOne({
      spotifyId: artist.id,
      name: artist.name,
      normalizedName: normalizedName,  // 🆕 Pour recherche fuzzy
      aliases: aliases,                 // 🆕 Variantes automatiques
      monthlyListeners: artist.followers?.total || 0,
      popularity: artist.popularity || 0,
      genres: artist.genres || [],
      imageUrl: artist.images?.[0]?.url || null,

      // 🆕 DONNÉES ENRICHIES LAST.FM
      bio: enrichedData?.bio || null,
      tags: enrichedData?.tags || [],
      topTracks: enrichedData?.topTracks || [],
      location: location,              // 🆕 Last.fm + Wikidata fallback
      lastfmListeners: enrichedData?.listeners || 0,
      lastfmPlaycount: enrichedData?.playcount || 0,

      // 🆕 POPULARITÉ & PROBABILITÉ
      popularityScore: popularityScore,  // Score pour sélection pondérée
      isTopArtist: false,  // Sera mis à jour en post-processing
      selectionWeight: 1,  // Poids de base

      // 🆕 DONNÉES POUR QUESTIONS
      firstReleaseYear: null,  // Sera calculé après crawl des albums
      totalAlbums: 0,          // Sera mis à jour après
      totalTracks: 0,          // Sera mis à jour après

      createdAt: new Date(),
      updatedAt: new Date(),
    });

    stats.artistsCrawled++;
    if (enrichedData?.bio) stats.artistsWithBio++;
    if (enrichedData?.tags?.length > 0) stats.artistsWithTags++;

    // Récupérer albums (LIMITÉ à MAX_ALBUMS_PER_ARTIST)
    const albumsData = await spotifyRequest(`/artists/${artistId}/albums`, {
      include_groups: 'album,single',
      limit: MAX_ALBUMS_PER_ARTIST,
      market: 'FR',
    });

    let albumCount = 0;
    let trackCount = 0;
    let collabCount = 0;
    let tracksWithPreview = 0;
    let tracksWithLyrics = 0;
    let albumsWithDiscogs = 0;
    const newArtistIds = new Set();

    const albumItems = (albumsData.items || []).slice(0, MAX_ALBUMS_PER_ARTIST);

    for (const albumSimple of albumItems) {
      try {
        // Pause entre chaque album
        await new Promise((resolve) => setTimeout(resolve, BATCH_PAUSE));

        // Album complet Spotify
        const album = await spotifyRequest(`/albums/${albumSimple.id}`);

        // 🆕 ENRICHISSEMENT DISCOGS (labels, crédits)
        console.log(`      🔍 Discogs: "${album.name}"...`);
        const discogsData = await discogsSearchAlbum(artist.name, album.name);
        if (discogsData) albumsWithDiscogs++;

        // Insérer album avec données enrichies
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
              label: album.label || discogsData?.label || null,
              totalTracks: album.total_tracks || 0,

              // 🆕 DISCOGS DATA
              discogsId: discogsData?.discogsId || null,
              discogsUrl: discogsData?.discogsUrl || null,
              formats: discogsData?.formats || [],

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
          if (track.popularity > 40 && GENIUS_ACCESS_TOKEN) {
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

            // B -> A
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
        console.log(`      ❌ Erreur album: ${error.message}`);
      }
    }

    stats.tracksWithPreview += tracksWithPreview;
    stats.tracksWithLyrics += tracksWithLyrics;
    stats.albumsWithDiscogs += albumsWithDiscogs;

    return {
      success: true,
      name: artist.name,
      albumCount,
      trackCount,
      collabCount,
      tracksWithPreview,
      tracksWithLyrics,
      albumsWithDiscogs,
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
  console.log('🔍 === DÉCOUVERTE ULTRA-SLOW (OVERNIGHT) ===\n');

  const artistsCol = db.collection('artists');
  const albumsCol = db.collection('albums');
  const tracksCol = db.collection('tracks');
  const collabsCol = db.collection('collaborations');

  // Seeds initiaux
  console.log('🌱 Recherche de seeds initiaux...\n');

  const seedNames = [
    'Booba', 'Kaaris', 'Ninho', 'SCH', 'Jul', 'Niska', 'PNL',
    'Damso', 'Orelsan', 'Nekfeu', 'Freeze Corleone', 'Alpha Wann',
    'Laylow', 'Hamza', 'Lomepal', 'Rim\'K', 'Sofiane', 'Koba LaD',
    'Gazo', 'Tiakola', 'SDM', 'Zola'
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

  // Exploration récursive ULTRA-SLOW
  console.log(`🐌 Exploration ULTRA-SLOW (target: ${TARGET_ARTISTS} artistes)`);
  console.log(`⏱️  Durée estimée: 10-15 heures\n`);

  crawlStartTime = Date.now(); // Démarrer le chrono

  let roundNumber = 0;
  let lastPauseRound = 0;
  let lastProgressLog = 0;

  while (toExplore.length > 0 && discovered.size < TARGET_ARTISTS) {
    roundNumber++;
    const artistId = toExplore.shift();

    const progress = `${discovered.size}/${TARGET_ARTISTS}`;
    const percentage = ((discovered.size / TARGET_ARTISTS) * 100).toFixed(1);

    console.log(`📦 Round ${roundNumber} | ${progress} (${percentage}%) | Queue: ${toExplore.length}`);

    try {
      const result = await crawlArtistUltraEnriched(artistId, artistsCol, albumsCol, tracksCol, collabsCol);

      if (result.alreadyCrawled) {
        console.log(`   ⏭️  Skip: ${result.name} (déjà crawlé)`);
      } else if (result.skipped) {
        console.log(`   ⏭️  Skip: ${artistId.substring(0, 8)} (${result.reason})`);
      } else if (result.success) {
        console.log(`   ✅ ${result.name}`);
        console.log(`      Albums: ${result.albumCount} | Tracks: ${result.trackCount} (${result.tracksWithPreview} preview)`);
        console.log(`      Collabs: ${result.collabCount} | Bio: ${result.hasBio ? '✓' : '✗'} | Tags: ${result.tagsCount} | Discogs: ${result.albumsWithDiscogs}`);

        // Afficher détails d'injection pour le 1er artiste
        if (stats.artistsCrawled === 1) {
          console.log('\n      ╔══════════════════════════════════════════════════════╗');
          console.log('      ║    📋 EXEMPLE D\'INJECTION DANS LA BDD              ║');
          console.log('      ╚══════════════════════════════════════════════════════╝');
          console.log('      ✅ Collection "artists": 1 document');
          console.log(`      ✅ Collection "albums": ${result.albumCount} documents`);
          console.log(`      ✅ Collection "tracks": ${result.trackCount} documents`);
          console.log(`      ✅ Collection "collaborations": ${result.collabCount} documents`);
          console.log('      ');
          console.log('      📊 Données injectées pour cet artiste:');
          console.log(`         - name, normalizedName, aliases ✅`);
          console.log(`         - location ${result.location ? '✅' : '❌'}`);
          console.log(`         - bio ${result.hasBio ? '✅' : '❌'}`);
          console.log(`         - tags (${result.tagsCount}) ${result.tagsCount > 0 ? '✅' : '❌'}`);
          console.log(`         - popularity, monthlyListeners ✅`);
          console.log('      ');
          console.log('      🎮 Les modes suivants peuvent utiliser ces données:');
          console.log('         🔗 Roland Gamos (featurings)');
          console.log('         🎯 Le Thème (thèmes)');
          console.log('         💰 Les Enchères (mises)');
          console.log('         🎵 Blind Test (audio)');
          console.log('         🖼️  Pixel Cover (pochettes)');
          console.log('         🕵️  Devine Qui (indices)');
          console.log('      ╚══════════════════════════════════════════════════════╝\n');
        }

        // Ajouter les nouveaux artistes
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

      // PAUSE TOUS LES 5 ARTISTES (15 secondes)
      if (roundNumber - lastPauseRound >= 5) {
        console.log(`\n   ⏸️  PAUSE 15s (santé mentale du rate limiter)\n`);
        await new Promise((resolve) => setTimeout(resolve, ARTIST_PAUSE));
        lastPauseRound = roundNumber;
      }

      // Stop si target atteint
      if (discovered.size >= TARGET_ARTISTS) {
        console.log(`\n✅ Target atteint: ${discovered.size} artistes\n`);
        break;
      }

    } catch (error) {
      stats.errors++;
      console.log(`   ❌ ERREUR: ${error.message}`);
      if (error.response) {
        console.log(`      Status: ${error.response.status} | ${error.response.statusText}`);
      }
      console.log(`      Artiste ID: ${artistId}`);
    }

    // Rapport détaillé tous les 10 artistes crawlés
    if (stats.artistsCrawled - lastProgressLog >= 10) {
      lastProgressLog = stats.artistsCrawled;

      const counts = {
        artists: await artistsCol.countDocuments(),
        albums: await albumsCol.countDocuments(),
        tracks: await tracksCol.countDocuments(),
        collabs: await collabsCol.countDocuments(),
      };

      // Afficher barre de progression
      logProgress(discovered.size, TARGET_ARTISTS, crawlStartTime);

      // Statistiques détaillées
      console.log(`📊 BASE DE DONNÉES (Vérification en direct):`);
      console.log(`   Artistes: ${counts.artists.toLocaleString()} | Albums: ${counts.albums.toLocaleString()} | Tracks: ${counts.tracks.toLocaleString()} | Collabs: ${counts.collabs.toLocaleString()}`);

      // Échantillon de la BDD
      const sampleArtist = await artistsCol.findOne({}, { sort: { _id: -1 } });
      if (sampleArtist) {
        console.log(`   💾 Dernier artiste injecté: ${sampleArtist.name} (${sampleArtist.totalAlbums || 0} albums)`);
      }
      console.log();

      console.log(`📈 QUALITÉ DES DONNÉES:`);
      const bioPercent = ((stats.artistsWithBio / stats.artistsCrawled) * 100).toFixed(1);
      const tagsPercent = ((stats.artistsWithTags / stats.artistsCrawled) * 100).toFixed(1);
      const previewPercent = ((stats.tracksWithPreview / stats.tracksCrawled) * 100).toFixed(1);
      console.log(`   Bio: ${stats.artistsWithBio}/${stats.artistsCrawled} (${bioPercent}%)`);
      console.log(`   Tags: ${stats.artistsWithTags}/${stats.artistsCrawled} (${tagsPercent}%)`);
      console.log(`   Preview: ${stats.tracksWithPreview}/${stats.tracksCrawled} (${previewPercent}%)\n`);

      if (stats.spotifyRateLimits > 0 || stats.lastfmRateLimits > 0 || stats.geniusRateLimits > 0) {
        console.log(`⚠️  RATE LIMITS RENCONTRÉS:`);
        console.log(`   Spotify: ${stats.spotifyRateLimits} | Last.fm: ${stats.lastfmRateLimits} | Genius: ${stats.geniusRateLimits}\n`);
      }

      if (stats.errors > 0) {
        console.log(`⚠️  Erreurs: ${stats.errors}\n`);
      }
    }
  }

  console.log(`✅ Découverte terminée: ${discovered.size} artistes\n`);
  stats.artistsDiscovered = discovered.size;
}

// ==========================================
// POST-PROCESSING: CALCULS & TOP ARTISTS
// ==========================================

async function postProcessArtists() {
  console.log('\n\n📊 === POST-PROCESSING DES ARTISTES ===\n');

  const artistsCol = db.collection('artists');
  const albumsCol = db.collection('albums');
  const tracksCol = db.collection('tracks');

  console.log('1️⃣  Calcul des firstReleaseYear, totalAlbums, totalTracks...');

  const artists = await artistsCol.find({}).toArray();
  let processed = 0;

  for (const artist of artists) {
    // Récupérer tous les albums de l'artiste
    const albums = await albumsCol.find({ artistId: artist.spotifyId }).sort({ year: 1 }).toArray();
    const tracks = await tracksCol.find({ artistId: artist.spotifyId }).toArray();

    // Année du premier album
    const firstReleaseYear = albums.length > 0 ? albums[0].year : null;

    // Mettre à jour
    await artistsCol.updateOne(
      { spotifyId: artist.spotifyId },
      {
        $set: {
          firstReleaseYear: firstReleaseYear,
          totalAlbums: albums.length,
          totalTracks: tracks.length,
          updatedAt: new Date(),
        }
      }
    );

    processed++;
    if (processed % 100 === 0) {
      console.log(`   ✅ ${processed}/${artists.length} artistes traités`);
    }
  }

  console.log(`   ✅ ${processed} artistes traités\n`);

  // 2️⃣  MARQUER LES TOP 100-200 ARTISTES
  console.log('2️⃣  Identification des Top 100-200 rappeurs...');

  // Trier par popularityScore décroissant
  const topArtists = await artistsCol
    .find({})
    .sort({ popularityScore: -1 })
    .limit(200)
    .toArray();

  console.log(`   🎯 Top 200 artistes identifiés`);
  console.log(`   📊 Range de popularité: ${topArtists[0]?.popularityScore} → ${topArtists[199]?.popularityScore}`);

  // Marquer les top 200 et calculer les poids
  for (let i = 0; i < topArtists.length; i++) {
    const artist = topArtists[i];

    // Poids de sélection:
    // - Top 100: weight = 100 (100x plus probable)
    // - Top 200: weight = 50  (50x plus probable)
    // - Autres: weight = 1    (probabilité de base)
    const selectionWeight = i < 100 ? 100 : 50;

    await artistsCol.updateOne(
      { spotifyId: artist.spotifyId },
      {
        $set: {
          isTopArtist: true,
          selectionWeight: selectionWeight,
          topRank: i + 1,
          updatedAt: new Date(),
        }
      }
    );
  }

  console.log(`   ✅ Top 200 artistes marqués avec poids de sélection\n`);

  // 3️⃣  STATS FINALES
  const stats = {
    total: await artistsCol.countDocuments(),
    top100: await artistsCol.countDocuments({ topRank: { $lte: 100 } }),
    top200: await artistsCol.countDocuments({ isTopArtist: true }),
    withFirstYear: await artistsCol.countDocuments({ firstReleaseYear: { $ne: null } }),
    totalWeight: 0,
  };

  // Calculer le poids total pour probabilités
  const allArtists = await artistsCol.find({}).toArray();
  stats.totalWeight = allArtists.reduce((sum, a) => sum + (a.selectionWeight || 1), 0);

  console.log('📊 Statistiques de popularité:');
  console.log(`   - Total artistes: ${stats.total}`);
  console.log(`   - Top 100 (weight=100): ${stats.top100}`);
  console.log(`   - Top 200 (weight=50): ${stats.top200 - stats.top100}`);
  console.log(`   - Autres (weight=1): ${stats.total - stats.top200}`);
  console.log(`   - Poids total: ${stats.totalWeight.toLocaleString()}`);
  console.log(`   - Avec année de début: ${stats.withFirstYear}\n`);

  return stats;
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║        🇫🇷 CRAWLER RAP FRANÇAIS (OVERNIGHT MODE)           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`📅 Démarrage: ${new Date().toLocaleString('fr-FR')}\n`);

  console.log('⚙️  CONFIGURATION:');
  console.log(`   Target                  : ${TARGET_ARTISTS.toLocaleString()} artistes`);
  console.log(`   Minimum followers       : ${MIN_FOLLOWERS.toLocaleString()}`);
  console.log(`   Max albums/artiste      : ${MAX_ALBUMS_PER_ARTIST}`);
  console.log();

  console.log('⏱️  DÉLAIS (anti-rate-limit):');
  console.log(`   Spotify                 : ${SPOTIFY_DELAY}ms`);
  console.log(`   Last.fm                 : ${LASTFM_DELAY}ms`);
  console.log(`   Genius                  : ${GENIUS_DELAY}ms`);
  console.log(`   Discogs                 : ${DISCOGS_DELAY}ms`);
  console.log(`   Pause tous les 5        : ${ARTIST_PAUSE/1000}s`);
  console.log();

  console.log('📊 SOURCES DE DONNÉES:');
  console.log(`   ✅ Spotify API          : Artistes, albums, tracks, popularity`);
  console.log(`   ${LASTFM_API_KEY ? '✅' : '❌'} Last.fm API          : Bio, tags, location`);
  console.log(`   ✅ Wikidata API         : Location (fallback)`);
  console.log(`   ${GENIUS_ACCESS_TOKEN ? '✅' : '❌'} Genius API           : Lyrics`);
  console.log(`   ${DISCOGS_CONSUMER_KEY ? '✅' : '❌'} Discogs API          : Labels, formats`);
  console.log();

  console.log('📈 FEATURES:');
  console.log('   ✅ Normalisation des noms (fuzzy matching)');
  console.log('   ✅ Génération automatique d\'alias');
  console.log('   ✅ Détection de localisation (départements FR)');
  console.log('   ✅ Scoring de popularité (sélection pondérée)');
  console.log('   ✅ Top 200 artistes avec poids ×50-100');
  console.log();

  console.log('⏳ DURÉE ESTIMÉE: 10-15 heures');
  console.log('💡 TIP: Lance le crawler et va dormir! ☕\n');

  console.log('═══════════════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  try {
    await connectDB();
    await discoverAndCrawl();

    // 🆕 POST-PROCESSING (calcul années, top artists, poids)
    await postProcessArtists();

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
      albumsWithDiscogs: await albumsCol.countDocuments({ discogsId: { $ne: null, $exists: true } }),
    };

    console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║               📊 STATISTIQUES FINALES                       ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('🎤 ARTISTES:');
    console.log(`   Total                   : ${finalCounts.artists.toLocaleString()}`);
    console.log(`   - Avec bio Last.fm      : ${finalCounts.artistsWithBio.toLocaleString()} (${((finalCounts.artistsWithBio/finalCounts.artists)*100).toFixed(1)}%)`);
    console.log(`   - Avec tags détaillés   : ${finalCounts.artistsWithTags.toLocaleString()} (${((finalCounts.artistsWithTags/finalCounts.artists)*100).toFixed(1)}%)`);
    console.log();

    console.log('🎵 TRACKS:');
    console.log(`   Total                   : ${finalCounts.tracks.toLocaleString()}`);
    console.log(`   - Avec preview Spotify  : ${finalCounts.tracksWithPreview.toLocaleString()} (${((finalCounts.tracksWithPreview/finalCounts.tracks)*100).toFixed(1)}%)`);
    console.log(`   - Avec Genius link      : ${finalCounts.tracksWithGenius.toLocaleString()} (${((finalCounts.tracksWithGenius/finalCounts.tracks)*100).toFixed(1)}%)`);
    console.log();

    console.log('💿 ALBUMS:');
    console.log(`   Total                   : ${finalCounts.albums.toLocaleString()}`);
    console.log(`   - Avec Discogs data     : ${finalCounts.albumsWithDiscogs.toLocaleString()} (${((finalCounts.albumsWithDiscogs/finalCounts.albums)*100).toFixed(1)}%)`);
    console.log();

    console.log('🔗 COLLABORATIONS:');
    console.log(`   Total                   : ${finalCounts.collabs.toLocaleString()}`);
    console.log();

    console.log('⚠️  INCIDENTS:');
    console.log(`   Erreurs                 : ${stats.errors}`);
    console.log(`   Rate limits rencontrés  :`);
    console.log(`     - Spotify             : ${stats.spotifyRateLimits}`);
    console.log(`     - Last.fm             : ${stats.lastfmRateLimits}`);
    console.log(`     - Genius              : ${stats.geniusRateLimits}`);
    console.log();

    const duration = Date.now() - startTime;
    const durationStr = formatDuration(duration);
    const avgSpeed = (finalCounts.artists / (duration / 1000 / 60)).toFixed(2);

    console.log('⏱️  PERFORMANCE:');
    console.log(`   Durée totale            : ${durationStr}`);
    console.log(`   Vitesse moyenne         : ${avgSpeed} artistes/min`);
    console.log();

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ CRAWL TERMINÉ AVEC SUCCÈS!              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('🎮 Le jeu peut maintenant être lancé avec:');
    console.log('   npm run dev\n');

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
