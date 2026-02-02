# 🚀 Démarrage Rapide - MongoDB Local + Crawler RAP FR

Guide ultra rapide pour lancer le crawling et avoir des données exhaustives!

---

## ⚡ 3 Commandes Pour Tout Setup

```powershell
# 1️⃣ Setup MongoDB (crée BDD + collections + index)
npm run mongo:setup

# 2️⃣ Lance le crawler RAP FR
npm run crawl

# 3️⃣ (Optionnel) Lance le serveur pendant que ça crawl
npm run dev
```

C'est tout! 🎉

---

## 📊 Ce que le Crawler Va Récupérer

### Artistes Rap FR (~2000-5000)
- **Critère**: Mini 10k monthly listeners
- **Sources**:
  - Genres Spotify: "rap francais", "french hip hop", "trap francais", etc.
  - Seed artistes connus: Booba, PNL, Ninho, Kaaris, Jul, etc.
  - Related artists pour découvrir plus

- **Données par artiste**:
  - Nom + aliases (variations)
  - Popularité + monthly listeners
  - **Ville + département** (Paris, 91, 93, etc.)
  - Genres
  - Image

### Albums (~10,000-20,000)
- **Tous les albums** de chaque artiste
- Année de sortie
- Cover HD
- Label

### Tracks (~50,000-100,000)
- **Tous les tracks** de chaque album
- **Featurings extraits automatiquement** ✨
- Durée
- Preview URL (pour Blind Test)
- Popularité

### Collaborations (~20,000-50,000)
- **Toutes les collabs** détectées automatiquement
- Bidirectionnelles (A×B et B×A)
- Vérifiées depuis Spotify

---

## ⏱️ Durée du Crawl

**Estimation:** 2-6 heures (dépend du rate limiting Spotify)

- ~50 artistes/minute
- ~200 albums/minute
- ~1000 tracks/minute

**Astuce:** Lance ça overnight sur ton portable, demain matin = 100% done! 🌙

---

## 📈 Progression en Temps Réel

Le script affiche:
```
🚀 Crawl de 2547 artistes...

📦 Batch 1/127 (0-20/2547)
   ✅ Artistes: 15 | Albums: 180 | Tracks: 1205 | Collabs: 342

📦 Batch 2/127 (20-40/2547)
   ✅ Artistes: 32 | Albums: 421 | Tracks: 2890 | Collabs: 735
```

---

## 🎯 Nouveaux Thèmes Créatifs Disponibles

Une fois la BDD remplie, tu auras accès à **50+ types de thèmes**:

### 📊 Basés sur les Nombres
- "Musiques avec 'love' dans le titre"
- "Artistes avec plus de 10 albums"
- "Tracks de plus de 5 minutes"

### 🔤 Basés sur les Lettres
- "Rappeurs avec 3 lettres" (Jul, RK, PLK...)
- "Rappeurs commençant par K"
- "Tracks finissant par 'gang'"
- "Rappeurs SANS voyelles" (PNL, SCH...)

### 📅 Basés sur les Années
- "Albums des années 2010s"
- "Artistes ayant débuté en 2015"

### 🤝 Basés sur les Featurings
- "Artistes les plus featés avec Booba"
- "Artistes n'ayant JAMAIS fait de feat"

### 🏙️ Basés sur la Ville
- "Rappeurs du 93"
- "Rappeurs de Sevran"
- "Rappeurs d'Île-de-France"

### 🎨 Créatifs et Originaux
- "Tracks avec des chiffres" (911, 93...)
- "Tracks avec le titre le plus court"
- "Tracks avec le nom de l'artiste dedans"
- "Tracks avec des mots palindromes" (Bob, Anna...)

**Total: 50+ types différents!** 🔥

---

## ✅ Vérifier que Ça Marche

### Pendant le crawl:
```powershell
# Dans un autre terminal PowerShell
mongosh

use rapbattle

# Voir les stats
db.artists.countDocuments()
db.tracks.countDocuments()
db.collaborations.countDocuments()

# Vérifier Kaaris × Niska
db.collaborations.findOne({
  $or: [
    { artistAName: "Kaaris", artistBName: "Niska" },
    { artistAName: "Niska", artistBName: "Kaaris" }
  ]
})

# Vérifier rappeurs du 91
db.artists.find({ "location.department": "91" }).count()
```

### Résultat attendu:
```
artists: 2000-5000
tracks: 50,000-100,000
albums: 10,000-20,000
collaborations: 20,000-50,000
```

---

## 🔧 Si Kaaris × Niska Toujours Pas Détecté

C'est possible qu'ils n'aient pas de track officiel ensemble sur Spotify.

**Solution:** Ajoute manuellement si tu es sûr:
```javascript
mongosh

use rapbattle

db.collaborations.insertOne({
  artistAName: "Kaaris",
  artistBName: "Niska",
  trackTitle: "EXEMPLE TRACK",
  verified: false,
  source: "manual",
  createdAt: new Date(),
  updatedAt: new Date()
})

// Inverse aussi
db.collaborations.insertOne({
  artistAName: "Niska",
  artistBName: "Kaaris",
  trackTitle: "EXEMPLE TRACK",
  verified: false,
  source: "manual",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

---

## 📂 Fichiers Créés

```
scripts/
  ├── setup-mongodb-local.js     ← Setup BDD (1x seulement)
  ├── crawl-rap-fr.js            ← Crawler RAP FR exhaustif
  └── crawl-rap-data.js          ← Crawler global (si besoin)

app/data/
  └── themesCreatifs.ts          ← 50+ types de thèmes

database-schema.md                ← Schema MongoDB complet
SETUP-MONGODB-IONOS.md            ← Guide IONOS (si déploiement)
GUIDE-COMPLET-BDD.md              ← Guide exhaustif
```

---

## 🐛 Troubleshooting

### MongoDB pas connecté
```powershell
# Vérifier si MongoDB tourne
mongosh

# Si erreur, démarrer MongoDB:
net start MongoDB
```

### Rate Limit Spotify
Le script attend automatiquement. Ça peut juste prendre plus longtemps.

### Erreurs "duplicate key"
Normal! Le script skip automatiquement ce qui existe déjà.

### Crawler bloqué?
Ctrl+C puis relance `npm run crawl`, il reprendra là où il s'est arrêté.

---

## 🚀 Prochaine Étape

Une fois le crawl terminé:

1. **Intégrer MongoDB dans le game** (modifier `roomManager.ts`)
2. **Activer les thèmes créatifs** (importer `themesCreatifs.ts`)
3. **Tester les validations** (Kaaris×Niska, Rohff×91)

---

**Ready? Lance le crawler! 🔥**
```powershell
npm run crawl
```

Puis va te faire un café, ça va crawler pendant 2-6h! ☕
