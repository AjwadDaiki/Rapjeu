#!/usr/bin/env node

// ============================================
// SETUP MONGODB LOCAL
// Crée la BDD + collections + index
// ============================================

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'rapbattle';

async function setup() {
  console.log('🚀 Setup MongoDB Local\n');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connecté à MongoDB local\n');

    const db = client.db(DB_NAME);

    // Créer les collections
    const collections = [
      'artists',
      'tracks',
      'albums',
      'collaborations',
      'lyrics',
      'punchlines',
      'producers',
    ];

    console.log('📁 Création des collections...');
    for (const col of collections) {
      await db.createCollection(col).catch(() => {}); // Ignore si existe déjà
      console.log(`   ✅ ${col}`);
    }

    console.log('\n🔍 Création des index...\n');

    // Artists
    console.log('   Artists...');
    await db.collection('artists').createIndex({ spotifyId: 1 }, { unique: true });
    await db.collection('artists').createIndex({ name: 'text', aliases: 'text' });
    await db.collection('artists').createIndex({ 'location.department': 1 });
    await db.collection('artists').createIndex({ 'location.city': 1 });
    await db.collection('artists').createIndex({ monthlyListeners: -1 });
    await db.collection('artists').createIndex({ popularity: -1 });

    // Tracks
    console.log('   Tracks...');
    await db.collection('tracks').createIndex({ spotifyId: 1 }, { unique: true });
    await db.collection('tracks').createIndex({ artistId: 1 });
    await db.collection('tracks').createIndex({ 'featuring.artistId': 1 });
    await db.collection('tracks').createIndex({ title: 'text', artistName: 'text' });
    await db.collection('tracks').createIndex({ year: 1 });
    await db.collection('tracks').createIndex({ popularity: -1 });
    await db.collection('tracks').createIndex({ previewUrl: 1 });

    // Albums
    console.log('   Albums...');
    await db.collection('albums').createIndex({ spotifyId: 1 }, { unique: true });
    await db.collection('albums').createIndex({ artistId: 1 });
    await db.collection('albums').createIndex({ year: 1 });
    await db.collection('albums').createIndex({ title: 'text', artistName: 'text' });

    // Collaborations
    console.log('   Collaborations...');
    await db.collection('collaborations').createIndex({ artistAId: 1, artistBId: 1 });
    await db.collection('collaborations').createIndex({ artistBId: 1, artistAId: 1 });
    await db.collection('collaborations').createIndex({ trackId: 1 });

    // Lyrics
    console.log('   Lyrics...');
    await db.collection('lyrics').createIndex({ trackId: 1 });
    await db.collection('lyrics').createIndex({ artistId: 1 });
    await db.collection('lyrics').createIndex({ snippet: 'text' });

    // Punchlines
    console.log('   Punchlines...');
    await db.collection('punchlines').createIndex({ artistId: 1 });
    await db.collection('punchlines').createIndex({ text: 'text' });
    await db.collection('punchlines').createIndex({ popularity: -1 });

    // Producers
    console.log('   Producers...');
    await db.collection('producers').createIndex({ name: 1 });
    await db.collection('producers').createIndex({ trackId: 1 });

    console.log('\n✅ Setup terminé!\n');
    console.log('📊 Base de données: rapbattle');
    console.log('📡 URI: mongodb://127.0.0.1:27017/rapbattle\n');
    console.log('🚀 Prochaine étape: npm run crawl\n');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setup();
