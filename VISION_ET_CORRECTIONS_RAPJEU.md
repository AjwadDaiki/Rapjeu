# 🎯 VISION RAPJEU - CAHIER DES CHARGES COMPLET

## 📌 CONTEXTE ET VISION GLOBALE

### CE QUE JE VEUX VRAIMENT

Un **jeu web multijoueur en ligne** pour jouer avec des amis dans le thème du rap français. Un vrai jeu de société digital, comme Gartic Phone ou Skribbl.io, mais centré sur la culture rap.

**L'esprit recherché :**
- Ambiance conviviale et fun entre potes
- Rires garantis quand quelqu'un se plante
- Possibilité de voir les réponses des autres (bonnes ET mauvaises)
- Dynamique et interactif entre coéquipiers ET adversaires
- Vraies données du monde réel (pas de données inventées)

### CONFIGURATION DE JEU

**Nombre de joueurs :** 2 à 8 joueurs
**Organisation :** 2 équipes qui s'affrontent
**Type de jeu :** Tour par tour avec visibilité de ce que font les autres

---

## ❌ CE QUI NE VA PAS DANS LE PROJET ACTUEL

### 1. PROBLÈME : Pas de système de pseudo/nom de joueur

**État actuel :**
- On arrive directement sur la page d'accueil
- On peut créer ou rejoindre une room sans entrer de nom
- Aucune identification des joueurs

**Ce qu'il faut :**
- Écran d'entrée de pseudo AVANT tout
- Chaque joueur doit choisir son blaze/pseudo (max 15-20 caractères)
- Ce pseudo sera affiché tout au long de la partie
- Sauvegarde du pseudo en session (pas besoin de le retaper)

**Flow attendu :**
```
1. Page d'accueil → Champ "Entre ton blaze" + bouton "Jouer"
2. Une fois le pseudo validé → Options "Créer une partie" ou "Rejoindre avec code"
3. Lobby avec les pseudos visibles
```

---

### 2. PROBLÈME : Système de room non fonctionnel

**État actuel :**
- Le code semble avoir du code pour les rooms mais ça ne marche pas vraiment
- Pas de gestion propre de la création/join
- Connexion Socket.IO incertaine
- Navigation vers `/lobby/[code]` mais page vide ou non fonctionnelle

**Ce qu'il faut :**
- **Créer une room** : génère un code unique de 4-6 caractères (ex: "A7X2")
- **Rejoindre une room** : entrer le code + validation si la room existe
- **Lobby d'attente** : voir les joueurs qui rejoignent en temps réel
- **Système de prêt** : chaque joueur clique sur "Prêt" avant de démarrer
- **Hôte de la room** : le créateur peut lancer la partie quand tout le monde est prêt

**Architecture technique nécessaire :**
```typescript
// État d'une room
interface Room {
  code: string;                    // Ex: "A7X2"
  hostId: string;                  // Socket ID de l'hôte
  players: Player[];               // Liste des joueurs
  status: 'waiting' | 'playing' | 'finished';
  currentMode: GameMode | null;
  createdAt: Date;
  
  // 🆕 Configuration de la partie (définie par l'hôte dans le lobby)
  config: {
    modeSelection: 'random' | 'manual';  // Aléatoire ou choix manuel
    selectedModes?: GameMode[];          // Si manuel, quels modes?
    mysteryCardsEnabled: boolean;        // Cartes mystères activées?
    numberOfRounds: number;              // Nombre de manches (défaut: 5)
  };
}

// État d'un joueur
interface Player {
  id: string;                      // Socket ID
  pseudo: string;                  // Nom choisi
  team: 'A' | 'B' | null;         // Équipe (null si spectateur)
  isReady: boolean;                // Prêt à jouer
  isHost: boolean;                 // Créateur de la room
}

// Types de modes de jeu disponibles
type GameMode = 
  | 'rolandgamos' 
  | 'letheme' 
  | 'mytho' 
  | 'blindtest' 
  | 'pixelcover' 
  | 'devinequi';
```

**Événements Socket.IO nécessaires :**
- `create_room` → serveur crée une room et renvoie le code
- `join_room` → serveur ajoute le joueur à la room
- `leave_room` → serveur retire le joueur
- `toggle_ready` → joueur change son statut prêt/pas prêt
- `assign_team` → joueur change d'équipe
- `start_game` → hôte lance la partie (si tous prêts)
- `room_updated` → broadcast à tous les joueurs de la room

---

### 3. PROBLÈME : Base de données non utilisée

**État actuel :**
- Il y a un crawler qui tourne et récupère des données (EXCELLENT ✅)
- Il y a un schéma MongoDB complet (EXCELLENT ✅)
- **MAIS** : Le jeu n'utilise PAS ces données
- Tout est hardcodé dans des fichiers JSON statiques
- Exemple : `/app/data/artists.ts` contient ~50 artistes en dur
- Le jeu ne se connecte jamais à MongoDB

**Ce qu'il faut ABSOLUMENT :**

Le jeu DOIT utiliser la base de données MongoDB remplie par le crawler. C'est la base de tout le projet.

**Architecture de connexion nécessaire :**

```typescript
// app/server/db/connection.ts
import { MongoClient } from 'mongodb';

let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db('rapbattle');
  
  cachedDb = db;
  return db;
}

// Récupérer les collections
export async function getCollections() {
  const db = await connectToDatabase();
  return {
    artists: db.collection('artists'),
    albums: db.collection('albums'),
    tracks: db.collection('tracks'),
    collaborations: db.collection('collaborations'),
  };
}
```

**Services de données pour chaque mode :**

```typescript
// app/server/services/rolandGamosService.ts
export async function getRandomStartArtist() {
  const { artists } = await getCollections();
  
  // Récupérer un artiste populaire aléatoire
  const artist = await artists.aggregate([
    { $match: { popularity: { $gte: 50 } } },
    { $sample: { size: 1 } }
  ]).next();
  
  return artist;
}

export async function validateFeaturing(currentArtistId, submittedArtistName) {
  const { artists, collaborations } = await getCollections();
  
  // 1. Trouver l'artiste soumis (avec fuzzy matching)
  const submittedArtist = await resolveArtistByName(submittedArtistName);
  if (!submittedArtist) return { valid: false, reason: 'Artiste inconnu' };
  
  // 2. Vérifier si collaboration existe
  const collab = await collaborations.findOne({
    $or: [
      { artistAId: currentArtistId, artistBId: submittedArtist._id },
      { artistAId: submittedArtist._id, artistBId: currentArtistId }
    ]
  });
  
  return { 
    valid: !!collab, 
    artist: submittedArtist,
    trackTitle: collab?.trackTitle 
  };
}
```

**RÈGLE ABSOLUE :** Plus JAMAIS de fichiers JSON hardcodés. Tout doit venir de MongoDB.

---

### 4. PROBLÈME : Manque de dynamisme et d'interaction sociale

**État actuel :**
- Le jeu semble statique
- On ne voit pas ce que font les autres joueurs
- Pas d'interaction rigolote entre équipes

**Ce qu'il faut pour un vrai jeu de société en ligne :**

#### A. VISIBILITÉ DES RÉPONSES

**Quand quelqu'un répond :**
- ✅ Son pseudo s'affiche
- ✅ Sa réponse s'affiche en temps réel (même si fausse)
- ✅ Feedback immédiat : vert si correct, rouge si faux
- ✅ Tout le monde voit TOUTES les réponses

**Exemple d'affichage :**
```
═══════════════════════════════════════
Tour 3 - Équipe A

Question : "Rappeur du 93"
⏱️ 12 secondes restantes

Réponses de l'équipe :
[Mike33] : "Booba" ❌ (Il est du 92 mdr)
[Sarah_rap] : "Kaaris" ✅ (+10 points)

Équipe B observe et rigole 😂
═══════════════════════════════════════
```

#### B. CHAT OU RÉACTIONS

Pendant que l'autre équipe joue :
- Messages rapides : "😂", "🔥", "💀"
- Ou un mini-chat pour commenter
- Ambiance comme dans Gartic Phone

#### C. HISTORIQUE VISIBLE

En fin de round :
- Afficher TOUTES les réponses données (bonnes + mauvaises)
- Avec les pseudos
- Pour qu'on puisse se chambrer

**Exemple :**
```
═══════════════════════════════════════
RÉCAP DU ROUND - Rappeurs du 93

Équipe A :
✅ Mike33 : "Kaaris"
✅ Sarah_rap : "Niska"
❌ Mike33 : "Booba" (lol il est du 92)
✅ Sarah_rap : "Kalash Criminel"

Équipe B :
✅ Alex_flow : "PNL"
✅ Julie_beat : "Damso"
TIMEOUT (pas eu le temps)

Score : Équipe A +30pts | Équipe B +20pts
═══════════════════════════════════════
```

---

## ✅ CE QUI VA BIEN (À GARDER)

### 1. Le crawler est PARFAIT ✅

Le script `crawl-OVERNIGHT-v2.js` est excellent :
- Récupère des données réelles de Spotify, Last.fm, etc.
- Stocke tout dans MongoDB
- Génère des alias automatiques
- Gère les collaborations
- **À UTILISER TEL QUEL**

### 2. Le schéma de BDD est EXCELLENT ✅

Les collections MongoDB sont très bien pensées :
- `artists` avec normalisation et alias
- `tracks` avec featuring
- `collaborations` pour Roland Gamos
- `albums` avec covers pour Pixel Cover
- **À GARDER TEL QUEL**

### 3. L'UI/UX est belle ✅

Le design rétro/vaporwave est stylé
- Garder l'identité visuelle
- Les composants React sont bien faits
- Animations Framer Motion au top

---

## 🎮 MODES DE JEU - SPÉCIFICATIONS DÉTAILLÉES

### MODE 1 : ROLAND GAMOS (Chaîne de featurings)

**Concept :**
Tour par tour, chaque équipe doit trouver un artiste qui a fait un featuring avec l'artiste actuel.

**Flow de jeu :**

```
1. Game master tire un artiste de départ aléatoire
   Ex: "Booba"

2. Équipe A joue (15 secondes)
   - Tous les joueurs de l'équipe A peuvent taper
   - Quand quelqu'un submit → validation en temps réel
   - Si correct : artiste ajouté à la chaîne
   - Si faux : message d'erreur visible par tous

3. Tour de l'Équipe B
   - Doit trouver un feat avec le DERNIER artiste de la chaîne
   - Ex: Si Équipe A a dit "Kaaris", Équipe B doit feat avec Kaaris

4. Continue jusqu'à :
   - Une équipe ne trouve pas (perd le round)
   - Timeout (perd le round)
```

**Données utilisées :**
```javascript
// Au début du round
const startArtist = await rolandGamosService.getRandomStartArtist();

// À chaque réponse
const validation = await rolandGamosService.validateFeaturing(
  currentArtistId, 
  playerAnswer
);

if (validation.valid) {
  // Ajouter à la chaîne
  chain.push({
    artistId: validation.artist._id,
    artistName: validation.artist.name,
    team: currentTeam,
    playerPseudo: player.pseudo,
    trackTitle: validation.trackTitle
  });
}
```

**Interface utilisateur :**
```
┌─────────────────────────────────────────┐
│   ROLAND GAMOS - Round 2                │
├─────────────────────────────────────────┤
│                                          │
│   Artiste de départ : Booba              │
│                                          │
│   Chaîne actuelle :                      │
│   Booba → Kaaris → Niska → ?            │
│                                          │
│   [Équipe A joue]                        │
│   ⏱️ 12s                                 │
│                                          │
│   [Input] : ________________  [Valider] │
│                                          │
│   💡 Indice : Trouve un feat avec Niska │
│                                          │
│   Historique :                           │
│   ✅ Mike33 : "Kaaris" (Track: "Tchoin")│
│   ✅ Sarah : "Niska" (Track: "Réseaux") │
│                                          │
└─────────────────────────────────────────┘
```

---

### MODE 2 : LE THÈME (Nommer des artistes d'une catégorie)

**Concept :**
Un thème est tiré (ex: "Rappeurs du 93"), les équipes doivent tour par tour nommer des artistes valides.

**Flow de jeu :**

```
1. Tirer un thème aléatoire
   Ex: "Rappeurs du 93"
   
2. Récupérer tous les artistes valides depuis MongoDB
   const validArtists = await leThemeService.getArtistsForTheme(themeId);

3. Tour par tour (15 secondes par équipe)
   - Équipe A propose un artiste
   - Validation : est-il du 93 + pas déjà dit?
   - Si oui : +10 points, tour suivant
   - Si non : -5 points, tour suivant quand même

4. Continue jusqu'à :
   - Une équipe fait 3 erreurs (perd)
   - Plus personne ne trouve (match nul)
   - 2 minutes écoulées (compte des points)
```

**Exemples de thèmes dynamiques (depuis MongoDB) :**

```javascript
// Thèmes géographiques
"Rappeurs du 91/92/93/94/95/75"
"Rappeurs de Paris/Marseille/Lyon"

// Thèmes temporels  
"Artistes des années 2010"
"Albums sortis en 2020"

// Thèmes stylistiques
"Artistes trap"
"Rappeurs old school"

// Thèmes alphabétiques
"Rappeurs commençant par K"

// Thèmes de popularité
"Artistes avec + de 1M de streams"
```

**Génération des thèmes :**
```javascript
// app/server/services/leThemeService.ts
export async function getRandomTheme() {
  const themes = [
    {
      id: 'dep-93',
      title: 'Rappeurs du 93',
      query: { 'location.department': '93' },
      difficulty: 'medium'
    },
    {
      id: 'year-2020',
      title: 'Albums sortis en 2020',
      collection: 'albums',
      query: { year: 2020 },
      difficulty: 'hard'
    },
    // ... 100+ thèmes
  ];
  
  return themes[Math.floor(Math.random() * themes.length)];
}

export async function getArtistsForTheme(themeId) {
  const theme = themes.find(t => t.id === themeId);
  const collection = theme.collection || 'artists';
  const { [collection]: col } = await getCollections();
  
  return await col.find(theme.query).toArray();
}

export async function validateThemeAnswer(themeId, answer, alreadyUsed) {
  const validArtists = await getArtistsForTheme(themeId);
  const normalized = normalizeName(answer);
  
  // Fuzzy matching
  const match = validArtists.find(artist => 
    artist.normalizedName === normalized ||
    artist.aliases.some(alias => normalizeName(alias) === normalized)
  );
  
  if (!match) return { valid: false, reason: 'Pas dans le thème' };
  if (alreadyUsed.includes(match._id)) return { valid: false, reason: 'Déjà dit' };
  
  return { valid: true, artist: match };
}
```

---

### MODE 3 : MYTHO / PAS MYTHO (Vrai ou Faux)

**IMPORTANT :** Ce mode NE DOIT PAS utiliser de JSON hardcodé. Tout doit être dynamique.

**Concept :**
Une anecdote est affichée, chaque équipe vote VRAI ou FAUX.

**Types d'anecdotes générées dynamiquement :**

```javascript
// Type 1: Collaborations
"Booba et Kaaris ont fait un feat ensemble"
→ Vérifier dans `collaborations`

// Type 2: Géographie
"PNL vient du 93"
→ Vérifier dans `artists.location`

// Type 3: Chronologie
"L'album 'Commando' de Niska est sorti avant 'Ipséité' de Damso"
→ Vérifier dans `albums.year`

// Type 4: Popularité
"Booba a plus de streams que Jul"
→ Vérifier dans `artists.popularity`

// Type 5: Discographie
"Ninho a sorti plus de 5 albums"
→ Vérifier dans `albums.count()`
```

**Génération des anecdotes :**
```javascript
// app/server/services/mythoService.ts
export async function generateAnecdote() {
  const types = [
    'collaboration',
    'geography', 
    'chronology',
    'popularity',
    'discography'
  ];
  
  const type = types[Math.floor(Math.random() * types.length)];
  
  switch(type) {
    case 'collaboration':
      return await generateCollaborationAnecdote();
    case 'geography':
      return await generateGeographyAnecdote();
    // ... etc
  }
}

async function generateCollaborationAnecdote() {
  const { artists, collaborations } = await getCollections();
  
  // Prendre 2 artistes aléatoires
  const [artist1, artist2] = await artists.aggregate([
    { $sample: { size: 2 } }
  ]).toArray();
  
  // Vérifier s'ils ont collaboré
  const hasCollab = await collaborations.findOne({
    $or: [
      { artistAId: artist1._id, artistBId: artist2._id },
      { artistAId: artist2._id, artistBId: artist1._id }
    ]
  });
  
  return {
    text: `${artist1.name} et ${artist2.name} ont fait un feat ensemble`,
    isTrue: !!hasCollab,
    trackTitle: hasCollab?.trackTitle,
    category: 'collaboration'
  };
}
```

**Flow de jeu :**
```
1. Générer une anecdote
2. Afficher à tout le monde
3. Chaque JOUEUR vote individuellement (pas par équipe)
4. Timer de 10 secondes
5. Révélation :
   - Si vrai : tous ceux qui ont voté VRAI gagnent +5pts
   - Si faux : tous ceux qui ont voté FAUX gagnent +5pts
6. Afficher qui s'est planté (pour les rires)
```

---

## 🃏 CARTES MYSTÈRES (ENTRE LES MANCHES)

### Concept

**Entre chaque manche**, si l'hôte a activé cette option dans le lobby, une **Carte Mystère** apparaît de manière aléatoire.

Ces cartes ajoutent du chaos, du fun et des retournements de situation ! Elles peuvent :
- Donner des bonus de points à une équipe
- Infliger des malus à l'équipe adverse
- Créer des événements spéciaux

### Quand apparaissent-elles ?

```
Manche 1 (Roland Gamos)
    ↓
[RÉSULTAT + SCORES]
    ↓
[🃏 CARTE MYSTÈRE!] ← Apparaît aléatoirement (50% de chance)
    ↓
Manche 2 (Le Thème)
    ↓
[RÉSULTAT + SCORES]
    ↓
[🃏 CARTE MYSTÈRE!] ← Peut apparaître à nouveau
    ↓
Manche 3...
```

**Fréquence :** 40-60% de chance entre chaque manche (configurable).

### Qui tire la carte ?

**Système aléatoire :**
- Un joueur aléatoire de n'importe quelle équipe est choisi
- Son pseudo s'affiche en gros : "🎲 Julie_beat tire la carte..."
- Animation de carte qui se retourne
- Révélation de l'effet

**Interface de tirage :**

```
┌──────────────────────────────────────────────────┐
│                                                  │
│          🃏 CARTE MYSTÈRE 🃏                     │
│                                                  │
│  🎲 Sarah_rap va tirer une carte !               │
│                                                  │
│      [Cliquez pour révéler] ← Elle clique        │
│                                                  │
└──────────────────────────────────────────────────┘

Puis après révélation :

┌──────────────────────────────────────────────────┐
│                                                  │
│          🎁 JACKPOT! 🎁                          │
│                                                  │
│  L'ÉQUIPE A gagne +20 points bonus!              │
│                                                  │
│  Score actuel :                                  │
│  ÉQUIPE A : 45 → 65 pts  🔥                      │
│  ÉQUIPE B : 38 pts                               │
│                                                  │
│         [Continuer] →                            │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Types de cartes

#### 🎁 CARTES BONUS (pour son équipe)

| Carte | Effet | Rareté |
|-------|-------|--------|
| 💰 **Jackpot** | +20 points | Commune |
| 🔥 **En feu!** | +15 points | Commune |
| ⚡ **Boost** | +10 points | Très commune |
| 🎯 **Précision** | Prochain round vaut 2x points | Rare |
| 🛡️ **Bouclier** | Immunité au prochain malus | Rare |
| ⏰ **Temps bonus** | +5 secondes au prochain round | Commune |
| 🎲 **Double ou rien** | Prochain round : 2x points si gagne, 0 si perd | Épique |

#### 💣 CARTES MALUS (pour l'équipe adverse)

| Carte | Effet | Rareté |
|-------|-------|--------|
| 💀 **Malédiction** | -15 points à l'adversaire | Commune |
| ⏱️ **Pression** | -5 secondes au prochain round adverse | Commune |
| 🌫️ **Brouillard** | L'adversaire ne voit pas les indices au prochain round | Rare |
| 🔇 **Silence** | L'équipe adverse ne peut pas collaborer au prochain round | Épique |
| 🔄 **Vol de points** | Vole 10 points à l'adversaire | Rare |

#### ⚡ CARTES SPÉCIALES (événements)

| Carte | Effet | Rareté |
|-------|-------|--------|
| 🎰 **Casino** | Les 2 équipes parient des points, la gagnante du prochain round rafle tout | Épique |
| 🔀 **Chaos** | Prochain round en modeSpeed (tout le monde joue en même temps) | Rare |
| 👥 **Solidarité** | Prochain round, les 2 équipes jouent ensemble contre la montre | Rare |
| 🎭 **Inversion** | Les équipes échangent leurs scores | Légendaire |
| 🌟 **Étoile** | Le joueur qui a tiré la carte peut choisir le mode du prochain round | Épique |

### Configuration de la rareté

```javascript
// Probabilités de tirage
const CARD_PROBABILITIES = {
  'commune': 50,      // 50%
  'rare': 30,         // 30%
  'épique': 15,       // 15%
  'légendaire': 5     // 5%
};

// Pool de cartes
const MYSTERY_CARDS = [
  // BONUS
  { id: 'jackpot', name: 'Jackpot', type: 'bonus', effect: '+20pts', rarity: 'commune', icon: '💰' },
  { id: 'enfeu', name: 'En feu!', type: 'bonus', effect: '+15pts', rarity: 'commune', icon: '🔥' },
  { id: 'boost', name: 'Boost', type: 'bonus', effect: '+10pts', rarity: 'commune', icon: '⚡' },
  { id: 'precision', name: 'Précision', type: 'bonus', effect: '2x points prochain round', rarity: 'rare', icon: '🎯' },
  { id: 'bouclier', name: 'Bouclier', type: 'bonus', effect: 'Immunité malus', rarity: 'rare', icon: '🛡️' },
  { id: 'tempsbonus', name: 'Temps bonus', type: 'bonus', effect: '+5 secondes', rarity: 'commune', icon: '⏰' },
  { id: 'doubleourien', name: 'Double ou rien', type: 'bonus', effect: '2x si gagne, 0 si perd', rarity: 'épique', icon: '🎲' },
  
  // MALUS
  { id: 'malediction', name: 'Malédiction', type: 'malus', effect: '-15pts adversaire', rarity: 'commune', icon: '💀' },
  { id: 'pression', name: 'Pression', type: 'malus', effect: '-5s adversaire', rarity: 'commune', icon: '⏱️' },
  { id: 'brouillard', name: 'Brouillard', type: 'malus', effect: 'Pas d\'indices adversaire', rarity: 'rare', icon: '🌫️' },
  { id: 'silence', name: 'Silence', type: 'malus', effect: 'Pas de collaboration adversaire', rarity: 'épique', icon: '🔇' },
  { id: 'vol', name: 'Vol de points', type: 'malus', effect: 'Vole 10pts', rarity: 'rare', icon: '🔄' },
  
  // SPÉCIALES
  { id: 'casino', name: 'Casino', type: 'special', effect: 'Pari sur prochain round', rarity: 'épique', icon: '🎰' },
  { id: 'chaos', name: 'Chaos', type: 'special', effect: 'Mode Speed', rarity: 'rare', icon: '🔀' },
  { id: 'solidarite', name: 'Solidarité', type: 'special', effect: 'Coop vs montre', rarity: 'rare', icon: '👥' },
  { id: 'inversion', name: 'Inversion', type: 'special', effect: 'Échange des scores', rarity: 'légendaire', icon: '🎭' },
  { id: 'etoile', name: 'Étoile', type: 'special', effect: 'Choisir le mode', rarity: 'épique', icon: '🌟' },
];
```

### Backend : Service des cartes mystères

```javascript
// app/server/services/mysteryCardService.ts

export function shouldDrawCard(config) {
  // Si désactivé dans le lobby
  if (!config.mysteryCardsEnabled) return false;
  
  // Sinon, 50% de chance entre chaque manche
  return Math.random() < 0.5;
}

export function drawRandomCard() {
  // Tirer une rareté selon les probabilités
  const rarity = selectRarity();
  
  // Filtrer les cartes de cette rareté
  const cardsOfRarity = MYSTERY_CARDS.filter(c => c.rarity === rarity);
  
  // En choisir une au hasard
  const card = cardsOfRarity[Math.floor(Math.random() * cardsOfRarity.length)];
  
  return card;
}

function selectRarity() {
  const rand = Math.random() * 100;
  
  if (rand < 50) return 'commune';
  if (rand < 80) return 'rare';
  if (rand < 95) return 'épique';
  return 'légendaire';
}

export function applyCardEffect(card, gameState, drawerTeam) {
  const targetTeam = drawerTeam; // L'équipe du joueur qui a tiré
  const opponentTeam = targetTeam === 'A' ? 'B' : 'A';
  
  switch(card.id) {
    case 'jackpot':
      gameState.scores[`team${targetTeam}`] += 20;
      return { message: `L'équipe ${targetTeam} gagne +20 points!` };
      
    case 'malediction':
      gameState.scores[`team${opponentTeam}`] -= 15;
      return { message: `L'équipe ${opponentTeam} perd -15 points!` };
      
    case 'precision':
      gameState.effects[`team${targetTeam}NextRound`] = 'double_points';
      return { message: `L'équipe ${targetTeam} gagnera 2x points au prochain round!` };
      
    case 'pression':
      gameState.effects[`team${opponentTeam}NextRound`] = 'time_minus_5';
      return { message: `L'équipe ${opponentTeam} aura -5 secondes au prochain round!` };
      
    case 'inversion':
      const tempScore = gameState.scores.teamA;
      gameState.scores.teamA = gameState.scores.teamB;
      gameState.scores.teamB = tempScore;
      return { message: `Les scores sont inversés! 🎭` };
      
    // ... autres cartes
  }
}
```

### Événements Socket.IO pour les cartes

```typescript
// Après chaque manche
socket.on('round_ended', async ({ roomCode, roundResult }) => {
  const room = await roomManager.getRoom(roomCode);
  
  // Vérifier si on tire une carte
  if (shouldDrawCard(room.config)) {
    // Choisir un joueur aléatoire
    const randomPlayer = room.players[Math.floor(Math.random() * room.players.length)];
    
    // Notifier tout le monde qu'une carte va être tirée
    io.to(roomCode).emit('mystery_card_incoming', {
      drawerPseudo: randomPlayer.pseudo,
      drawerTeam: randomPlayer.team
    });
    
    // Attendre que le joueur clique (ou timeout 10s)
    // ...
  } else {
    // Pas de carte, passer direct au prochain round
    io.to(roomCode).emit('next_round_starting');
  }
});

socket.on('draw_mystery_card', async ({ roomCode }) => {
  const card = drawRandomCard();
  const drawerTeam = ...; // Équipe du tireur
  
  // Appliquer l'effet
  const result = applyCardEffect(card, gameState, drawerTeam);
  
  // Broadcast la carte à tout le monde
  io.to(roomCode).emit('mystery_card_revealed', {
    card,
    effect: result,
    newGameState: gameState
  });
});
```

### Animation de la carte

**Étapes visuelles :**

1. **Annonce** (3 secondes)
```
┌────────────────────────────┐
│   🎲 CARTE MYSTÈRE 🎲      │
│                            │
│   Sarah_rap va tirer       │
│   une carte!               │
│                            │
│   [En attente...]          │
└────────────────────────────┘
```

2. **Tirage** (joueur clique)
```
┌────────────────────────────┐
│   🃏                        │
│                            │
│   [RETOURNE LA CARTE]      │
│   ← Carte dos face visible │
│                            │
│   (Animation flip 3D)      │
└────────────────────────────┘
```

3. **Révélation** (2 secondes)
```
┌────────────────────────────┐
│   💰 JACKPOT! 💰           │
│                            │
│   L'équipe A gagne         │
│   +20 POINTS!              │
│                            │
│   (Confettis animés)       │
└────────────────────────────┘
```

4. **Résultat** (5 secondes)
```
┌────────────────────────────┐
│   Scores mis à jour :      │
│                            │
│   ÉQUIPE A: 45 → 65 🔥     │
│   ÉQUIPE B: 38             │
│                            │
│   [Manche suivante →]      │
└────────────────────────────┘
```

### Variante : Choix stratégique (optionnel)

Au lieu de l'application automatique, le joueur qui tire peut **choisir** entre 2-3 cartes :

```
┌─────────────────────────────────────────┐
│  Sarah_rap, choisis ta carte :          │
│                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │    💰    │ │    ⏰    │ │    💀    ││
│  │ Jackpot  │ │  +5 sec  │ │  -15pts  ││
│  │  +20pts  │ │          │ │ adversaire││
│  └──────────┘ └──────────┘ └──────────┘│
│                                          │
└─────────────────────────────────────────┘
```

Ça ajoute une dimension stratégique !

---

## 🎨 INTERFACE UTILISATEUR - SPÉCIFICATIONS

### Écran 1 : Accueil (Page de pseudo)

```
┌──────────────────────────────────────────┐
│                                          │
│           🎤 RAPJEU 🎤                   │
│     Le quiz rap multijoueur              │
│                                          │
│   ┌────────────────────────────────┐    │
│   │  Entre ton blaze :             │    │
│   │  [________________]            │    │
│   │          (max 15 car.)         │    │
│   └────────────────────────────────┘    │
│                                          │
│        [Continuer] →                     │
│                                          │
└──────────────────────────────────────────┘
```

### Écran 2 : Choix Créer/Rejoindre

```
┌──────────────────────────────────────────┐
│                                          │
│   Salut Mike33 ! 👋                      │
│                                          │
│   ┌────────────────────────┐            │
│   │   [Créer une partie]   │            │
│   └────────────────────────┘            │
│                                          │
│   ┌────────────────────────┐            │
│   │  [Rejoindre (code)]    │            │
│   └────────────────────────┘            │
│                                          │
└──────────────────────────────────────────┘

Si clic sur "Rejoindre" :

┌──────────────────────────────────────────┐
│                                          │
│   Entre le code de la partie :          │
│                                          │
│   ┌────┬────┬────┬────┐                 │
│   │ A  │ 7  │ X  │ 2  │                 │
│   └────┴────┴────┴────┘                 │
│                                          │
│        [Rejoindre] →                     │
│                                          │
└──────────────────────────────────────────┘
```

### Écran 3 : Lobby (Salle d'attente)

```
┌──────────────────────────────────────────────────────────┐
│  LOBBY - Code: A7X2                      [Quitter]       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Joueurs (4/8) :                                          │
│                                                           │
│  ÉQUIPE A                ÉQUIPE B                         │
│  ┌──────────────┐       ┌──────────────┐                │
│  │ 👑 Mike33 ✅ │       │ Julie_beat ✅│                │
│  │    Sarah_rap │       │ Alex_flow    │                │
│  │              │       │              │                │
│  └──────────────┘       └──────────────┘                │
│                                                           │
│  Spectateurs :                                            │
│  (Glisse un joueur ici pour le déplacer)                 │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                           │
│  ⚙️ CONFIGURATION (visible seulement pour l'hôte 👑)     │
│                                                           │
│  Sélection des modes :                                    │
│  ┌─────────────────────────────────────────┐             │
│  │ ○ Modes aléatoires (le jeu choisit)    │             │
│  │ ● Choisir les modes manuellement        │             │
│  └─────────────────────────────────────────┘             │
│                                                           │
│  Si "Choisir manuellement", sélectionne les modes :      │
│  [✓] Roland Gamos    [✓] Le Thème                        │
│  [✓] Mytho/Pas Mytho [ ] Blind Test                      │
│  [ ] Pixel Cover     [ ] Devine Qui                      │
│  (Minimum 3 modes requis)                                │
│                                                           │
│  Cartes Mystères entre les manches :                     │
│  ┌─────────────────────────────────────────┐             │
│  │ [ ] Désactivé                           │             │
│  │ [✓] Activé (événements surprise!)       │             │
│  └─────────────────────────────────────────┘             │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                           │
│  [Je suis prêt ✅]                                        │
│                                                           │
│  [LANCER LA PARTIE]  ← Visible si hôte + tous prêts      │
│                                                           │
└──────────────────────────────────────────────────────────┘

Fonctionnalités :
- Drag & drop pour changer d'équipe
- 👑 = hôte de la room (seul à voir les options de config)
- ✅ = joueur prêt
- Configuration des modes (aléatoire ou manuel)
- Activation/désactivation des cartes mystères
- Temps réel : voir les joueurs rejoindre/partir + config qui se met à jour
```

### Écran 4 : Jeu en cours (Exemple Roland Gamos)

```
┌──────────────────────────────────────────────────┐
│  ROLAND GAMOS - Round 3/5          Score: 45-38 │
├──────────────────────────────────────────────────┤
│                                                  │
│  Artiste de départ : Booba                       │
│                                                  │
│  Chaîne :                                        │
│  [Booba] → [Kaaris] → [Niska] → ?               │
│                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                  │
│  C'est au tour de l'ÉQUIPE A  ⏱️ 12s            │
│                                                  │
│  [Input collaboratif] : ____________ [Valider]  │
│  (Tous les joueurs de l'équipe A peuvent taper) │
│                                                  │
│  Historique de l'équipe A ce tour :              │
│  ❌ Mike33 : "Booba" (Déjà dans la chaîne)      │
│  ✅ Sarah_rap : "Niska" (Feat sur "Réseaux")    │
│                                                  │
│  Équipe B attend et observe... 👀                │
│                                                  │
└──────────────────────────────────────────────────┘

En bas de l'écran (toujours visible) :

┌──────────────────────────────────────────────────┐
│  ÉQUIPE A (45 pts)         ÉQUIPE B (38 pts)     │
│  • Mike33  (en train de taper...)                │
│  • Sarah_rap                                      │
│                            • Julie_beat           │
│                            • Alex_flow            │
└──────────────────────────────────────────────────┘
```

---

## 🔧 ARCHITECTURE TECHNIQUE DÉTAILLÉE

### Structure Backend (ce qui MANQUE)

```
app/
├── server/
│   ├── gameServer.ts              ← Serveur Socket.IO principal
│   ├── db/
│   │   └── connection.ts          ← Connexion MongoDB
│   ├── services/
│   │   ├── rolandGamosService.ts  ← Logique Roland Gamos
│   │   ├── leThemeService.ts      ← Logique Le Thème
│   │   ├── mythoService.ts        ← Logique Mytho
│   │   └── ...
│   ├── managers/
│   │   ├── RoomManager.ts         ← Gestion des rooms
│   │   └── GameStateManager.ts    ← State machine du jeu
│   └── utils/
│       ├── fuzzyMatching.ts       ← Normalisation/matching
│       └── artistResolver.ts      ← Résolution des artistes
```

### Événements Socket.IO à implémenter

```typescript
// Connexion
socket.on('connection', (socket) => {
  
  // Gestion des rooms
  socket.on('create_room', async ({ pseudo }) => {
    const room = await roomManager.createRoom(socket.id, pseudo);
    socket.join(room.code);
    socket.emit('room_created', { code: room.code, room });
  });
  
  socket.on('join_room', async ({ code, pseudo }) => {
    const result = await roomManager.joinRoom(code, socket.id, pseudo);
    if (result.success) {
      socket.join(code);
      io.to(code).emit('room_updated', result.room);
    } else {
      socket.emit('join_error', result.error);
    }
  });
  
  socket.on('leave_room', async ({ code }) => {
    const room = await roomManager.leaveRoom(code, socket.id);
    socket.leave(code);
    io.to(code).emit('room_updated', room);
  });
  
  socket.on('toggle_ready', async ({ code }) => {
    const room = await roomManager.toggleReady(code, socket.id);
    io.to(code).emit('room_updated', room);
  });
  
  socket.on('assign_team', async ({ code, playerId, team }) => {
    const room = await roomManager.assignTeam(code, playerId, team);
    io.to(code).emit('room_updated', room);
  });
  
  // 🆕 Configuration de la partie (réservé à l'hôte)
  socket.on('update_game_config', async ({ code, config }) => {
    const room = await roomManager.getRoom(code);
    if (room.hostId !== socket.id) return; // Seul l'hôte peut modifier
    
    const updatedRoom = await roomManager.updateConfig(code, config);
    io.to(code).emit('room_updated', updatedRoom);
  });
  
  // Démarrage du jeu
  socket.on('start_game', async ({ code }) => {
    const room = await roomManager.getRoom(code);
    if (room.hostId !== socket.id) return; // Seul l'hôte peut start
    
    const gameState = await gameStateManager.initGame(room);
    io.to(code).emit('game_started', gameState);
  });
  
  // Gameplay
  socket.on('submit_answer', async ({ code, answer }) => {
    const result = await gameStateManager.processAnswer(code, socket.id, answer);
    io.to(code).emit('answer_result', result);
    
    if (result.nextState) {
      io.to(code).emit('game_state_updated', result.nextState);
    }
  });
  
  socket.on('input_typing', async ({ code, text }) => {
    // Sync en temps réel de ce que les coéquipiers tapent
    const room = await roomManager.getRoom(code);
    const player = room.players.find(p => p.id === socket.id);
    
    // Broadcast aux coéquipiers uniquement
    room.players
      .filter(p => p.team === player.team && p.id !== socket.id)
      .forEach(teammate => {
        io.to(teammate.id).emit('teammate_typing', { 
          playerPseudo: player.pseudo,
          text 
        });
      });
  });
  
  // Déconnexion
  socket.on('disconnect', async () => {
    await roomManager.handleDisconnect(socket.id);
  });
});
```

### Game State Machine

```typescript
interface GameState {
  roomCode: string;
  status: 'lobby' | 'playing' | 'finished';
  currentMode: 'rolandgamos' | 'letheme' | 'mytho' | ...;
  currentRound: number;
  totalRounds: number;
  
  // État du round actuel
  roundState: {
    question: any;              // Données de la question
    currentTeam: 'A' | 'B';     // Équipe qui joue
    timeLeft: number;           // Secondes restantes
    answers: Answer[];          // Historique des réponses
    validAnswers: string[];     // Réponses valides déjà données (Le Thème)
  };
  
  // Scores
  scores: {
    teamA: number;
    teamB: number;
  };
  
  // Historique
  history: RoundResult[];
}

interface Answer {
  playerId: string;
  playerPseudo: string;
  team: 'A' | 'B';
  text: string;
  isValid: boolean;
  timestamp: Date;
  points: number;
}
```

---

## 📋 CHECKLIST DE DÉVELOPPEMENT

### Phase 1 : Système de base (PRIORITÉ ABSOLUE)

- [ ] **Écran de pseudo**
  - [ ] Page d'accueil avec input pseudo
  - [ ] Validation (3-15 caractères)
  - [ ] Sauvegarde en sessionStorage
  - [ ] Navigation vers écran créer/rejoindre

- [ ] **Système de rooms**
  - [ ] Serveur Socket.IO fonctionnel
  - [ ] Création de room (code unique)
  - [ ] Rejoindre une room existante
  - [ ] Quitter une room
  - [ ] Gestion de la déconnexion

- [ ] **Lobby d'attente**
  - [ ] Affichage des joueurs en temps réel
  - [ ] Système de drag & drop pour équipes
  - [ ] Bouton "Prêt/Pas prêt"
  - [ ] Indicateur d'hôte (👑)
  - [ ] **🆕 Configuration des modes (hôte uniquement)**
    - [ ] Toggle "Modes aléatoires" / "Choix manuel"
    - [ ] Si manuel : checkboxes pour sélectionner les modes
    - [ ] Validation : minimum 3 modes si manuel
  - [ ] **🆕 Configuration des cartes mystères (hôte uniquement)**
    - [ ] Toggle "Activé" / "Désactivé"
    - [ ] Affichage de l'état aux autres joueurs
  - [ ] Bouton "Lancer" (hôte uniquement)
  - [ ] Validation : au moins 1 joueur par équipe + tous prêts

### Phase 2 : Connexion à la BDD (PRIORITÉ ABSOLUE)

- [ ] **Connexion MongoDB**
  - [ ] Service de connexion à MongoDB
  - [ ] Récupération des collections
  - [ ] Gestion des erreurs de connexion

- [ ] **Services de données**
  - [ ] `rolandGamosService.ts` (récup artistes + validation feats)
  - [ ] `leThemeService.ts` (génération thèmes + validation)
  - [ ] `mythoService.ts` (génération anecdotes dynamiques)
  - [ ] `fuzzyMatching.ts` (normalisation + matching)
  - [ ] `artistResolver.ts` (résolution des noms d'artistes)

- [ ] **SUPPRIMER tous les fichiers JSON hardcodés**
  - [ ] Supprimer `/app/data/artists.ts`
  - [ ] Supprimer `/app/data/themes.ts`
  - [ ] Supprimer `/app/data/mytho-anecdotes.json`
  - [ ] Tout doit venir de MongoDB

### Phase 3 : Premier mode jouable (Roland Gamos)

- [ ] **Backend Roland Gamos**
  - [ ] Tirer artiste de départ aléatoire (depuis BDD)
  - [ ] Valider les réponses (featuring existe?)
  - [ ] Construire la chaîne
  - [ ] Gérer les tours A/B
  - [ ] Timer par équipe
  - [ ] Conditions de victoire/défaite

- [ ] **Frontend Roland Gamos**
  - [ ] Affichage artiste de départ
  - [ ] Affichage de la chaîne
  - [ ] Input collaboratif (équipe qui joue)
  - [ ] Historique des réponses
  - [ ] Timer visuel
  - [ ] Feedback immédiat (bon/mauvais)
  - [ ] Visibilité pour l'équipe qui attend

### Phase 4 : Interaction sociale

- [ ] **Visibilité des réponses**
  - [ ] Afficher toutes les réponses (bonnes ET mauvaises)
  - [ ] Afficher les pseudos
  - [ ] Animations de feedback (vert/rouge)
  - [ ] Son de succès/échec

- [ ] **Typing indicator**
  - [ ] Les coéquipiers voient ce que je tape
  - [ ] "Mike33 est en train de taper..."

- [ ] **Récap de round**
  - [ ] Écran de résultat avec toutes les réponses
  - [ ] Score mis à jour
  - [ ] Bouton "Round suivant"

### Phase 5 : Cartes Mystères 🃏

- [ ] **Service de cartes mystères**
  - [ ] `mysteryCardService.ts` avec pool de cartes
  - [ ] Système de rareté (commune/rare/épique/légendaire)
  - [ ] Fonction `shouldDrawCard()` basée sur config
  - [ ] Fonction `drawRandomCard()` avec probabilités
  - [ ] Fonction `applyCardEffect()` pour chaque carte

- [ ] **Types de cartes**
  - [ ] Cartes BONUS (Jackpot, Boost, Précision, etc.)
  - [ ] Cartes MALUS (Malédiction, Pression, Silence, etc.)
  - [ ] Cartes SPÉCIALES (Casino, Chaos, Inversion, etc.)

- [ ] **Interface de tirage**
  - [ ] Écran "Carte mystère incoming"
  - [ ] Sélection du joueur aléatoire
  - [ ] Animation de flip 3D de la carte
  - [ ] Révélation de l'effet avec animation
  - [ ] Mise à jour des scores en temps réel
  - [ ] Confettis/effets visuels selon la carte

- [ ] **Backend cartes mystères**
  - [ ] Événement `mystery_card_incoming`
  - [ ] Événement `draw_mystery_card`
  - [ ] Événement `mystery_card_revealed`
  - [ ] Application des effets différés (bonus pour prochain round)
  - [ ] Gestion des effets actifs dans gameState

### Phase 6 : Autres modes

- [ ] **Le Thème**
  - [ ] Backend (thèmes dynamiques)
  - [ ] Frontend
  - [ ] Détection des doublons

- [ ] **Mytho/Pas Mytho**
  - [ ] Génération d'anecdotes dynamiques
  - [ ] Système de vote individuel
  - [ ] Révélation + scores

---

## 🎯 RÉSUMÉ : LES CORRECTIONS MAJEURES

### 1. AJOUTER LE SYSTÈME DE PSEUDO + ROOMS FONCTIONNEL

Actuellement : Rien. On arrive sur la page et on ne peut rien faire.

À faire :
- Écran de pseudo
- Création/join de room
- Lobby avec joueurs visibles
- Système prêt/démarrer
- **🆕 Configuration par l'hôte (modes + cartes mystères)**

### 2. UTILISER LA BASE DE DONNÉES (PAS DE JSON HARDCODÉ)

Actuellement : Tout est hardcodé dans des fichiers TypeScript.

À faire :
- Connexion MongoDB
- Services de récupération de données
- Génération dynamique des questions
- Validation contre la vraie BDD
- **SUPPRIMER TOUS LES FICHIERS DE DONNÉES STATIQUES**

### 3. RENDRE LE JEU SOCIAL ET INTERACTIF

Actuellement : Statique, on ne voit pas ce que font les autres.

À faire :
- Voir les réponses des autres en temps réel
- Historique visible (bonnes ET mauvaises réponses)
- Typing indicators
- Feedback immédiat
- Récaps de round fun
- **🆕 Cartes mystères entre les manches (si activé par l'hôte)**

---

## ⚡ POINTS IMPORTANTS À RETENIR

1. **Données réelles uniquement** : Plus JAMAIS de JSON hardcodé. MongoDB sinon rien.

2. **Jeu de société en ligne** : L'esprit doit être comme Gartic Phone, avec rires et interaction.

3. **Visibilité totale** : Tout le monde voit tout (réponses, erreurs, scores).

4. **Pseudos partout** : Chaque action doit afficher le pseudo du joueur.

5. **Temps réel** : Socket.IO pour que tout soit instantané et synchronisé.

6. **2 à 8 joueurs, 2 équipes** : Architecture flexible mais toujours en équipes.

7. **Le crawler est parfait** : Ne pas y toucher, juste l'utiliser.

8. **Flow : Pseudo → Créer/Rejoindre → Lobby → Jouer**

---

## 🎨 STYLE VISUEL ET AMBIANCE

### Garder l'identité actuelle

- Design rétro/vaporwave ✅
- Couleurs néon ✅
- Animations fluides ✅
- Typographie stylée ✅

### Ajouter des éléments de jeu de société

- Avatars colorés pour chaque joueur
- Emojis de réaction (👍 😂 🔥 💀)
- Sons fun (succès, échec, timer)
- Confettis lors des victoires
- Écrans de transition dynamiques

### Exemple de palette émotionnelle

```
Succès : ✅ 🎉 🔥 (vert fluo)
Échec : ❌ 💀 😅 (rouge néon)
Attente : ⏱️ 👀 🤔 (jaune/orange)
Victoire : 🏆 👑 🎊 (doré brillant)
```

---

## 🚀 ORDRE DE DÉVELOPPEMENT RECOMMANDÉ

### Semaine 1 : Fondations
1. Système de pseudo
2. Rooms fonctionnelles
3. Lobby avec équipes
4. Connexion MongoDB

### Semaine 2 : Premier mode jouable
5. Services de données (Roland Gamos)
6. Backend Roland Gamos
7. Frontend Roland Gamos
8. Tests avec 4 joueurs

### Semaine 3 : Polish + autres modes
9. Le Thème
10. Mytho/Pas Mytho
11. Interactions sociales
12. Sons et animations

### Semaine 4 : Finitions
13. Mode Blind Test (si previews dispo)
14. Gestion des erreurs
15. Optimisations
16. Déploiement

---

## ✅ CRITÈRES DE RÉUSSITE

Le projet sera réussi quand :

1. ✅ Je peux inviter 3 potes avec un code de room
2. ✅ On choisit tous notre pseudo
3. ✅ On voit qui est dans quelle équipe
4. ✅ **L'hôte peut configurer les modes (aléatoire ou manuel) et activer/désactiver les cartes mystères**
5. ✅ On lance la partie quand tout le monde est prêt
6. ✅ Les questions viennent de la vraie BDD (pas de hardcode)
7. ✅ On voit les réponses des autres en temps réel
8. ✅ On rigole des mauvaises réponses
9. ✅ **Entre certaines manches, une carte mystère peut apparaître et changer le cours du jeu**
10. ✅ Les scores s'affichent clairement
11. ✅ Aucun bug de synchronisation
12. ✅ On a envie de refaire une partie direct après

---

## 💬 TON À ADOPTER DANS LE JEU

Le jeu doit être **fun, détendu, entre potes**. Pas trop sérieux.

Exemples de messages :

**Bonnes réponses :**
- "GG Mike33! 🔥"
- "Sarah_rap écrase tout! 💪"
- "Équipe A en feu! 🎉"

**Mauvaises réponses :**
- "Oups Julie_beat, t'es sûre de ça? 😅"
- "Mdrrr Alex t'as mélangé 💀"
- "Proche mais pas tout à fait!"

**Timeouts :**
- "Trop tard! ⏰"
- "Vous dormiez ou quoi? 😴"
- "Prochaine fois faut réveiller Mike!"

---

## 🎯 OBJECTIF FINAL

Créer un jeu où :

1. On invite facilement nos potes (code de room simple)
2. On rigole ensemble des erreurs
3. On apprend des trucs sur le rap français
4. On a envie de refaire une partie
5. Les données sont RÉELLES et DYNAMIQUES
6. Tout est fluide et en temps réel

**Un Kahoot/Gartic Phone du rap français, mais en mieux !** 🎤🔥
