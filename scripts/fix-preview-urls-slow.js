// ============================================
// FIX PREVIEW URLs - Version ULTRA LENTE pour la nuit
// Traite TOUS les tracks sans rate limit
// ============================================

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'rapbattle';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let accessToken = null;
let tokenExpiry = 0;

// Statistiques globales
const stats = {
  startTime: Date.now(),
  totalProcessed: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
};

// Spotify API request
async function spotifyRequest(endpoint, params = {}) {
  if (!accessToken || Date.now() >= tokenExpiry) {
    console.log('\n🔑 Requesting new Spotify access token...');

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
    tokenExpiry = Date.now() + (authData.expires_in - 300) * 1000;
    console.log(`✅ Token obtained (expires in ${authData.expires_in}s)\n`);
  }

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

async function fixPreviewUrlsSlow() {
  console.log('🌙 === FIX PREVIEW URLs - VERSION NUIT (ULTRA LENT) ===\n');
  console.log('⏱️  Ce script va tourner pendant plusieurs heures.');
  console.log('💤 Tu peux le laisser tourner toute la nuit.\n');

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const tracksCol = db.collection('tracks');

    // Compte total
    const totalTracks = await tracksCol.countDocuments();
    const tracksWithoutPreview = await tracksCol.countDocuments({
      $or: [{ previewUrl: null }, { previewUrl: { $exists: false } }],
    });

    console.log(`📊 Total tracks in database: ${totalTracks}`);
    console.log(`❌ Tracks without preview URLs: ${tracksWithoutPreview}`);
    console.log(`✅ Tracks already with preview URLs: ${totalTracks - tracksWithoutPreview}\n`);

    if (tracksWithoutPreview === 0) {
      console.log('🎉 All tracks already have preview URLs!');
      return;
    }

    console.log('🔄 Starting to fetch preview URLs...\n');
    console.log('⚙️  Configuration:');
    console.log('   - Batch size: 50 tracks');
    console.log('   - Delay between batches: 5 seconds');
    console.log('   - Estimated time: ~' + Math.ceil((tracksWithoutPreview / 50) * 5 / 60) + ' minutes\n');

    // Traiter par petits batches avec cursor
    let batch = [];
    let batchNumber = 0;

    const cursor = tracksCol.find({
      $or: [{ previewUrl: null }, { previewUrl: { $exists: false } }],
    });

    while (await cursor.hasNext()) {
      const track = await cursor.next();
      if (!track) break;

      batch.push(track);

      // Quand on a 50 tracks, traiter le batch
      if (batch.length === 50) {
        batchNumber++;
        await processBatch(batch, tracksCol, batchNumber, tracksWithoutPreview);
        batch = [];

        // DÉLAI IMPORTANT: 5 secondes entre chaque batch
        console.log('⏳ Waiting 5 seconds before next batch...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Traiter le dernier batch (moins de 50 tracks)
    if (batch.length > 0) {
      batchNumber++;
      await processBatch(batch, tracksCol, batchNumber, tracksWithoutPreview);
    }

    // Stats finales
    const elapsedMinutes = Math.round((Date.now() - stats.startTime) / 60000);
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TERMINÉ !');
    console.log('='.repeat(60));
    console.log(`⏱️  Durée totale: ${elapsedMinutes} minutes`);
    console.log(`📊 Tracks traités: ${stats.totalProcessed}`);
    console.log(`✅ Preview URLs récupérées: ${stats.updated}`);
    console.log(`⚠️  Tracks sans preview: ${stats.skipped}`);
    console.log(`❌ Erreurs: ${stats.errors}`);

    // Stats finales MongoDB
    const finalWithPreview = await tracksCol.countDocuments({
      previewUrl: { $ne: null, $exists: true },
    });
    const percentage = ((finalWithPreview / totalTracks) * 100).toFixed(2);

    console.log('\n📈 RÉSULTAT FINAL:');
    console.log(`   Total tracks: ${totalTracks}`);
    console.log(`   Avec preview URLs: ${finalWithPreview} (${percentage}%)`);

    if (percentage >= 70) {
      console.log('\n✅ BLIND TEST EST PRÊT ! 🎵');
      console.log(`   Tu peux jouer ~${Math.floor(finalWithPreview / 5)} rounds de Blind Test !`);
    } else if (percentage >= 40) {
      console.log('\n⚠️  BLIND TEST est utilisable mais limité.');
      console.log('   Relance ce script pour récupérer plus de preview URLs.');
    } else {
      console.log('\n❌ Pas encore assez de preview URLs.');
      console.log('   Continue à faire tourner le script.');
    }

  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

async function processBatch(batch, tracksCol, batchNumber, total) {
  const trackIds = batch.map(t => t.spotifyId).join(',');

  try {
    console.log(`\n📦 Batch #${batchNumber} (${batch.length} tracks)`);

    // Fetch depuis Spotify
    const data = await spotifyRequest('/tracks', { ids: trackIds });

    // Update chaque track
    for (let i = 0; i < data.tracks.length; i++) {
      const spotifyTrack = data.tracks[i];
      const dbTrack = batch[i];

      stats.totalProcessed++;

      if (!spotifyTrack) {
        console.log(`   ⚠️  Track not found: ${dbTrack.title}`);
        stats.skipped++;
        continue;
      }

      if (spotifyTrack.preview_url) {
        await tracksCol.updateOne(
          { spotifyId: dbTrack.spotifyId },
          { $set: { previewUrl: spotifyTrack.preview_url, updatedAt: new Date() } }
        );
        stats.updated++;
        console.log(`   ✅ ${spotifyTrack.name} - ${spotifyTrack.artists[0].name}`);
      } else {
        stats.skipped++;
        console.log(`   ⚠️  No preview: ${spotifyTrack.name}`);
      }
    }

    // Progress
    const percentage = ((stats.totalProcessed / total) * 100).toFixed(1);
    console.log(`\n📈 Progress: ${stats.totalProcessed}/${total} (${percentage}%)`);
    console.log(`   ✅ Updated: ${stats.updated} | ⚠️  Skipped: ${stats.skipped} | ❌ Errors: ${stats.errors}`);

  } catch (error) {
    console.error(`\n❌ Error processing batch #${batchNumber}:`, error.message);
    stats.errors++;

    // Si rate limit, attendre 60 secondes
    if (error.message.includes('429')) {
      console.log('⏳ Rate limit hit! Waiting 60 seconds...');
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }
}

// Démarrage
console.log('\n🚀 Starting in 3 seconds...\n');
setTimeout(() => {
  fixPreviewUrlsSlow().catch(console.error);
}, 3000);
