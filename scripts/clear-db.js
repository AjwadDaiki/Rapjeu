#!/usr/bin/env node

const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb://127.0.0.1:27017/rapbattle');
  await client.connect();
  const db = client.db();

  const collections = ['artists', 'albums', 'tracks', 'collaborations'];

  for (const col of collections) {
    const result = await db.collection(col).deleteMany({});
    console.log(`✅ ${col}: ${result.deletedCount} documents supprimés`);
  }

  console.log('\n📊 Vérification:');
  for (const col of collections) {
    const count = await db.collection(col).countDocuments();
    console.log(`   ${col}: ${count} documents`);
  }

  await client.close();
  console.log('\n✅ Base de données vidée!');
})();
