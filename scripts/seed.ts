#!/usr/bin/env tsx
// ============================================
// PIPELINE ETL - Seeding des données Rap
//
// Usage: npx tsx scripts/seed.ts
//
// Étapes:
//   A) Spotify  → artistes + tracks + preview URLs + covers
//   B) Wikidata → département / ville d'origine (FR)
//   C) Genius   → alias, featurings additionnels
//   D) Export   → génère les fichiers JSON dans app/data/
//
// En runtime (pendant une partie), AUCUN appel API.
// Tout est pré-calculé ici.
// ============================================

import 'dotenv/config';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CONFIG
// ============================================

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const GENIUS_ACCESS_TOKEN = process.env.GENIUS_ACCESS_TOKEN || '';

// Playlists Spotify de référence pour le seeding
const SPOTIFY_PLAYLISTS = {
  // RAP FR
  'rap_fr_classiques': '37i9dQZF1DX1X1Uvyb5lBs',     // Classiques Rap Français
  'rap_fr_valide': '37i9dQZF1DWU4xkMBRYEoG',          // Validé
  'rap_fr_tendances': '37i9dQZF1DX7Axsg3uDpjA',        // Tendances rap FR
  // RAP US
  'rap_us_rapcaviar': '37i9dQZF1DX0XUsuxWHRQd',        // RapCaviar
  'rap_us_mostnecessary': '37i9dQZF1DX2RxBh64BHjQ',     // Most Necessary
  'rap_us_hiphop_classics': '37i9dQZF1DX186v583rmzp',   // I Love My 90s Hip-Hop
};

// Mapping département FR
const DEPT_MAPPING: Record<string, string> = {
  'paris': '75',
  'seine-saint-denis': '93',
  'saint-denis': '93',
  'hauts-de-seine': '92',
  'boulogne-billancourt': '92',
  'val-de-marne': '94',
  'vitry-sur-seine': '94',
  'essonne': '91',
  'évry': '91',
  'evry': '91',
  'corbeil-essonnes': '91',
  'bouches-du-rhône': '13',
  'marseille': '13',
  'val-d\'oise': '95',
  'seine-et-marne': '77',
  'yvelines': '78',
  'trappes': '78',
  'sarcelles': '95',
  'garges-lès-gonesse': '95',
  'sevran': '93',
  'aulnay-sous-bois': '93',
  'bondy': '93',
  'bobigny': '93',
  'villepinte': '93',
  'meaux': '77',
  'créteil': '94',
  'thiais': '94',
  'alfortville': '94',
  'bonneuil-sur-marne': '94',
  'villeneuve-saint-georges': '94',
  'clamart': '92',
  'issy-les-moulineaux': '92',
  'nanterre': '92',
  'lyon': '69',
  'rhône': '69',
  'toulouse': '31',
  'haute-garonne': '31',
  'bordeaux': '33',
  'gironde': '33',
  'lille': '59',
  'nord': '59',
  'strasbourg': '67',
  'orléans': '45',
  'caen': '14',
  'rennes': '35',
  'nice': '06',
};

// ============================================
// TYPES INTERNES
// ============================================

interface SeedArtist {
  id: string;
  name: string;
  spotifyId: string;
  aliases: string[];
  department?: string;
  city?: string;
  country: 'FR' | 'US';
  imageUrl?: string;
  popularity: number;
  genres: string[];
  topTracks: SeedTrack[];
  featurings: SeedFeaturing[];
  crews: string[];
  labels: string[];
  albums: SeedAlbum[];
  era: string[];
  wikidata?: {
    birthPlace?: string;
    birthPlaceLabel?: string;
    region?: string;
  };
}

interface SeedTrack {
  title: string;
  spotifyId: string;
  previewUrl: string | null;
  albumName: string;
  albumCoverUrl?: string;
  releaseYear: number;
  artistIds: string[]; // All artists on the track (for feat detection)
}

interface SeedAlbum {
  title: string;
  year: number;
  coverUrl?: string;
}

interface SeedFeaturing {
  artistId: string;
  artistName: string;
  track: string;
  year?: number;
}

// ============================================
// SPOTIFY API
// ============================================

class SpotifyClient {
  private token: string = '';
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.spotify.com/v1',
    });
  }

  async authenticate(): Promise<void> {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env');
    }

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
        },
      }
    );

    this.token = response.data.access_token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    console.log('✅ Spotify authenticated');
  }

  async getPlaylistTracks(playlistId: string, limit: number = 100): Promise<any[]> {
    const tracks: any[] = [];
    let offset = 0;

    while (offset < limit) {
      const batchSize = Math.min(50, limit - offset);
      const response = await this.client.get(`/playlists/${playlistId}/tracks`, {
        params: { offset, limit: batchSize, fields: 'items(track(id,name,artists,album,preview_url,popularity))' },
      });

      tracks.push(...response.data.items.map((i: any) => i.track).filter(Boolean));
      offset += batchSize;

      if (response.data.items.length < batchSize) break;
      await this.rateLimit();
    }

    return tracks;
  }

  async getArtist(artistId: string): Promise<any> {
    const response = await this.client.get(`/artists/${artistId}`);
    return response.data;
  }

  async getArtistTopTracks(artistId: string, market: string = 'FR'): Promise<any[]> {
    const response = await this.client.get(`/artists/${artistId}/top-tracks`, {
      params: { market },
    });
    return response.data.tracks;
  }

  async getArtistAlbums(artistId: string, limit: number = 20): Promise<any[]> {
    const response = await this.client.get(`/artists/${artistId}/albums`, {
      params: { limit, include_groups: 'album,single' },
    });
    return response.data.items;
  }

  private async rateLimit(): Promise<void> {
    // Spotify rate limit: respecter ~100ms entre les appels
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// ============================================
// WIKIDATA API (SPARQL)
// ============================================

class WikidataClient {
  private endpoint = 'https://query.wikidata.org/sparql';
  private cache: Map<string, any> = new Map();

  /**
   * Cherche le lieu de naissance/origine d'un artiste via Wikidata SPARQL
   */
  async getArtistOrigin(artistName: string): Promise<{ city?: string; region?: string; country?: string } | null> {
    // Check cache
    const cacheKey = artistName.toLowerCase();
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const query = `
      SELECT ?person ?personLabel ?birthPlace ?birthPlaceLabel ?region ?regionLabel ?country ?countryLabel WHERE {
        ?person wdt:P106 wd:Q2252262 .
        ?person rdfs:label "${artistName}"@fr .
        OPTIONAL { ?person wdt:P19 ?birthPlace . }
        OPTIONAL { ?birthPlace wdt:P131 ?region . }
        OPTIONAL { ?birthPlace wdt:P17 ?country . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
      }
      LIMIT 1
    `;

    try {
      const response = await axios.get(this.endpoint, {
        params: { query, format: 'json' },
        headers: { 'User-Agent': 'RapJeuSeeder/1.0 (contact@rapjeu.dev)' },
      });

      const bindings = response.data.results.bindings;
      if (bindings.length === 0) {
        // Retry with English label
        return this.getArtistOriginEN(artistName);
      }

      const result = {
        city: bindings[0].birthPlaceLabel?.value,
        region: bindings[0].regionLabel?.value,
        country: bindings[0].countryLabel?.value,
      };

      this.cache.set(cacheKey, result);
      await this.rateLimit();
      return result;
    } catch (error) {
      console.warn(`⚠️ Wikidata lookup failed for "${artistName}":`, (error as any).message);
      this.cache.set(cacheKey, null);
      return null;
    }
  }

  private async getArtistOriginEN(artistName: string): Promise<{ city?: string; region?: string; country?: string } | null> {
    const query = `
      SELECT ?person ?personLabel ?birthPlace ?birthPlaceLabel ?region ?regionLabel WHERE {
        ?person wdt:P106 wd:Q2252262 .
        ?person rdfs:label "${artistName}"@en .
        OPTIONAL { ?person wdt:P19 ?birthPlace . }
        OPTIONAL { ?birthPlace wdt:P131 ?region . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr". }
      }
      LIMIT 1
    `;

    try {
      const response = await axios.get(this.endpoint, {
        params: { query, format: 'json' },
        headers: { 'User-Agent': 'RapJeuSeeder/1.0 (contact@rapjeu.dev)' },
      });

      const bindings = response.data.results.bindings;
      if (bindings.length === 0) return null;

      const result = {
        city: bindings[0].birthPlaceLabel?.value,
        region: bindings[0].regionLabel?.value,
      };

      this.cache.set(artistName.toLowerCase(), result);
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Map une ville/région vers un code département FR
   */
  resolveDepartment(city?: string, region?: string): string | undefined {
    if (!city && !region) return undefined;

    const check = (s: string) => DEPT_MAPPING[s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')];

    if (city) {
      const dept = check(city);
      if (dept) return dept;
    }
    if (region) {
      const dept = check(region);
      if (dept) return dept;
    }
    return undefined;
  }

  private async rateLimit(): Promise<void> {
    // Wikidata: 1 req/sec max
    await new Promise(resolve => setTimeout(resolve, 1100));
  }
}

// ============================================
// GENIUS API
// ============================================

class GeniusClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.genius.com',
      headers: {
        Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}`,
      },
    });
  }

  /**
   * Cherche un artiste et retourne ses alias/noms alternatifs
   */
  async getArtistAliases(artistName: string): Promise<string[]> {
    if (!GENIUS_ACCESS_TOKEN) return [];

    try {
      const response = await this.client.get('/search', {
        params: { q: artistName },
      });

      const hits = response.data.response.hits;
      const aliases: Set<string> = new Set();

      for (const hit of hits.slice(0, 5)) {
        const artist = hit.result.primary_artist;
        if (artist) {
          // Genius sometimes has alternate names
          if (artist.alternate_names) {
            artist.alternate_names.forEach((n: string) => aliases.add(n));
          }
        }
      }

      await this.rateLimit();
      return Array.from(aliases);
    } catch (error) {
      console.warn(`⚠️ Genius lookup failed for "${artistName}":`, (error as any).message);
      return [];
    }
  }

  private async rateLimit(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

// ============================================
// MAIN SEED PIPELINE
// ============================================

async function main() {
  console.log('🎤 RAP JEU — Pipeline ETL de seeding');
  console.log('=====================================\n');

  const spotify = new SpotifyClient();
  const wikidata = new WikidataClient();
  const genius = new GeniusClient();

  // --- STEP A: Spotify ---
  console.log('📀 ÉTAPE A: Récupération Spotify...');

  await spotify.authenticate();

  // Collect unique artists from playlists
  const artistMap = new Map<string, SeedArtist>();
  const trackMap = new Map<string, SeedTrack>();

  for (const [name, playlistId] of Object.entries(SPOTIFY_PLAYLISTS)) {
    console.log(`  📋 Playlist: ${name}...`);
    try {
      const tracks = await spotify.getPlaylistTracks(playlistId);
      console.log(`     → ${tracks.length} tracks`);

      for (const track of tracks) {
        if (!track || !track.artists) continue;

        // Store track info
        const trackData: SeedTrack = {
          title: track.name,
          spotifyId: track.id,
          previewUrl: track.preview_url,
          albumName: track.album?.name || '',
          albumCoverUrl: track.album?.images?.[0]?.url,
          releaseYear: new Date(track.album?.release_date || '').getFullYear(),
          artistIds: track.artists.map((a: any) => a.id),
        };
        trackMap.set(track.id, trackData);

        // Store each artist
        for (const artist of track.artists) {
          if (!artistMap.has(artist.id)) {
            artistMap.set(artist.id, {
              id: slugify(artist.name),
              name: artist.name,
              spotifyId: artist.id,
              aliases: [],
              country: name.startsWith('rap_fr') ? 'FR' : 'US',
              imageUrl: undefined,
              popularity: 0,
              genres: [],
              topTracks: [],
              featurings: [],
              crews: [],
              labels: [],
              albums: [],
              era: [],
            });
          }
        }

        // Detect featurings (tracks with multiple artists)
        if (track.artists.length > 1) {
          const mainArtistId = track.artists[0].id;
          for (let i = 1; i < track.artists.length; i++) {
            const featArtistId = track.artists[i].id;
            const mainArtist = artistMap.get(mainArtistId);
            if (mainArtist) {
              mainArtist.featurings.push({
                artistId: slugify(track.artists[i].name),
                artistName: track.artists[i].name,
                track: track.name,
                year: trackData.releaseYear,
              });
            }
            // Bidirectional
            const featArtist = artistMap.get(featArtistId);
            if (featArtist) {
              featArtist.featurings.push({
                artistId: slugify(track.artists[0].name),
                artistName: track.artists[0].name,
                track: track.name,
                year: trackData.releaseYear,
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn(`  ⚠️ Erreur playlist ${name}:`, (error as any).message);
    }
  }

  console.log(`\n  📊 ${artistMap.size} artistes uniques trouvés`);

  // Enrich top artists with details
  const topArtists = Array.from(artistMap.values())
    .sort((a, b) => b.featurings.length - a.featurings.length)
    .slice(0, 200); // Top 200 by feat count

  console.log(`  🔍 Enrichissement des top ${topArtists.length} artistes...`);

  for (let i = 0; i < topArtists.length; i++) {
    const artist = topArtists[i];
    try {
      const details = await spotify.getArtist(artist.spotifyId);
      artist.popularity = details.popularity;
      artist.genres = details.genres || [];
      artist.imageUrl = details.images?.[0]?.url;

      // Get albums
      const albums = await spotify.getArtistAlbums(artist.spotifyId, 10);
      artist.albums = albums.map((a: any) => ({
        title: a.name,
        year: new Date(a.release_date || '').getFullYear(),
        coverUrl: a.images?.[0]?.url,
      }));

      // Get top tracks (for blind test preview URLs)
      const topTracks = await spotify.getArtistTopTracks(artist.spotifyId);
      artist.topTracks = topTracks.map((t: any) => ({
        title: t.name,
        spotifyId: t.id,
        previewUrl: t.preview_url,
        albumName: t.album?.name || '',
        albumCoverUrl: t.album?.images?.[0]?.url,
        releaseYear: new Date(t.album?.release_date || '').getFullYear(),
        artistIds: t.artists.map((a: any) => a.id),
      }));

      // Detect era
      const years = artist.albums.map(a => a.year).filter(y => y > 1980);
      if (years.some(y => y >= 1990 && y < 2000)) artist.era.push('90s');
      if (years.some(y => y >= 2000 && y < 2010)) artist.era.push('2000s');
      if (years.some(y => y >= 2010 && y < 2020)) artist.era.push('2010s');
      if (years.some(y => y >= 2020)) artist.era.push('2020s');
      if (artist.era.length === 0) artist.era.push('2020s');

      if (i % 10 === 0) console.log(`     ${i + 1}/${topArtists.length}...`);
    } catch (error) {
      console.warn(`  ⚠️ Enrichissement failed for "${artist.name}":`, (error as any).message);
    }
  }

  // --- STEP B: Wikidata ---
  console.log('\n🌍 ÉTAPE B: Enrichissement géographique (Wikidata)...');

  const frArtists = topArtists.filter(a => a.country === 'FR');
  console.log(`  🇫🇷 ${frArtists.length} artistes FR à enrichir`);

  for (let i = 0; i < frArtists.length; i++) {
    const artist = frArtists[i];
    const origin = await wikidata.getArtistOrigin(artist.name);
    if (origin) {
      artist.city = origin.city;
      artist.wikidata = {
        birthPlace: origin.city,
        birthPlaceLabel: origin.city,
        region: origin.region,
      };
      artist.department = wikidata.resolveDepartment(origin.city, origin.region);
      if (artist.department) {
        console.log(`     ✅ ${artist.name} → ${artist.city} (${artist.department})`);
      }
    }
    if (i % 10 === 0 && i > 0) console.log(`     ${i}/${frArtists.length}...`);
  }

  // --- STEP C: Genius ---
  console.log('\n📝 ÉTAPE C: Enrichissement alias (Genius)...');

  if (GENIUS_ACCESS_TOKEN) {
    for (let i = 0; i < Math.min(topArtists.length, 100); i++) {
      const artist = topArtists[i];
      const aliases = await genius.getArtistAliases(artist.name);
      if (aliases.length > 0) {
        artist.aliases.push(...aliases);
        // Deduplicate
        artist.aliases = [...new Set(artist.aliases)];
        console.log(`     ✅ ${artist.name} → aliases: ${aliases.join(', ')}`);
      }
      if (i % 10 === 0 && i > 0) console.log(`     ${i}/100...`);
    }
  } else {
    console.log('  ⚠️ GENIUS_ACCESS_TOKEN manquant, skip alias enrichment');
  }

  // --- STEP D: Export ---
  console.log('\n💾 ÉTAPE D: Export des données...');

  const outputDir = path.join(__dirname, '..', 'app', 'data', 'generated');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Export artists
  const artistsOutput = {
    generatedAt: new Date().toISOString(),
    source: 'Spotify + Wikidata + Genius ETL Pipeline',
    count: topArtists.length,
    artists: topArtists.map(a => ({
      id: a.id,
      name: a.name,
      spotifyId: a.spotifyId,
      aliases: a.aliases,
      department: a.department,
      city: a.city,
      country: a.country,
      imageUrl: a.imageUrl,
      popularity: a.popularity,
      genres: a.genres,
      crews: a.crews,
      labels: a.labels,
      albums: a.albums,
      era: a.era,
    })),
  };

  fs.writeFileSync(
    path.join(outputDir, 'artists.json'),
    JSON.stringify(artistsOutput, null, 2)
  );
  console.log(`  ✅ artists.json (${topArtists.length} artistes)`);

  // Export featurings
  const featuringsSet = new Set<string>();
  const featurings: any[] = [];

  for (const artist of topArtists) {
    for (const feat of artist.featurings) {
      const key = [artist.id, feat.artistId].sort().join('::') + '::' + feat.track;
      if (!featuringsSet.has(key)) {
        featuringsSet.add(key);
        featurings.push({
          artistA: artist.id,
          artistB: feat.artistId,
          track: feat.track,
          year: feat.year,
        });
      }
    }
  }

  fs.writeFileSync(
    path.join(outputDir, 'featurings.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), count: featurings.length, featurings }, null, 2)
  );
  console.log(`  ✅ featurings.json (${featurings.length} featurings)`);

  // Export tracks (for blind test)
  const blindTestTracks = topArtists
    .flatMap(a => a.topTracks.filter(t => t.previewUrl).map(t => ({
      artistId: a.id,
      artistName: a.name,
      title: t.title,
      previewUrl: t.previewUrl,
      albumCoverUrl: t.albumCoverUrl,
      year: t.releaseYear,
    })))
    .slice(0, 500);

  fs.writeFileSync(
    path.join(outputDir, 'blindtest_tracks.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), count: blindTestTracks.length, tracks: blindTestTracks }, null, 2)
  );
  console.log(`  ✅ blindtest_tracks.json (${blindTestTracks.length} tracks avec previewUrl)`);

  // Export album covers (for pixel cover)
  const albumCovers = topArtists
    .flatMap(a => a.albums.filter(al => al.coverUrl).map(al => ({
      artistId: a.id,
      artistName: a.name,
      albumTitle: al.title,
      coverUrl: al.coverUrl,
      year: al.year,
    })))
    .slice(0, 300);

  fs.writeFileSync(
    path.join(outputDir, 'album_covers.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), count: albumCovers.length, covers: albumCovers }, null, 2)
  );
  console.log(`  ✅ album_covers.json (${albumCovers.length} pochettes)`);

  // Stats summary
  console.log('\n=====================================');
  console.log('📊 RÉSUMÉ DU SEEDING');
  console.log('=====================================');
  console.log(`  Artistes:     ${topArtists.length}`);
  console.log(`  FR:           ${topArtists.filter(a => a.country === 'FR').length}`);
  console.log(`  US:           ${topArtists.filter(a => a.country === 'US').length}`);
  console.log(`  Avec dept:    ${topArtists.filter(a => a.department).length}`);
  console.log(`  Featurings:   ${featurings.length}`);
  console.log(`  Blind test:   ${blindTestTracks.length} tracks`);
  console.log(`  Pixel cover:  ${albumCovers.length} pochettes`);
  console.log(`  Données dans: ${outputDir}`);
  console.log('\n✅ Seed terminé ! Les données sont prêtes.');
  console.log('   → En runtime, le jeu utilise ces fichiers JSON, AUCUN appel API.');
}

// ============================================
// UTILS
// ============================================

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// ============================================
// RUN
// ============================================

main().catch(error => {
  console.error('❌ Pipeline failed:', error);
  process.exit(1);
});
