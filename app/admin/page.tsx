'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface AdminStats {
  stats: {
    totalArtists: number;
    totalAlbums: number;
    totalTracks: number;
    totalCollabs: number;
    tracksWithPreview: number;
    albumsWithCovers: number;
  };
  topArtists: Array<{
    name: string;
    popularity: number;
    followers: number;
    spotifyId: string;
  }>;
  artistsWithMostAlbums: Array<{ name: string; count: number }>;
  artistsWithMostTracks: Array<{ name: string; count: number }>;
  artistsWithMostCollabs: Array<{ name: string; count: number }>;
  locationDistribution: Array<{ location: string; count: number }>;
  popularityDistribution: Array<{ _id: number; count: number }>;
  sampleArtists: Array<{
    name: string;
    popularity: number;
    followers: number;
    location: string;
    spotifyId: string;
  }>;
}

export default function AdminPage() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'popularity' | 'followers'>('popularity');

  useEffect(() => {
    fetch('/admin/api')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading admin data:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-4xl text-yellow-400 animate-pulse">Chargement...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-2xl text-red-400">Erreur de chargement des données</div>
      </div>
    );
  }

  // Filter and sort artists
  const filteredArtists = data.sampleArtists
    .filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'popularity') return b.popularity - a.popularity;
      return b.followers - a.followers;
    });

  const percentWithPreview = Math.round((data.stats.tracksWithPreview / data.stats.totalTracks) * 100);
  const percentWithCovers = Math.round((data.stats.albumsWithCovers / data.stats.totalAlbums) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold text-yellow-400 mb-2">🔧 Admin Dashboard</h1>
          <p className="text-gray-400">Visualisation des données MongoDB - RapJeu</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon="👨‍🎤"
            label="Artistes"
            value={data.stats.totalArtists}
            color="from-blue-600 to-blue-400"
          />
          <StatCard
            icon="💿"
            label="Albums"
            value={data.stats.totalAlbums}
            color="from-purple-600 to-purple-400"
          />
          <StatCard
            icon="🎵"
            label="Tracks"
            value={data.stats.totalTracks}
            color="from-pink-600 to-pink-400"
          />
          <StatCard
            icon="🤝"
            label="Collaborations"
            value={data.stats.totalCollabs}
            color="from-green-600 to-green-400"
          />
          <StatCard
            icon="🔊"
            label="Preview URLs"
            value={`${data.stats.tracksWithPreview} (${percentWithPreview}%)`}
            color="from-red-600 to-red-400"
          />
          <StatCard
            icon="🖼️"
            label="Covers Albums"
            value={`${data.stats.albumsWithCovers} (${percentWithCovers}%)`}
            color="from-yellow-600 to-yellow-400"
          />
        </div>

        {/* Top Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Artists by Popularity */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border-2 border-yellow-400"
          >
            <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
              🏆 Top 10 - Popularité
            </h2>
            <div className="space-y-3">
              {data.topArtists.map((artist, index) => (
                <div
                  key={artist.spotifyId}
                  className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <span className="text-2xl font-bold text-yellow-400 w-8">#{index + 1}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{artist.name}</div>
                    <div className="text-sm text-gray-400">
                      Pop: {artist.popularity} • {(artist.followers / 1000000).toFixed(2)}M followers
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Artists by Albums */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border-2 border-purple-400"
          >
            <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
              💿 Top 10 - Albums
            </h2>
            <div className="space-y-3">
              {data.artistsWithMostAlbums.map((artist, index) => (
                <div
                  key={artist.name}
                  className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <span className="text-2xl font-bold text-purple-400 w-8">#{index + 1}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{artist.name}</div>
                    <div className="text-sm text-gray-400">{artist.count} albums</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Artists by Tracks */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border-2 border-pink-400"
          >
            <h2 className="text-2xl font-bold text-pink-400 mb-4 flex items-center gap-2">
              🎵 Top 10 - Tracks
            </h2>
            <div className="space-y-3">
              {data.artistsWithMostTracks.map((artist, index) => (
                <div
                  key={artist.name}
                  className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <span className="text-2xl font-bold text-pink-400 w-8">#{index + 1}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{artist.name}</div>
                    <div className="text-sm text-gray-400">{artist.count} tracks</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Artists by Collaborations */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-400"
          >
            <h2 className="text-2xl font-bold text-green-400 mb-4 flex items-center gap-2">
              🤝 Top 10 - Collaborations
            </h2>
            <div className="space-y-3">
              {data.artistsWithMostCollabs.map((artist, index) => (
                <div
                  key={artist.name}
                  className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <span className="text-2xl font-bold text-green-400 w-8">#{index + 1}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{artist.name}</div>
                    <div className="text-sm text-gray-400">{artist.count} collabs</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Location Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-400 mb-8"
        >
          <h2 className="text-2xl font-bold text-blue-400 mb-4 flex items-center gap-2">
            🌍 Distribution Géographique
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {data.locationDistribution.map((loc) => (
              <div
                key={loc.location}
                className="p-4 bg-gray-700/50 rounded-lg text-center hover:bg-gray-700 transition-colors"
              >
                <div className="text-3xl font-bold text-blue-400">{loc.count}</div>
                <div className="text-sm text-gray-400 mt-1">{loc.location || 'Unknown'}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Artists List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border-2 border-yellow-400"
        >
          <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
            👨‍🎤 Liste des Artistes (Top 50)
          </h2>

          {/* Search and Sort Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Rechercher un artiste..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg border-2 border-gray-600 focus:border-yellow-400 focus:outline-none"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 bg-gray-700 text-white rounded-lg border-2 border-gray-600 focus:border-yellow-400 focus:outline-none"
            >
              <option value="popularity">Trier par Popularité</option>
              <option value="followers">Trier par Followers</option>
              <option value="name">Trier par Nom</option>
            </select>
          </div>

          {/* Artists Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-700">
                  <th className="text-left p-3 text-yellow-400">Nom</th>
                  <th className="text-center p-3 text-yellow-400">Popularité</th>
                  <th className="text-center p-3 text-yellow-400">Followers</th>
                  <th className="text-center p-3 text-yellow-400">Location</th>
                </tr>
              </thead>
              <tbody>
                {filteredArtists.map((artist) => (
                  <tr
                    key={artist.spotifyId}
                    className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="p-3 font-semibold">{artist.name}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        artist.popularity >= 80 ? 'bg-green-600' :
                        artist.popularity >= 60 ? 'bg-yellow-600' :
                        artist.popularity >= 40 ? 'bg-orange-600' :
                        'bg-red-600'
                      }`}>
                        {artist.popularity}
                      </span>
                    </td>
                    <td className="p-3 text-center text-gray-300">
                      {(artist.followers / 1000000).toFixed(2)}M
                    </td>
                    <td className="p-3 text-center text-gray-400">
                      {artist.location || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-center text-gray-400">
            {filteredArtists.length} artiste(s) affiché(s)
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`bg-gradient-to-br ${color} rounded-2xl p-6 shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white/80 text-sm font-semibold mb-1">{label}</div>
          <div className="text-3xl font-bold text-white">{value}</div>
        </div>
        <div className="text-5xl opacity-80">{icon}</div>
      </div>
    </motion.div>
  );
}
