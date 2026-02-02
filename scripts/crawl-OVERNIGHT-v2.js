#!/usr/bin/env node

// ============================================
// CRAWLER RAP FRANÇAIS - VERSION 2 (AMÉLIORÉ)
// ============================================
// CORRECTIONS MAJEURES vs V1:
// 1. DEEZER API pour preview URLs (Spotify les a supprimées fin 2024)
// 2. Fetch FULL track objects (popularity était jamais récupérée - bug critique)
// 3. Déduplication albums (Deluxe, Remaster, Clean vs Explicit)
// 4. Classification tiers: mainstream/mid/underground
// 5. Logging détaillé par artiste + résumé game modes
// 6. Stockage Genius URLs pour lyrics (script séparé fetch-lyrics.js)
// 7. Album type tracking (album vs single vs compilation)
// 8. Vérification data completeness pour chaque mode de jeu
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
const DISCOGS_CONSUMER_KEY = process.env.DISCOGS_CONSUMER_KEY;

const MIN_FOLLOWERS = 5000;
const TARGET_ARTISTS = 3000;
const DEFAULT_CONTINUE_TARGET = 1000;

// DÉLAIS (anti-rate-limit)
const SPOTIFY_DELAY = 800;
const LASTFM_DELAY = 600;
const GENIUS_DELAY = 1000;
const DISCOGS_DELAY = 1500;
const DEEZER_DELAY = 250;       // Deezer: 50 req/5s = 100ms min, on prend 250ms
const ARTIST_PAUSE = 15000;
const BATCH_PAUSE = 3000;

const MAX_ALBUMS_PER_ARTIST = 20;
// Nombre max de tracks par artiste pour lesquelles on cherche un preview Deezer
const MAX_DEEZER_LOOKUPS_PER_ARTIST = 25;
// Popularité minimum pour chercher un preview Deezer (pas la peine pour les tracks obscures)
const DEEZER_MIN_POPULARITY = 20;

// TIERS DE POPULARITÉ
const TIER_THRESHOLDS = {
  mainstream: { minFollowers: 300000, minPopularity: 60 },
  mid:        { minFollowers: 30000,  minPopularity: 30 },
  // underground = tout le reste
};

// ==========================================
// STATS
// ==========================================

let stats = {
  artistsDiscovered: 0,
  artistsCrawled: 0,
  artistsSkipped: 0,
  artistsWithBio: 0,
  artistsWithTags: 0,
  artistsWithLocation: 0,
  albumsCrawled: 0,
  albumsDeduped: 0,
  tracksCrawled: 0,
  tracksWithSpotifyPreview: 0,
  tracksWithDeezerPreview: 0,
  tracksWithAnyPreview: 0,
  tracksWithGenius: 0,
  tracksPopular: 0,       // popularity >= 50
  collabsFound: 0,
  errors: 0,
  spotifyRateLimits: 0,
  lastfmRateLimits: 0,
  geniusRateLimits: 0,
  deezerErrors: 0,
  // Par tier
  tierMainstream: 0,
  tierMid: 0,
  tierUnderground: 0,
};

let crawlStartTime = 0;
let DEDUPE_NAME = false;

// ==========================================
// HELPERS
// ==========================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getArgValue(args, flag, fallback = null) {
  const direct = args.find(a => a.startsWith(`${flag}=`));
  if (direct) {
    return direct.split('=').slice(1).join('=');
  }
  const idx = args.indexOf(flag);
  if (idx !== -1) {
    const next = args[idx + 1];
    if (next && !next.startsWith('--')) return next;
  }
  return fallback;
}

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getProgressBar(current, total, width = 30) {
  const percentage = Math.min(100, (current / total) * 100);
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage.toFixed(1)}%`;
}

function getETA(startTime, current, total) {
  if (current === 0) return '???';
  const elapsed = Date.now() - startTime;
  const rate = current / elapsed;
  const remaining = total - current;
  return formatDuration(remaining / rate);
}

function logProgress(current, total, startTime) {
  const bar = getProgressBar(current, total);
  const eta = getETA(startTime, current, total);
  const elapsed = formatDuration(Date.now() - startTime);
  const speed = current > 0 ? (current / ((Date.now() - startTime) / 60000)).toFixed(1) : '0';

  console.log(`\n┌──────────────────────────────────────────────────────────────┐`);
  console.log(`│ 📊 PROGRESSION: ${current}/${total} artistes`);
  console.log(`│ ${bar}`);
  console.log(`│ ⏱️  Écoulé: ${elapsed} | ETA: ${eta} | ⚡ ${speed} art/min`);
  console.log(`└──────────────────────────────────────────────────────────────┘`);
}

// ==========================================
// SPOTIFY AUTH & REQUEST
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
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
    }
  );

  spotifyAccessToken = response.data.access_token;
  tokenExpiresAt = Date.now() + response.data.expires_in * 1000 - 60000;
  console.log('✅ Token Spotify obtenu\n');
  return spotifyAccessToken;
}

async function spotifyRequest(endpoint, params = {}) {
  const token = await getSpotifyToken();
  await sleep(SPOTIFY_DELAY);

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
      console.warn(`   ⏳ Rate limit Spotify! Attente ${retryAfter}s... (#${stats.spotifyRateLimits})`);
      await sleep(retryAfter * 1000);
      return spotifyRequest(endpoint, params);
    }
    throw error;
  }
}

// ==========================================
// BATCH FETCH FULL TRACKS (pour popularity + preview)
// ==========================================

async function fetchFullTracks(trackIds) {
  if (trackIds.length === 0) return [];

  const allFullTracks = [];

  // Spotify /tracks endpoint accepte max 50 IDs
  for (let i = 0; i < trackIds.length; i += 50) {
    const batch = trackIds.slice(i, i + 50);
    try {
      const data = await spotifyRequest('/tracks', {
        ids: batch.join(','),
        market: 'FR',
      });
      allFullTracks.push(...(data.tracks || []));
    } catch (error) {
      console.warn(`      ⚠️  Erreur batch tracks ${i}-${i + 50}: ${error.message}`);
      // Push nulls pour maintenir l'alignement
      batch.forEach(() => allFullTracks.push(null));
    }
  }

  return allFullTracks;
}

// ==========================================
// DEEZER API (preview URLs fallback)
// ==========================================

async function deezerSearchTrack(artistName, trackTitle) {
  await sleep(DEEZER_DELAY);

  try {
    // Nettoyer les noms pour la recherche
    const cleanArtist = artistName.replace(/['"]/g, '');
    const cleanTitle = trackTitle.replace(/['"]/g, '').replace(/\s*\(feat\..*?\)/i, '');

    const response = await axios.get('https://api.deezer.com/search', {
      params: {
        q: `artist:"${cleanArtist}" track:"${cleanTitle}"`,
        limit: 5,
      },
      timeout: 10000,
    });

    const results = response.data?.data || [];
    if (results.length === 0) return null;

    // Trouver le meilleur match (vérifier que l'artiste correspond)
    const normalizedArtist = normalizeName(artistName);
    const bestMatch = results.find(r =>
      normalizeName(r.artist?.name || '').includes(normalizedArtist) ||
      normalizedArtist.includes(normalizeName(r.artist?.name || ''))
    ) || results[0];

    if (!bestMatch.preview) return null;

    return {
      deezerId: bestMatch.id,
      deezerPreviewUrl: bestMatch.preview,
      deezerTitle: bestMatch.title,
      deezerArtist: bestMatch.artist?.name,
      deezerAlbumCover: bestMatch.album?.cover_xl || bestMatch.album?.cover_big || null,
    };
  } catch (error) {
    stats.deezerErrors++;
    return null;
  }
}

// ==========================================
// LAST.FM API
// ==========================================

async function lastfmRequest(method, params = {}) {
  if (!LASTFM_API_KEY) return null;
  await sleep(LASTFM_DELAY);

  try {
    const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: { method, api_key: LASTFM_API_KEY, format: 'json', ...params },
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      stats.lastfmRateLimits++;
      console.warn(`   ⏳ Rate limit Last.fm! Attente 10s... (#${stats.lastfmRateLimits})`);
      await sleep(10000);
      return lastfmRequest(method, params);
    }
    return null;
  }
}

async function getArtistEnrichedData(artistName) {
  try {
    const data = await lastfmRequest('artist.getInfo', { artist: artistName });
    const tagsData = await lastfmRequest('artist.getTopTags', { artist: artistName });

    const artist = data?.artist;
    if (!artist) return null;

    const bio = artist.bio?.content || artist.bio?.summary || '';
    const bioClean = bio.replace(/<a[^>]*>.*?<\/a>/gi, '').trim();

    const tags = (tagsData?.toptags?.tag || [])
      .slice(0, 15)
      .map(t => t.name.toLowerCase())
      .filter(t => !['seen live', 'albums i own', 'favorite', 'favourites'].includes(t));

    // Patterns de localisation
    const patterns = {
      '91': /91|Essonne|Évry|Corbeil|Massy|Grigny|Longjumeau/i,
      '92': /92|Hauts-de-Seine|Boulogne|Nanterre|Colombes|Asnières|Gennevilliers|Rueil/i,
      '93': /93|Seine-Saint-Denis|Sevran|Bondy|Montreuil|Bobigny|Aulnay|Saint-Denis|Noisy|Pantin|Aubervilliers|Drancy|Épinay|Stains|Clichy-sous-Bois/i,
      '94': /94|Val-de-Marne|Créteil|Ivry|Vitry|Champigny|Villejuif|Fontenay|Alfortville|Choisy/i,
      '95': /95|Val-d'Oise|Argenteuil|Cergy|Sarcelles|Garges|Villiers-le-Bel|Gonesse/i,
      '75': /Paris|75|parisien/i,
      '13': /Marseille|13|Bouches-du-Rhône|phocé/i,
      '69': /Lyon|69|Rhône|lyonnais/i,
      '59': /Lille|59|Nord|Roubaix|Tourcoing/i,
      '33': /Bordeaux|33|Gironde/i,
      '31': /Toulouse|31|Haute-Garonne/i,
      '67': /Strasbourg|67|Bas-Rhin/i,
      '44': /Nantes|44|Loire-Atlantique/i,
      '76': /Rouen|76|Seine-Maritime|Le Havre/i,
      '34': /Montpellier|34|Hérault/i,
    };

    let location = {};
    for (const [dept, regex] of Object.entries(patterns)) {
      if (regex.test(bio)) {
        location = { department: dept, country: 'FR' };
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
// WIKIDATA (localisation structurée)
// ==========================================

async function getLocationFromWikidata(artistName) {
  await sleep(500);

  try {
    const query = `
      SELECT ?item ?birthPlaceLabel ?countryLabel WHERE {
        ?item wdt:P31 wd:Q5 .
        ?item ?label "${artistName}"@fr .
        OPTIONAL { ?item wdt:P19 ?birthPlace . }
        OPTIONAL { ?item wdt:P27 ?country . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en" }
      }
      LIMIT 1
    `;

    const response = await axios.get('https://query.wikidata.org/sparql', {
      params: { query, format: 'json' },
      headers: { 'User-Agent': 'RapBattleGame/2.0' },
      timeout: 10000,
    });

    const bindings = response.data?.results?.bindings || [];
    if (bindings.length === 0) return null;

    const result = bindings[0];
    const birthPlace = result.birthPlaceLabel?.value;
    const country = result.countryLabel?.value;

    if (!birthPlace) return null;

    const locationMap = {
      'Boulogne-Billancourt': '92', 'Nanterre': '92', 'Colombes': '92',
      'Sevran': '93', 'Bondy': '93', 'Montreuil': '93', 'Bobigny': '93',
      'Aulnay-sous-Bois': '93', 'Saint-Denis': '93', 'Noisy-le-Grand': '93',
      'Pantin': '93', 'Aubervilliers': '93', 'Drancy': '93', 'Épinay-sur-Seine': '93',
      'Stains': '93', 'Clichy-sous-Bois': '93',
      'Corbeil-Essonnes': '91', 'Évry': '91', 'Longjumeau': '91', 'Grigny': '91',
      'Créteil': '94', 'Ivry-sur-Seine': '94', 'Vitry-sur-Seine': '94',
      'Champigny-sur-Marne': '94',
      'Argenteuil': '95', 'Cergy': '95', 'Sarcelles': '95', 'Garges-lès-Gonesse': '95',
      'Paris': '75',
      'Marseille': '13', 'Lyon': '69', 'Lille': '59', 'Bordeaux': '33',
      'Toulouse': '31', 'Nice': '06', 'Nantes': '44', 'Strasbourg': '67',
      'Roubaix': '59', 'Caen': '14', 'Rouen': '76', 'Le Havre': '76',
      'Montpellier': '34',
    };

    for (const [ville, dept] of Object.entries(locationMap)) {
      if (birthPlace.includes(ville)) {
        return { department: dept, city: ville, country: 'FR', source: 'wikidata' };
      }
    }

    if (country) {
      const countryCode = country === 'France' ? 'FR' :
                           country === 'Belgique' || country === 'Belgium' ? 'BE' :
                           country === 'Algérie' || country === 'Algeria' ? 'DZ' :
                           country === 'Maroc' || country === 'Morocco' ? 'MA' :
                           country === 'Tunisie' || country === 'Tunisia' ? 'TN' :
                           country === 'République démocratique du Congo' ? 'CD' :
                           country === 'Comores' ? 'KM' : null;
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
// NORMALISATION & ALIAS
// ==========================================

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateAliases(name) {
  const normalized = normalizeName(name);
  const aliases = new Set([normalized]);

  // Sans espaces (ex: "freeze corleone" → "freezecorleone")
  aliases.add(normalized.replace(/\s/g, ''));

  // Premier mot seulement (ex: "Freeze Corleone" → "freeze")
  const words = normalized.split(' ');
  if (words.length > 1) {
    aliases.add(words[0]);
    // Deux premiers mots (ex: "Alpha Wann" → "alpha wann" déjà ok)
  }

  // Sans apostrophes/tirets dans l'original
  const withoutSpecial = name.toLowerCase().replace(/['\-]/g, ' ');
  aliases.add(normalizeName(withoutSpecial));
  aliases.add(normalizeName(withoutSpecial).replace(/\s/g, ''));

  // Variantes courantes
  const variations = {
    'lad': 'la d', 'la d': 'lad',
    'le ': 'l', 'l ': 'le ',
  };
  for (const [from, to] of Object.entries(variations)) {
    if (normalized.includes(from)) {
      aliases.add(normalized.replace(from, to));
    }
  }

  // Retirer le nom normalisé lui-même de la liste
  const result = Array.from(aliases).filter(a => a !== normalized && a.length > 1);
  return result;
}

// ==========================================
// CLASSIFICATION TIER
// ==========================================

function classifyTier(followers, popularity) {
  if (followers >= TIER_THRESHOLDS.mainstream.minFollowers ||
      popularity >= TIER_THRESHOLDS.mainstream.minPopularity) {
    return 'mainstream';
  }
  if (followers >= TIER_THRESHOLDS.mid.minFollowers ||
      popularity >= TIER_THRESHOLDS.mid.minPopularity) {
    return 'mid';
  }
  return 'underground';
}

// ==========================================
// DÉDUPLICATION ALBUMS
// ==========================================

function deduplicateAlbums(albums) {
  // Trier: albums d'abord, puis singles
  const sorted = [...albums].sort((a, b) => {
    const typeOrder = { album: 0, single: 1, compilation: 2 };
    return (typeOrder[a.album_group] || 3) - (typeOrder[b.album_group] || 3);
  });

  const seen = new Map(); // normalizedTitle → album
  const unique = [];

  for (const album of sorted) {
    // Normaliser le titre pour détecter les doublons
    let normalizedTitle = album.name
      .toLowerCase()
      .replace(/\s*\(deluxe\)/i, '')
      .replace(/\s*\(deluxe edition\)/i, '')
      .replace(/\s*\(bonus track version\)/i, '')
      .replace(/\s*\(remaster(ed)?\)/i, '')
      .replace(/\s*\(clean\)/i, '')
      .replace(/\s*\(explicit\)/i, '')
      .replace(/\s*\(version deluxe\)/i, '')
      .replace(/\s*-\s*deluxe/i, '')
      .replace(/\s*\(edition collector\)/i, '')
      .replace(/\s*\(chrome edition\)/i, '')
      .replace(/\s*\(réédition\)/i, '')
      .trim();

    if (seen.has(normalizedTitle)) {
      // Garder la version avec le plus de tracks
      const existing = seen.get(normalizedTitle);
      if ((album.total_tracks || 0) > (existing.total_tracks || 0)) {
        // Remplacer par la version plus complète
        const idx = unique.indexOf(existing);
        if (idx !== -1) unique[idx] = album;
        seen.set(normalizedTitle, album);
      }
      stats.albumsDeduped++;
    } else {
      seen.set(normalizedTitle, album);
      unique.push(album);
    }
  }

  return unique;
}

// ==========================================
// DISCOGS API
// ==========================================

async function discogsSearchAlbum(artistName, albumTitle) {
  if (!DISCOGS_CONSUMER_KEY) return null;
  await sleep(DISCOGS_DELAY);

  try {
    const response = await axios.get('https://api.discogs.com/database/search', {
      params: {
        artist: artistName, release_title: albumTitle,
        type: 'release', per_page: 1,
      },
      headers: {
        'User-Agent': 'RapBattleGame/2.0',
        Authorization: `Discogs key=${DISCOGS_CONSUMER_KEY}`,
      },
      timeout: 15000,
    });

    const results = response.data?.results || [];
    if (results.length === 0) return null;

    const release = results[0];
    return {
      discogsId: release.id,
      label: release.label?.[0] || null,
      coverUrlHD: release.cover_image || null,
    };
  } catch (error) {
    return null;
  }
}

// ==========================================
// GENIUS API
// ==========================================

async function searchGeniusSong(artist, title) {
  if (!GENIUS_ACCESS_TOKEN) return null;
  await sleep(GENIUS_DELAY);

  try {
    const response = await axios.get('https://api.genius.com/search', {
      params: { q: `${artist} ${title}` },
      headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` },
      timeout: 15000,
    });

    const hits = response.data?.response?.hits || [];
    if (hits.length === 0) return null;

    // Vérifier que le résultat correspond bien à l'artiste
    const normalizedArtist = normalizeName(artist);
    const bestHit = hits.find(h =>
      normalizeName(h.result?.primary_artist?.name || '').includes(normalizedArtist) ||
      normalizedArtist.includes(normalizeName(h.result?.primary_artist?.name || ''))
    ) || hits[0];

    const song = bestHit.result;
    return {
      geniusId: song.id,
      geniusUrl: song.url,
      geniusTitle: song.title,
      geniusArtist: song.primary_artist?.name,
      geniusImageUrl: song.song_art_image_url || null,
    };
  } catch (error) {
    if (error.response?.status === 429) {
      stats.geniusRateLimits++;
      console.warn(`   ⏳ Rate limit Genius! Skip... (#${stats.geniusRateLimits})`);
    }
    return null;
  }
}

// ==========================================
// MONGODB
// ==========================================

let db = null;

async function connectDB() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           🔌 CONNEXION MONGODB                             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('📍 URI:', MONGODB_URI);

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();
    console.log('✅ Connexion réussie!\n');

    // Stats existantes
    const collections = await db.listCollections().toArray();
    if (collections.length > 0) {
      console.log('📦 Collections existantes:');
      for (const col of collections) {
        if (col.name.startsWith('_')) continue;
        const count = await db.collection(col.name).countDocuments();
        console.log(`   ${col.name}: ${count.toLocaleString()} documents`);
      }
      console.log();
    }

    // Créer les index nécessaires
    console.log('🔍 Création/vérification des index...');
    const artistsCol = db.collection('artists');
    const tracksCol = db.collection('tracks');
    const albumsCol = db.collection('albums');
    const collabsCol = db.collection('collaborations');

    await artistsCol.createIndex({ spotifyId: 1 }, { unique: true });
    await artistsCol.createIndex({ normalizedName: 1 });
    await artistsCol.createIndex({ tier: 1 });
    await artistsCol.createIndex({ 'location.department': 1 });
    await artistsCol.createIndex({ popularity: -1 });

    await tracksCol.createIndex({ spotifyId: 1 }, { unique: true });
    await tracksCol.createIndex({ artistId: 1 });
    await tracksCol.createIndex({ 'featuring.artistId': 1 });
    await tracksCol.createIndex({ previewUrl: 1 });
    await tracksCol.createIndex({ popularity: -1 });

    await albumsCol.createIndex({ spotifyId: 1 }, { unique: true });
    await albumsCol.createIndex({ artistId: 1 });

    await collabsCol.createIndex({ artistAId: 1, artistBId: 1, trackId: 1 }, { unique: true });
    await collabsCol.createIndex({ artistAId: 1 });
    await collabsCol.createIndex({ artistBId: 1 });

    console.log('✅ Index OK\n');

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ MONGODB PRÊT                                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ ERREUR MONGODB:', error.message);
    console.error('💡 Vérifie que MongoDB tourne: mongod');
    throw error;
  }
}

// ==========================================
// CRAWL UN ARTISTE (VERSION 2)
// ==========================================

async function crawlArtistV2(artistId, collections) {
  const { artistsCol, albumsCol, tracksCol, collabsCol } = collections;

  try {
    // 1. Vérifier si déjà crawlé
    const existing = await artistsCol.findOne({ spotifyId: artistId });
    if (existing) {
      return { alreadyCrawled: true, name: existing.name, newArtists: [] };
    }

    // 2. Récupérer artiste Spotify
    const artist = await spotifyRequest(`/artists/${artistId}`);

    if (artist.followers?.total < MIN_FOLLOWERS) {
      stats.artistsSkipped++;
      return { skipped: true, reason: 'followers', name: artist.name, newArtists: [] };
    }

    const normalizedName = normalizeName(artist.name);
    if (DEDUPE_NAME) {
      const existingByName = await artistsCol.findOne({ normalizedName });
      if (existingByName) {
        stats.artistsSkipped++;
        return { skipped: true, reason: 'name-duplicate', name: artist.name, newArtists: [] };
      }
    }

    const followers = artist.followers?.total || 0;
    const popularity = artist.popularity || 0;

    // 3. Classification tier
    const tier = classifyTier(followers, popularity);
    stats[`tier${tier.charAt(0).toUpperCase() + tier.slice(1)}`]++;

    // 4. Enrichissement Last.fm
    console.log(`   🔍 Last.fm: ${artist.name}...`);
    const enrichedData = await getArtistEnrichedData(artist.name);

    // 5. Fallback Wikidata pour location
    let location = enrichedData?.location || {};
    if (!location.department && !location.city) {
      const wikidataLocation = await getLocationFromWikidata(artist.name);
      if (wikidataLocation) {
        location = wikidataLocation;
        console.log(`      📍 Wikidata: ${wikidataLocation.city || wikidataLocation.country}`);
      }
    }

    if (location.department || location.city) stats.artistsWithLocation++;

    // 6. Alias
    const aliases = generateAliases(artist.name);

    // 7. Insérer artiste
    await artistsCol.insertOne({
      spotifyId: artist.id,
      name: artist.name,
      normalizedName,
      aliases,
      monthlyListeners: followers,
      popularity,
      genres: artist.genres || [],
      imageUrl: artist.images?.[0]?.url || null,

      // Last.fm
      bio: enrichedData?.bio || null,
      tags: enrichedData?.tags || [],
      location,
      lastfmListeners: enrichedData?.listeners || 0,
      lastfmPlaycount: enrichedData?.playcount || 0,

      // Tier & sélection
      tier,
      popularityScore: Math.floor(followers / 10000) + (popularity * 10),

      // Sera calculé en post-processing
      firstReleaseYear: null,
      totalAlbums: 0,
      totalSingles: 0,
      totalTracks: 0,
      totalCollabs: 0,
      tracksWithPreview: 0,

      createdAt: new Date(),
      updatedAt: new Date(),
    });

    stats.artistsCrawled++;
    if (enrichedData?.bio) stats.artistsWithBio++;
    if (enrichedData?.tags?.length > 0) stats.artistsWithTags++;

    // 8. Récupérer albums
    const albumsData = await spotifyRequest(`/artists/${artistId}/albums`, {
      include_groups: 'album,single',
      limit: MAX_ALBUMS_PER_ARTIST,
      market: 'FR',
    });

    // 9. Déduplication albums
    const rawAlbums = (albumsData.items || []).slice(0, MAX_ALBUMS_PER_ARTIST);
    const uniqueAlbums = deduplicateAlbums(rawAlbums);

    // Stats par artiste
    let artistStats = {
      albums: 0,
      singles: 0,
      tracks: 0,
      tracksWithSpotifyPreview: 0,
      tracksWithDeezerPreview: 0,
      tracksWithAnyPreview: 0,
      tracksPopular: 0,
      collabs: 0,
      geniusFound: 0,
      deduped: rawAlbums.length - uniqueAlbums.length,
    };

    const newArtistIds = new Set();
    let deezerLookupsThisArtist = 0;

    // 10. Pour chaque album
    for (const albumSimple of uniqueAlbums) {
      try {
        await sleep(BATCH_PAUSE);

        // Album complet
        const album = await spotifyRequest(`/albums/${albumSimple.id}`);
        const albumType = albumSimple.album_group || 'album'; // album, single, compilation
        const isFullAlbum = albumType === 'album';

        if (isFullAlbum) artistStats.albums++;
        else artistStats.singles++;

        // Discogs (seulement pour les vrais albums)
        let discogsData = null;
        if (isFullAlbum && DISCOGS_CONSUMER_KEY) {
          discogsData = await discogsSearchAlbum(artist.name, album.name);
        }

        // Insérer album
        await albumsCol.updateOne(
          { spotifyId: album.id },
          {
            $set: {
              spotifyId: album.id,
              title: album.name,
              artistId: artist.id,
              artistName: artist.name,
              year: parseInt(album.release_date?.split('-')[0]) || null,
              coverUrl: album.images?.[0]?.url || null,
              coverUrlHD: discogsData?.coverUrlHD || album.images?.[0]?.url || null,
              label: album.label || discogsData?.label || null,
              totalTracks: album.total_tracks || 0,
              albumType, // 'album' ou 'single'
              discogsId: discogsData?.discogsId || null,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );
        stats.albumsCrawled++;

        // Collecter les IDs de tracks pour batch fetch
        const simplifiedTracks = album.tracks?.items || [];
        const trackIds = simplifiedTracks.map(t => t.id).filter(Boolean);

        // BATCH FETCH full tracks (pour popularity + preview_url)
        const fullTracks = await fetchFullTracks(trackIds);
        const fullTrackMap = new Map();
        for (const ft of fullTracks) {
          if (ft) fullTrackMap.set(ft.id, ft);
        }

        // Log album
        const albumLabel = isFullAlbum ? '💿' : '💽';
        console.log(`      ${albumLabel} ${album.name} (${album.total_tracks} tracks, ${albumType})`);

        // Traiter chaque track
        for (const track of simplifiedTracks) {
          const fullTrack = fullTrackMap.get(track.id);
          const trackPopularity = fullTrack?.popularity || 0;

          // Preview: Spotify d'abord, puis Deezer en fallback
          let spotifyPreview = fullTrack?.preview_url || track.preview_url || null;
          let deezerData = null;
          let finalPreviewUrl = spotifyPreview;

          if (spotifyPreview) {
            artistStats.tracksWithSpotifyPreview++;
            stats.tracksWithSpotifyPreview++;
          }

          // Deezer fallback: seulement si pas de preview ET track assez populaire
          if (!finalPreviewUrl &&
              trackPopularity >= DEEZER_MIN_POPULARITY &&
              deezerLookupsThisArtist < MAX_DEEZER_LOOKUPS_PER_ARTIST) {
            deezerData = await deezerSearchTrack(artist.name, track.name);
            deezerLookupsThisArtist++;

            if (deezerData?.deezerPreviewUrl) {
              finalPreviewUrl = deezerData.deezerPreviewUrl;
              artistStats.tracksWithDeezerPreview++;
              stats.tracksWithDeezerPreview++;
            }
          }

          if (finalPreviewUrl) {
            artistStats.tracksWithAnyPreview++;
            stats.tracksWithAnyPreview++;
          }

          if (trackPopularity >= 50) {
            artistStats.tracksPopular++;
            stats.tracksPopular++;
          }

          // Featurings
          const featuring = track.artists
            .filter(a => a.id !== artist.id)
            .map(a => ({ artistId: a.id, artistName: a.name }));

          featuring.forEach(f => newArtistIds.add(f.artistId));

          // Genius (pour tracks avec popularité >= 40 - CORRIGÉ: utilise fullTrack.popularity)
          let geniusData = null;
          if (trackPopularity >= 40 && GENIUS_ACCESS_TOKEN) {
            geniusData = await searchGeniusSong(artist.name, track.name);
            if (geniusData) {
              artistStats.geniusFound++;
              stats.tracksWithGenius++;
            }
          }

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
                albumType,
                featuring,
                year: parseInt(album.release_date?.split('-')[0]) || null,
                durationMs: track.duration_ms || 0,
                trackNumber: track.track_number || 0,
                popularity: trackPopularity,
                explicit: track.explicit || false,

                // Preview URLs
                previewUrl: finalPreviewUrl,
                spotifyPreviewUrl: spotifyPreview,
                deezerPreviewUrl: deezerData?.deezerPreviewUrl || null,
                deezerId: deezerData?.deezerId || null,

                // Genius
                geniusId: geniusData?.geniusId || null,
                geniusUrl: geniusData?.geniusUrl || null,

                // Cover (pour Pixel Cover mode - fallback Deezer si meilleure qualité)
                coverUrl: album.images?.[0]?.url || deezerData?.deezerAlbumCover || null,

                updatedAt: new Date(),
              },
              $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true }
          );

          artistStats.tracks++;
          stats.tracksCrawled++;

          // Collaborations (A→B et B→A)
          for (const feat of featuring) {
            try {
              await collabsCol.updateOne(
                { artistAId: artist.id, artistBId: feat.artistId, trackId: track.id },
                {
                  $set: {
                    artistAId: artist.id, artistAName: artist.name,
                    artistBId: feat.artistId, artistBName: feat.artistName,
                    trackId: track.id, trackTitle: track.name,
                    verified: true, source: 'spotify',
                    updatedAt: new Date(),
                  },
                  $setOnInsert: { createdAt: new Date() },
                },
                { upsert: true }
              );

              await collabsCol.updateOne(
                { artistAId: feat.artistId, artistBId: artist.id, trackId: track.id },
                {
                  $set: {
                    artistAId: feat.artistId, artistAName: feat.artistName,
                    artistBId: artist.id, artistBName: artist.name,
                    trackId: track.id, trackTitle: track.name,
                    verified: true, source: 'spotify',
                    updatedAt: new Date(),
                  },
                  $setOnInsert: { createdAt: new Date() },
                },
                { upsert: true }
              );

              artistStats.collabs++;
              stats.collabsFound++;
            } catch (e) {
              // Ignorer les erreurs de duplicate key
              if (e.code !== 11000) throw e;
            }
          }
        }

      } catch (error) {
        stats.errors++;
        console.log(`      ❌ Erreur album "${albumSimple.name}": ${error.message}`);
      }
    }

    // ==========================================
    // LOG DÉTAILLÉ PAR ARTISTE
    // ==========================================

    const tierEmoji = { mainstream: '🔥', mid: '🎯', underground: '🌑' };
    const previewRate = artistStats.tracks > 0
      ? ((artistStats.tracksWithAnyPreview / artistStats.tracks) * 100).toFixed(0)
      : '0';

    console.log(`   ✅ ${artist.name} [${tierEmoji[tier]} ${tier.toUpperCase()}]`);
    console.log(`      📊 ${artistStats.albums} albums + ${artistStats.singles} singles = ${artistStats.tracks} tracks`);
    console.log(`      🎵 Preview: ${artistStats.tracksWithAnyPreview}/${artistStats.tracks} (${previewRate}%) [Spotify: ${artistStats.tracksWithSpotifyPreview} | Deezer: ${artistStats.tracksWithDeezerPreview}]`);
    console.log(`      🔗 Collabs: ${artistStats.collabs} | 📝 Genius: ${artistStats.geniusFound} | 📍 Loc: ${location.department || location.city || '?'}`);

    if (artistStats.deduped > 0) {
      console.log(`      🔄 ${artistStats.deduped} albums dédupliqués (Deluxe/Remaster)`);
    }

    // Vérification game mode readiness
    const gameModeReady = [];
    const gameModeNotReady = [];

    if (artistStats.collabs > 0) gameModeReady.push('Roland Gamos');
    else gameModeNotReady.push('Roland Gamos (0 collabs)');

    if (location.department) gameModeReady.push('Le Thème');
    else gameModeNotReady.push('Le Thème (pas de dept)');

    if (artistStats.tracksWithAnyPreview > 0) gameModeReady.push('Blind Test');
    else gameModeNotReady.push('Blind Test (0 preview)');

    const albumCovers = await albumsCol.countDocuments({ artistId: artist.id, coverUrl: { $ne: null } });
    if (albumCovers > 0) gameModeReady.push('Pixel Cover');
    else gameModeNotReady.push('Pixel Cover (0 covers)');

    if (artistStats.geniusFound > 0) gameModeReady.push('Paroles');
    else gameModeNotReady.push('Paroles (0 genius)');

    gameModeReady.push('Devine Qui'); // Toujours possible si l'artiste existe

    console.log(`      🎮 Modes OK: ${gameModeReady.join(', ')}`);
    if (gameModeNotReady.length > 0) {
      console.log(`      ⚠️  Modes manquants: ${gameModeNotReady.join(', ')}`);
    }

    // Nouveaux artistes découverts
    let addedNew = 0;
    for (const id of newArtistIds) {
      const exists = await artistsCol.findOne({ spotifyId: id });
      if (!exists) addedNew++;
    }
    if (addedNew > 0) {
      console.log(`      🔍 +${addedNew} nouveaux artistes découverts via featurings`);
    }

    return {
      success: true,
      name: artist.name,
      tier,
      artistStats,
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
  console.log('\n🔍 === DÉCOUVERTE ET CRAWL (V2) ===\n');

  const collections = {
    artistsCol: db.collection('artists'),
    albumsCol: db.collection('albums'),
    tracksCol: db.collection('tracks'),
    collabsCol: db.collection('collaborations'),
  };

  // Seeds
  console.log('🌱 Recherche des seeds...\n');

  const seedNames = [
    'Booba', 'Kaaris', 'Ninho', 'SCH', 'Jul', 'Niska', 'PNL',
    'Damso', 'Orelsan', 'Nekfeu', 'Freeze Corleone', 'Alpha Wann',
    'Laylow', 'Hamza', 'Lomepal', "Rim'K", 'Sofiane', 'Koba LaD',
    'Gazo', 'Tiakola', 'SDM', 'Zola', 'Vald', 'Dosseh', 'Lacrim',
    'Maes', 'Aya Nakamura', 'Dinos', 'Hornet La Frappe', 'Zkr',
    'La Fouine', 'Rohff', 'Médine', 'Youssoupha', 'Oxmo Puccino',
    'IAM', 'NTM', 'Sniper', 'Soprano', 'Black M', 'Gradur',
    'MHD', 'Kalash Criminel', 'Luv Resval', 'Ziak', 'Werenoi',
    'Naps', 'Soolking', 'PLK', 'Josman',
  ];

  const toExplore = [];
  const discovered = new Set();

  for (const name of seedNames) {
    try {
      const data = await spotifyRequest('/search', {
        q: name, type: 'artist', limit: 1, market: 'FR',
      });

      if (data.artists?.items?.[0]) {
        const a = data.artists.items[0];
        if (a.followers?.total >= MIN_FOLLOWERS) {
          toExplore.push(a.id);
          discovered.add(a.id);
          const tier = classifyTier(a.followers.total, a.popularity);
          console.log(`   ✅ ${a.name} (${a.followers.total.toLocaleString()} followers) [${tier}]`);
        }
      }
    } catch (error) {
      console.log(`   ❌ ${name}: ${error.message}`);
    }
  }

  console.log(`\n🎯 ${toExplore.length} seeds trouvés. Target: ${TARGET_ARTISTS}\n`);

  crawlStartTime = Date.now();

  let roundNumber = 0;
  let lastProgressLog = 0;

  while (toExplore.length > 0 && discovered.size < TARGET_ARTISTS) {
    roundNumber++;
    const artistId = toExplore.shift();

    console.log(`\n📦 Round ${roundNumber} | ${discovered.size}/${TARGET_ARTISTS} (${((discovered.size / TARGET_ARTISTS) * 100).toFixed(1)}%) | Queue: ${toExplore.length}`);

    try {
      const result = await crawlArtistV2(artistId, collections);

      if (result.alreadyCrawled) {
        console.log(`   ⏭️  Skip: ${result.name} (déjà crawlé)`);
      } else if (result.skipped) {
        console.log(`   ⏭️  Skip: ${result.name || artistId.substring(0, 8)} (${result.reason})`);
      } else if (result.success) {
        // Ajouter les nouveaux artistes à explorer
        let addedCount = 0;
        for (const newId of result.newArtists) {
          if (!discovered.has(newId)) {
            discovered.add(newId);
            toExplore.push(newId);
            addedCount++;
          }
        }
      }

      // Pause tous les 5 artistes crawlés
      if (stats.artistsCrawled > 0 && stats.artistsCrawled % 5 === 0) {
        console.log(`\n   ⏸️  PAUSE 15s (rate limiter)\n`);
        await sleep(ARTIST_PAUSE);
      }

      // Rapport détaillé tous les 10 artistes
      if (stats.artistsCrawled - lastProgressLog >= 10 && stats.artistsCrawled > 0) {
        lastProgressLog = stats.artistsCrawled;
        await logDetailedReport(collections, discovered.size);
      }

    } catch (error) {
      stats.errors++;
      console.log(`   ❌ ERREUR: ${error.message}`);
    }
  }

  console.log(`\n✅ Découverte terminée: ${discovered.size} artistes\n`);
  stats.artistsDiscovered = discovered.size;
}

// ==========================================
// CONTINUATION (à partir de la BDD existante)
// ==========================================

async function discoverAndCrawlContinue(targetNewArtists) {
  console.log('\n🔁 === CONTINUATION DU CRAWL (V2) ===\n');

  const collections = {
    artistsCol: db.collection('artists'),
    albumsCol: db.collection('albums'),
    tracksCol: db.collection('tracks'),
    collabsCol: db.collection('collaborations'),
  };

  const { artistsCol, tracksCol, collabsCol } = collections;

  console.log('🔍 Chargement des artistes existants...\n');
  const existingArtistIds = await artistsCol.distinct('spotifyId');
  const knownIds = new Set(existingArtistIds);
  console.log(`✅ ${knownIds.size} artistes déjà en base\n`);

  console.log('🔁 Construction de la file de reprise (collabs + featurings)...\n');
  const candidateIds = new Set();

  const featuredIds = await tracksCol.distinct('featuring.artistId');
  for (const id of featuredIds) {
    if (id && !knownIds.has(id)) candidateIds.add(id);
  }

  const collabAIds = await collabsCol.distinct('artistAId');
  for (const id of collabAIds) {
    if (id && !knownIds.has(id)) candidateIds.add(id);
  }

  const collabBIds = await collabsCol.distinct('artistBId');
  for (const id of collabBIds) {
    if (id && !knownIds.has(id)) candidateIds.add(id);
  }

  if (candidateIds.size === 0) {
    console.log('⚠️  Aucun candidat trouvé via collabs/featurings, fallback sur seeds.\n');

    const seedNames = [
      'Booba', 'Kaaris', 'Ninho', 'SCH', 'Jul', 'Niska', 'PNL',
      'Damso', 'Orelsan', 'Nekfeu', 'Freeze Corleone', 'Alpha Wann',
      'Laylow', 'Hamza', 'Lomepal', "Rim'K", 'Sofiane', 'Koba LaD',
      'Gazo', 'Tiakola', 'SDM', 'Zola', 'Vald', 'Dosseh', 'Lacrim',
      'Maes', 'Aya Nakamura', 'Dinos', 'Hornet La Frappe', 'Zkr',
      'La Fouine', 'Rohff', 'Médine', 'Youssoupha', 'Oxmo Puccino',
      'IAM', 'NTM', 'Sniper', 'Soprano', 'Black M', 'Gradur',
      'MHD', 'Kalash Criminel', 'Luv Resval', 'Ziak', 'Werenoi',
      'Naps', 'Soolking', 'PLK', 'Josman',
    ];

    for (const name of seedNames) {
      try {
        const data = await spotifyRequest('/search', {
          q: name, type: 'artist', limit: 1, market: 'FR',
        });

        if (data.artists?.items?.[0]) {
          const a = data.artists.items[0];
          if (a.followers?.total >= MIN_FOLLOWERS && !knownIds.has(a.id)) {
            candidateIds.add(a.id);
          }
        }
      } catch (error) {
        console.log(`   ❌ ${name}: ${error.message}`);
      }
    }
  }

  const toExplore = Array.from(candidateIds);
  const discovered = new Set([...knownIds, ...candidateIds]);

  console.log(`🎯 File initiale: ${toExplore.length} artistes | Objectif: +${targetNewArtists}\n`);

  crawlStartTime = Date.now();

  let roundNumber = 0;
  let lastProgressLog = 0;
  let newCrawled = 0;

  while (toExplore.length > 0 && newCrawled < targetNewArtists) {
    roundNumber++;
    const artistId = toExplore.shift();

    console.log(`\n📦 Round ${roundNumber} | +${newCrawled}/${targetNewArtists} | Queue: ${toExplore.length}`);

    try {
      const result = await crawlArtistV2(artistId, collections);

      if (result.alreadyCrawled) {
        console.log(`   ⏭️  Skip: ${result.name} (déjà crawlé)`);
      } else if (result.skipped) {
        console.log(`   ⏭️  Skip: ${result.name || artistId.substring(0, 8)} (${result.reason})`);
      } else if (result.success) {
        newCrawled++;
        knownIds.add(artistId);

        let addedCount = 0;
        for (const newId of result.newArtists) {
          if (!discovered.has(newId) && !knownIds.has(newId)) {
            discovered.add(newId);
            toExplore.push(newId);
            addedCount++;
          }
        }

        if (addedCount > 0) {
          console.log(`   🔍 +${addedCount} nouveaux artistes ajoutés à la queue`);
        }
      }

      // Pause tous les 5 artistes crawlés
      if (stats.artistsCrawled > 0 && stats.artistsCrawled % 5 === 0) {
        console.log(`\n   ⏸️  PAUSE 15s (rate limiter)\n`);
        await sleep(ARTIST_PAUSE);
      }

      // Rapport détaillé tous les 10 artistes
      if (stats.artistsCrawled - lastProgressLog >= 10 && stats.artistsCrawled > 0) {
        lastProgressLog = stats.artistsCrawled;
        await logDetailedReport(collections, newCrawled, targetNewArtists);
      }

    } catch (error) {
      stats.errors++;
      console.log(`   ❌ ERREUR: ${error.message}`);
    }
  }

  console.log(`\n✅ Continuation terminée: +${newCrawled} artistes ajoutés\n`);
  stats.artistsDiscovered = knownIds.size;

  return { newCrawled, totalArtists: knownIds.size };
}

// ==========================================
// RAPPORT DÉTAILLÉ (tous les 10 artistes)
// ==========================================

async function logDetailedReport(collections, discoveredCount, targetCount = TARGET_ARTISTS) {
  const { artistsCol, albumsCol, tracksCol, collabsCol } = collections;

  logProgress(discoveredCount, targetCount, crawlStartTime);

  const counts = {
    artists: await artistsCol.countDocuments(),
    albums: await albumsCol.countDocuments(),
    tracks: await tracksCol.countDocuments(),
    collabs: await collabsCol.countDocuments(),
    tracksWithPreview: await tracksCol.countDocuments({ previewUrl: { $ne: null } }),
    tracksWithGenius: await tracksCol.countDocuments({ geniusId: { $ne: null } }),
  };

  const previewPct = counts.tracks > 0 ? ((counts.tracksWithPreview / counts.tracks) * 100).toFixed(1) : '0';

  console.log(`\n📊 BASE DE DONNÉES:`);
  console.log(`   🎤 Artistes: ${counts.artists} | 💿 Albums: ${counts.albums} | 🎵 Tracks: ${counts.tracks} | 🔗 Collabs: ${counts.collabs}`);
  console.log(`   🎧 Preview: ${counts.tracksWithPreview}/${counts.tracks} (${previewPct}%) [Spotify: ${stats.tracksWithSpotifyPreview} | Deezer: ${stats.tracksWithDeezerPreview}]`);
  console.log(`   📝 Genius: ${counts.tracksWithGenius} | 🎯 Populaires (50+): ${stats.tracksPopular}`);

  console.log(`\n📈 TIERS:`);
  console.log(`   🔥 Mainstream: ${stats.tierMainstream} | 🎯 Mid: ${stats.tierMid} | 🌑 Underground: ${stats.tierUnderground}`);

  console.log(`\n📋 QUALITÉ:`);
  console.log(`   Bio: ${stats.artistsWithBio}/${stats.artistsCrawled} (${stats.artistsCrawled > 0 ? ((stats.artistsWithBio / stats.artistsCrawled) * 100).toFixed(0) : 0}%)`);
  console.log(`   Tags: ${stats.artistsWithTags}/${stats.artistsCrawled} (${stats.artistsCrawled > 0 ? ((stats.artistsWithTags / stats.artistsCrawled) * 100).toFixed(0) : 0}%)`);
  console.log(`   Location: ${stats.artistsWithLocation}/${stats.artistsCrawled} (${stats.artistsCrawled > 0 ? ((stats.artistsWithLocation / stats.artistsCrawled) * 100).toFixed(0) : 0}%)`);

  if (stats.errors > 0 || stats.spotifyRateLimits > 0) {
    console.log(`\n⚠️  Erreurs: ${stats.errors} | Rate limits: Spotify ${stats.spotifyRateLimits}, Last.fm ${stats.lastfmRateLimits}, Genius ${stats.geniusRateLimits}, Deezer ${stats.deezerErrors}`);
  }

  // Game mode readiness
  const blindTestReady = counts.tracksWithPreview;
  const pixelCoverReady = await albumsCol.countDocuments({ coverUrl: { $ne: null } });
  const rolandGamosReady = await collabsCol.estimatedDocumentCount();
  const lyricsReady = counts.tracksWithGenius;

  console.log(`\n🎮 READINESS MODES DE JEU:`);
  console.log(`   🎵 Blind Test:    ${blindTestReady} tracks avec preview ${blindTestReady >= 100 ? '✅' : '⚠️  (besoin ~100+)'}`);
  console.log(`   🖼️  Pixel Cover:   ${pixelCoverReady} albums avec cover ${pixelCoverReady >= 50 ? '✅' : '⚠️  (besoin ~50+)'}`);
  console.log(`   🔗 Roland Gamos:  ${rolandGamosReady} collabs ${rolandGamosReady >= 200 ? '✅' : '⚠️  (besoin ~200+)'}`);
  console.log(`   📝 Paroles:       ${lyricsReady} tracks avec Genius ${lyricsReady >= 50 ? '✅' : '⚠️  (besoin ~50+)'}`);
  console.log(`   🎯 Le Thème:      ${stats.artistsWithLocation} artistes avec location ${stats.artistsWithLocation >= 30 ? '✅' : '⚠️  (besoin ~30+)'}`);
  console.log(`   🕵️  Devine Qui:    ${counts.artists} artistes ✅`);
  console.log();
}

// ==========================================
// POST-PROCESSING
// ==========================================

async function postProcessArtists() {
  console.log('\n\n📊 === POST-PROCESSING ===\n');

  const artistsCol = db.collection('artists');
  const albumsCol = db.collection('albums');
  const tracksCol = db.collection('tracks');
  const collabsCol = db.collection('collaborations');

  // 1. Calculer les stats par artiste
  console.log('1️⃣  Calcul des stats par artiste...');

  const artists = await artistsCol.find({}).toArray();
  let processed = 0;

  for (const artist of artists) {
    // Vrais albums (pas singles)
    const realAlbums = await albumsCol.countDocuments({
      artistId: artist.spotifyId,
      albumType: 'album',
    });
    const singles = await albumsCol.countDocuments({
      artistId: artist.spotifyId,
      albumType: { $ne: 'album' },
    });
    const totalTracks = await tracksCol.countDocuments({ artistId: artist.spotifyId });
    const tracksWithPreview = await tracksCol.countDocuments({
      artistId: artist.spotifyId,
      previewUrl: { $ne: null },
    });
    const totalCollabs = await collabsCol.countDocuments({ artistAId: artist.spotifyId });

    // Premier album (année)
    const firstAlbum = await albumsCol.findOne(
      { artistId: artist.spotifyId, albumType: 'album', year: { $ne: null } },
      { sort: { year: 1 } }
    );
    // Fallback: premier single si pas d'album
    const firstRelease = firstAlbum || await albumsCol.findOne(
      { artistId: artist.spotifyId, year: { $ne: null } },
      { sort: { year: 1 } }
    );

    await artistsCol.updateOne(
      { spotifyId: artist.spotifyId },
      {
        $set: {
          totalAlbums: realAlbums,
          totalSingles: singles,
          totalTracks,
          totalCollabs,
          tracksWithPreview,
          firstReleaseYear: firstRelease?.year || null,
          updatedAt: new Date(),
        },
      }
    );

    processed++;
    if (processed % 50 === 0) {
      console.log(`   ✅ ${processed}/${artists.length} artistes traités`);
    }
  }
  console.log(`   ✅ ${processed} artistes traités\n`);

  // 2. Stats finales par tier
  console.log('2️⃣  Stats par tier:');

  for (const tier of ['mainstream', 'mid', 'underground']) {
    const count = await artistsCol.countDocuments({ tier });
    const withPreview = await artistsCol.countDocuments({ tier, tracksWithPreview: { $gt: 0 } });
    const withCollabs = await artistsCol.countDocuments({ tier, totalCollabs: { $gt: 0 } });
    console.log(`   ${tier}: ${count} artistes (${withPreview} avec preview, ${withCollabs} avec collabs)`);
  }
  console.log();
}

// ==========================================
// MODE --fix-previews
// ==========================================

async function fixExistingPreviews() {
  console.log('\n🔧 === FIX PREVIEWS (Deezer) pour tracks existantes ===\n');

  const tracksCol = db.collection('tracks');

  // Tracks sans preview, triées par popularité (les plus populaires d'abord)
  const tracksWithoutPreview = await tracksCol
    .find({
      $or: [{ previewUrl: null }, { previewUrl: { $exists: false } }],
      popularity: { $gte: DEEZER_MIN_POPULARITY },
    })
    .sort({ popularity: -1 })
    .limit(500)
    .toArray();

  console.log(`📊 ${tracksWithoutPreview.length} tracks sans preview (pop >= ${DEEZER_MIN_POPULARITY})\n`);

  let fixed = 0;
  let notFound = 0;

  for (let i = 0; i < tracksWithoutPreview.length; i++) {
    const track = tracksWithoutPreview[i];

    const deezerData = await deezerSearchTrack(track.artistName, track.title);

    if (deezerData?.deezerPreviewUrl) {
      await tracksCol.updateOne(
        { spotifyId: track.spotifyId },
        {
          $set: {
            previewUrl: deezerData.deezerPreviewUrl,
            deezerPreviewUrl: deezerData.deezerPreviewUrl,
            deezerId: deezerData.deezerId,
            updatedAt: new Date(),
          },
        }
      );
      fixed++;
      console.log(`   ✅ ${fixed}. ${track.artistName} - ${track.title} (pop: ${track.popularity})`);
    } else {
      notFound++;
    }

    // Progress tous les 50
    if ((i + 1) % 50 === 0) {
      const total = await tracksCol.countDocuments({ previewUrl: { $ne: null } });
      const allTracks = await tracksCol.countDocuments();
      console.log(`\n   📈 Progress: ${i + 1}/${tracksWithoutPreview.length} | Fixed: ${fixed} | Total previews: ${total}/${allTracks} (${((total / allTracks) * 100).toFixed(1)}%)\n`);
    }
  }

  console.log(`\n✅ Fix terminé: ${fixed} previews ajoutées, ${notFound} non trouvées sur Deezer`);

  const totalWithPreview = await tracksCol.countDocuments({ previewUrl: { $ne: null } });
  const totalTracks = await tracksCol.countDocuments();
  console.log(`📊 Total: ${totalWithPreview}/${totalTracks} tracks avec preview (${((totalWithPreview / totalTracks) * 100).toFixed(1)}%)\n`);
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  const args = process.argv.slice(2);
  const fixMode = args.includes('--fix-previews');
  const continueMode = args.includes('--continue');
  const dedupeNameMode = args.includes('--dedupe-name');
  const targetArg = getArgValue(args, '--target', `${DEFAULT_CONTINUE_TARGET}`);
  const targetNewArtists = parsePositiveInt(targetArg, DEFAULT_CONTINUE_TARGET);

  if (fixMode && continueMode) {
    console.log('âŒ Modes incompatibles: --fix-previews et --continue');
    process.exit(1);
  }

  DEDUPE_NAME = dedupeNameMode;

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║        🇫🇷 CRAWLER RAP FRANÇAIS V2 (AMÉLIORÉ)              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log(`📅 ${new Date().toLocaleString('fr-FR')}\n`);

  if (fixMode) {
    console.log('🔧 MODE: Fix previews uniquement (Deezer)\n');
  } else if (continueMode) {
    console.log('🔁 MODE: Continuation (après un crawl existant)\n');
  }

  console.log('⚙️  CONFIG:');
  console.log(`   Target           : ${TARGET_ARTISTS.toLocaleString()} artistes`);
  if (continueMode) {
    console.log(`   Continue target  : +${targetNewArtists.toLocaleString()} artistes`);
    console.log(`   Dédoublonnage nom: ${DEDUPE_NAME ? 'ON (strict)' : 'OFF (par ID)'}`);
  }
  console.log(`   Min followers    : ${MIN_FOLLOWERS.toLocaleString()}`);
  console.log(`   Max albums/art   : ${MAX_ALBUMS_PER_ARTIST}`);
  console.log(`   Max Deezer/art   : ${MAX_DEEZER_LOOKUPS_PER_ARTIST}`);
  console.log(`   Deezer min pop   : ${DEEZER_MIN_POPULARITY}`);
  console.log();

  console.log('📊 SOURCES:');
  console.log(`   ✅ Spotify API    : Artistes, albums, tracks, popularity`);
  console.log(`   ✅ Deezer API     : Preview URLs (fallback Spotify)`);
  console.log(`   ${LASTFM_API_KEY ? '✅' : '❌'} Last.fm API    : Bio, tags, location`);
  console.log(`   ✅ Wikidata       : Location (fallback)`);
  console.log(`   ${GENIUS_ACCESS_TOKEN ? '✅' : '❌'} Genius API     : Lyrics URLs`);
  console.log(`   ${DISCOGS_CONSUMER_KEY ? '✅' : '❌'} Discogs API    : Labels, covers HD`);
  console.log();

  console.log('🆕 AMÉLIORATIONS V2:');
  console.log('   ✅ Deezer preview fallback (Spotify les a supprimées)');
  console.log('   ✅ Full track fetch (popularity réelle, pas undefined)');
  console.log('   ✅ Dédup albums (Deluxe, Remaster, Clean/Explicit)');
  console.log('   ✅ Tiers: mainstream/mid/underground');
  console.log('   ✅ Logging détaillé par artiste + game mode readiness');
  console.log('   ✅ Album type tracking (album vs single)');
  console.log('   ✅ Mode --fix-previews pour corriger tracks existantes');
  console.log('   ✅ Mode --continue pour reprendre la découverte');
  console.log('   ✅ Option --dedupe-name pour éviter doublons par nom');
  console.log();
  console.log('═══════════════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  try {
    await connectDB();

    if (fixMode) {
      await fixExistingPreviews();
    } else if (continueMode) {
      await discoverAndCrawlContinue(targetNewArtists);
      await postProcessArtists();
    } else {
      await discoverAndCrawl();
      await postProcessArtists();
    }

    // Stats finales
    const artistsCol = db.collection('artists');
    const albumsCol = db.collection('albums');
    const tracksCol = db.collection('tracks');
    const collabsCol = db.collection('collaborations');

    const final = {
      artists: await artistsCol.countDocuments(),
      albums: await albumsCol.countDocuments(),
      realAlbums: await albumsCol.countDocuments({ albumType: 'album' }),
      singles: await albumsCol.countDocuments({ albumType: { $ne: 'album' } }),
      tracks: await tracksCol.countDocuments(),
      tracksWithPreview: await tracksCol.countDocuments({ previewUrl: { $ne: null } }),
      tracksWithGenius: await tracksCol.countDocuments({ geniusId: { $ne: null } }),
      collabs: await collabsCol.countDocuments(),
      tierMainstream: await artistsCol.countDocuments({ tier: 'mainstream' }),
      tierMid: await artistsCol.countDocuments({ tier: 'mid' }),
      tierUnderground: await artistsCol.countDocuments({ tier: 'underground' }),
      withLocation: await artistsCol.countDocuments({ 'location.department': { $exists: true } }),
    };

    const previewPct = final.tracks > 0 ? ((final.tracksWithPreview / final.tracks) * 100).toFixed(1) : '0';
    const duration = formatDuration(Date.now() - startTime);

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║               📊 STATISTIQUES FINALES                       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('🎤 ARTISTES:');
    console.log(`   Total              : ${final.artists}`);
    console.log(`   🔥 Mainstream      : ${final.tierMainstream}`);
    console.log(`   🎯 Mid             : ${final.tierMid}`);
    console.log(`   🌑 Underground     : ${final.tierUnderground}`);
    console.log(`   📍 Avec location   : ${final.withLocation}`);
    console.log();

    console.log('💿 ALBUMS:');
    console.log(`   Total              : ${final.albums} (${final.realAlbums} albums + ${final.singles} singles)`);
    console.log(`   Dédupliqués        : ${stats.albumsDeduped}`);
    console.log();

    console.log('🎵 TRACKS:');
    console.log(`   Total              : ${final.tracks}`);
    console.log(`   Avec preview       : ${final.tracksWithPreview} (${previewPct}%)`);
    console.log(`     - Spotify        : ${stats.tracksWithSpotifyPreview}`);
    console.log(`     - Deezer         : ${stats.tracksWithDeezerPreview}`);
    console.log(`   Avec Genius        : ${final.tracksWithGenius}`);
    console.log(`   Populaires (50+)   : ${stats.tracksPopular}`);
    console.log();

    console.log('🔗 COLLABORATIONS:');
    console.log(`   Total              : ${final.collabs}`);
    console.log();

    console.log('🎮 READINESS MODES DE JEU:');
    console.log(`   Blind Test         : ${final.tracksWithPreview >= 100 ? '✅' : '⚠️ '} ${final.tracksWithPreview} tracks`);
    console.log(`   Pixel Cover        : ${final.realAlbums >= 50 ? '✅' : '⚠️ '} ${final.realAlbums} albums`);
    console.log(`   Roland Gamos       : ${final.collabs >= 200 ? '✅' : '⚠️ '} ${final.collabs} collabs`);
    console.log(`   Continue Paroles   : ${final.tracksWithGenius >= 50 ? '✅' : '⚠️ '} ${final.tracksWithGenius} tracks Genius`);
    console.log(`   Le Thème           : ${final.withLocation >= 30 ? '✅' : '⚠️ '} ${final.withLocation} localisés`);
    console.log(`   Devine Qui         : ✅ ${final.artists} artistes`);
    console.log();

    console.log(`⏱️  Durée: ${duration}`);
    console.log(`⚠️  Erreurs: ${stats.errors} | Rate limits: Spotify ${stats.spotifyRateLimits}, Last.fm ${stats.lastfmRateLimits}, Genius ${stats.geniusRateLimits}`);
    console.log();

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ CRAWL V2 TERMINÉ!                       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    if (final.tracksWithPreview < 50) {
      console.log('💡 TIP: Lance `node scripts/crawl-OVERNIGHT-v2.js --fix-previews` pour ajouter des previews Deezer aux tracks existantes\n');
    }
    if (final.tracksWithGenius > 0) {
      console.log('💡 TIP: Lance `node scripts/fetch-lyrics.js` pour récupérer les textes depuis Genius\n');
    }

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
