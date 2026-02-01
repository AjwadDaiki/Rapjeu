# RAP BATTLE ONLINE - DOCUMENTATION COMPLETE

## 📋 RESUME DU PROJET

**Rap Battle Online** est un jeu de quiz rap multijoueur en temps réel, style **Versus Fighting** (comme Street Fighter).
- 2 équipes s'affrontent (Team A = Bleue, Team B = Jaune)
- Système de HP (barres de vie) style fighting game
- 6 modes de jeu différents
- Temps réel via Socket.IO

---

## 🎮 ARCHITECTURE TECHNIQUE

### Stack
- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS v4
- **Backend**: Node.js + Socket.IO (serveur custom dans `server.ts`)
- **Animations**: Framer Motion
- **Audio**: Howler.js (prêt mais pas intégré)
- **Base de données**: MongoDB (connectée mais inutilisée)

### Structure des fichiers
```
/mnt/c/Users/daiki/Desktop/kimitest/
├── app/
│   ├── components/          # Composants UI
│   │   ├── ScreenShake.tsx      # Effet vibration
│   │   ├── HPBar.tsx            # Barre de vie
│   │   ├── TeamSlot.tsx         # Slot d'équipe (lobby)
│   │   ├── DisputeModal.tsx     # Modal litige (veto)
│   │   └── GameTimer.tsx        # Timer de jeu
│   ├── data/                # Données locales
│   │   ├── artists.ts           # Graph de featurings
│   │   ├── themes.ts            # 50+ thèmes
│   │   └── anecdotes.ts         # 100+ anecdotes
│   ├── game/
│   │   ├── page.tsx             # Page principale jeu
│   │   ├── modes/               # Les 6 modes de jeu
│   │   │   ├── RolandGamosMode.tsx
│   │   │   ├── LeThemeMode.tsx
│   │   │   ├── MythoPasMythoMode.tsx
│   │   │   ├── EncheresMode.tsx
│   │   │   ├── BlindTestMode.tsx
│   │   │   └── PixelCoverMode.tsx
│   │   └── phases/              # Phases de transition
│   ├── lobby/
│   │   └── page.tsx             # Page création/rejoindre room
│   ├── hooks/
│   │   ├── useSocket.ts         # Connexion Socket.IO
│   │   └── useGameContext.tsx   # Contexte global jeu
│   ├── lib/
│   │   ├── roomManager.ts       # Logique serveur (FSM)
│   │   ├── constants.ts         # Constantes timing/scoring
│   │   ├── utils.ts             # Fuzzy matching, helpers
│   │   ├── gameDataService.ts   # Cache API Spotify
│   │   └── api/                 # Intégrations API
│   │       ├── spotify.ts
│   │       └── lastfm.ts
│   └── types/
│       └── index.ts             # Types TypeScript
├── server.ts                # Serveur principal Socket.IO
└── next.config.ts           # Configuration Next.js
```

---

## 🎯 LES 6 MODES DE JEU

### 1. 🔗 ROLAND GAMOS (Chaîne de featurings)
**Concept**: Ping-pong de réponses où chaque réponse doit avoir un featuring avec la précédente.

**Déroulement**:
- Un artiste de départ est choisi aléatoirement (ex: Booba)
- Tour par tour (15s par équipe)
- Équipe A: trouve un feat avec Booba → "Kaaris" (Kalash, 2012)
- Équipe B: trouve un feat avec Kaaris → etc.

**Règles**:
- ❌ Pas de doublon (artiste déjà cité)
- ❌ Doit être un featuring documenté
- ✅ Fuzzy matching ("B2O" = "Booba")
- ⏱️ 15 secondes par tour
- **Dégâts**: 10 HP (x combo)

**Data**: Graph d'artistes avec `FEATURINGS[]` dans `artists.ts`

---

### 2. 🎯 LE THEME (Nommez X de Y)
**Concept**: Tour par tour, nommer des artistes correspondant à un thème.

**Déroulement**:
- Un thème est tiré (ex: "Rappeur du 92")
- Tour par tour (10s)
- Équipe A: "Booba" → Équipe B: "SDM" → etc.

**Thèmes disponibles**:
- Géographie: Départements (92, 93, 91...), Villes (Marseille, Paris)
- Crews: PNL, 92i, 667, Casseurs Flowters
- Labels: Rec. 118, Def Jam
- Époques: Années 90, 2000s, 2010s, 2020s
- Alphabet: Commence par B, N, S...

**Règles**:
- ❌ Pas de doublon
- ✅ Fuzzy matching
- ⏱️ 10 secondes par tour
- **Dégâts**: 8 HP (x combo)

**Data**: `THEMES[]` dans `themes.ts` (50+ thèmes)

---

### 3. ❓ MYTHO / PAS MYTHO (Vrai ou Faux)
**Concept**: Les 2 équipes répondent **simultanément** à des anecdotes.

**Déroulement**:
- Une anecdote s'affiche (ex: "Booba est originaire du 93")
- 10 secondes pour choisir: MYTHO (faux) ou PAS MYTHO (vrai)
- Révélation avec explication

**Scoring**:
- Bonne réponse: **-15 HP** à l'adversaire
- Mauvaise réponse: **-10 HP** à soi-même

**Data**: `ANECDOTES[]` dans `anecdotes.ts` (100+ entrées, 50/50 vrai/faux)

---

### 4. 💰 LES ENCHERES (Miser puis Prouver)
**Concept**: Poker menteur. Misez combien vous pouvez en nommer.

**Déroulement - 2 phases**:

**Phase 1: MISE (10s)**
- Thème affiché (ex: "Rappeur du 91")
- Les 2 équipes misent secrètement (1 à 20)
- Révélation: la mise la plus haute gagne

**Phase 2: PREUVE (45s)**
- L'équipe gagnante doit nommer X réponses
- Une réponse valide = **-5 HP** adversaire
- Objectif atteint = **BONUS -25 HP** supplémentaires
- Échec (timeout) = **-20 HP** (gros self-damage)

---

### 5. 🎵 BLIND TEST (Buzzer)
**Concept**: Premier qui buzz a la parole.

**Déroulement**:
- Extrait audio se joue (preview Spotify)
- Animation vinyle qui tourne
- **FREE FOR ALL**: N'importe qui peut buzzer
- 5 secondes pour répondre après buzz

**Scoring**:
- Bonne réponse: **-25 HP**
- Mauvaise réponse: **-10 HP** + extrait reprend

**Data**: Spotify API → fallback local

---

### 6. 🖼️ PIXEL COVER (Image Floue)
**Concept**: Pochette d'album floue qui devient progressivement nette.

**Déroulement**:
- Image avec 30px de blur
- Le flou diminue toutes les 500ms
- Premier qui trouve (artiste OU album) gagne

**Scoring**:
- Réponse rapide (flou max): **-30 HP**
- Réponse tardive (image nette): **-5 HP**

**Data**: Spotify API → fallback local

---

## ⚔️ SYSTEME DE COMBAT (HP)

```
DÉBUT: 100 HP chaque équipe

DÉGÂTS INFLIGÉS:
- Roland Gamos: 10 HP (x combo)
- Le Thème: 8 HP (x combo)
- Mytho correct: 15 HP
- Enchères (par réponse): 5 HP + 25 bonus
- Blind Test correct: 25 HP
- Pixel Cover: 5-30 HP selon rapidité

SELF-DAMAGE (quand on se trompe):
- Mauvaise réponse: 5 HP
- Timeout: 10-15 HP selon mode
- Blind Test raté: 10 HP
- Enchères échouées: 20 HP

COMBO MULTIPLICATEUR:
- 2 réponses consécutives: x1.5
- 3+ réponses consécutives: x2.0
- Reset sur erreur ou timeout
```

---

## 🔄 PHASES DE JEU (FSM)

```
lobby → vs_intro (4s) → mode_roulette (5s) → mode_intro (2s) 
→ playing → round_result (5s) → [loop ou final_score]
```

---

## ✅ CE QUI FONCTIONNE

### Core Gameplay
- ✅ Lobby multijoueur avec création/rejoindre via code room
- ✅ Système d'équipes (Bleu vs Jaune) avec drag & drop
- ✅ Input collaboratif - voir ce que les coéquipiers tapent
- ✅ Anti-spam - cooldown 500ms entre réponses
- ✅ Fuzzy Matching - tolérance aux fautes (Levenshtein distance ≤ 2)
- ✅ Alias system - "Booba" accepte "B2O", "Kopp", etc.
- ✅ Système de combo (x1.5, x2)
- ✅ Screen Shake sur erreur/impact
- ✅ HP Bars style Fighting Game avec animations
- ✅ Timer autoritaire côté serveur
- ✅ Reconnexion automatique après refresh

### Modes de Jeu
- ✅ **Roland Gamos** - FULLY WORKING avec graph de featurings
- ✅ **Le Thème** - FULLY WORKING avec 50+ thèmes
- ✅ **Mytho/Pas Mytho** - FULLY WORKING avec explications
- ✅ **Les Enchères** - FULLY WORKING avec détection d'échec
- 🟡 **Blind Test** - UI prête, dépend de Spotify API
- 🟡 **Pixel Cover** - UI prête, dépend de Spotify API

### Architecture
- ✅ Serveur Socket.IO avec FSM (Finite State Machine)
- ✅ RoomManager avec gestion des états
- ✅ Systeme de litige (Veto) - backend prêt
- ✅ Animation blur progressif Pixel Cover
- ✅ Event system pour mise à jour temps réel

---

## ❌ CE QUI NE FONCTIONNE PAS / BUGS CONNUS

### Bugs Critiques
1. **Problème de reconnexion** - Quand on redirige vers /game, les joueurs perdent parfois la connexion
2. **Host parfois non reconnu** - Le rôle host peut être perdu lors du déplacement dans les équipes (FIXÉ en partie)

### Manque / TODO
1. **Système de litige (Veto)** - Backend prêt mais pas de bouton UI pour le déclencher
2. **Audio Blind Test** - Previews Spotify peuvent être indisponibles
3. **Images Pixel Cover** - URLs d'images peuvent être vides si API fail
4. **Effets sonores (SFX)** - Howler.js prêt mais pas intégré
5. **Music BGM** - Contexte prêt mais pas de fichiers audio
6. **Classement persistant** - MongoDB connecté mais inutilisé
7. **Mode spectateur** - Structure présente mais pas optimisé

### Problèmes API
- Spotify API: Les clés dans `.env.local` peuvent être expirées
- Fallbacks locaux existent mais sans audio/pochettes réelles

---

## 🔧 CONFIGURATION

### Fichier `.env.local`
```
SPOTIFY_CLIENT_ID=xxx
SPOTIFY_CLIENT_SECRET=xxx
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/auth/spotify/callback

LASTFM_API_KEY=xxx
LASTFM_SHARED_SECRET=xxx

MONGODB_URI=mongodb://localhost:27017/rapbattle

NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Commandes
```bash
# Lancer le développement
npm run dev

# Build (nécessite --webpack car config webpack custom)
npm run build -- --webpack

# Lancer en production
npm start
```

---

## 📊 DONNEES DU JEU

### Artists & Featurings (`app/data/artists.ts`)
- ~20 artistes FR (Booba, Kaaris, Ninho, Jul, Damso, SCH, etc.)
- ~10 artistes US (Drake, Kendrick, Jay-Z, Kanye, etc.)
- Graph de collaborations (featurings documentés)

### Thèmes (`app/data/themes.ts`)
- 50+ thèmes catégorisés
- Géographie (départements, villes)
- Crews/Labels
- Époques
- Alphabet

### Anecdotes (`app/data/anecdotes.ts`)
- 100+ anecdotes
- 50% vrai, 50% faux
- Mix FR & US
- Explications détaillées

---

## 🎨 DESIGN SYSTEM

### Couleurs
- **Team A (Bleue)**: #3B82F6 (primary), #1D4ED8 (secondary)
- **Team B (Jaune)**: #EAB308 (primary), #713F12 (secondary)
- **Fond**: Gradient gris/noir

### Animations
- Framer Motion pour toutes les animations
- Screen shake sur erreur (CSS keyframes + Framer)
- HP drain avec spring physics
- Combo popups
- Transitions de phases

---

## 🚀 POUR TESTER

1. ```bash
   npm run dev
   ```

2. Ouvrir http://localhost:3000/lobby dans 2 onglets

3. **Onglet 1**: Créer une room (nom: "Joueur1")
4. **Onglet 2**: Rejoindre avec le code (nom: "Joueur2")

5. Se mettre dans des équipes différentes (Team A vs Team B)

6. Cliquer "Prêt" tous les deux

7. L'hôte clique "Démarrer"

---

## 📝 NOTES DE DEVELOPPEMENT

### Derniers changements majeurs
- Fix du problème de host qui devenait player
- Ajout de la reconnexion automatique après refresh
- Fix de l'input collaboratif (voir coéquipier taper)
- Implémentation complète des validations de réponses
- Systeme de litige (veto) backend complet

### Fichiers modifiés récemment
- `server.ts` - Logs debug + reconnexion
- `app/lib/roomManager.ts` - Validation réponses + events
- `app/hooks/useSocket.ts` - Reconnexion auto
- `app/lobby/page.tsx` - Session storage
- `app/game/page.tsx` - Fix team players
- `app/game/modes/*.tsx` - Input collaboratif

### Prochaines priorités si reprise
1. Fix définitif du problème de reconnexion (éviter la pertie de socket)
2. Ajouter un bouton "Contester" dans l'UI
3. Intégrer les sons (Howler.js)
4. Tester avec des vraies clés Spotify
5. Ajouter un système de chat

---

**Dernière mise à jour**: $(date)
**Statut**: Alpha - Jouable mais bugs de reconnexion
