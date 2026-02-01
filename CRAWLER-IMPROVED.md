# 🚀 Crawler Amélioré - Découverte Récursive

Le nouveau crawler utilise une stratégie **récursive** pour découvrir beaucoup plus d'artistes rap FR!

---

## ❌ Problème Ancien Crawler

```
✅ Découverte terminée: 51 artistes RAP FR
   artists             : 51
   tracks              : 10,220
   albums              : 2,149
   collaborations      : 5,184
```

**Trop peu d'artistes!** Seulement 51 au lieu de 2000-5000.

### Pourquoi?
- La recherche par genre ne retourne que quelques résultats
- Les seed artists échouent (404)
- Pas d'exploration récursive

---

## ✅ Nouveau Crawler Amélioré

### Stratégie: Découverte Récursive

```
1. Part des 51 artistes déjà crawlés (ou cherche des seeds)
2. Pour chaque artiste → récupère ses "related artists"
3. Filtre par followers (>10k) et genre rap/hip-hop
4. Continue récursivement jusqu'à 3000 artistes
5. Évite les doublons automatiquement
```

### Exemple de Découverte

```
Round 1: Booba → découvre Kaaris, Damso, SCH (20 artistes)
Round 2: Kaaris → découvre Niska, Freeze Corleone (35 nouveaux)
Round 3: Niska → découvre Heuss, PLK, RK (50 nouveaux)
...
Round 50: Target atteint: 3000 artistes
```

---

## 🎯 Résultats Attendus

### Ancien Crawler
```
51 artistes
10,220 tracks
2,149 albums
5,184 collabs
```

### Nouveau Crawler (cible)
```
3,000 artistes  (+5800%)
150,000+ tracks  (+1400%)
15,000+ albums  (+600%)
50,000+ collabs  (+900%)
```

---

## 🚀 Lancer le Nouveau Crawler

### Option 1: Partir de zéro
```powershell
# Supprimer l'ancienne BDD
mongosh mongodb://127.0.0.1:27017/rapbattle
db.dropDatabase()
exit

# Lancer le nouveau crawler
npm run crawl:improved
```

### Option 2: Continuer depuis les 51 artistes
```powershell
# Utilise les 51 artistes comme seeds
npm run crawl:improved
```

Le crawler va:
1. Charger les 51 artistes existants comme seeds
2. Explorer leurs related artists
3. Continuer jusqu'à 3000 artistes

---

## ⏱️ Durée Estimée

**2-4 heures** pour crawler 3000 artistes (vs 2-6h pour seulement 51)

Le crawler est plus rapide car:
- Rate limiting mieux géré
- Pas de recherches par genre (lentes)
- Utilise directement l'endpoint related artists

---

## 📊 Progression en Temps Réel

```
🔍 === DÉCOUVERTE RÉCURSIVE RAP FR ===

📊 Seeds depuis BDD: 51 artistes

🚀 Exploration récursive (target: 3000 artistes)

📦 Round 1: 50 artistes à explorer (découverts: 51/3000)
   +25 artistes depuis 4iV5W9uYEdYUVa79Qp7GqN...
   +18 artistes depuis 3IW7ScrzXmPvZhB27hmfgy...
   Total découvert: 94

📦 Round 2: 50 artistes à explorer (découverts: 94/3000)
   +31 artistes depuis 2hcs4RKa7WQz...
   Total découvert: 125

...

✅ Target atteint: 3000 artistes

🚀 Crawl de 3000 artistes...

📦 Batch 1/150 (0-20/3000)
   ✅ Booba: 25 albums, 320 tracks, 156 collabs
   ✅ Kaaris: 18 albums, 201 tracks, 89 collabs
   ...
```

---

## 🔍 Filtres du Crawler

### Minimum Followers
```javascript
const MIN_FOLLOWERS = 10000; // 10k+ followers
```

Inclut:
- ✅ Artistes établis (Booba, Ninho, Jul...)
- ✅ Artistes moyens (Ziak, PLK, RK...)
- ✅ Petits artistes avec base solide (10k+)

Exclus:
- ❌ Artistes inconnus (<10k)
- ❌ Faux comptes/spam

### Genre Rap/Hip-Hop
```javascript
const rapGenres = [
  'rap', 'hip hop', 'trap', 'drill', 'afro',
  'cloud rap', 'underground', 'grime', 'phonk',
  'boom bap', 'gangsta', 'conscious', 'francais', 'french'
];
```

Inclut tous les sous-genres du rap!

---

## 🎮 Impact sur le Jeu

Avec 3000 artistes au lieu de 51:

### Thèmes Géographiques
```
Avant: "Rappeur du 91" → 2-3 réponses valides
Après: "Rappeur du 91" → 50+ réponses valides
```

### Thèmes Créatifs
```
Avant: "Rappeurs avec 3 lettres" → Jul, SCH (2)
Après: "Rappeurs avec 3 lettres" → Jul, SCH, PLK, RK, ZKR... (15+)
```

### Mode Featurings
```
Avant: 5,184 collabs → peu de chaînes possibles
Après: 50,000+ collabs → énormément de chaînes possibles
```

### Blind Test / Pixel Cover
```
Avant: 10,220 tracks → risque de répétition
Après: 150,000+ tracks → infini de possibilités
```

---

## 🔄 Mises à Jour Régulières

Pour garder la BDD à jour:

```powershell
# Tous les mois
npm run crawl:improved
```

Le crawler:
- ✅ Garde les artistes existants
- ✅ Ajoute de nouveaux artistes
- ✅ Met à jour les albums/tracks
- ✅ Détecte nouvelles collabs

---

## 🐛 Troubleshooting

### Erreur "Target pas atteint"
Si le crawler s'arrête avant 3000 artistes:
- Normal! Il a exploré tout le réseau disponible
- Relancer avec des seeds différents
- Ou baisser TARGET_ARTISTS dans le script

### Rate Limiting Excessif
Si beaucoup de "Rate limit, attente...":
- Normal! Spotify limite à ~100 req/min
- Le crawler attend automatiquement
- Ça peut juste prendre plus longtemps

### Doublons
Le crawler évite automatiquement les doublons:
- Set JavaScript pour les IDs découverts
- updateOne avec upsert pour la BDD
- Pas de risque de duplication

---

## 📈 Comparaison

| Métrique | Ancien Crawler | Nouveau Crawler | Amélioration |
|----------|----------------|-----------------|--------------|
| Artistes | 51 | 3,000 | +5,800% |
| Tracks | 10,220 | 150,000+ | +1,400% |
| Albums | 2,149 | 15,000+ | +600% |
| Collabs | 5,184 | 50,000+ | +900% |
| Durée | 4.28 min | 2-4 heures | - |
| Richesse | ⭐⭐ | ⭐⭐⭐⭐⭐ | Excellente |

---

## 🚀 Prêt?

```powershell
npm run crawl:improved
```

Puis va te faire un café pendant 2-4h! ☕

Une fois terminé, ton jeu aura des **données MASSIVES** et ne sera plus frustrant! 🔥
