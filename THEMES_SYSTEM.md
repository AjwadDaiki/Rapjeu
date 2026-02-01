# 🎯 Système de Thèmes - RapJeu

## Vue d'ensemble

Le système de thèmes permet de créer des questions variées pour les modes **"Le Thème"** et **"Les Enchères"**.

**150+ thèmes différents** répartis en 6 catégories!

## 📁 Architecture

```
app/
├── lib/
│   ├── themes.ts           # 150+ thèmes avec métadonnées
│   └── themeQueries.ts     # Logique MongoDB pour récupérer artistes
└── api/
    └── themes/
        ├── random/route.ts    # GET - Sélection aléatoire
        ├── validate/route.ts  # POST - Validation réponse
        └── hints/route.ts     # GET - Indices (power-up)
```

## 🎨 Catégories de thèmes

### 📍 Géographie (12 thèmes)
- Départements: 91, 92, 93, 94, 95, 75, 13, 69, 59, 33
- Régions: Île-de-France, Sud de la France

**Exemple:**
```typescript
{
  id: 'geo_93',
  title: 'Rappeurs du 93',
  description: 'Seine-Saint-Denis',
  category: 'geography',
  difficulty: 'easy',
  mongoQuery: { 'location.department': '93' },
  estimatedCount: 300
}
```

### 🎨 Styles musicaux (7 thèmes)
- Trap, Drill, Cloud Rap, Boom Bap, Conscient, Hardcore, RnB

**Exemple:**
```typescript
{
  id: 'style_trap',
  title: 'Rappeurs Trap',
  description: 'Style trap français',
  category: 'style',
  difficulty: 'easy',
  mongoQuery: { tags: 'trap' },
  estimatedCount: 400
}
```

### 📅 Chronologie (15 thèmes)
- Décennies: 90s, 2000s, 2010s, 2020s
- Années spécifiques: 2015 à 2025

**Exemple:**
```typescript
{
  id: 'time_2019',
  title: 'Album en 2019',
  description: 'Sorti un album en 2019',
  category: 'timeline',
  difficulty: 'easy',
  estimatedCount: 200
}
```

### 📊 Statistiques (11 thèmes)
- Nombre d'albums: 1 album, 2-3 albums, +5 albums, +10 albums
- Popularité: Top 100, Top 200, +5M listeners, +1M listeners
- Nombre de tracks: +50 tracks, +100 tracks

**Exemple:**
```typescript
{
  id: 'stats_5plus_albums',
  title: '+5 albums',
  description: 'Au moins 5 albums',
  category: 'stats',
  difficulty: 'easy',
  mongoQuery: { totalAlbums: { $gte: 5 } },
  estimatedCount: 300
}
```

### 🔤 Lettres (30 thèmes!)
- Chaque lettre A-Z dans le pseudo
- Variations: "Commence par A", "Commence par L", etc.

**Exemple:**
```typescript
{
  id: 'letter_a',
  title: 'Lettre A dans le pseudo',
  description: 'Contient un "A"',
  category: 'letters',
  difficulty: 'easy',
  mongoQuery: { name: /a/i },
  estimatedCount: 800
}
```

### 🤝 Collaborations (8 thèmes)
- Featurings avec: Booba, Ninho, PNL, Jul, SCH, Damso, Kaaris, Freeze Corleone

**Exemple:**
```typescript
{
  id: 'collab_booba',
  title: 'Featurings avec Booba',
  description: 'A feat avec Booba',
  category: 'collab',
  difficulty: 'easy',
  estimatedCount: 100
}
```

## 🔌 API Routes

### 1. Sélection aléatoire

```bash
GET /api/themes/random?difficulty=easy
GET /api/themes/random?category=geography
```

**Réponse:**
```json
{
  "theme": {
    "id": "geo_93",
    "title": "Rappeurs du 93",
    "description": "Seine-Saint-Denis",
    "difficulty": "easy",
    "category": "geography"
  },
  "artistCount": 300
}
```

### 2. Validation de réponse

```bash
POST /api/themes/validate
Content-Type: application/json

{
  "themeId": "geo_93",
  "artistName": "booba",
  "usedAnswers": ["PNL", "Kaaris"]
}
```

**Réponse (succès):**
```json
{
  "valid": true,
  "normalizedName": "Booba",
  "artist": {
    "name": "Booba",
    "spotifyId": "0VBc83GX4gb0l2sEfkLVWC",
    "imageUrl": "https://..."
  }
}
```

**Réponse (échec):**
```json
{
  "valid": false,
  "reason": "Artiste invalide pour ce thème"
}
```

### 3. Indices (power-up)

```bash
GET /api/themes/hints?themeId=geo_93&count=3
```

**Réponse:**
```json
{
  "hints": ["PNL", "Kaaris", "Booba"],
  "themeTitle": "Rappeurs du 93"
}
```

## 💡 Utilisation dans le jeu

### Mode "Le Thème"

```typescript
// 1. Récupérer un thème
const response = await fetch('/api/themes/random?difficulty=easy');
const { theme, artistCount } = await response.json();

// 2. Afficher le thème
<div>{theme.title}</div>

// 3. Valider les réponses des joueurs
const validateResponse = await fetch('/api/themes/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    themeId: theme.id,
    artistName: playerInput,
    usedAnswers: alreadyNamed
  })
});

const result = await validateResponse.json();
if (result.valid) {
  // Ajouter à la liste des bonnes réponses
  alreadyNamed.push(result.normalizedName);
}
```

### Mode "Les Enchères"

Même principe, mais:
1. Le joueur mise sur combien d'artistes il peut nommer
2. Il doit ensuite prouver en nommant X artistes du thème
3. Utiliser la même API de validation

## 🔧 Queries complexes

### Thèmes basés sur les années

Ces thèmes nécessitent une jointure avec la collection `albums`:

```typescript
// Récupère tous les artistes ayant sorti un album en 2019
const albums = await db.collection('albums').find({ year: 2019 });
const artistIds = [...new Set(albums.map(a => a.artistId))];
const artists = await db.collection('artists').find({
  spotifyId: { $in: artistIds }
});
```

### Thèmes basés sur les collaborations

Ces thèmes nécessitent une jointure avec la collection `collaborations`:

```typescript
// Récupère tous les artistes ayant feat avec Booba
const collabs = await db.collection('collaborations').find({
  $or: [
    { artist1Id: 'booba_spotify_id' },
    { artist2Id: 'booba_spotify_id' }
  ]
});
```

## 📊 Statistiques

```typescript
import { getThemeStats } from './lib/themes';

const stats = getThemeStats();
console.log(stats);

// Résultat:
{
  total: 150,
  byCategory: {
    geography: 12,
    style: 7,
    timeline: 15,
    stats: 11,
    letters: 30,
    collab: 8
  },
  byDifficulty: {
    easy: 50,
    medium: 70,
    hard: 30
  }
}
```

## 🎮 Exemple de gameplay

**Round "Le Thème":**

1. Thème sélectionné: "Rappeurs du 93" (300 réponses possibles)
2. Team A: "PNL" ✅ (+25 HP damage à Team B)
3. Team B: "Kaaris" ✅ (+25 HP damage à Team A)
4. Team A: "Booba" ✅ (+25 HP damage à Team B)
5. Team B: "Jul" ❌ (Jul est de Marseille, pas du 93)
6. Team B perd son tour
7. ...continue jusqu'à timeout

**Round "Les Enchères":**

1. Thème révélé: "Lettre A dans le pseudo"
2. Team A mise: "Je peux en nommer 5"
3. Team B mise: "Je peux en nommer 7"
4. Team B doit prouver: nomme 7 artistes avec un "A"
   - "Aya Nakamura" ✅
   - "Alpha Wann" ✅
   - "Alkpote" ✅
   - "Gradur" ✅
   - "Naza" ✅
   - "Sofiane" ❌ (pas de A)
   - Team B échoue, perd des HP

## 🚀 Améliorations futures

- Ajouter plus de labels (Def Jam, 7Corp, 92i, etc.)
- Thèmes par featuring count (artistes avec +50 featurings)
- Thèmes par certifications (disques d'or, platine)
- Thèmes par influence (old school legends, nouvelle vague)
- Thèmes par région détaillée (Hauts-de-Seine villes: Nanterre, Boulogne...)

## 📝 Notes techniques

- Tous les noms d'artistes sont normalisés (accents, casse) lors de la validation
- Les thèmes avec moins de 3 artistes sont automatiquement remplacés
- La difficulté affecte la probabilité de sélection (easy = plus fréquent)
- Les estimatedCount sont basés sur la DB actuelle (peuvent varier)
