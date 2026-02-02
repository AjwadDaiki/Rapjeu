// ============================================
// TEST BLIND TEST - Verify Preview URLs
// Checks how many tracks have preview URLs available
// ============================================

const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'rapbattle';

async function testBlindTest() {
  console.log('🔍 Testing Blind Test - Checking Preview URLs...\n');

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const tracksCol = db.collection('tracks');

    // Get total tracks
    const totalTracks = await tracksCol.countDocuments();
    console.log(`📊 Total tracks in database: ${totalTracks}`);

    // Count tracks with preview URLs
    const tracksWithPreview = await tracksCol.countDocuments({
      previewUrl: { $ne: null, $exists: true },
    });
    console.log(`🎵 Tracks with preview URLs: ${tracksWithPreview}`);

    // Calculate percentage
    const percentage = ((tracksWithPreview / totalTracks) * 100).toFixed(2);
    console.log(`📈 Percentage: ${percentage}%\n`);

    // Get sample tracks with preview URLs
    console.log('📝 Sample tracks with preview URLs:');
    const sampleTracks = await tracksCol
      .find({ previewUrl: { $ne: null, $exists: true } })
      .limit(10)
      .toArray();

    sampleTracks.forEach((track, i) => {
      console.log(`\n${i + 1}. ${track.title} - ${track.artistName}`);
      console.log(`   Preview: ${track.previewUrl}`);
    });

    console.log('\n---\n');

    // Get sample tracks WITHOUT preview URLs
    const tracksWithoutPreview = await tracksCol.countDocuments({
      $or: [{ previewUrl: null }, { previewUrl: { $exists: false } }],
    });
    console.log(`❌ Tracks WITHOUT preview URLs: ${tracksWithoutPreview}`);

    if (tracksWithoutPreview > 0) {
      console.log('\n📝 Sample tracks WITHOUT preview URLs:');
      const sampleNoPreview = await tracksCol
        .find({
          $or: [{ previewUrl: null }, { previewUrl: { $exists: false } }],
        })
        .limit(5)
        .toArray();

      sampleNoPreview.forEach((track, i) => {
        console.log(`${i + 1}. ${track.title} - ${track.artistName}`);
      });
    }

    console.log('\n---\n');

    // Final verdict
    if (percentage >= 70) {
      console.log('✅ VERDICT: Blind Test is READY! Sufficient preview URLs available.');
      console.log('   You can use Blind Test mode without issues.');
    } else if (percentage >= 40) {
      console.log('⚠️  VERDICT: Blind Test is USABLE but limited.');
      console.log('   Consider crawling more tracks or filtering tracks without previews.');
    } else {
      console.log('❌ VERDICT: Blind Test has INSUFFICIENT preview URLs.');
      console.log('   Need to crawl more tracks or check Spotify API issues.');
    }

    console.log('\n🎮 Recommendation:');
    if (tracksWithPreview >= 100) {
      console.log(`   With ${tracksWithPreview} tracks, you can play ~${Math.floor(tracksWithPreview / 5)} Blind Test rounds!`);
    } else {
      console.log('   Crawl more artists to get more tracks with preview URLs.');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testBlindTest().catch(console.error);
