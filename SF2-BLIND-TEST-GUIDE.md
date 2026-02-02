# 🥊 DA STREET FIGHTER 2 + 🔊 BLIND TEST - Guide Complet

## ✅ Ce qui a été fait

### 1. 🥊 DA STREET FIGHTER 2 COMPLÈTE

Tous les composants et styles SF2 ont été créés pour transformer ton jeu en une vraie expérience Fighting Game !

#### 📂 Fichiers créés:

**Composants SF2:**
- `app/components/SF2HealthBar.tsx` - Barres HP style Street Fighter 2
- `app/components/SF2ComboText.tsx` - Messages de combo (PERFECT, K.O., CRITICAL, etc.)
- `app/components/SF2VSScreen.tsx` - Écran VS d'intro
- `app/components/SF2KOScreen.tsx` - Écran de victoire/défaite K.O.

**Styles:**
- `app/styles/sf2.css` - CSS complet Street Fighter 2 avec font "Press Start 2P"
  - Importé automatiquement dans `app/layout.tsx`

**Audio:**
- `app/lib/audioManager.ts` - SFX activés (combo, hit, critical, buzz, etc.)
- Dossier `public/sounds` créé (prêt pour les fichiers audio)

#### 🎨 Fonctionnalités SF2:

**HP Bars:**
- Barres segmentées style SF2 avec dégradés
- Couleurs dynamiques: Jaune (>60%), Orange (30-60%), Rouge (<30%)
- Flash rouge quand HP critique (<20%)
- Animation de dégâts (flash blanc)
- Affichage "VS" entre les deux barres
- Font "Press Start 2P" partout

**Écran VS:**
- Animations d'entrée (sliding + rotation)
- Silhouettes des équipes (boxes colorées avec emojis)
- VS text massif avec cercles d'impact
- Éclairs dorés animés
- Effet "READY..." en bas
- Background rayé animé

**Combo Text:**
- **PERFECT** - Doré, 120px, avec lignes d'impact radiantes
- **K.O.** - Rouge massif, 140px, shake animation
- **CRITICAL** - Orange, 80px, flash animation
- **HIT** - Vert, remonte et disparaît
- **MISS** - Gris, tombe et disparaît
- **COMBO** - Bleu cyan, pop animation

**Écran K.O.:**
- Feux d'artifice circulaires autour de K.O.
- Affichage du gagnant avec character box
- Perdant en gris désaturé
- "PERFECT!" si victoire sans dégâts
- "Press any button to continue" clignotant

**CSS Global SF2:**
- Conteneur avec effet CRT (scanlines + courbure écran)
- Boutons SF2 (jaune/rouge/bleu) avec ombre 3D
- Input fields avec bordures néon
- Timer style SF2 avec flash rouge critique
- Indicateurs de dégâts flottants
- Combo meter avec pips dorés
- Question box avec bordure shine animée
- Mode icons flottants
- Responsive mobile

#### 🎮 Comment utiliser les composants SF2:

```tsx
import { SF2HealthBar } from './components/SF2HealthBar';
import { SF2ComboText } from './components/SF2ComboText';
import { SF2VSScreen } from './components/SF2VSScreen';
import { SF2KOScreen } from './components/SF2KOScreen';

// HP Bars
<SF2HealthBar
  team="A"
  hp={75}
  maxHp={100}
  teamName="EQUIPE A"
  position="left"
/>

// Combo Text
<SF2ComboText
  message="PERFECT!"
  type="perfect"
  show={showCombo}
  onComplete={() => setShowCombo(false)}
/>

// VS Screen
<SF2VSScreen
  teamA="TEAM A"
  teamB="TEAM B"
  duration={3000}
  onComplete={() => startGame()}
/>

// K.O. Screen
<SF2KOScreen
  winner="A"
  winnerName="TEAM A"
  loserName="TEAM B"
  isPerfect={true}
  duration={5000}
  onComplete={() => goToResults()}
/>
```

#### 🔊 Sons SF2:

Les sons sont maintenant activés dans `audioManager.ts`. Il faut juste ajouter les fichiers audio dans `public/sounds/`:

**Fichiers nécessaires** (format MP3, WEBM ou OGG):
- `combo2x.mp3` - Combo ×2
- `combo3x.mp3` - Combo ×3
- `critical_hit.mp3` - Dégâts critiques (>20 HP)
- `normal_hit.mp3` - Dégâts normaux
- `victory.mp3` - Victoire
- `defeat.mp3` - Défaite
- `tick.mp3` - Timer tick
- `buzz.mp3` - Buzzer Blind Test
- `wrong.mp3` - Mauvaise réponse
- `correct.mp3` - Bonne réponse

**Où trouver les sons:**
- Freesound.org (gratuit)
- Zapsplat.com (gratuit avec attribution)
- Ou extraire depuis les jeux SF2 (usage personnel uniquement)

---

### 2. 🔊 BLIND TEST - Problème identifié et solution

#### ❌ Problème découvert:

```
📊 Total tracks: 4518
🎵 Tracks avec preview URLs: 0 (0.00%)
```

**Aucune preview URL** n'est dans la base de données. Le crawler ne les récupère pas car Spotify ne retourne pas toujours les `preview_url` dans les réponses.

#### ✅ Solution:

**Il faut configurer Spotify API credentials** pour que le script `fix-preview-urls.js` puisse récupérer les preview URLs.

### 🔧 CONFIGURATION SPOTIFY API (TRÈS IMPORTANT)

#### Étape 1: Créer une App Spotify

1. Va sur https://developer.spotify.com/dashboard
2. Clique sur "Create app"
3. Remplis les infos:
   - **App name:** RapJeu Blind Test
   - **App description:** Application de quiz rap
   - **Redirect URI:** http://localhost:3000/callback
   - **Which API/SDKs are you planning to use?** Coche "Web API"
4. Accepte les terms et clique "Save"

#### Étape 2: Copier les credentials

1. Sur la page de ton app, clique sur "Settings"
2. Tu verras:
   - **Client ID** (une longue chaîne genre `a1b2c3d4e5f6...`)
   - **Client secret** (clique "View client secret" pour le voir)
3. **COPIE ces deux valeurs !**

#### Étape 3: Créer le fichier .env

Crée un fichier `.env` à la racine du projet (à côté de `package.json`):

```bash
# Windows
notepad .env

# Mac/Linux
nano .env
```

Colle ce contenu en remplaçant par tes vraies credentials:

```env
# ============================================
# SPOTIFY API CREDENTIALS
# ============================================

SPOTIFY_CLIENT_ID=ton_vrai_client_id_ici
SPOTIFY_CLIENT_SECRET=ton_vrai_client_secret_ici

# ============================================
# MONGODB CONNECTION
# ============================================

MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=rapbattle
```

**Sauvegarde** et ferme le fichier.

#### Étape 4: Lancer le script de fix

Maintenant tu peux récupérer les preview URLs:

```bash
node scripts/fix-preview-urls.js
```

Ce script va:
1. Se connecter à MongoDB
2. Trouver les tracks sans preview URL
3. Requêter Spotify API par batches de 50
4. Mettre à jour les tracks avec preview URL

**Résultat attendu:**
```
✅ Updated: 350-400 tracks (environ 70-80% ont des previews)
⚠️  Skipped: 100-150 tracks (pas de preview dispo chez Spotify)
```

#### Étape 5: Vérifier que ça marche

```bash
node scripts/test-blind-test.js
```

Tu devrais voir:
```
📊 Total tracks: 4518
🎵 Tracks avec preview URLs: 3500+ (70-80%)
✅ VERDICT: Blind Test is READY!
```

---

## 📊 Résumé des Scripts

| Script | Description | Quand l'utiliser |
|--------|-------------|------------------|
| `scripts/crawl-via-collabs.js` | Crawle les artistes via collaborations | Ajouter plus d'artistes |
| `scripts/fix-preview-urls.js` | Récupère les preview URLs manquantes | Après crawler ou si 0 previews |
| `scripts/test-blind-test.js` | Vérifie le statut du Blind Test | Vérifier si Blind Test est prêt |

---

## 🎮 Prochaines Étapes

### Immédiat:
1. ✅ **Créer le fichier `.env`** avec tes credentials Spotify
2. ✅ **Lancer `fix-preview-urls.js`** pour récupérer les preview URLs
3. ✅ **Vérifier avec `test-blind-test.js`** que ça fonctionne
4. 🎨 **Intégrer les composants SF2** dans tes pages de jeu
5. 🔊 **Télécharger et ajouter les sons** dans `public/sounds/`

### Optionnel:
6. ✍️ Ajouter 80+ anecdotes dans `app/data/mytho-anecdotes.json`
7. 🎨 Personnaliser les couleurs SF2 dans `app/styles/sf2.css`
8. 🔊 Créer tes propres sons custom

---

## 📁 Structure des Fichiers Créés

```
app/
├── components/
│   ├── SF2HealthBar.tsx          ← Barres HP SF2
│   ├── SF2ComboText.tsx           ← Messages combo
│   ├── SF2VSScreen.tsx            ← Écran VS
│   └── SF2KOScreen.tsx            ← Écran K.O.
├── styles/
│   ├── sf2.css                    ← CSS SF2 global
│   └── mobile.css                 ← (existant)
├── lib/
│   └── audioManager.ts            ← (modifié: SFX activés)
└── layout.tsx                     ← (modifié: import sf2.css)

scripts/
├── fix-preview-urls.js            ← Script pour fix preview URLs
└── test-blind-test.js             ← Script pour tester Blind Test

public/
└── sounds/                        ← Dossier pour les fichiers audio
    └── (vide, à remplir)

.env.example                       ← Template pour .env
.env                               ← À créer avec tes credentials
```

---

## 🎯 Checklist Finale

### DA Street Fighter 2:
- [x] Composants SF2 créés (HP, Combo, VS, K.O.)
- [x] CSS SF2 global avec font Press Start 2P
- [x] AudioManager avec SFX activés
- [x] Dossier sounds créé
- [ ] Sons MP3 ajoutés dans public/sounds/
- [ ] Composants SF2 intégrés dans les pages du jeu

### Blind Test:
- [x] Problème identifié (0 preview URLs)
- [x] Script fix-preview-urls.js créé
- [x] Script test-blind-test.js créé
- [x] .env.example créé
- [ ] Fichier .env créé avec credentials Spotify
- [ ] Script fix-preview-urls.js exécuté
- [ ] Preview URLs récupérées (test avec test-blind-test.js)

---

## 💡 Notes Importantes

### Spotify API Limits:
- **Rate limit:** ~100 requêtes/minute
- Le script `fix-preview-urls.js` respect ce limit (delay 100ms entre batches)
- Si rate limited, attend 1-2 minutes et relance

### Preview URLs:
- **Disponibilité:** ~70-80% des tracks ont des previews chez Spotify
- **Durée:** 30 secondes par preview
- **Format:** MP3 streamable via Howler.js

### Sons SF2:
- **Formats supportés:** MP3, WEBM, OGG (Howler.js teste dans cet ordre)
- **Volume:** Configurable via audioManager.setVolume(0-1)
- **Mute:** audioManager.toggleMute()

---

## 🆘 Troubleshooting

### "401 Unauthorized" lors du fix-preview-urls:
→ Vérifie que ton `.env` a les bonnes credentials Spotify

### "Rate limit exceeded":
→ Attends 1-2 minutes et relance le script

### Blind Test ne joue pas de son:
→ Vérifie que les preview URLs sont bien dans MongoDB (`test-blind-test.js`)
→ Vérifie la console browser pour errors Howler.js

### Sons SF2 ne jouent pas:
→ Vérifie que les fichiers MP3 sont bien dans `public/sounds/`
→ Ouvre la console et cherche "Could not load SFX"

---

Tout est prêt ! Il te reste juste à configurer Spotify API et récupérer les preview URLs. 🚀🔥
