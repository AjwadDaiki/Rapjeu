// ============================================
// MUSICBRAINZ API CLIENT
// Pour producteurs, collaborations, featurings
// Docs: https://musicbrainz.org/doc/MusicBrainz_API
// ============================================

import axios from 'axios';

const MUSICBRAINZ_API_BASE = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'RapBattleGame/1.0 (contact@rapbattle.game)';

interface MBArtist {
  id: string;
  name: string;
  'sort-name': string;
  type?: string;
  country?: string;
  'life-span'?: {
    begin?: string;
    end?: string;
  };
}

interface MBRecording {
  id: string;
  title: string;
  length?: number;
  'artist-credit': Array<{
    name: string;
    artist: MBArtist;
  }>;
  relations?: Array<{
    type: string;
    artist?: MBArtist;
    direction?: string;
    'type-id'?: string;
  }>;
}

interface MBRelease {
  id: string;
  title: string;
  date?: string;
  'artist-credit': Array<{
    name: string;
    artist: MBArtist;
  }>;
}

interface Collaboration {
  artistA: string;
  artistB: string;
  trackTitle: string;
  releaseDate?: string;
}

interface Producer {
  name: string;
  trackTitle: string;
  artistName: string;
}

// Cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 heure

// Rate limiting (MusicBrainz requires 1 request/second)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds to be safe
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY = 500;
const DISABLE_AFTER_FAILURES = 3;
const DISABLE_DURATION = 5 * 60 * 1000; // 5 minutes
let consecutiveFailures = 0;
let disabledUntil = 0;

// ==========================================
// HELPERS
// ==========================================

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return cached.data as T;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
}

async function musicbrainzRequest<T>(
  endpoint: string,
  params: Record<string, any> = {}
): Promise<T | null> {
  if (Date.now() < disabledUntil) {
    return null;
  }

  const isTransient = (err: any) => {
    const code = err?.code;
    const status = err?.response?.status;
    return code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNABORTED' || code === 'ENOTFOUND' ||
      (typeof status === 'number' && (status === 429 || status >= 500));
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await waitForRateLimit();
    try {
      const response = await axios.get(`${MUSICBRAINZ_API_BASE}${endpoint}`, {
        params: {
          fmt: 'json',
          ...params,
        },
        headers: {
          'User-Agent': USER_AGENT,
        },
        timeout: 10000,
      });
      consecutiveFailures = 0;
      return response.data;
    } catch (error: any) {
      if (!isTransient(error) || attempt === MAX_RETRIES) {
        consecutiveFailures++;
        if (consecutiveFailures >= DISABLE_AFTER_FAILURES) {
          disabledUntil = Date.now() + DISABLE_DURATION;
          console.warn('[MusicBrainz] Temporarily disabled due to repeated failures.');
        }
        return null;
      }

      const delay = RETRY_BASE_DELAY * (attempt + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return null;
}

// ==========================================
// SEARCH
// ==========================================

export async function searchArtist(name: string): Promise<MBArtist | null> {
  const cacheKey = `artist:${name}`;
  const cached = getCached<MBArtist>(cacheKey);
  if (cached) return cached;

  try {
    const data = await musicbrainzRequest<{ artists: MBArtist[] }>('/artist', {
      query: name,
      limit: 1,
    });

    if (!data || !data.artists || data.artists.length === 0) {
      return null;
    }

    const artist = data.artists[0];
    setCache(cacheKey, artist);
    return artist;
  } catch (error) {
    return null;
  }
}

export async function searchRecording(title: string, artist?: string): Promise<MBRecording[]> {
  const cacheKey = `recording:${title}:${artist || ''}`;
  const cached = getCached<MBRecording[]>(cacheKey);
  if (cached) return cached;

  try {
    const query = artist ? `${title} AND artist:${artist}` : title;
    const data = await musicbrainzRequest<{ recordings: MBRecording[] }>('/recording', {
      query,
      limit: 10,
      inc: 'artist-credits+releases+artist-rels',
    });

    const recordings = data?.recordings || [];
    setCache(cacheKey, recordings);
    return recordings;
  } catch (error) {
    return [];
  }
}

// ==========================================
// COLLABORATIONS & FEATURINGS
// ==========================================

/**
 * Get artists that collaborated with a given artist
 */
export async function getArtistCollaborations(artistName: string): Promise<Collaboration[]> {
  const cacheKey = `collabs:${artistName}`;
  const cached = getCached<Collaboration[]>(cacheKey);
  if (cached) return cached;

  try {
    const artist = await searchArtist(artistName);
    if (!artist) return [];

    // Search for recordings with this artist
    const recordings = await musicbrainzRequest<{ recordings: MBRecording[] }>('/recording', {
      query: `artist:${artistName}`,
      limit: 50,
      inc: 'artist-credits',
    });

    const collaborations: Collaboration[] = [];

    for (const recording of recordings?.recordings || []) {
      if (recording['artist-credit'] && recording['artist-credit'].length > 1) {
        // Multi-artist track (featuring)
        for (const credit of recording['artist-credit']) {
          if (credit.artist.name !== artistName) {
            collaborations.push({
              artistA: artistName,
              artistB: credit.artist.name,
              trackTitle: recording.title,
            });
          }
        }
      }
    }

    // Remove duplicates
    const unique = collaborations.filter((collab, index, self) =>
      index === self.findIndex(c => c.artistB === collab.artistB)
    );

    setCache(cacheKey, unique);
    return unique;
  } catch (error) {
    return [];
  }
}

/**
 * Check if two artists have collaborated
 */
export async function haveCollaborated(artistA: string, artistB: string): Promise<boolean> {
  try {
    const collabs = await getArtistCollaborations(artistA);
    return collabs.some(c =>
      c.artistB.toLowerCase().includes(artistB.toLowerCase()) ||
      artistB.toLowerCase().includes(c.artistB.toLowerCase())
    );
  } catch (error) {
    console.error('Have collaborated check error:', error);
    return false;
  }
}

// ==========================================
// PRODUCERS
// ==========================================

/**
 * Get producer of a track (if available)
 */
export async function getTrackProducer(trackTitle: string, artistName: string): Promise<string | null> {
  const cacheKey = `producer:${trackTitle}:${artistName}`;
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  try {
    const recordings = await searchRecording(trackTitle, artistName);

    for (const recording of recordings) {
      if (recording.relations) {
        const producerRelation = recording.relations.find(
          rel => rel.type === 'producer' || rel['type-id'] === '5c0ceac3-feb4-41f0-868d-dc06f6e27fc0'
        );

        if (producerRelation && producerRelation.artist) {
          const producer = producerRelation.artist.name;
          setCache(cacheKey, producer);
          return producer;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Get track producer error:', error);
    return null;
  }
}

/**
 * Get random producers from famous rap tracks
 */
export async function getRandomProducers(count: number = 10): Promise<Producer[]> {
  // Hardcoded famous rap tracks with known producers
  const famousTracks: Producer[] = [
    { name: 'Dr. Dre', trackTitle: 'Still D.R.E.', artistName: 'Dr. Dre' },
    { name: 'Kanye West', trackTitle: 'Stronger', artistName: 'Kanye West' },
    { name: 'Metro Boomin', trackTitle: 'Mask Off', artistName: 'Future' },
    { name: 'Mike WiLL Made-It', trackTitle: 'Black Beatles', artistName: 'Rae Sremmurd' },
    { name: 'Timbaland', trackTitle: 'Big Pimpin\'', artistName: 'Jay-Z' },
    { name: 'The Neptunes', trackTitle: 'Drop It Like It\'s Hot', artistName: 'Snoop Dogg' },
    { name: 'DJ Mustard', trackTitle: 'Rack City', artistName: 'Tyga' },
    { name: 'Lex Luger', trackTitle: 'Hard in da Paint', artistName: 'Waka Flocka Flame' },
    { name: '808 Mafia', trackTitle: 'Love Sosa', artistName: 'Chief Keef' },
    { name: 'Zaytoven', trackTitle: 'I Get the Bag', artistName: 'Gucci Mane' },
    { name: 'Skread', trackTitle: 'DKR', artistName: 'Booba' },
    { name: 'Therapy', trackTitle: 'Tchoin', artistName: 'Kaaris' },
    { name: 'Niska', trackTitle: 'Réseaux', artistName: 'Niska' },
    { name: 'Stwo', trackTitle: 'Naha', artistName: 'PNL' },
    { name: 'Pyroman', trackTitle: 'Basique', artistName: 'Orelsan' },
  ];

  const shuffled = [...famousTracks].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ==========================================
// GAME MODE DATA GENERATORS
// ==========================================

/**
 * Generate data for "Qui a produit ?" mode
 */
export interface WhoProducedQuestion {
  trackTitle: string;
  artistName: string;
  correctProducer: string;
  wrongProducers: string[];
}

export async function getWhoProducedData(count: number = 5): Promise<WhoProducedQuestion[]> {
  const producers = await getRandomProducers(count * 2);
  const questions: WhoProducedQuestion[] = [];

  const allProducers = [...new Set(producers.map(p => p.name))];

  for (let i = 0; i < Math.min(count, producers.length); i++) {
    const correct = producers[i];
    const wrongOptions = allProducers
      .filter(p => p !== correct.name)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    questions.push({
      trackTitle: correct.trackTitle,
      artistName: correct.artistName,
      correctProducer: correct.name,
      wrongProducers: wrongOptions,
    });
  }

  return questions;
}

/**
 * Generate data for "Feature ou Pas Feature" mode
 */
export interface FeatureOrNotQuestion {
  artistA: string;
  artistB: string;
  haveCollaborated: boolean;
  exampleTrack?: string;
}

export async function getFeatureOrNotData(count: number = 5): Promise<FeatureOrNotQuestion[]> {
  const rapArtists = [
    'Booba', 'Kaaris', 'Ninho', 'Damso', 'PNL', 'Orelsan',
    'Nekfeu', 'SCH', 'Niska', 'Freeze Corleone', 'Jul',
    'Drake', 'Kendrick Lamar', 'J. Cole', 'Travis Scott',
  ];

  const questions: FeatureOrNotQuestion[] = [];

  // Generate random artist pairs
  for (let i = 0; i < count; i++) {
    const artistA = rapArtists[Math.floor(Math.random() * rapArtists.length)];
    let artistB = rapArtists[Math.floor(Math.random() * rapArtists.length)];

    while (artistB === artistA) {
      artistB = rapArtists[Math.floor(Math.random() * rapArtists.length)];
    }

    try {
      const collabs = await getArtistCollaborations(artistA);
      const collab = collabs.find(c => c.artistB === artistB);

      questions.push({
        artistA,
        artistB,
        haveCollaborated: !!collab,
        exampleTrack: collab?.trackTitle,
      });
    } catch (e) {
      // If API fails, use random value
      questions.push({
        artistA,
        artistB,
        haveCollaborated: Math.random() > 0.5,
      });
    }
  }

  return questions;
}

// ==========================================
// STATUS
// ==========================================

export function getMusicBrainzStatus(): { cacheSize: number; lastRequest: Date | null } {
  return {
    cacheSize: cache.size,
    lastRequest: lastRequestTime ? new Date(lastRequestTime) : null,
  };
}
