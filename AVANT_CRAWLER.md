# ⚠️ À FAIRE AVANT DE LANCER LE CRAWLER!

**Important:** Le crawler va récupérer les données, mais le jeu crashera sans ces fixes!

---

## 🔴 4 BUGS CRITIQUES À FIXER (30-45 min)

### 1. Connexion MongoDB répétée ⚡ (10-15 min)

**Problème:**
Chaque handler ouvre/ferme une connexion MongoDB à chaque requête.

**Impact:**
- Performance dégradée
- Risque de saturation du pool de connexions
- Latence pendant le jeu

**Solution:**
Créer un fichier `app/server/db.js` pour partager une connexion:

```javascript
// app/server/db.js
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapbattle';

let client = null;
let db = null;

async function getDB() {
  if (db) return db;

  client = await MongoClient.connect(MONGODB_URI);
  db = client.db();
  console.log('✅ MongoDB connecté');

  return db;
}

async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = { getDB, closeDB };
```

**Ensuite, dans chaque handler, remplacer:**

```javascript
// ❌ AVANT
const client = await MongoClient.connect(MONGODB_URI);
const db = client.db();
// ...
await client.close();

// ✅ APRÈS
const { getDB } = require('../db');
const db = await getDB();
// ... (pas de close!)
```

**Fichiers à modifier:**
- `app/server/modes/DevineQuiHandler.js` (lignes 22, 90)
- `app/server/modes/RolandGamosHandler.js`
- `app/server/modes/LeThemeHandler.js`
- `app/server/modes/PixelCoverHandler.js`
- `app/server/modes/BlindTestHandler.js`

---

### 2. Bug timer EncheresHandler 🐛 (2 min)

**Problème:**
Ligne 43 dans `EncheresHandler.js`:
```javascript
return this.room.room.config.encheresTime * 1000; // ❌ this.room.room
```

**Impact:**
Crash du mode Les Enchères

**Solution:**
```javascript
return this.room.config.encheresTime * 1000; // ✅ this.room.config
```

**Fichier:**
- `app/server/modes/EncheresHandler.js:43`

---

### 3. Gestion erreurs async 🛡️ (5 min)

**Problème:**
Si une requête MongoDB échoue, le serveur crash sans message d'erreur.

**Fichier:** `app/server/GameStateMachine.js:171`

**Solution:**

```javascript
// ❌ AVANT
async handleRoundStart() {
  const currentMode = this.modesQueue[this.currentModeIndex];
  this.currentHandler = this.handlers[currentMode];

  this.currentQuestion = await this.currentHandler.generateQuestion();

  this.room.broadcast('round_start', {
    mode: currentMode,
    round: this.currentRound + 1,
    totalRounds: this.room.config.roundsPerMode,
    question: this.currentQuestion,
  });

  setTimeout(() => {
    this.setState('round_active');
  }, 1000);
}

// ✅ APRÈS
async handleRoundStart() {
  const currentMode = this.modesQueue[this.currentModeIndex];
  this.currentHandler = this.handlers[currentMode];

  try {
    this.currentQuestion = await this.currentHandler.generateQuestion();

    this.room.broadcast('round_start', {
      mode: currentMode,
      round: this.currentRound + 1,
      totalRounds: this.room.config.roundsPerMode,
      question: this.currentQuestion,
    });

    setTimeout(() => {
      this.setState('round_active');
    }, 1000);

  } catch (error) {
    console.error('❌ Erreur generateQuestion:', error);
    this.room.broadcast('error', {
      message: 'Impossible de générer la question',
      error: error.message
    });

    // Passer au round suivant
    setTimeout(() => {
      this.setState('round_end');
    }, 2000);
  }
}
```

---

### 4. Égalité Devine Qui 🎯 (5 min)

**Problème:**
Si personne ne trouve, on retourne `winner: null` mais `damage: 10`.
Le code dans GameStateMachine ne sait pas comment gérer ça.

**Fichier:** `app/server/modes/DevineQuiHandler.js:210-217`

**Solution:**

```javascript
// ❌ AVANT
if (!this.foundBy) {
  return {
    winner: null,
    damage: 10,
    targetArtist: this.currentQuestion.targetArtist.name,
    attempts: this.attempts.length,
  };
}

// ✅ APRÈS
if (!this.foundBy) {
  // Personne n'a trouvé - pas de dégâts
  return {
    winner: null,
    damage: 0, // Pas de dégâts en cas d'égalité
    targetArtist: this.currentQuestion.targetArtist.name,
    attempts: this.attempts.length,
  };
}
```

**Ou alternative (dégâts aux deux):**

```javascript
// Dans GameStateMachine.js:206-213
if (results.winner) {
  const loser = results.winner === 'A' ? 'B' : 'A';
  this.teamHP[loser] = Math.max(0, this.teamHP[loser] - results.damage);
  this.combos[results.winner]++;
  this.combos[loser] = 0;
} else if (results.damage > 0) {
  // Égalité - dégâts aux deux teams
  this.teamHP.A = Math.max(0, this.teamHP.A - results.damage);
  this.teamHP.B = Math.max(0, this.teamHP.B - results.damage);
}
```

---

## ✅ APRÈS CES FIXES

**1. Tester rapidement (5 min):**

```bash
# Démarrer le serveur
npm run dev

# Dans le navigateur:
# - Créer une room
# - Ajouter 2 joueurs (2 onglets)
# - Lancer le jeu
# - Vérifier qu'il ne crash pas
```

**2. Lancer le crawler:**

```bash
npm run crawl
```

**Logs améliorés:**
- ✅ Barre de progression avec pourcentage
- ✅ Temps écoulé / ETA
- ✅ Vitesse de crawling (artistes/min)
- ✅ Rapport détaillé tous les 10 artistes
- ✅ Statistiques de qualité des données
- ✅ Rapport final complet avec graphiques

**3. Attendre 10-15h:**

Le crawler affichera:
```
┌─────────────────────────────────────────────────────────┐
│ 📊 PROGRESSION: 450/3000 artistes
│ [█████████░░░░░░░░░░░░░░░░░░░] 15.0%
│ ⏱️  Temps écoulé: 2h 15m | ETA: 12h 45m
│ ⚡ Vitesse: 3.33 artistes/min
└─────────────────────────────────────────────────────────┘

📊 BASE DE DONNÉES:
   Artistes: 450 | Albums: 3,240 | Tracks: 45,678 | Collabs: 1,234

📈 QUALITÉ DES DONNÉES:
   Bio: 380/450 (84.4%)
   Tags: 420/450 (93.3%)
   Preview: 38,900/45,678 (85.2%)
```

**4. Après le crawler:**

```bash
npm run dev
# → http://localhost:3000
# → JEU 100% OPÉRATIONNEL! 🎮
```

---

## 📊 TEMPS TOTAL

- Fixes critiques: 30-45 min
- Test rapide: 5 min
- Crawler: 10-15h (automatique)

**Dans ~15h, tu auras un jeu complet et jouable!** 🚀

---

## 🔧 COMMANDES UTILES

```bash
# Vérifier que MongoDB tourne
mongosh

# Vérifier les collections après crawler
use rapbattle
db.artists.countDocuments()
db.albums.countDocuments()
db.tracks.countDocuments()

# Lancer le jeu
npm run dev
```

---

**IMPORTANT:** Ne lance PAS le crawler avant d'avoir fait les 4 fixes, sinon le jeu crashera même avec les données!
