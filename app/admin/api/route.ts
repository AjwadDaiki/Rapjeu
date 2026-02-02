// ============================================
// ADMIN API - Database Statistics
// Route: GET /admin/api
// ============================================

import { NextResponse } from 'next/server';
import { getDb } from '../../lib/mongoService';

export async function GET() {
  try {
    const db = await getDb();

    // Get collections
    const artistsCol = db.collection('artists');
    const albumsCol = db.collection('albums');
    const tracksCol = db.collection('tracks');
    const collabsCol = db.collection('collaborations');

    // Count documents
    const [
      totalArtists,
      totalAlbums,
      totalTracks,
      totalCollabs,
    ] = await Promise.all([
      artistsCol.countDocuments(),
      albumsCol.countDocuments(),
      tracksCol.countDocuments(),
      collabsCol.countDocuments(),
    ]);

    // Get top 10 artists by popularity
    const topArtists = await artistsCol
      .find({})
      .sort({ popularity: -1 })
      .limit(10)
      .toArray();

    // Get artists with most albums
    const artistsWithMostAlbums = await albumsCol.aggregate([
      { $group: { _id: '$artistName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray();

    // Get artists with most tracks
    const artistsWithMostTracks = await tracksCol.aggregate([
      { $group: { _id: '$artistName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray();

    // Get artists with most collaborations
    const artistsWithMostCollabs = await collabsCol.aggregate([
      { $group: { _id: '$artistAName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray();

    // Count tracks with preview URLs
    const tracksWithPreview = await tracksCol.countDocuments({
      previewUrl: { $ne: null, $exists: true },
    });

    // Count albums with covers
    const albumsWithCovers = await albumsCol.countDocuments({
      coverUrl: { $ne: null, $exists: true },
    });

    // Get location distribution
    const locationDistribution = await artistsCol.aggregate([
      { $match: { location: { $ne: null, $exists: true } } },
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray();

    // Get popularity distribution (buckets)
    const popularityDistribution = await artistsCol.aggregate([
      {
        $bucket: {
          groupBy: '$popularity',
          boundaries: [0, 20, 40, 60, 80, 100],
          default: 'unknown',
          output: { count: { $sum: 1 } },
        },
      },
    ]).toArray();

    // Sample artists for preview
    const sampleArtists = await artistsCol
      .find({})
      .sort({ popularity: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      stats: {
        totalArtists,
        totalAlbums,
        totalTracks,
        totalCollabs,
        tracksWithPreview,
        albumsWithCovers,
      },
      topArtists: topArtists.map(a => ({
        name: a.name,
        popularity: a.popularity,
        followers: a.followers,
        spotifyId: a.spotifyId,
      })),
      artistsWithMostAlbums: artistsWithMostAlbums.map(a => ({
        name: a._id,
        count: a.count,
      })),
      artistsWithMostTracks: artistsWithMostTracks.map(a => ({
        name: a._id,
        count: a.count,
      })),
      artistsWithMostCollabs: artistsWithMostCollabs.map(a => ({
        name: a._id,
        count: a.count,
      })),
      locationDistribution: locationDistribution.map(l => ({
        location: l._id,
        count: l.count,
      })),
      popularityDistribution,
      sampleArtists: sampleArtists.map(a => ({
        name: a.name,
        popularity: a.popularity,
        followers: a.followers,
        location: a.location,
        spotifyId: a.spotifyId,
      })),
    });
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database stats' },
      { status: 500 }
    );
  }
}
