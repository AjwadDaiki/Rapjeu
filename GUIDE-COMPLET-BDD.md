# 📚 Guide Complet - Base de Données RAP BATTLE

Ce guide te montre comment mettre en place la BDD exhaustive avec 100k+ données pour que **TOUTES** les réponses fonctionnent (Kaaris×Niska, Rohff×91, etc.).

---

## 🎯 Objectif

Remplacer les données hardcodées par une BDD massive qui contient:
- **50,000+** artistes rap (même petits artistes à 30k streams)
- **500,000+** tracks avec tous les featurings
- **100,000+** albums avec covers HD
- **100,000+** collaborations vérifiées
- Données géographiques (ville, département) pour thèmes "Rappeur du 91/92/93..."

---

## 📋 Checklist Complète

### Phase 1: Setup MongoDB sur IONOS ✅

1. [ ] Suivre le guide `SETUP-MONGODB-IONOS.md`
2. [ ] MongoDB installé sur VPS IONOS
3. [ ] Base `rapbattle` créée
4. [ ] Tous les index créés
5. [ ] Backup automatique configuré

### Phase 2: Configuration Locale ✅

1. [ ] Modifier `.env.local`:
   ```bash
   # MongoDB
   MONGODB_URI=mongodb://rapbattle_app:MOT_DE_PASSE@ton-ip-ionos:27017/rapbattle

   # Spotify (pour crawler)
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...

   # Last.fm (pour localisation)
   LASTFM_API_KEY=...
   ```

2. [ ] Tester la connexion:
   ```bash
   node -e "const {MongoClient} = require('mongodb'); new MongoClient(process.env.MONGODB_URI).connect().then(() => console.log('✅ OK')).catch(e => console.error('❌', e.message))"
   ```

### Phase 3: Crawling Initial (1-2 jours) 🚀

1. [ ] Lancer le crawler:
   ```bash
   npm run crawl
   ```

   **Ce que ça fait:**
   - Découvre 50k artistes rap via Spotify
   - Pour chaque artiste: tous ses albums
   - Pour chaque album: tous les tracks
   - Extrait TOUS les featurings
   - Récupère ville/département depuis Last.fm
   - Stocke tout dans MongoDB

   **Durée:** ~12-24h pour 50k artistes (dépend du rate limiting Spotify)

2. [ ] Surveiller les logs:
   ```bash
   # Dans un autre terminal
   tail -f /var/log/mongodb/mongod.log
   ```

3. [ ] Vérifier la progression:
   ```bash
   # Se connecter à MongoDB
   mongosh -u rapbattle_app -p --authenticationDatabase rapbattle

   # Vérifier les stats
   use rapbattle
   db.artists.countDocuments()
   db.tracks.countDocuments()
   db.collaborations.countDocuments()
   ```

### Phase 4: Intégration au Jeu ✅

1. [ ] Modifier `app/lib/roomManager.ts` pour query MongoDB au lieu de hardcoded data

2. [ ] Exemple pour Roland Gamos:
   ```typescript
   // Au lieu de hardcoded collabs, query MongoDB:
   const collabsCol = db.collection('collaborations');
   const collabs = await collabsCol.find({
     artistAName: currentArtist
   }).limit(50).toArray();

   // Valider réponse:
   const isValid = collabs.some(c =>
     fuzzyMatch(answer, c.artistBName).isValid
   );
   ```

3. [ ] Exemple pour "Rappeur du 91":
   ```typescript
   const artistsCol = db.collection('artists');
   const artists = await artistsCol.find({
     'location.department': '91',
     monthlyListeners: { $gte: 30000 }
   }).limit(100).toArray();
   ```

### Phase 5: Auto-Refresh Quotidien ✅

1. [ ] Option A: Cron sur serveur IONOS
   ```bash
   crontab -e

   # Ajouter:
   0 4 * * * cd /path/to/rapbattle && npm run crawl >> /var/log/crawl.log 2>&1
   ```

2. [ ] Option B: Script Node.js daemon
   ```bash
   npm run crawl:watch
   ```
   (Crawle puis attend 24h puis recommence)

---

## 🔧 Modification des Modes de Jeu

### Roland Gamos - Chaîne de Feats

**Avant (hardcoded):**
```typescript
// ❌ Liste hardcodée limitée
const knownCollabs = ['Niska', 'Booba', 'Kaaris'];
```

**Après (MongoDB):**
```typescript
// ✅ Query exhaustive MongoDB
async function getArtistFeaturings(artistName: string): Promise<string[]> {
  const collabsCol = db.collection('collaborations');

  const collabs = await collabsCol.find({
    $or: [
      { artistAName: artistName },
      { artistBName: artistName }
    ]
  }).limit(100).toArray();

  return collabs.map(c =>
    c.artistAName === artistName ? c.artistBName : c.artistAName
  );
}
```

### Le Thème - Rappeurs du XX

**Avant (hardcoded):**
```typescript
// ❌ Liste hardcodée par département
const rappeurs93 = ['Kaaris', 'Rohff', 'Booba'];
```

**Après (MongoDB):**
```typescript
// ✅ Query MongoDB avec filtre département
async function getArtistsByDepartment(dept: string): Promise<Artist[]> {
  const artistsCol = db.collection('artists');

  return await artistsCol.find({
    'location.department': dept,
    monthlyListeners: { $gte: 30000 } // Mini 30k streams
  }).limit(200).toArray();
}
```

---

## 📊 Queries Utiles

### Vérifier les données

```javascript
// Dans mongosh
use rapbattle

// Artistes les plus populaires
db.artists.find().sort({ monthlyListeners: -1 }).limit(10)

// Tous les artistes du 91
db.artists.find({ 'location.department': '91' })

// Toutes les collabs de Kaaris
db.collaborations.find({
  $or: [
    { artistAName: 'Kaaris' },
    { artistBName: 'Kaaris' }
  ]
})

// Vérifier Kaaris × Niska
db.collaborations.findOne({
  $or: [
    { artistAName: 'Kaaris', artistBName: 'Niska' },
    { artistAName: 'Niska', artistBName: 'Kaaris' }
  ]
})
```

### Nettoyer les doublons

```javascript
// Si tu as des doublons de collabs
db.collaborations.aggregate([
  {
    $group: {
      _id: { a: "$artistAName", b: "$artistBName" },
      count: { $sum: 1 },
      ids: { $push: "$_id" }
    }
  },
  { $match: { count: { $gt: 1 } } }
])
```

---

## 🚀 Optimisations

### Cache Redis (optionnel)

Pour éviter de query MongoDB à chaque requête:

```typescript
import { createClient } from 'redis';

const redis = createClient({ url: 'redis://localhost:6379' });
await redis.connect();

async function getArtistFeaturingsCached(artistName: string): Promise<string[]> {
  const cacheKey = `feats:${artistName}`;

  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Query MongoDB
  const feats = await getArtistFeaturings(artistName);

  // Store in cache (24h)
  await redis.setEx(cacheKey, 86400, JSON.stringify(feats));

  return feats;
}
```

### Index Complémentaires

Si certaines queries sont lentes:

```javascript
// Index text search pour fuzzy matching
db.artists.createIndex({ name: "text", aliases: "text" }, { weights: { name: 10, aliases: 5 } })

// Index composé pour collabs inversées
db.collaborations.createIndex({ artistBName: 1, artistAName: 1 })
```

---

## ❓ FAQ

### Q: Combien de temps prend le crawl initial?
**R:** 12-24h pour 50k artistes avec tous leurs albums/tracks. Tu peux le laisser tourner overnight.

### Q: Ça coûte combien en stockage?
**R:** ~2-3 GB pour 50k artistes + 500k tracks. Sur IONOS VPS (10-20 GB), c'est largement suffisant.

### Q: Comment gérer les nouveaux artistes?
**R:** Le script auto-refresh quotidien découvre automatiquement les nouveaux artistes qui dépassent 30k listeners.

### Q: Et si Spotify rate-limit?
**R:** Le script attend automatiquement (header `Retry-After`). Ça peut juste prendre plus longtemps.

### Q: Comment tester sans tout crawler?
**R:** Modifie `MAX_ARTISTS` dans le script à 1000 pour un test rapide (30 minutes).

### Q: Rohff n'est pas détecté dans le 91?
**R:** Vérifie sa bio Last.fm. Si Last.fm n'a pas l'info, ajoute manuellement:
```javascript
db.artists.updateOne(
  { name: 'Rohff' },
  { $set: { location: { country: 'FR', department: '91', city: 'Vitry-sur-Seine' } } }
)
```

### Q: Kaaris × Niska toujours pas détecté?
**R:** Vérifie la BDD:
```javascript
db.collaborations.find({
  $or: [
    { artistAName: /kaaris/i, artistBName: /niska/i },
    { artistAName: /niska/i, artistBName: /kaaris/i }
  ]
})
```
Si absent, peut-être qu'ils n'ont pas de track officiel ensemble sur Spotify. Ajoute manuellement si nécessaire.

---

## ✅ Résultat Final

Une fois tout setup:

✅ **Kaaris × Niska** fonctionnera (si collab existe sur Spotify)
✅ **Rohff rappeur du 91** fonctionnera (si bio Last.fm correcte)
✅ **Petits artistes à 30k streams** seront inclus
✅ **100k+ collaborations** vérifiées
✅ **Auto-refresh quotidien** pour nouveautés
✅ **Queries ultra rapides** (<50ms avec index)
✅ **Pas de hardcode** = jeu évolutif et exhaustif

---

## 🆘 Support

Si problème:

1. Vérifier les logs MongoDB: `/var/log/mongodb/mongod.log`
2. Vérifier les logs crawler: `npm run crawl 2>&1 | tee crawl.log`
3. Tester les queries manuellement avec `mongosh`
4. Vérifier les API keys dans `.env.local`

---

**Prochaine étape:** Une fois la BDD remplie, on pourra créer des **thèmes plus originaux** basés sur les données réelles (genre, décennie, label, producteur, etc.) au lieu de simples "Rappeur du XX". 🎯
