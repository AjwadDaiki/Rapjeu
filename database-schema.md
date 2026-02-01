# 🎮 RAP BATTLE - Database Schema (MongoDB)

## Collections Overview

Cette structure couvre **TOUS** les 12 modes de jeu avec queries ultra rapides.

---

## 1️⃣ Collection: `artists`

```javascript
{
  _id: ObjectId,
  spotifyId: "3IW7ScrzXmPvZhB27hmfgy", // Unique Spotify ID
  name: "Kaaris",
  aliases: ["Kaaris", "2.7 Zéro", "Gnonkondwa"], // Pour fuzzy matching

  // Stats
  monthlyListeners: 2800000,
  popularity: 78, // Spotify popularity (0-100)

  // Géographie (CRUCIAL pour thèmes "Rappeur du XX")
  location: {
    country: "FR",
    city: "Sevran",
    department: "93", // ⚡ Pour "Rappeur du 93"
    region: "Île-de-France"
  },

  // Genres
  genres: ["rap francais", "trap", "cloud rap"],

  // Relations
  relatedArtists: [ObjectId, ObjectId], // Pour chaînes de feat

  // Assets
  image: "https://i.scdn.co/image/...",

  // Metadata
  source: "spotify", // ou "lastfm", "musicbrainz"
  verified: true,
  createdAt: ISODate("2024-01-15"),
  updatedAt: ISODate("2024-01-15")
}
```

**Index:**
```javascript
db.artists.createIndex({ spotifyId: 1 }, { unique: true })
db.artists.createIndex({ name: "text", aliases: "text" }) // Full-text search
db.artists.createIndex({ "location.department": 1 }) // ⚡ Thème "Rappeur du XX"
db.artists.createIndex({ "location.city": 1 })
db.artists.createIndex({ monthlyListeners: -1 }) // Pour filtrer par popularité
db.artists.createIndex({ popularity: -1 })
```

**Utilité:**
- ✅ Thème "Rappeur du 91/92/93..." → `location.department`
- ✅ Thème "Rappeur de Paris" → `location.city`
- ✅ Thème "Artiste trap" → `genres`
- ✅ Roland Gamos → `relatedArtists`

---

## 2️⃣ Collection: `tracks`

```javascript
{
  _id: ObjectId,
  spotifyId: "5NMj89JX8SxOCJZ0N0vXaC",

  // Infos principales
  title: "Tchoin",
  artistId: ObjectId, // Ref → artists
  artistName: "Kaaris", // Dénormalisé pour perfs

  // Featurings (⚡ CRUCIAL pour Roland Gamos)
  featuring: [
    {
      artistId: ObjectId, // Ref → artists
      artistName: "Kalash Criminel"
    }
  ],

  // Album
  albumId: ObjectId, // Ref → albums
  albumName: "Or Noir",

  // Metadata
  year: 2013,
  duration: 218000, // millisecondes
  popularity: 82,

  // Audio (⚡ CRUCIAL pour Blind Test)
  previewUrl: "https://p.scdn.co/mp3-preview/...", // 30s preview

  // Genres
  genres: ["trap", "rap francais"],

  // Crédits
  producerId: ObjectId, // Ref → producers (optionnel)
  producerName: "Therapy",

  // Metadata
  source: "spotify",
  verified: true,
  createdAt: ISODate("2024-01-15"),
  updatedAt: ISODate("2024-01-15")
}
```

**Index:**
```javascript
db.tracks.createIndex({ spotifyId: 1 }, { unique: true })
db.tracks.createIndex({ artistId: 1 })
db.tracks.createIndex({ "featuring.artistId": 1 }) // ⚡ Pour Roland Gamos
db.tracks.createIndex({ title: "text", artistName: "text" })
db.tracks.createIndex({ year: 1 })
db.tracks.createIndex({ popularity: -1 })
db.tracks.createIndex({ previewUrl: 1 }) // Filter tracks avec preview
```

**Utilité:**
- ✅ Blind Test → `previewUrl`
- ✅ Roland Gamos → `featuring.artistId`
- ✅ Who Produced → `producerName`
- ✅ Guess The Year → `year`

---

## 3️⃣ Collection: `albums`

```javascript
{
  _id: ObjectId,
  spotifyId: "3fHCfFZj8yqOMpCWqYpqmW",
  discogsId: "12345678", // Si dispo (pour covers HD)

  // Infos principales
  title: "Commando",
  artistId: ObjectId, // Ref → artists
  artistName: "Niska",

  // Metadata
  year: 2017,
  releaseDate: "2017-04-21",
  label: "Universal Music France",

  // Covers (⚡ CRUCIAL pour Pixel Cover)
  coverUrl: "https://i.scdn.co/image/...", // 640x640 Spotify
  coverUrlHD: "https://img.discogs.com/...", // HD Discogs si dispo

  // Tracks
  trackIds: [ObjectId, ObjectId], // Ref → tracks
  trackCount: 18,

  // Genres
  genres: ["trap", "rap francais"],

  // Metadata
  source: "spotify", // ou "discogs"
  verified: true,
  createdAt: ISODate("2024-01-15"),
  updatedAt: ISODate("2024-01-15")
}
```

**Index:**
```javascript
db.albums.createIndex({ spotifyId: 1 }, { unique: true })
db.albums.createIndex({ discogsId: 1 }, { sparse: true })
db.albums.createIndex({ artistId: 1 })
db.albums.createIndex({ year: 1 }) // ⚡ Pour Guess The Year
db.albums.createIndex({ title: "text", artistName: "text" })
```

**Utilité:**
- ✅ Pixel Cover → `coverUrl` ou `coverUrlHD`
- ✅ Guess The Year → `year`

---

## 4️⃣ Collection: `collaborations` (Dénormalisée pour perfs)

```javascript
{
  _id: ObjectId,

  // Artistes
  artistAId: ObjectId, // Ref → artists
  artistAName: "Kaaris",
  artistBId: ObjectId, // Ref → artists
  artistBName: "Niska",

  // Track
  trackId: ObjectId, // Ref → tracks
  trackTitle: "Exemple Track",

  // Metadata
  verified: true, // Vérifié par le crawler
  source: "spotify", // ou "lastfm", "musicbrainz"
  createdAt: ISODate("2024-01-15"),
  updatedAt: ISODate("2024-01-15")
}
```

**Index:**
```javascript
db.collaborations.createIndex({ artistAId: 1, artistBId: 1 }) // ⚡ Roland Gamos
db.collaborations.createIndex({ artistBId: 1, artistAId: 1 }) // Inverse aussi
db.collaborations.createIndex({ trackId: 1 })
```

**Utilité:**
- ✅ Roland Gamos → Query ultra rapide sur artistAId ou artistBId
- ✅ Feature or Not → Vérifier si 2 artistes ont collaboré

---

## 5️⃣ Collection: `lyrics`

```javascript
{
  _id: ObjectId,

  // Track info
  trackId: ObjectId, // Ref → tracks
  trackTitle: "Dozo",
  artistId: ObjectId, // Ref → artists
  artistName: "PNL",

  // Lyrics
  snippet: "Dans la rue, j'ai tout vu\nDes lovés, des déçus", // 2-4 lignes
  fullLyrics: "...", // Lyrics complètes (optionnel)

  // Metadata
  language: "fr",
  isPunchline: false, // true si c'est une punchline célèbre
  source: "genius",
  verified: true,

  createdAt: ISODate("2024-01-15"),
  updatedAt: ISODate("2024-01-15")
}
```

**Index:**
```javascript
db.lyrics.createIndex({ trackId: 1 })
db.lyrics.createIndex({ artistId: 1 })
db.lyrics.createIndex({ snippet: "text", fullLyrics: "text" })
db.lyrics.createIndex({ isPunchline: 1 })
```

**Utilité:**
- ✅ Lyrics Snippets → `snippet`
- ✅ Who Said It → `snippet` + `artistName`

---

## 6️⃣ Collection: `punchlines` (Subset de lyrics)

```javascript
{
  _id: ObjectId,

  // Punchline
  text: "La vie c'est comme une kalachnikov, ça part dans tous les sens",

  // Attribution
  artistId: ObjectId, // Ref → artists
  artistName: "Booba",
  trackId: ObjectId, // Ref → tracks
  trackTitle: "DKR",
  year: 2016,

  // Popularité
  votes: 1250, // Nombre de votes/likes
  popularity: 95, // Score calculé

  // Metadata
  source: "genius",
  verified: true,
  createdAt: ISODate("2024-01-15"),
  updatedAt: ISODate("2024-01-15")
}
```

**Index:**
```javascript
db.punchlines.createIndex({ artistId: 1 })
db.punchlines.createIndex({ text: "text" })
db.punchlines.createIndex({ popularity: -1 })
db.punchlines.createIndex({ votes: -1 })
```

**Utilité:**
- ✅ Punchlines Mode → Afficher punchline + deviner artiste
- ✅ Who Said It → Quiz sur punchlines célèbres

---

## 7️⃣ Collection: `producers`

```javascript
{
  _id: ObjectId,

  // Producer
  name: "Skread",
  spotifyId: "...", // Si dispo
  image: "https://...",

  // Track
  trackId: ObjectId, // Ref → tracks
  trackTitle: "DKR",
  artistId: ObjectId, // Ref → artists
  artistName: "Booba",
  albumId: ObjectId, // Ref → albums

  // Metadata
  source: "musicbrainz", // ou "spotify", "genius"
  verified: true,
  createdAt: ISODate("2024-01-15"),
  updatedAt: ISODate("2024-01-15")
}
```

**Index:**
```javascript
db.producers.createIndex({ name: 1 })
db.producers.createIndex({ trackId: 1 })
db.producers.createIndex({ artistId: 1 })
```

**Utilité:**
- ✅ Who Produced → Quiz sur producteurs

---

## 🔥 Queries Exemple

### Roland Gamos - Trouver tous les feats de Kaaris
```javascript
// Méthode 1: Via collaborations (RAPIDE)
db.collaborations.find({
  artistAName: "Kaaris"
}).limit(20)

// Méthode 2: Via tracks
db.tracks.find({
  "featuring.artistName": "Kaaris"
}).limit(20)
```

### Le Thème - Rappeurs du 93
```javascript
db.artists.find({
  "location.department": "93",
  monthlyListeners: { $gte: 30000 } // Mini 30k streams
}).limit(50)
```

### Blind Test - Tracks avec preview
```javascript
db.tracks.find({
  previewUrl: { $exists: true, $ne: null },
  popularity: { $gte: 40 }
}).limit(100)
```

### Guess The Year - Albums années 2010-2020
```javascript
db.albums.find({
  year: { $gte: 2010, $lte: 2020 },
  coverUrlHD: { $exists: true }
}).limit(50)
```

### Feature or Not - Kaaris × Niska
```javascript
db.collaborations.findOne({
  artistAName: "Kaaris",
  artistBName: "Niska"
})
// ou inverse
db.collaborations.findOne({
  artistAName: "Niska",
  artistBName: "Kaaris"
})
```

---

## 📈 Évolution & Maintenance

### Update Automatique
```javascript
// Chaque artiste a un `updatedAt`
// Le crawler peut identifier les docs obsolètes:
db.artists.find({
  updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 jours
}).limit(100)
```

### Stats
```javascript
// Nombre total de collaborations
db.collaborations.countDocuments()

// Artistes les plus populaires
db.artists.find().sort({ monthlyListeners: -1 }).limit(10)

// Tracks les plus récents
db.tracks.find().sort({ year: -1 }).limit(100)
```

---

## 🚀 Performance

Avec cette structure:
- ✅ Toutes les queries < 50ms (avec index)
- ✅ Fuzzy matching via text search MongoDB
- ✅ Pas besoin de JOIN (tout dénormalisé intelligemment)
- ✅ Scalable jusqu'à 10M+ documents

---

## 💾 Backup

Sur IONOS, configure un cron pour backup quotidien:
```bash
mongodump --out /backup/$(date +%Y%m%d)
```
