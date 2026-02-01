// ============================================
// FIX PREVIEW URLs - Update existing tracks
// Fetches preview URLs for tracks that don't have them
// ============================================

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'rapbattle';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let accessToken = null;
let tokenExpiry = 0;

// Spotify API request with rate limiting
async function spotifyRequest(endpoint, params = {}) {
  // Refresh token if expired (token lasts 3600 seconds, refresh 5 minutes before)
  if (!accessToken || Date.now() >= tokenExpiry) {
    console.log('🔑 Requesting new Spotify access token...');

    const authResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      throw new Error(`Spotify auth failed: ${authResponse.status} ${authResponse.statusText}`);
    }

    const authData = await authResponse.json();
    accessToken = authData.access_token;
    tokenExpiry = Date.now() + (authData.expires_in - 300) * 1000; // Expire 5 min avant
    console.log(`✅ Token obtained (expires in ${authData.expires_in}s)`);
  }

  // Build URL
  const queryString = new URLSearchParams(params).toString();
  const url = `https://api.spotify.com/v1${endpoint}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

async function fixPreviewUrls() {
  console.log('🔧 Fixing Preview URLs for existing tracks...\n');

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const tracksCol = db.collection('tracks');

    // Get tracks without preview URLs (RÉDUIT pour éviter rate limit)
    const tracksWithoutPreview = await tracksCol
      .find({
        $or: [{ previewUrl: null }, { previewUrl: { $exists: false } }],
      })
      .limit(100) // Process seulement 100 tracks à la fois (au lieu de 500)
      .toArray();

    console.log(`📊 Found ${tracksWithoutPreview.length} tracks without preview URLs`);

    if (tracksWithoutPreview.length === 0) {
      console.log('✅ All tracks already have preview URLs!');
      return;
    }

    console.log('🔄 Fetching preview URLs from Spotify API...\n');

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process in batches of 50 (Spotify /tracks endpoint limit)
    for (let i = 0; i < tracksWithoutPreview.length; i += 50) {
      const batch = tracksWithoutPreview.slice(i, i + 50);
      const trackIds = batch.map(t => t.spotifyId).join(',');

      try {
        // Fetch track details (includes preview_url)
        const data = await spotifyRequest('/tracks', { ids: trackIds });

        // Update each track
        for (let j = 0; j < data.tracks.length; j++) {
          const spotifyTrack = data.tracks[j];
          const dbTrack = batch[j];

          if (!spotifyTrack) {
            console.log(`⚠️  Track not found: ${dbTrack.title}`);
            skipped++;
            continue;
          }

          if (spotifyTrack.preview_url) {
            await tracksCol.updateOne(
              { spotifyId: dbTrack.spotifyId },
              { $set: { previewUrl: spotifyTrack.preview_url, updatedAt: new Date() } }
            );
            updated++;
            console.log(`✅ ${updated}. ${spotifyTrack.name} - ${spotifyTrack.artists[0].name}`);
          } else {
            skipped++;
          }
        }

        // Rate limiting delay (augmenté pour éviter 429)
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 secondes entre chaque batch

      } catch (error) {
        console.error(`❌ Error processing batch ${i / 50 + 1}:`, error.message);
        errors++;
      }

      // Progress
      console.log(`\n📈 Progress: ${Math.min(i + 50, tracksWithoutPreview.length)}/${tracksWithoutPreview.length} tracks processed\n`);
    }

    console.log('\n---\n');
    console.log(`✅ Updated: ${updated} tracks`);
    console.log(`⚠️  Skipped (no preview): ${skipped} tracks`);
    console.log(`❌ Errors: ${errors} batches`);

    // Final stats
    const totalWithPreview = await tracksCol.countDocuments({
      previewUrl: { $ne: null, $exists: true },
    });
    const totalTracks = await tracksCol.countDocuments();
    const percentage = ((totalWithPreview / totalTracks) * 100).toFixed(2);

    console.log('\n📊 Final Stats:');
    console.log(`   Total tracks: ${totalTracks}`);
    console.log(`   With preview URLs: ${totalWithPreview} (${percentage}%)`);

    if (percentage >= 70) {
      console.log('\n✅ Blind Test is now READY!');
    } else {
      console.log('\n⚠️  Run this script again to fetch more preview URLs.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

fixPreviewUrls().catch(console.error);
